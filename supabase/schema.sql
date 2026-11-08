-- Stayfy: esquema de base de datos para Supabase
-- Ejecuta este script completo en el SQL Editor de tu proyecto Supabase.

-- ============ PROFILES ============
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists stripe_account_id text;
alter table public.profiles add column if not exists stripe_onboarding_complete boolean not null default false;

-- ============ PROGRAMA DE REFERIDOS (clientes) ============
-- La comisión de la plataforma se cobra al CLIENTE por encima del precio del
-- dueño (ver create-checkout-session), no se descuenta del pago del dueño.
-- Un cliente referido paga comisión reducida en su primera reserva; el
-- descuento sale de la comisión de la plataforma, nunca del precio del dueño.
alter table public.profiles add column if not exists referred_by uuid references public.profiles(id);
alter table public.profiles add column if not exists referral_discount_used boolean not null default false;

-- ============ DESCUENTO POR RESEÑA (fidelización) ============
-- Al dejar una reseña, el cliente gana la misma comisión reducida que el
-- programa de referidos (ver REFERRAL_DISCOUNT_FEE_PERCENT) para su próxima
-- reserva. Se consume (vuelve a false) en stripe-webhook cuando esa reserva
-- con descuento se paga. No se acumula: dejar varias reseñas no da más de un
-- descuento pendiente a la vez.
alter table public.profiles add column if not exists review_discount_available boolean not null default false;

-- Ya no existe comisión variable por dueño ni promo de referidos entre dueños.
drop trigger if exists profiles_apply_referral_reward on public.profiles;
drop function if exists public.apply_referral_reward();
alter table public.profiles drop column if exists platform_fee_percent;
alter table public.profiles drop column if exists promo_fee_expires_at;
alter table public.profiles drop column if exists referral_reward_granted;

-- Resuelve un código de referido (primeros 8 caracteres del UUID de quien invita)
-- al id de ese usuario. Usada por el flujo de registro para fijar profiles.referred_by.
create or replace function public.resolve_referrer(code text)
returns uuid
language sql
security definer set search_path = public
as $$
  select id from public.profiles where id::text like (code || '%') limit 1;
$$;
grant execute on function public.resolve_referrer(text) to anon, authenticated;

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles are editable by owner" on public.profiles;
create policy "Profiles are editable by owner"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Crea automáticamente un perfil cuando se registra un usuario nuevo
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Rellena el email en perfiles que ya existían antes de agregar la columna.
update public.profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;

-- ============ SPACES ============
create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'hotel' check (category in ('hotel', 'estudio', 'oficina', 'evento', 'reunion', 'coworking')),
  city text not null,
  address text,
  price_per_hour numeric(10, 2) not null check (price_per_hour >= 0),
  price_per_night numeric(10, 2) check (price_per_night is null or price_per_night >= 0),
  images text[] not null default '{}',
  videos text[] not null default '{}',
  amenities text[] not null default '{}',
  rating numeric(2, 1) not null default 0 check (rating >= 0 and rating <= 5),
  review_count int not null default 0,
  host_id uuid references public.profiles(id) on delete set null,
  host_stripe_ready boolean not null default false,
  created_at timestamptz not null default now()
);

-- Migración para instalaciones existentes: agrega columnas nuevas si faltan,
-- migra la antigua image_url a images[] y actualiza el check de categoría.
alter table public.spaces add column if not exists images text[] not null default '{}';
alter table public.spaces add column if not exists videos text[] not null default '{}';
alter table public.spaces add column if not exists amenities text[] not null default '{}';
alter table public.spaces add column if not exists price_per_night numeric(10, 2);
alter table public.spaces add column if not exists host_stripe_ready boolean not null default false;
alter table public.spaces add column if not exists capacity integer;

-- Mantiene spaces.host_stripe_ready sincronizado con profiles.stripe_onboarding_complete,
-- para que el cliente pueda saber si un espacio acepta pago con tarjeta sin exponer perfiles públicamente.
create or replace function public.sync_space_host_stripe_ready()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.host_id is not null then
    select coalesce(stripe_onboarding_complete, false) into new.host_stripe_ready
    from public.profiles where id = new.host_id;
  else
    new.host_stripe_ready := false;
  end if;
  return new;
