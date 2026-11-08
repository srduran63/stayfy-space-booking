import { supabase } from './supabaseClient'

const BUCKET = 'space-media'

function randomId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}

export async function uploadSpaceMedia(file: File, folder: 'images' | 'videos', userId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'bin'
  const path = `${folder}/${userId}/${randomId()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export function extractStoragePath(publicUrl: string): string | null {
  const marker = `/object/public/${BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return null
  return publicUrl.slice(idx + marker.length)
}

export async function deleteSpaceMedia(publicUrl: string): Promise<void> {
  const path = extractStoragePath(publicUrl)
  if (!path) return
  await supabase.storage.from(BUCKET).remove([path])
}
