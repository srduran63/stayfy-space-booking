import { supabase } from './supabaseClient'
import type { CalendarSource, ExternalCalendar } from '../types'

export function getExportFeedUrl(spaceId: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string
  return `${base}/functions/v1/ical-feed?space_id=${spaceId}`
}

export async function listExternalCalendars(spaceId: string): Promise<ExternalCalendar[]> {
  const { data } = await supabase
    .from('external_calendars')
    .select('*')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: true })
  return (data as ExternalCalendar[]) ?? []
}

export async function addExternalCalendar(
  spaceId: string,
  sourceName: CalendarSource,
  icalUrl: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('external_calendars')
    .insert({ space_id: spaceId, source_name: sourceName, ical_url: icalUrl })
  if (error) return { error: error.message }
  return {}
}

export async function removeExternalCalendar(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('external_calendars').delete().eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function syncCalendars(spaceId: string): Promise<{
  results?: { id: string; blocked_ranges: number; error: string | null }[]
  error?: string
}> {
  const { data, error } = await supabase.functions.invoke('sync-ical-calendars', {
    body: { space_id: spaceId },
  })
  if (error) {
    const serverMessage = (data as { error?: string } | null)?.error
    return { error: serverMessage ?? error.message }
  }
  return { results: data?.results }
}