end;
$$;

drop trigger if exists spaces_sync_host_stripe_ready on public.spaces;
create trigger spaces_sync_host_stripe_ready
  before insert or update of host_id on public.spaces
  for each row execute procedure public.sync_space_host_stripe_ready();

create or replace function public.sync_profile_stripe_ready_to_spaces()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.stripe_onboarding_complete is distinct from old.stripe_onboarding_complete then
    update public.spaces set host_stripe_ready = new.stripe_onboarding_complete where host_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sync_stripe_ready on public.profiles;
create trigger profiles_sync_stripe_ready
  after update of stripe_onboarding_complete on public.profiles
  for each row execute procedure public.sync_profile_stripe_ready_to_spaces();
alter table public.spaces add column if not exists review_count int not null default 0;
alter table public.spaces alter column rating set default 0;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'spaces' and column_name = 'image_url') then
    update public.spaces set images = array[image_url] where image_url is not null and images = '{}';
    alter table public.spaces drop column image_url;
  end if;
end $$;

alter table public.spaces drop constraint if exists spaces_category_check;
alter table public.spaces add constraint spaces_category_check
  check (category in ('hotel', 'estudio', 'oficina', 'evento', 'reunion', 'coworking'));

alter table public.spaces enable row level security;

-- Único correo autorizado a publicar/editar/eliminar espacios (panel de anfitrión).
-- Cambia este valor si el correo de administración cambia.
-- NOTE: replace 'admin@example.com' with your admin email (must match VITE_ADMIN_EMAIL in .env).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'admin@example.com';
$$;

-- El admin puede ver el perfil (nombre/correo) de cualquier cliente que haya reservado sus espacios.
drop policy if exists "Admin can view all profiles" on public.profiles;
create policy "Admin can view all profiles"
  on public.profiles for select
  using (public.is_admin());

drop policy if exists "Spaces are publicly readable" on public.spaces;
create policy "Spaces are publicly readable"
  on public.spaces for select
  using (true);

-- Autoservicio: cualquier usuario autenticado puede publicar su propio espacio
-- (host_id = su propio id). El admin además puede publicar y asignarlo a cualquier dueño.
drop policy if exists "Hosts can insert own spaces" on public.spaces;
drop policy if exists "Only admin can insert spaces" on public.spaces;
create policy "Hosts can insert own spaces"
  on public.spaces for insert
  with check (public.is_admin() or auth.uid() = host_id);

-- El admin puede editar cualquier espacio (incluyendo reasignar el dueño). El dueño asignado
-- solo puede editar el suyo, y no puede reasignarlo a otra persona (with check lo impide).
drop policy if exists "Hosts can update own spaces" on public.spaces;
drop policy if exists "Only admin can update own spaces" on public.spaces;
drop policy if exists "Admin or assigned owner can update spaces" on public.spaces;
create policy "Admin or assigned owner can update spaces"
  on public.spaces for update
  using (public.is_admin() or auth.uid() = host_id)
  with check (public.is_admin() or auth.uid() = host_id);

-- Solo el admin elimina espacios (los dueños pueden editar pero no despublicar).
drop policy if exists "Hosts can delete own spaces" on public.spaces;
drop policy if exists "Only admin can delete own spaces" on public.spaces;
drop policy if exists "Only admin can delete spaces" on public.spaces;
create policy "Only admin can delete spaces"
  on public.spaces for delete
  using (public.is_admin());

-- ============ BOOKINGS ============
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  booking_type text not null default 'hourly' check (booking_type in ('hourly', 'nightly')),
  check_in timestamptz not null,
  check_out timestamptz not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'pending_payment')),
  total_price numeric(10, 2), -- precio del dueño (lo que el dueño recibe en su totalidad)
  terms_accepted_at timestamptz,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  platform_fee_amount numeric(10, 2), -- cargo de servicio cobrado al cliente ENCIMA de total_price
  referral_discount_applied boolean not null default false,
  review_discount_applied boolean not null default false,
  guests integer not null default 1 check (guests > 0),
  booking_code text unique, -- código corto (ej. STF-7K2P9X) para verificar la reserva en recepción
  refunded_amount numeric(10, 2), -- lo que realmente se le devolvió al cliente al cancelar
  cancellation_fee_amount numeric(10, 2), -- lo que Stayfy retuvo del total cobrado al cancelar
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  constraint bookings_checkout_after_checkin check (check_out > check_in)
);

