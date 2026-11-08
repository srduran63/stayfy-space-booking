import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-bold text-ink">{title}</h2>
      <div className="space-y-2 text-xs leading-relaxed text-ink-muted">{children}</div>
    </div>
  )
}

export function Terms() {
  return (
    <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-start p-4 pb-20 sm:p-6">
      <div className="w-full space-y-6 animate-fadeIn">
        <div className="w-full border-b border-line/10 pb-4">
          <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">Términos y Condiciones</h1>
          <p className="mt-1 text-xs text-accent">
            Última actualización: 7 de septiembre de 2026 · Aplica también como Política de Cancelación y Depósito por
            Daños
          </p>
        </div>

        <div className="glass-modal w-full space-y-6 rounded-3xl p-5 sm:p-6">
          <Section title="1. Qué es Stayfy">
            <p>
              Stayfy es una plataforma de intermediación que conecta a personas que buscan reservar un espacio
              (estudios, terrazas, cabañas, oficinas, salas y espacios similares) con los anfitriones que los ofrecen.
              Stayfy no es propietario, operador ni administrador de los espacios publicados: cada espacio es
              responsabilidad de su respectivo anfitrión.
            </p>
          </Section>

          <Section title="2. Cuentas de usuario">
            <p>
              Para reservar necesitas crear una cuenta con información veraz. Eres responsable de mantener la
              confidencialidad de tu contraseña y de toda actividad realizada desde tu cuenta. Stayfy puede suspender o
              cancelar cuentas que incumplan estos términos.
            </p>
          </Section>

          <Section title="3. Reservas">
            <p>
              Al confirmar una reserva en Stayfy, aceptas los datos de fecha, horario (o check-in/check-out) y precio
              mostrados en el momento de la confirmación. La disponibilidad se bloquea automáticamente para evitar
              reservas duplicadas sobre el mismo espacio y horario.
            </p>
          </Section>

          <Section title="4. Pagos">
            <p>
              Actualmente, Stayfy <strong>no procesa pagos</strong> dentro de la plataforma. El pago del espacio
              reservado se coordina y se realiza <strong>directamente entre el huésped y el anfitrión</strong>, ya sea
              en efectivo al momento de la llegada o por transferencia previamente acordada entre ambas partes.
            </p>
            <p>
              Stayfy no garantiza, retiene ni intermedia el dinero de estas transacciones, y no es responsable por
              disputas relacionadas con el pago entre huésped y anfitrión. Recomendamos a ambas partes acordar por
              escrito (mensaje, correo o WhatsApp) el monto y la forma de pago antes de la llegada.
            </p>
          </Section>

          <Section title="5. Política de cancelación">
            <p>
              Puedes cancelar una reserva próxima en cualquier momento desde la sección "Mis Reservas" de tu cuenta.
              Si la reserva ya fue pagada con tarjeta a través de la plataforma, aplica lo siguiente:
            </p>
            <ul className="list-disc space-y-1 pl-4">
              <li>
                Stayfy reembolsa automáticamente el 95% del total pagado a tu tarjeta, sin importar con cuánta
                anticipación canceles.
              </li>
              <li>
                El 5% restante queda como cargo de cancelación de Stayfy, que cubre el procesamiento del pago y el
                reembolso.
              </li>
              <li>
                Si el pago se coordinó directamente con el anfitrión (efectivo o transferencia, fuera de la
                plataforma), cualquier devolución se acuerda directamente entre huésped y anfitrión.
              </li>
            </ul>
          </Section>

          <Section title="6. Depósito por daños y responsabilidad del huésped">
            <p>
              El huésped es responsable de cualquier daño causado al espacio, mobiliario o equipo durante su estancia,
              más allá del desgaste normal por uso. El anfitrión puede solicitar un depósito de garantía antes del
              check-in y descontar de este el costo de reparación de daños comprobables, devolviendo el resto. Estos
              acuerdos de depósito se coordinan directamente entre huésped y anfitrión, fuera de la plataforma.
            </p>
          </Section>

          <Section title="7. Uso aceptable">
            <p>
              No está permitido usar Stayfy para actividades ilegales, fraudulentas, o que pongan en riesgo la
              seguridad de otros usuarios o de las propiedades publicadas. El incumplimiento puede resultar en la
              cancelación inmediata de la cuenta y de cualquier reserva asociada.
            </p>
          </Section>

          <Section title="8. Limitación de responsabilidad">
            <p>
              Stayfy actúa únicamente como intermediario tecnológico. En la máxima medida permitida por la ley, Stayfy
              no será responsable por daños, lesiones, pérdidas económicas, disputas de pago, o el estado, seguridad o
              legalidad de los espacios publicados por los anfitriones. La relación contractual sobre el uso del
              espacio y el pago se establece directamente entre huésped y anfitrión.
            </p>
          </Section>

          <Section title="9. Resolución de disputas">
            <p>
              Ante cualquier inconveniente con una reserva, huésped y anfitrión deben intentar resolverlo directamente
              entre sí en primer lugar. Stayfy conserva un registro de cada reserva (fechas, horarios, monto acordado y
              partes involucradas) que puede usarse como referencia en caso de disputa, pero no actúa como mediador
              ni garante de ninguna de las partes.
            </p>
          </Section>

          <Section title="10. Cambios a estos términos">
            <p>
              Stayfy puede actualizar estos términos en cualquier momento. El uso continuado de la plataforma después
              de un cambio implica la aceptación de los nuevos términos.
            </p>
          </Section>

          <Section title="11. Ley aplicable">
            <p>
              Estos términos se rigen por las leyes del Estado de Florida, Estados Unidos, sin perjuicio de las
              disposiciones sobre conflicto de leyes.
            </p>
          </Section>

          <Section title="12. Contacto">
            <p>
              Para preguntas sobre estos términos, contáctanos a{' '}
              <a href="mailto:contact@example.com" className="text-accent hover:underline">
                contact@example.com
              </a>
              .
            </p>
          </Section>
        </div>

        <Link to="/" className="text-xs font-semibold text-accent hover:text-indigo-200">
          ← Volver al inicio
        </Link>
      </div>
    </main>
  )
}
