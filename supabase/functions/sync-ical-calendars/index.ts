import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const MAX_EVENTS_PER_FEED = 500
const FETCH_TIMEOUT_MS = 15000

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Deshace el plegado de líneas de RFC5545: una línea continuada empieza con espacio o tab.
function unfoldLines(raw: string): string[] {
  const rawLines = raw.split(/\r\n|\n|\r/)
  const lines: string[] = []
  for (const line of rawLines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1)
    } else {
      lines.push(line)
    }
  }
  return lines
}

// Extrae solo la parte de fecha (YYYY-MM-DD) de un valor DTSTART/DTEND,
// que puede venir como fecha simple (VALUE=DATE) o como fecha-hora.
function extractDateOnly(value: string): string | null {
  const digits = value.replace(/[^0-9]/g, '')
  if (digits.length < 8) return null
  const year = digits.slice(0, 4)
  const month = digits.slice(4, 6)
  const day = digits.slice(6, 8)
  return `${year}-${month}-${day}`
}

interface ParsedEvent {
  start: string
  end: string
}

function parseIcs(text: string): ParsedEvent[] {
  const lines = unfoldLines(text)
  const events: ParsedEvent[] = []
  let inEvent = false
  let start: string | null = null
  let end: string | null = null

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      inEvent = true
      start = null
      end = null
      continue
    }
    if (line.startsWith('END:VEVENT')) {
      if (inEvent && start && end) {
        events.push({ start, end })
        if (events.length >= MAX_EVENTS_PER_FEED) break
      }
      inEvent = false
      continue
    }
    if (!inEvent) continue

    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx)
    const value = line.slice(colonIdx + 1).trim()

    if (key.startsWith('DTSTART')) {
      start = extractDateOnly(value)
    } else if (key.startsWith('DTEND')) {
      end = extractDateOnly(value)
    }
  }

  return events
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
    error: userError,
  } = await supabaseAuth.auth.getUser()
  if (userError || !user) return json({ error: 'Unauthorized' }, 401)

  let spaceId: string
  try {
    const body = await req.json()
    spaceId = body.space_id
  } catch {
    return json({ error: 'Invalid payload' }, 400)
  }
  if (!spaceId) return json({ error: 'Missing space_id' }, 400)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: space, error: spaceError } = await supabase
    .from('spaces')
    .select('id, host_id')
    .eq('id', spaceId)
    .single()
  if (spaceError || !space) return json({ error: 'Space not found' }, 404)
  if (space.host_id !== user.id) return json({ error: 'Forbidden' }, 403)

  const { data: calendars, error: calendarsError } = await supabase
    .from('external_calendars')
    .select('id, ical_url')
    .eq('space_id', spaceId)
  if (calendarsError) return json({ error: calendarsError.message }, 500)

  const results = []

  for (const calendar of calendars ?? []) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
      const res = await fetch(calendar.ical_url, { signal: controller.signal })
      clearTimeout(timeout)

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      const events = parseIcs(text)

      await supabase.from('blocked_dates').delete().eq('external_calendar_id', calendar.id)

      if (events.length > 0) {
        const rows = events.map((e) => ({
          space_id: spaceId,
          external_calendar_id: calendar.id,
          start_date: e.start,
          end_date: e.end,
        }))
        const { error: insertError } = await supabase.from('blocked_dates').insert(rows)
        if (insertError) throw new Error(insertError.message)
      }

      await supabase
        .from('external_calendars')
        .update({ last_synced_at: new Date().toISOString(), last_sync_error: null })
        .eq('id', calendar.id)

      results.push({ id: calendar.id, blocked_ranges: events.length, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido al sincronizar'
      await supabase
        .from('external_calendars')
        .update({ last_synced_at: new Date().toISOString(), last_sync_error: message })
        .eq('id', calendar.id)
      results.push({ id: calendar.id, blocked_ranges: 0, error: message })
    }
  }

  return json({ results })
})