alter table public.bookings add column if not exists terms_accepted_at timestamptz;
alter table public.bookings add column if not exists stripe_checkout_session_id text;
alter table public.bookings add column if not exists stripe_payment_intent_id text;
alter table public.bookings add column if not exists platform_fee_amount numeric(10, 2);
alter table public.bookings add column if not exists referral_discount_applied boolean not null default false;
alter table public.bookings add column if not exists review_discount_applied boolean not null default false;
alter table public.bookings add column if not exists guests integer not null default 1;
alter table public.bookings drop constraint if exists bookings_guests_check;
alter table public.bookings add constraint bookings_guests_check check (guests > 0);
alter table public.bookings add column if not exists booking_code text unique;
alter table public.bookings add column if not exists refunded_amount numeric(10, 2);
alter table public.bookings add column if not exists cancellation_fee_amount numeric(10, 2);
alter table public.bookings add column if not exists cancelled_at timestamptz;
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check check (status in ('confirmed', 'cancelled', 'pending_payment'));

-- Código corto de reserva (ej. STF-7K2P9X), para que recepción pueda verificar al huésped sin buscar por UUID.
create or replace function public.generate_booking_code() returns text
language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- sin 0/O/1/I/L para evitar confusión al leerlo en voz alta
  code text;
  i int;
begin
  code := 'STF-';
  for i in 1..6 loop
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return code;
end;
$$;

create or replace function public.set_booking_code() returns trigger
language plpgsql as $$
declare
  new_code text;
  tries int := 0;
begin
  if new.booking_code is null then
    loop
      new_code := public.generate_booking_code();
      tries := tries + 1;
      exit when not exists (select 1 from public.bookings where booking_code = new_code) or tries > 20;
    end loop;
    new.booking_code := new_code;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_set_code on public.bookings;
create trigger bookings_set_code
  before insert on public.bookings
  for each row execute function public.set_booking_code();

-- Migración para instalaciones existentes: pasar de booking_date/start_time/duration_hours a check_in/check_out.
alter table public.bookings add column if not exists booking_type text not null default 'hourly' check (booking_type in ('hourly', 'nightly'));
alter table public.bookings add column if not exists check_in timestamptz;
alter table public.bookings add column if not exists check_out timestamptz;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'bookings' and column_name = 'booking_date') then
    update public.bookings
      set check_in = (booking_date + start_time)::timestamptz,
          check_out = (booking_date + start_time)::timestamptz + make_interval(hours => duration_hours)
      where check_in is null;
    alter table public.bookings drop column booking_date;
    alter table public.bookings drop column start_time;
    alter table public.bookings drop column duration_hours;
  end if;
end $$;

alter table public.bookings alter column check_in set not null;
alter table public.bookings alter column check_out set not null;
alter table public.bookings drop constraint if exists bookings_checkout_after_checkin;
alter table public.bookings add constraint bookings_checkout_after_checkin check (check_out > check_in);

-- Evita reservas dobles a nivel de base de datos: ningún espacio puede tener dos reservas
-- confirmadas O con pago en curso que se solapen (a prueba de condiciones de carrera).
-- Incluir 'pending_payment' bloquea el horario desde que arranca el checkout de Stripe,
-- no solo cuando se confirma el pago.
create extension if not exists btree_gist;

alter table public.bookings drop constraint if exists bookings_no_overlap;
alter table public.bookings add constraint bookings_no_overlap
  exclude using gist (
    space_id with =,
    tstzrange(check_in, check_out) with &&
  )
  where (status in ('confirmed', 'pending_payment'));

alter table public.bookings enable row level security;

