import {
  AirVent,
  Bath,
  Car,
  Coffee,
  ConciergeBell,
  Dumbbell,
  Martini,
  PawPrint,
  SquareParking,
  UtensilsCrossed,
  WavesLadder,
  Wifi,
  type LucideIcon,
} from 'lucide-react'
import i18n from '../i18n'
import type { AmenityKey } from '../types'

const AMENITY_ICONS: Record<AmenityKey, LucideIcon> = {
  pool: WavesLadder,
  bar: Martini,
  restaurant: UtensilsCrossed,
  valet_parking: Car,
  parking: SquareParking,
  wifi: Wifi,
  gym: Dumbbell,
  spa: ConciergeBell,
  breakfast: Coffee,
  air_conditioning: AirVent,
  pet_friendly: PawPrint,
  room_service: ConciergeBell,
  jacuzzi: Bath,
}

const AMENITY_KEYS = Object.keys(AMENITY_ICONS) as AmenityKey[]

export function getAmenityOptions(): Array<{ key: AmenityKey; label: string; icon: LucideIcon }> {
  return AMENITY_KEYS.map((key) => ({
    key,
    label: i18n.t(`amenities.${key}`, { defaultValue: key }),
    icon: AMENITY_ICONS[key],
  }))
}

export function amenityInfo(key: string) {
  const icon = AMENITY_ICONS[key as AmenityKey] ?? Wifi
  const label = i18n.t(`amenities.${key}`, { defaultValue: key })
  return { key, label, icon }
}
