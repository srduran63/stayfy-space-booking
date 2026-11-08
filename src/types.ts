export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  stripe_account_id: string | null
  stripe_onboarding_complete: boolean
  referred_by: string | null
  referral_discount_used: boolean
  review_discount_available: boolean
  created_at: string
}

export type SpaceCategory = 'hotel' | 'estudio' | 'oficina' | 'evento' | 'reunion' | 'coworking'

export type AmenityKey =
  | 'pool'
  | 'bar'
  | 'restaurant'
  | 'valet_parking'
  | 'parking'
  | 'wifi'
  | 'gym'
  | 'spa'
  | 'breakfast'
  | 'air_conditioning'
  | 'pet_friendly'
  | 'room_service'
  | 'jacuzzi'

export interface Space {
  id: string
  title: string
  description: string | null
  category: SpaceCategory
  city: string
  address: string | null
  price_per_hour: number
  price_per_night: number | null
  images: string[]
  videos: string[]
  amenities: AmenityKey[]
  capacity: number | null
  rating: number
  review_count: number
  host_id: string | null
  host_stripe_ready: boolean
  created_at: string
  host?: Profile | null
}

export type BookingStatus = 'confirmed' | 'cancelled' | 'pending_payment'
export type BookingType = 'hourly' | 'nightly'

export interface Booking {
  id: string
  space_id: string
  user_id: string
  booking_type: BookingType
  check_in: string
  check_out: string
  status: BookingStatus
  total_price: number | null
  terms_accepted_at: string | null
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  platform_fee_amount: number | null
  referral_discount_applied: boolean
  review_discount_applied: boolean
  guests: number
  booking_code: string | null
  refunded_amount: number | null
  cancellation_fee_amount: number | null
  cancelled_at: string | null
  created_at: string
  space?: Space
  customer?: Profile
}

export interface Review {
  id: string
  space_id: string
  user_id: string
  booking_id: string
  rating: number
  comment: string | null
  created_at: string
  author?: Profile
}

export type CalendarSource = 'airbnb' | 'booking' | 'google' | 'other'

export interface ExternalCalendar {
  id: string
  space_id: string
  source_name: CalendarSource
  ical_url: string
  last_synced_at: string | null
  last_sync_error: string | null
  created_at: string
}