drop policy if exists "Users can view own bookings" on public.bookings;
create policy "Users can view own bookings"
  on public.bookings for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own bookings" on public.bookings;
create policy "Users can insert own bookings"
  on public.bookings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own bookings" on public.bookings;
create policy "Users can update own bookings"
  on public.bookings for update
  using (auth.uid() = user_id);

-- El admin ve y puede cancelar todas las reservas (panel de anfitrión / supervisión).
drop policy if exists "Admin can view all bookings" on public.bookings;
create policy "Admin can view all bookings"
  on public.bookings for select
  using (public.is_admin());

drop policy if exists "Admin can update all bookings" on public.bookings;
create policy "Admin can update all bookings"
  on public.bookings for update
  using (public.is_admin());

-- Un dueño/socio ve y puede cancelar las reservas de los espacios que le fueron asignados.
drop policy if exists "Space owner can view own space bookings" on public.bookings;
create policy "Space owner can view own space bookings"
  on public.bookings for select
  using (exists (select 1 from public.spaces s where s.id = bookings.space_id and s.host_id = auth.uid()));

drop policy if exists "Space owner can update own space bookings" on public.bookings;
create policy "Space owner can update own space bookings"
  on public.bookings for update
  using (exists (select 1 from public.spaces s where s.id = bookings.space_id and s.host_id = auth.uid()));

-- ============ REVIEWS ============
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade unique,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

drop policy if exists "Reviews are publicly readable" on public.reviews;
create policy "Reviews are publicly readable"
  on public.reviews for select
  using (true);

drop policy if exists "Users can review own completed bookings" on public.reviews;
create policy "Users can review own completed bookings"
  on public.reviews for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.user_id = auth.uid()
        and b.status = 'confirmed'
        and b.check_out < now()
    )
  );

drop policy if exists "Users can update own reviews" on public.reviews;
create policy "Users can update own reviews"
  on public.reviews for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own reviews" on public.reviews;
create policy "Users can delete own reviews"
  on public.reviews for delete
  using (auth.uid() = user_id);

-- Recalcula automáticamente el rating y el conteo de reseñas del espacio.
create or replace function public.update_space_rating()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_space_id uuid := coalesce(new.space_id, old.space_id);
begin
  update public.spaces
  set rating = coalesce((select round(avg(rating)::numeric, 1) from public.reviews where space_id = target_space_id), 0),
      review_count = (select count(*) from public.reviews where space_id = target_space_id)
  where id = target_space_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists reviews_update_space_rating on public.reviews;
create trigger reviews_update_space_rating
  after insert or update or delete on public.reviews
  for each row execute procedure public.update_space_rating();

-- Recalcula el rating de todos los espacios existentes (por si ya había un valor fijo puesto a mano).
update public.spaces s
set rating = coalesce((select round(avg(r.rating)::numeric, 1) from public.reviews r where r.space_id = s.id), 0),
    review_count = (select count(*) from public.reviews r where r.space_id = s.id);

-- ============ NOTIFICACIONES POR CORREO ============
-- Al crear una reserva, notifica a la Edge Function "send-booking-email" (Resend) vía webhook.
create extension if not exists pg_net with schema extensions;

-- Se dispara cuando una reserva nace ya confirmada (pago directo con el anfitrión)
-- o cuando pasa a confirmada tras un pago exitoso con Stripe (pending_payment -> confirmed).
create or replace function public.notify_booking_created()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'confirmed' and (tg_op = 'INSERT' or old.status is distinct from 'confirmed') then
    -- SETUP: replace YOUR_PROJECT_REF with your Supabase project ref and REPLACE_WITH_WEBHOOK_SECRET
    -- with the same value you set as the BOOKING_WEBHOOK_SECRET secret of the send-booking-email
    -- Edge Function (supabase secrets set BOOKING_WEBHOOK_SECRET=...). Never commit the real value;
    -- ideally store it in Supabase Vault and read it here, e.g.:
    --   (select decrypted_secret from vault.decrypted_secrets where name = 'booking_webhook_secret')
    perform net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-booking-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', 'REPLACE_WITH_WEBHOOK_SECRET'
      ),
      body := jsonb_build_object('booking_id', new.id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_booking_created on public.bookings;
create trigger on_booking_created
  after insert or update on public.bookings
  for each row execute procedure public.notify_booking_created();

-- ============ FAVORITOS (fidelización) ============
create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, space_id)
);

