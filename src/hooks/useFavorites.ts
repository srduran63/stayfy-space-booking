import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

export function useFavorites() {
  const { user } = useAuth()
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) {
      setFavoriteIds(new Set())
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase.from('favorites').select('space_id').eq('user_id', user.id)
    setFavoriteIds(new Set((data ?? []).map((f) => f.space_id as string)))
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  async function toggleFavorite(spaceId: string) {
    if (!user) return
    const isFavorite = favoriteIds.has(spaceId)
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      if (isFavorite) next.delete(spaceId)
      else next.add(spaceId)
      return next
    })
    if (isFavorite) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('space_id', spaceId)
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, space_id: spaceId })
    }
  }

  return {
    favoriteIds,
    isFavorite: (spaceId: string) => favoriteIds.has(spaceId),
    toggleFavorite,
    loading,
    refresh: load,
  }
}
