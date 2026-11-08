# Stayfy — Instant Space Booking

> Español: see [README.es.md](README.es.md)

Stayfy is a full-stack marketplace for booking spaces by the hour or day — studios, offices, meeting rooms, coworking and event venues. Guests search a catalog, book instantly and pay by card; hosts publish their own spaces, get paid directly through **Stripe Connect**, sync availability with Airbnb / Booking.com / Google Calendar via **iCal**, and track performance in an analytics dashboard. The app is a React 19 + TypeScript SPA backed by **Supabase** (Auth, Postgres with Row Level Security, Storage and Deno Edge Functions).

## Highlights

- **Multilingual (9 languages)** — Spanish, English, Portuguese, Chinese, Japanese, German, Turkish, Hebrew (with automatic RTL layout) and Italian, via `i18next` with browser language detection.
- **Stripe Connect payouts to hosts** — hosts onboard with Stripe Express; Checkout uses `application_fee_amount` + `transfer_data.destination` so the platform keeps its service fee and the rest goes to the host. Includes a Stripe webhook (`checkout.session.completed`, `checkout.session.expired`, `account.updated`) and card refunds with a configurable cancellation fee.
- **iCal sync** — each space exposes an `.ics` export feed, and hosts can import external calendars (Airbnb, Booking.com, Google, other); imported events become blocked dates.
- **Host analytics** — revenue per month, demand by weekday and month-over-month stats, charted with Recharts.
- **Supabase Row Level Security** on every table (profiles, spaces, bookings, reviews, favorites, external calendars, blocked dates) and on the `space-media` storage bucket.
- **Edge Functions** (Deno): `create-checkout-session`, `stripe-webhook`, `cancel-booking`, `create-connect-account`, `check-connect-status`, `ical-feed`, `sync-ical-calendars`, `send-booking-email` (transactional email via Resend, triggered by a Postgres `pg_net` webhook). Plus a Netlify Edge Function (`/api/geo`) for country detection (COP vs USD pricing).
- **StayBot** — an in-app help chat widget that answers frequently asked questions (localized FAQ flow).
- **3D landing page** — interactive 3D models rendered with Google's `<model-viewer>` (lazy-loaded).
- Also: reviews and ratings, favorites, referral codes with service-fee discounts, light/dark theme, Google sign-in.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router 7 |
| Styling | Tailwind CSS v4, lucide-react icons |
| i18n | i18next, react-i18next, i18next-browser-languagedetector |
| Charts / 3D | Recharts, @google/model-viewer |
| Backend | Supabase (Auth, Postgres + RLS, Storage, Edge Functions on Deno) |
| Payments | Stripe Checkout + Stripe Connect (Express) |
| Email | Resend (from a Supabase Edge Function) |
| Hosting | Netlify (SPA + Edge Function for geo-IP) |
| Tooling | oxlint, TypeScript project references |

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Create a free project at [supabase.com](https://supabase.com).
2. In **Project Settings → API** copy the **Project URL** and the **anon public key**.
3. Copy `.env.example` to `.env` and fill in the values (see [Environment variables](#environment-variables)).

### 3. Create the database

Open `supabase/schema.sql` and, **before running it**, edit the two setup placeholders:

- `public.is_admin()` — replace `admin@example.com` with your admin email (same as `VITE_ADMIN_EMAIL`).
- `public.notify_booking_created()` — replace `YOUR_PROJECT_REF` with your project ref and `REPLACE_WITH_WEBHOOK_SECRET` with the value you set as `BOOKING_WEBHOOK_SECRET` (ideally stored in Supabase Vault).

Then paste the whole file in the Supabase **SQL Editor** and run it. It creates the tables, triggers, RLS policies and the `space-media` storage bucket with its policies.

### 4. Deploy the Edge Functions (optional, for payments / email / iCal)

```bash
supabase functions deploy
supabase secrets set STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... RESEND_API_KEY=... BOOKING_WEBHOOK_SECRET=... APP_URL=https://your-domain
```

Point a Stripe webhook to `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`.

### 5. Google sign-in (optional)

Enable **Authentication → Providers → Google** in Supabase and configure a Client ID/Secret from Google Cloud Console. Email/password login works without it.

### 6. Run

```bash
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
npm run preview
npm run lint       # oxlint
```

If `.env` is missing, the app shows a setup banner instead of failing.

## Environment variables

Frontend (`.env`, see `.env.example`):

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `VITE_ADMIN_EMAIL` | Email with admin access to the host panel (must match `is_admin()` in `schema.sql`) |

Edge Functions (Supabase secrets; `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically):

| Variable | Used by |
|---|---|
| `STRIPE_SECRET_KEY` | checkout, cancel, Connect, webhook |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` |
| `RESEND_API_KEY` | `send-booking-email` |
| `BOOKING_WEBHOOK_SECRET` | `send-booking-email` (shared secret with the DB trigger) |
| `APP_URL` | redirect / email links |
| `PLATFORM_FEE_PERCENT`, `REFERRAL_DISCOUNT_FEE_PERCENT`, `CANCELLATION_FEE_PERCENT` | optional fee overrides (keep in sync with `src/lib/pricing.ts`) |

## Architecture

```
src/                      React SPA
  pages/                  Landing, Dashboard (search + catalog), MyBookings, Favorites,
                          BecomeHost, PartnerPanel (host), HostPanel (admin), Terms
  components/             modals (auth, profile, space detail/form, bookings, reviews,
                          calendar sync), HostAnalytics, StayBot, switchers
  context/                Auth, Region (geo → currency), Theme, Toast
  lib/                    supabase client, Stripe & iCal helpers, pricing, referrals
  i18n/locales/           9 translation files
netlify/edge-functions/   geo.ts → /api/geo (visitor country)
supabase/
  schema.sql              tables, triggers, RLS policies, storage bucket + policies
  functions/              Deno Edge Functions (payments, Connect, iCal, email)
  auth-email-templates/   branded signup / reset-password emails
```

**Flow:** the SPA talks to Supabase directly for reads/writes (secured by RLS) and calls Edge Functions for anything requiring secrets (Stripe, Resend, iCal fetching). Stripe events come back through `stripe-webhook`, which confirms bookings; a Postgres trigger on confirmed bookings calls `send-booking-email` through `pg_net`.

**Database:** `profiles`, `spaces`, `bookings`, `reviews`, `favorites`, `external_calendars`, `blocked_dates`, plus helper functions such as `is_admin()`, `resolve_referrer()`, booking-code generation and rating aggregation.