alter table public.favorites enable row level security;

drop policy if exists "Users can view own favorites" on public.favorites;
create policy "Users can view own favorites"
  on public.favorites for select
  using (auth.uid() = user_id);

drop policy if exists "Users can add own favorites" on public.favorites;
create policy "Users can add own favorites"
  on public.favorites for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove own favorites" on public.favorites;
create policy "Users can remove own favorites"
  on public.favorites for delete
  using (auth.uid() = user_id);

-- ============ STORAGE (imágenes y videos de los espacios) ============
insert into storage.buckets (id, name, public)
values ('space-media', 'space-media', true)
on conflict (id) do nothing;

drop policy if exists "Public read access on space-media" on storage.objects;
create policy "Public read access on space-media"
  on storage.objects for select
  using (bucket_id = 'space-media');

-- Autoservicio: cada anfitrión sube fotos/videos de sus propios espacios, bajo su
-- propia carpeta (<tipo>/<user_id>/<archivo>). El admin puede gestionar cualquier archivo.
drop policy if exists "Only admin can upload to space-media" on storage.objects;
create policy "Owner or admin can upload to space-media"
  on storage.objects for insert
  with check (
    bucket_id = 'space-media'
    and (public.is_admin() or (storage.foldername(name))[2] = auth.uid()::text)
  );

drop policy if exists "Only admin can update space-media" on storage.objects;
create policy "Owner or admin can update space-media"
  on storage.objects for update
  using (
    bucket_id = 'space-media'
    and (public.is_admin() or (storage.foldername(name))[2] = auth.uid()::text)
  );

drop policy if exists "Only admin can delete space-media" on storage.objects;
create policy "Owner or admin can delete space-media"
  on storage.objects for delete
  using (
    bucket_id = 'space-media'
    and (public.is_admin() or (storage.foldername(name))[2] = auth.uid()::text)
  );

-- ============ SINCRONIZACIÓN DE CALENDARIOS (iCal) ============
-- Calendarios externos (Airbnb, Booking.com, Google Calendar) que el anfitrión
-- importa para bloquear fechas y evitar dobles reservas entre plataformas.
create table if not exists public.external_calendars (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  source_name text not null check (source_name in ('airbnb', 'booking', 'google', 'other')),
  ical_url text not null,
  last_synced_at timestamptz,
  last_sync_error text,
  created_at timestamptz not null default now()
);

-- Rangos de fechas bloqueados, generados al sincronizar los calendarios externos.
-- end_date es exclusivo (misma convención que DTEND en iCal).
create table if not exists public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  external_calendar_id uuid references public.external_calendars(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists blocked_dates_space_id_idx on public.blocked_dates(space_id);

alter table public.external_calendars enable row level security;
alter table public.blocked_dates enable row level security;

drop policy if exists "Space owner can manage own external calendars" on public.external_calendars;
create policy "Space owner can manage own external calendars"
  on public.external_calendars for all
  using (exists (select 1 from public.spaces s where s.id = external_calendars.space_id and s.host_id = auth.uid()))
  with check (exists (select 1 from public.spaces s where s.id = external_calendars.space_id and s.host_id = auth.uid()));

drop policy if exists "Anyone can view blocked dates" on public.blocked_dates;
create policy "Anyone can view blocked dates"
  on public.blocked_dates for select
  using (true);

drop policy if exists "Space owner can manage own blocked dates" on public.blocked_dates;
create policy "Space owner can manage own blocked dates"
  on public.blocked_dates for all
  using (exists (select 1 from public.spaces s where s.id = blocked_dates.space_id and s.host_id = auth.uid()))
  with check (exists (select 1 from public.spaces s where s.id = blocked_dates.space_id and s.host_id = auth.uid()));
