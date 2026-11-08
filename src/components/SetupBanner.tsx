export function SetupBanner() {
  return (
    <div className="relative z-10 mx-auto mt-6 w-full max-w-2xl px-4">
      <div className="glass-modal rounded-2xl border border-amber-400/30 p-4 text-xs text-amber-200">
        <p className="font-semibold">Supabase no está configurado.</p>
        <p className="mt-1 text-amber-200/80">
          Copia <code className="rounded bg-well/40 px-1">.env.example</code> como <code className="rounded bg-well/40 px-1">.env</code>,
          agrega tu URL y anon key de Supabase, y ejecuta el script <code className="rounded bg-well/40 px-1">supabase/schema.sql</code> en
          tu proyecto. Revisa el README para el paso a paso.
        </p>
      </div>
    </div>
  )
}
