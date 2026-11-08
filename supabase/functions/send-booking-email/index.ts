import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const WEBHOOK_SECRET = Deno.env.get('BOOKING_WEBHOOK_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = Deno.env.get('APP_URL') ?? 'https://stayfyapp.com'

// Marca de Stayfy alojada como archivo real (public/logo-email.png en el sitio) — Gmail
// bloquea imágenes data:base64 dentro de <img>, así que necesita ser una URL https normal.
const LOGO_URL = `${APP_URL}/logo-email.png`

function formatDate(iso: string, withTime: boolean) {
  const d = new Date(iso)
  return d.toLocaleString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

function formatMoney(n: number) {
  return `$${n.toFixed(2)}`
}

function firstName(fullName: string | null | undefined) {
  return (fullName ?? '').trim().split(/\s+/)[0] || 'viajero'
}

function buildEmailHtml(params: {
  guestName: string
  spaceTitle: string
  spaceCity: string
  isNightly: boolean
  checkInLabel: string
  checkOutLabel: string
  guests: number
  subtotal: number | null
  serviceFee: number
  total: number | null
  bookingCode: string | null
}) {
  const { guestName, spaceTitle, spaceCity, isNightly, checkInLabel, checkOutLabel, guests, subtotal, serviceFee, total, bookingCode } =
    params

  const priceRows =
    total != null
      ? `
        ${
          subtotal != null && serviceFee > 0
            ? `
                      <tr>
                        <td style="padding:8px 0;font-size:13.5px;color:#94a3b8;">Subtotal</td>
                        <td style="padding:8px 0;font-size:13.5px;color:#94a3b8;text-align:right;">${formatMoney(subtotal)}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:13.5px;color:#94a3b8;">Cargo de servicio</td>
                        <td style="padding:8px 0;font-size:13.5px;color:#94a3b8;text-align:right;">${formatMoney(serviceFee)}</td>
                      </tr>`
            : ''
        }
                      <tr>
                        <td style="padding:14px 0 0;font-size:14.5px;color:#ffffff;font-weight:700;border-top:1px solid rgba(255,255,255,0.1);">Total pagado</td>
                        <td style="padding:14px 0 0;font-size:19px;color:#818cf8;font-weight:800;text-align:right;border-top:1px solid rgba(255,255,255,0.1);">${formatMoney(total)}</td>
                      </tr>`
      : ''

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reserva confirmada - Stayfy</title>
</head>
<body style="margin:0;padding:0;background-color:#070913;font-family:Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#070913;padding:32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container matching the exact brand styling -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background-color:#0c0a1d;background:radial-gradient(circle at 50% 30%, #1e1b4b 0%, #0c0a1d 70%, #070913 100%);border-radius:24px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);box-shadow:0 12px 40px rgba(0,0,0,0.5);">

          <!-- Header / Brand Logo matching the card front -->
          <tr>
            <td style="padding:40px 30px 28px;text-align:center;">
              <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td align="center" style="vertical-align:middle;padding-right:10px;">
                    <img src="${LOGO_URL}" width="30" height="29" alt="" style="display:block;width:30px;height:29px;">
                  </td>
                  <td align="left" style="vertical-align:middle;font-size:32px;font-weight:800;color:#ffffff;letter-spacing:-0.03em;font-family:Helvetica,Arial,sans-serif;line-height:1.2;white-space:nowrap;">Stayfy</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Accent Line / Divider -->
          <tr>
            <td style="padding:0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:1px;background-color:rgba(255,255,255,0.1);line-height:1px;font-size:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;color:#818cf8;text-align:center;">Reserva confirmada</p>
              <h1 style="margin:0 0 16px;font-size:26px;line-height:1.3;color:#ffffff;font-weight:800;text-align:center;">¡Todo listo, ${guestName}!</h1>
              <p style="margin:0 0 28px;font-size:14.5px;line-height:1.6;color:#cbd5e1;text-align:center;">
                Tu reserva en <strong style="color:#ffffff;">${spaceTitle}</strong>${spaceCity ? ` (${spaceCity})` : ''} quedó
                confirmada al instante. Guarda este correo como comprobante — aquí tienes el resumen:
              </p>

              <!-- Summary Card Container -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;font-size:13.5px;color:#94a3b8;">${isNightly ? 'Check-in' : 'Fecha y hora de entrada'}</td>
                        <td style="padding:8px 0;font-size:13.5px;color:#ffffff;font-weight:700;text-align:right;">${checkInLabel}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:13.5px;color:#94a3b8;">${isNightly ? 'Check-out' : 'Fecha y hora de salida'}</td>
                        <td style="padding:8px 0;font-size:13.5px;color:#ffffff;font-weight:700;text-align:right;">${checkOutLabel}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:13.5px;color:#94a3b8;">Huéspedes</td>
                        <td style="padding:8px 0;font-size:13.5px;color:#ffffff;font-weight:700;text-align:right;">${guests}</td>
                      </tr>
                      ${priceRows}
                    </table>
                  </td>
                </tr>
              </table>

              ${
                bookingCode
                  ? `
              <!-- Booking Code -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;background-color:rgba(129,140,248,0.1);border:1px dashed rgba(129,140,248,0.4);border-radius:16px;">
                <tr>
                  <td style="padding:18px 24px;text-align:center;">
                    <p style="margin:0 0 6px;font-size:10.5px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#a5b4fc;">Código de reserva — muéstralo en recepción</p>
                    <p style="margin:0;font-size:24px;font-weight:800;letter-spacing:0.08em;color:#ffffff;font-family:'Courier New',Courier,monospace;">${bookingCode}</p>
                  </td>
                </tr>
              </table>`
                  : ''
              }

              <!-- CTA Button -->
              <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:32px auto 8px;">
                <tr>
                  <td align="center" style="border-radius:12px;background-color:#4338ca;background:linear-gradient(135deg, #6366f1, #4338ca);">
                    <a href="${APP_URL}/mis-reservas" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;letter-spacing:-0.01em;">Ver mi reserva</a>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;font-size:12.5px;line-height:1.6;color:#94a3b8;text-align:center;">
                ¿Necesitas hacer un cambio? Puedes gestionar o cancelar esta reserva en cualquier momento desde
                "Mis reservas" en tu cuenta de Stayfy.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
              <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">
                Stayfy · Reservas al Instante<br>
                Recibiste este correo porque se confirmó una reserva a tu nombre en <span style="color:#818cf8;">stayfyapp.com</span>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildHostEmailHtml(params: {
  hostName: string
  guestName: string
  guestEmail: string
  spaceTitle: string
  spaceCity: string
  isNightly: boolean
  checkInLabel: string
  checkOutLabel: string
  guests: number
  hostPayout: number | null
  bookingCode: string | null
}) {
  const {
    hostName,
    guestName,
    guestEmail,
    spaceTitle,
    spaceCity,
    isNightly,
    checkInLabel,
    checkOutLabel,
    guests,
    hostPayout,
    bookingCode,
  } = params

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nueva reserva - Stayfy</title>
</head>
<body style="margin:0;padding:0;background-color:#070913;font-family:Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#070913;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background-color:#0c0a1d;background:radial-gradient(circle at 50% 30%, #1e1b4b 0%, #0c0a1d 70%, #070913 100%);border-radius:24px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);box-shadow:0 12px 40px rgba(0,0,0,0.5);">

          <!-- Header -->
          <tr>
            <td style="padding:40px 30px 28px;text-align:center;">
              <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td align="center" style="vertical-align:middle;padding-right:10px;">
                    <img src="${LOGO_URL}" width="30" height="29" alt="" style="display:block;width:30px;height:29px;">
                  </td>
                  <td align="left" style="vertical-align:middle;font-size:32px;font-weight:800;color:#ffffff;letter-spacing:-0.03em;font-family:Helvetica,Arial,sans-serif;line-height:1.2;white-space:nowrap;">Stayfy</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Accent Line -->
          <tr>
            <td style="padding:0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:1px;background-color:rgba(255,255,255,0.1);line-height:1px;font-size:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;color:#818cf8;text-align:center;">Nueva reserva</p>
              <h1 style="margin:0 0 16px;font-size:26px;line-height:1.3;color:#ffffff;font-weight:800;text-align:center;">¡Tienes una reserva nueva, ${hostName}!</h1>
              <p style="margin:0 0 28px;font-size:14.5px;line-height:1.6;color:#cbd5e1;text-align:center;">
                <strong style="color:#ffffff;">${guestName}</strong> reservó <strong style="color:#ffffff;">${spaceTitle}</strong>${spaceCity ? ` (${spaceCity})` : ''}.
                Aquí el resumen:
              </p>

              <!-- Summary Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;font-size:13.5px;color:#94a3b8;">Huésped</td>
                        <td style="padding:8px 0;font-size:13.5px;color:#ffffff;font-weight:700;text-align:right;">${guestEmail}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:13.5px;color:#94a3b8;">${isNightly ? 'Check-in' : 'Fecha y hora de entrada'}</td>
                        <td style="padding:8px 0;font-size:13.5px;color:#ffffff;font-weight:700;text-align:right;">${checkInLabel}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:13.5px;color:#94a3b8;">${isNightly ? 'Check-out' : 'Fecha y hora de salida'}</td>
                        <td style="padding:8px 0;font-size:13.5px;color:#ffffff;font-weight:700;text-align:right;">${checkOutLabel}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:13.5px;color:#94a3b8;">Huéspedes</td>
                        <td style="padding:8px 0;font-size:13.5px;color:#ffffff;font-weight:700;text-align:right;">${guests}</td>
                      </tr>
                      ${
                        hostPayout != null
                          ? `
                      <tr>
                        <td style="padding:14px 0 0;font-size:14.5px;color:#ffffff;font-weight:700;border-top:1px solid rgba(255,255,255,0.1);">Recibirás</td>
                        <td style="padding:14px 0 0;font-size:19px;color:#818cf8;font-weight:800;text-align:right;border-top:1px solid rgba(255,255,255,0.1);">${formatMoney(hostPayout)}</td>
                      </tr>`
                          : ''
                      }
                    </table>
                  </td>
                </tr>
              </table>

              ${
                bookingCode
                  ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;background-color:rgba(129,140,248,0.1);border:1px dashed rgba(129,140,248,0.4);border-radius:16px;">
                <tr>
                  <td style="padding:18px 24px;text-align:center;">
                    <p style="margin:0 0 6px;font-size:10.5px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#a5b4fc;">Código de reserva — pídelo al huésped en recepción</p>
                    <p style="margin:0;font-size:24px;font-weight:800;letter-spacing:0.08em;color:#ffffff;font-family:'Courier New',Courier,monospace;">${bookingCode}</p>
                  </td>
                </tr>
              </table>`
                  : ''
              }

              <!-- CTA Button -->
              <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:32px auto 8px;">
                <tr>
                  <td align="center" style="border-radius:12px;background-color:#4338ca;background:linear-gradient(135deg, #6366f1, #4338ca);">
                    <a href="${APP_URL}/panel-dueno" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;letter-spacing:-0.01em;">Ver mis reservas</a>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;font-size:12.5px;line-height:1.6;color:#94a3b8;text-align:center;">
                El pago te llega directo a tu cuenta bancaria — no necesitas hacer nada más para recibirlo.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
              <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">
                Stayfy · Reservas al Instante<br>
                Recibiste este correo porque tienes un espacio publicado en <span style="color:#818cf8;">stayfyapp.com</span>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  let bookingId: string
  try {
    const body = await req.json()
    bookingId = body.booking_id
  } catch {
    return new Response('Invalid payload', { status: 400 })
  }

  if (!bookingId) {
    return new Response('Missing booking_id', { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: booking, error } = await supabase
    .from('bookings')
    .select(
      '*, space:spaces(title, city, host:profiles!spaces_host_id_fkey(full_name, email)), customer:profiles!bookings_user_id_fkey(full_name, email)',
    )
    .eq('id', bookingId)
    .single()

  if (error || !booking) {
    return new Response('Booking not found', { status: 404 })
  }

  const isNightly = booking.booking_type === 'nightly'
  const spaceTitle = booking.space?.title ?? 'tu espacio en Stayfy'
  const spaceCity = booking.space?.city ?? ''
  const checkInLabel = formatDate(booking.check_in, !isNightly)
  const checkOutLabel = formatDate(booking.check_out, !isNightly)

  const subtotal = booking.total_price != null ? Number(booking.total_price) : null
  const serviceFee = booking.platform_fee_amount != null ? Number(booking.platform_fee_amount) : 0
  const total = subtotal != null ? subtotal + serviceFee : null

  const sendResults: Array<{ to: string; ok: boolean; detail?: string }> = []

  const customerEmail = booking.customer?.email
  if (customerEmail) {
    const html = buildEmailHtml({
      guestName: firstName(booking.customer?.full_name),
      spaceTitle,
      spaceCity,
      isNightly,
      checkInLabel,
      checkOutLabel,
      guests: booking.guests ?? 1,
      subtotal,
      serviceFee,
      total,
      bookingCode: booking.booking_code ?? null,
    })
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Stayfy <reservas@stayfyapp.com>',
        to: customerEmail,
        subject: `¡Reserva confirmada en ${spaceTitle}! · Stayfy`,
        html,
      }),
    })
    sendResults.push({ to: customerEmail, ok: resp.ok, detail: resp.ok ? undefined : await resp.text() })
  }

  const hostEmail = booking.space?.host?.email
  if (hostEmail) {
    const html = buildHostEmailHtml({
      hostName: firstName(booking.space?.host?.full_name),
      guestName: booking.customer?.full_name?.trim() || booking.customer?.email || 'Un huésped',
      guestEmail: booking.customer?.email ?? '—',
      spaceTitle,
      spaceCity,
      isNightly,
      checkInLabel,
      checkOutLabel,
      guests: booking.guests ?? 1,
      hostPayout: subtotal,
      bookingCode: booking.booking_code ?? null,
    })
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Stayfy <reservas@stayfyapp.com>',
        to: hostEmail,
        subject: `¡Nueva reserva en ${spaceTitle}! · Stayfy`,
        html,
      }),
    })
    sendResults.push({ to: hostEmail, ok: resp.ok, detail: resp.ok ? undefined : await resp.text() })
  }

  const anyFailed = sendResults.some((r) => !r.ok)
  return new Response(JSON.stringify({ sent: sendResults }), {
    status: anyFailed ? 502 : 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
