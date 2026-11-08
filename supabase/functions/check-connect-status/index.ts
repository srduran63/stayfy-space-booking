import Stripe from 'npm:stripe@17'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' })
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: profile } = await supabase.from('profiles').select('stripe_account_id').eq('id', user.id).single()

  if (!profile?.stripe_account_id) {
    return new Response(JSON.stringify({ connected: false, onboarding_complete: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const account = await stripe.accounts.retrieve(profile.stripe_account_id)
  const complete = Boolean(account.charges_enabled && account.payouts_enabled)

  await supabase.from('profiles').update({ stripe_onboarding_complete: complete }).eq('id', user.id)

  return new Response(JSON.stringify({ connected: true, onboarding_complete: complete }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
