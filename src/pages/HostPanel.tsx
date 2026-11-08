import { CalendarClock, MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { SpaceBookingsModal } from '../components/SpaceBookingsModal'
import { SpaceFormModal } from '../components/SpaceFormModal'
import { useToast } from '../context/ToastContext'
import { deleteSpaceMedia } from '../lib/storage'
import { supabase } from '../lib/supabaseClient'
import { categoryLabel, formatPrice } from '../lib/utils'
import type { Space } from '../types'

export function HostPanel() {
  const { showToast } = useToast()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingSpace, setEditingSpace] = useState<Space | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [bookingsSpace, setBookingsSpace] = useState<Space | null>(null)

  const loadMySpaces = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('spaces')
      .select('*, host:profiles!spaces_host_id_fkey(*)')
      .order('created_at', { ascending: false })
    setSpaces((data as Space[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadMySpaces()
  }, [loadMySpaces])

  function openCreate() {
    setEditingSpace(null)
    setFormOpen(true)
  }

  function openEdit(space: Space) {
    setEditingSpace(space)
    setFormOpen(true)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const target = spaces.find((s) => s.id === id)
    const { error } = await supabase.from('spaces').delete().eq('id', id)
    setDeletingId(null)
    if (target) {
      Promise.all([...target.images, ...target.videos].map((url) => deleteSpaceMedia(url))).catch(() => {})
    }
    if (error) {
      showToast(error.message)
      return
    }
    showToast('Espacio eliminado.')
    loadMySpaces()
  }

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-start p-4 pb-20 sm:p-6">
      <div className="w-full space-y-6 animate-fadeIn">
        <div className="flex w-full flex-col items-start justify-between gap-4 border-b border-line/10 pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-extrabold text-ink sm:text-3xl">Panel de Anfitrión</h2>
            <p className="mt-1 text-xs text-accent">
              Publica espacios y asígnalos a sus dueños. Ves todos los espacios de la plataforma.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="glass-drop flex items-center space-x-2 rounded-2xl px-4 py-2.5 text-xs font-semibold text-ink"
          >
            <Plus size={13} />
            <span>Publicar espacio</span>
          </button>
        </div>

        {loading ? (
          <LoadingSpinner label="Cargando tus espacios..." />
        ) : spaces.length === 0 ? (
          <div className="glass-modal w-full rounded-3xl p-8 text-center">
            <p className="text-sm font-semibold text-ink">Todavía no has publicado ningún espacio</p>
            <p className="mt-1 text-xs text-ink-muted">
              Publica tu primer espacio para que otros usuarios puedan encontrarlo y reservarlo al instante.
            </p>
            <button
              onClick={openCreate}
              className="glass-drop mx-auto mt-4 flex items-center space-x-2 rounded-2xl px-4 py-2.5 text-xs font-semibold text-ink"
            >
              <Plus size={13} />
              <span>Publicar mi primer espacio</span>
            </button>
          </div>
        ) : (
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {spaces.map((space) => (
              <div key={space.id} className="glass-card flex flex-col overflow-hidden rounded-3xl">
                <div className="relative h-32 w-full overflow-hidden bg-well/30">
                  {space.images[0] ? (
                    <img src={space.images[0]} alt={space.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-ink-faint">
                      Sin imagen
                    </div>
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                    {categoryLabel(space.category)}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="text-sm font-bold text-ink line-clamp-1">{space.title}</h3>
                  <div className="flex items-center space-x-1.5 text-[11px] text-ink-muted">
                    <MapPin size={11} />
                    <span className="line-clamp-1">{space.city}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center space-x-1 text-[11px] text-amber-400">
                      <Star size={11} className="fill-amber-400" />
                      <span>{space.rating.toFixed(1)}</span>
                    </div>
                    <div className="text-xs font-bold text-ink">
                      {formatPrice(space.price_per_hour)}
                      <span className="font-normal text-ink-muted"> /h</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-ink-faint">
                    Dueño: <span className="text-ink-muted">{space.host?.full_name || space.host?.email || 'Sin asignar'}</span>
                  </p>
                  <div className="mt-auto flex flex-col gap-2 pt-3">
                    <button
                      onClick={() => setBookingsSpace(space)}
                      className="flex items-center justify-center space-x-1.5 rounded-xl border border-indigo-400/30 bg-indigo-500/10 py-2 text-[11px] font-semibold text-indigo-200 transition hover:bg-indigo-500/20"
                    >
                      <CalendarClock size={11} />
                      <span>Ver reservas</span>
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(space)}
                        className="flex flex-1 items-center justify-center space-x-1.5 rounded-xl border border-line/10 bg-line/5 py-2 text-[11px] font-semibold text-ink transition hover:bg-line/10"
                      >
                        <Pencil size={11} />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDelete(space.id)}
                        disabled={deletingId === space.id}
                        className="flex flex-1 items-center justify-center space-x-1.5 rounded-xl border border-red-500/20 bg-red-500/10 py-2 text-[11px] font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-60"
                      >
                        <Trash2 size={11} />
                        <span>{deletingId === space.id ? 'Eliminando...' : 'Eliminar'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SpaceFormModal
        open={formOpen}
        space={editingSpace}
        onClose={() => setFormOpen(false)}
        onSaved={loadMySpaces}
        allowOwnerAssignment
      />
      <SpaceBookingsModal space={bookingsSpace} onClose={() => setBookingsSpace(null)} />
    </main>
  )
}
