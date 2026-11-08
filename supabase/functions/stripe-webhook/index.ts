import Stripe from 'npm:stripe@17'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' })
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  if (!signature) return new Response('Missing signature', { status: 400 })

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, WEBHOOK_SECRET)
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${(err as Error).message}`, { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const bookingId = session.metadata?.booking_id
      if (bookingId) {
        const { data: confirmedBooking } = await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            stripe_payment_intent_id:
              typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
          })
          .eq('id', bookingId)
          .eq('status', 'pending_payment')
          .select('user_id, referral_discount_applied, review_discount_applied')
          .single()

        if (confirmedBooking?.referral_discount_applied) {
          await supabase.from('profiles').update({ referral_discount_used: true }).eq('id', confirmedBooking.user_id)
        }
        if (confirmedBooking?.review_discount_applied) {
          await supabase.from('profiles').update({ review_discount_available: false }).eq('id', confirmedBooking.user_id)
        }
      }
      break
    }
    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session
      const bookingId = session.metadata?.booking_id
      if (bookingId) {
        await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId).eq('status', 'pending_payment')
      }
      break
    }
    case 'account.updated': {
      const account = event.data.object as Stripe.Account
      const complete = Boolean(account.charges_enabled && account.payouts_enabled)
      await supabase.from('profiles').update({ stripe_onboarding_complete: complete }).eq('stripe_account_id', account.id)
      break
    }
  }

  return new Response('OK', { status: 200 })
})
