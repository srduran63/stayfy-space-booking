import Stripe from 'npm:stripe@17'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' })
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = Deno.env.get('APP_URL') ?? 'https://stayfyapp.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id, email, full_name')
      .eq('id', user.id)
      .single()

    let accountId = profile?.stripe_account_id as string | null

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: profile?.email ?? user.email ?? undefined,
        business_type: 'individual',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })
      accountId = account.id
      await supabase.from('profiles').update({ stripe_account_id: accountId }).eq('id', user.id)
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${APP_URL}/panel-dueno?stripe=refresh`,
      return_url: `${APP_URL}/panel-dueno?stripe=return`,
      type: 'account_onboarding',
    })

    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
