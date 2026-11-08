// Cargo de servicio cobrado al cliente encima del precio del dueño.
// Mantener en sync con supabase/functions/create-checkout-session/index.ts.
export const PLATFORM_FEE_PERCENT = 10
export const REFERRAL_DISCOUNT_FEE_PERCENT = 5

// Cargo de cancelación retenido sobre el total cobrado, siempre que la reserva
// ya se haya pagado con tarjeta. Mantener en sync con supabase/functions/cancel-booking/index.ts.
export const CANCELLATION_FEE_PERCENT = 5

export function serviceFeePercentFor(
  profile: { referred_by: string | null; referral_discount_used: boolean; review_discount_available?: boolean } | null,
): number {
  const referralApplies = Boolean(profile?.referred_by && !profile?.referral_discount_used)
  const discountApplies = referralApplies || Boolean(profile?.review_discount_available)
  return discountApplies ? REFERRAL_DISCOUNT_FEE_PERCENT : PLATFORM_FEE_PERCENT
}
