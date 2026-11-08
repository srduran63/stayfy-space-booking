import { supabase } from './supabaseClient'

export async function startConnectOnboarding(): Promise<{ url?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('create-connect-account')
  if (error) return { error: error.message }
  return { url: data?.url }
}

export async function checkConnectStatus(): Promise<{
  connected: boolean
  onboardingComplete: boolean
  error?: string
}> {
  const { data, error } = await supabase.functions.invoke('check-connect-status')
  if (error) return { connected: false, onboardingComplete: false, error: error.message }
  return { connected: Boolean(data?.connected), onboardingComplete: Boolean(data?.onboarding_complete) }
}

export async function createCheckoutSession(bookingId: string): Promise<{ url?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { booking_id: bookingId },
  })
  if (error) return { error: error.message }
  return { url: data?.url }
}

export async function cancelBooking(bookingId: string): Promise<{
  refunded: boolean
  refundedAmount?: number
  cancellationFeeAmount?: number
  error?: string
}> {
  const { data, error } = await supabase.functions.invoke('cancel-booking', {
    body: { booking_id: bookingId },
  })
  if (error) {
    const serverMessage = (data as { error?: string } | null)?.error
    return { refunded: false, error: serverMessage ?? error.message }
  }
  return {
    refunded: Boolean(data?.refunded),
    refundedAmount: data?.refunded_amount,
    cancellationFeeAmount: data?.cancellation_fee_amount,
  }
}
