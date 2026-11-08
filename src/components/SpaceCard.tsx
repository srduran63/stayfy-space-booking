import { Heart, MapPin, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { amenityInfo } from '../lib/amenities'
import { categoryLabel, formatPrice } from '../lib/utils'
import type { Space } from '../types'

interface SpaceCardProps {
  space: Space
  onSelect: (space: Space) => void
  isFavorite?: boolean
  onToggleFavorite?: (spaceId: string) => void
}

export function SpaceCard({ space, onSelect, isFavorite, onToggleFavorite }: SpaceCardProps) {
  const { t } = useTranslation()
  const cover = space.images[0]

  return (
    <button
      onClick={() => onSelect(space)}
      className="glass-card group flex flex-col overflow-hidden rounded-3xl text-left"
    >
      <div className="relative h-36 w-full overflow-hidden bg-well/30">
        {cover ? (
          <img
            src={cover}
            alt={space.title}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-ink-faint">
            {t('common.noImage')}
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
          {categoryLabel(space.category)}
        </span>
        {onToggleFavorite && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite(space.id)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                onToggleFavorite(space.id)
              }
            }}
            aria-label={isFavorite ? t('common.removeFromFavorites') : t('common.addToFavorites')}
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm transition hover:scale-110"
          >
            <Heart size={13} className={isFavorite ? 'fill-rose-500 text-rose-500' : 'text-white'} />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-sm font-bold text-ink line-clamp-1">{space.title}</h3>
        <div className="flex items-center space-x-1.5 text-[11px] text-ink-muted">
          <MapPin size={11} />
          <span className="line-clamp-1">{space.city}</span>
        </div>
        {space.amenities.length > 0 && (
          <div className="flex items-center gap-2 pt-0.5 text-ink-muted">
            {space.amenities.slice(0, 4).map((key) => {
              const { icon: Icon, label } = amenityInfo(key)
              return (
                <span key={key} title={label}>
                  <Icon size={12} />
                </span>
              )
            })}
            {space.amenities.length > 4 && (
              <span className="text-[10px]">+{space.amenities.length - 4}</span>
            )}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center space-x-1 text-[11px] text-amber-400">
            {space.review_count > 0 ? (
              <>
                <Star size={11} className="fill-amber-400" />
                <span>
                  {space.rating.toFixed(1)} <span className="text-ink-faint">({space.review_count})</span>
                </span>
              </>
            ) : (
              <span className="text-ink-faint">{t('common.new')}</span>
            )}
          </div>
          <div className="text-xs font-bold text-ink">
            {space.price_per_night != null ? (
              <>
                {formatPrice(space.price_per_night)}
                <span className="font-normal text-ink-muted"> {t('common.perNight')}</span>
              </>
            ) : (
              <>
                {formatPrice(space.price_per_hour)}
                <span className="font-normal text-ink-muted"> {t('common.perHour')}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
