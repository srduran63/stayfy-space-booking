import { Heart } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { SpaceCard } from '../components/SpaceCard'
import { SpaceDetailModal } from '../components/SpaceDetailModal'
import { useFavorites } from '../hooks/useFavorites'
import { supabase } from '../lib/supabaseClient'
import type { Space } from '../types'

export function Favorites() {
  const { t } = useTranslation()
  const { favoriteIds, isFavorite, toggleFavorite, loading: loadingFavorites } = useFavorites()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [loadingSpaces, setLoadingSpaces] = useState(true)
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null)

  const loadSpaces = useCallback(async () => {
    if (favoriteIds.size === 0) {
      setSpaces([])
      setLoadingSpaces(false)
      return
    }
    setLoadingSpaces(true)
    const { data } = await supabase.from('spaces').select('*').in('id', Array.from(favoriteIds))
    setSpaces((data as Space[]) ?? [])
    setLoadingSpaces(false)
  }, [favoriteIds])

  useEffect(() => {
    if (!loadingFavorites) loadSpaces()
  }, [loadingFavorites, loadSpaces])

  const loading = loadingFavorites || loadingSpaces

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-start p-4 pb-20 sm:p-6">
      <div className="w-full space-y-6 animate-fadeIn">
        <div className="w-full border-b border-line/10 pb-4">
          <h2 className="text-2xl font-extrabold text-ink sm:text-3xl">{t('favorites.title')}</h2>
          <p className="mt-1 text-xs text-accent">{t('favorites.subtitle')}</p>
        </div>

        {loading ? (
          <LoadingSpinner label={t('favorites.loading')} />
        ) : spaces.length === 0 ? (
          <div className="flex w-full flex-col items-center gap-2 py-12 text-center">
            <Heart size={28} className="text-ink-faint" />
            <p className="text-xs text-ink-muted">{t('favorites.empty')}</p>
          </div>
        ) : (
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {spaces.map((space) => (
              <SpaceCard
                key={space.id}
                space={space}
                onSelect={setSelectedSpace}
                isFavorite={isFavorite(space.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        )}
      </div>

      <SpaceDetailModal space={selectedSpace} onClose={() => setSelectedSpace(null)} onBooked={() => {}} />
    </main>
  )
}
