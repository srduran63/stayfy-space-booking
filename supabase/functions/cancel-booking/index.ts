import Stripe from 'npm:stripe@17'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' })
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Cargo de cancelación que retiene Stayfy sobre el total cobrado, siempre que
// la reserva ya se haya pagado con tarjeta. El resto se reembolsa al cliente.
const CANCELLATION_FEE_PERCENT = Number(Deno.env.get('CANCELLATION_FEE_PERCENT') ?? '5')

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
    error: userError,
  } = await supabaseAuth.auth.getUser()
  if (userError || !user) return json({ error: 'Unauthorized' }, 401)

  let bookingId: string
  try {
    const body = await req.json()
    bookingId = body.booking_id
  } catch {
    return json({ error: 'Invalid payload' }, 400)
  }
  if (!bookingId) return json({ error: 'Missing booking_id' }, 400)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*, space:spaces(host_id)')
    .eq('id', bookingId)
    .single()

  if (error || !booking) return json({ error: 'Booking not found' }, 404)

  const isCustomer = booking.user_id === user.id
  const isHost = booking.space?.host_id === user.id
  if (!isCustomer && !isHost) return json({ error: 'Forbidden' }, 403)

  if (booking.status === 'cancelled') return json({ error: 'Booking already cancelled' }, 400)

  // Reserva nunca pagada (pending_payment) o pagada directo con el anfitrión: nada que reembolsar.
  if (booking.status !== 'confirmed' || !booking.stripe_payment_intent_id) {
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', bookingId)
    if (updateError) return json({ error: updateError.message }, 500)
    return json({ status: 'cancelled', refunded: false })
  }

  // Reserva confirmada y pagada con Stripe: reembolso real, reteniendo el cargo de cancelación.
  try {
    const pi = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id, {
      expand: ['latest_charge'],
    })
    const charge = pi.latest_charge
    if (!charge || typeof charge === 'string') {
      return json({ error: 'No se encontró el cargo original de esta reserva.' }, 500)
    }

    const subtotalCents = Math.round(Number(booking.total_price) * 100)
    const feeCents = Math.round(Number(booking.platform_fee_amount ?? 0) * 100)
    const totalChargedCents = subtotalCents + feeCents
    const refundCents = Math.round(totalChargedCents * (1 - CANCELLATION_FEE_PERCENT / 100))
    const cancellationFeeCents = totalChargedCents - refundCents

    // Recupera el 100% de lo transferido al anfitrión antes de reembolsar al cliente,
    // para no pagar el reembolso del bolsillo de la plataforma.
    const transferId =
      typeof charge.transfer === 'string' ? charge.transfer : (charge.transfer as { id?: string } | null)?.id
    if (transferId) {
      try {
        await stripe.transfers.createReversal(transferId, { amount: subtotalCents })
      } catch (reversalErr) {
        console.error('Transfer reversal failed', reversalErr)
        return json(
          { error: 'No se pudo recuperar el pago del anfitrión para procesar el reembolso. Contacta a soporte.' },
          502,
        )
      }
    }

    const refund = await stripe.refunds.create({
      payment_intent: booking.stripe_payment_intent_id,
      amount: refundCents,
    })

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        refunded_amount: refundCents / 100,
        cancellation_fee_amount: cancellationFeeCents / 100,
      })
      .eq('id', bookingId)
    if (updateError) return json({ error: updateError.message }, 500)

    return json({
      status: 'cancelled',
      refunded: true,
      refund_id: refund.id,
      refunded_amount: refundCents / 100,
      cancellation_fee_amount: cancellationFeeCents / 100,
    })
  } catch (err) {
    console.error('cancel-booking error', err)
    return json({ error: err instanceof Error ? err.message : 'Error procesando el reembolso' }, 500)
  }
})
