import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function toIcsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeIcsText(text: string): string {
  return text.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' },
    })
  }

  const url = new URL(req.url)
  const spaceId = url.searchParams.get('space_id')
  if (!spaceId) return new Response('Missing space_id', { status: 400 })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: space } = await supabase.from('spaces').select('id, title').eq('id', spaceId).single()
  if (!space) return new Response('Space not found', { status: 404 })

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, check_in, check_out, booking_code')
    .eq('space_id', spaceId)
    .eq('status', 'confirmed')

  const now = toIcsDate(new Date().toISOString())
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Stayfy//Booking Feed//ES', 'CALSCALE:GREGORIAN']

  for (const b of bookings ?? []) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:stayfy-${b.id}@stayfyapp.com`,
      `DTSTAMP:${now}`,
      `DTSTART:${toIcsDate(b.check_in)}`,
      `DTEND:${toIcsDate(b.check_out)}`,
      `SUMMARY:${escapeIcsText(`Reservado - ${b.booking_code ?? space.title}`)}`,
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')

  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="stayfy-calendar.ics"',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=900',
    },
  })
})
