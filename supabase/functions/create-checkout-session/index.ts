import Stripe from 'npm:stripe@17'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' })
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = Deno.env.get('APP_URL') ?? 'https://stayfyapp.com'
// Cargo de servicio cobrado al CLIENTE encima del precio del dueño (nunca se
// descuenta del pago del dueño). Mantener en sync con src/lib/pricing.ts.
const PLATFORM_FEE_PERCENT = Number(Deno.env.get('PLATFORM_FEE_PERCENT') ?? '10')
const REFERRAL_DISCOUNT_FEE_PERCENT = Number(Deno.env.get('REFERRAL_DISCOUNT_FEE_PERCENT') ?? '5')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
    error: userError,
  } = await supabaseAuth.auth.getUser()
  if (userError || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  let bookingId: string
  try {
    const body = await req.json()
    bookingId = body.booking_id
  } catch {
    return new Response('Invalid payload', { status: 400, headers: corsHeaders })
  }
  if (!bookingId) return new Response('Missing booking_id', { status: 400, headers: corsHeaders })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*, space:spaces(title, host:profiles!spaces_host_id_fkey(stripe_account_id, stripe_onboarding_complete))')
    .eq('id', bookingId)
    .single()

  if (error || !booking) return new Response('Booking not found', { status: 404, headers: corsHeaders })
  if (booking.user_id !== user.id) return new Response('Forbidden', { status: 403, headers: corsHeaders })
  if (booking.status !== 'pending_payment')
    return new Response('Booking is not pending payment', { status: 400, headers: corsHeaders })

  const host = booking.space?.host as
    | { stripe_account_id?: string; stripe_onboarding_complete?: boolean }
    | undefined
  const hostAccountId = host?.stripe_account_id
  const onboardingComplete = host?.stripe_onboarding_complete
  if (!hostAccountId || !onboardingComplete) {
    return new Response('Host has not connected Stripe', { status: 400, headers: corsHeaders })
  }

  const { data: customerProfile } = await supabase
    .from('profiles')
    .select('referred_by, referral_discount_used, review_discount_available')
    .eq('id', user.id)
    .single()
  const referralDiscountApplies = Boolean(customerProfile?.referred_by && !customerProfile?.referral_discount_used)
  const reviewDiscountApplies = Boolean(customerProfile?.review_discount_available)
  const feePercent = referralDiscountApplies || reviewDiscountApplies ? REFERRAL_DISCOUNT_FEE_PERCENT : PLATFORM_FEE_PERCENT

  // El dueño siempre recibe el 100% de total_price. El cargo de servicio se
  // suma ENCIMA para el cliente: se cobra amountCents+feeCents en la tarjeta,
  // Stripe retiene feeCents como application_fee y transfiere el resto (=
  // amountCents, el precio íntegro del dueño) a la cuenta conectada del dueño.
  const amountCents = Math.round(Number(booking.total_price) * 100)
  const feeCents = Math.round(amountCents * (feePercent / 100))
  const chargeCents = amountCents + feeCents

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: chargeCents,
          product_data: { name: booking.space?.title ?? 'Reserva en Stayfy' },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: feeCents,
      transfer_data: { destination: hostAccountId },
    },
    metadata: { booking_id: bookingId },
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    success_url: `${APP_URL}/dashboard?payment=success&booking_id=${bookingId}`,
    cancel_url: `${APP_URL}/dashboard?payment=cancelled&booking_id=${bookingId}`,
  })

  await supabase
    .from('bookings')
    .update({
      stripe_checkout_session_id: session.id,
      platform_fee_amount: feeCents / 100,
      referral_discount_applied: referralDiscountApplies,
      review_discount_applied: !referralDiscountApplies && reviewDiscountApplies,
    })
    .eq('id', bookingId)

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
