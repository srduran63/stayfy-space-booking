import { AlertCircle, Check, Copy, LoaderCircle, RefreshCw, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../context/ToastContext'
import { addExternalCalendar, getExportFeedUrl, listExternalCalendars, removeExternalCalendar, syncCalendars } from '../lib/ical'
import type { CalendarSource, ExternalCalendar, Space } from '../types'

interface CalendarSyncModalProps {
  space: Space | null
  onClose: () => void
}

const SOURCE_OPTIONS: CalendarSource[] = ['airbnb', 'booking', 'google', 'other']

export function CalendarSyncModal({ space, onClose }: CalendarSyncModalProps) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [visible, setVisible] = useState(false)
  const [calendars, setCalendars] = useState<ExternalCalendar[]>([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<CalendarSource>('airbnb')
  const [url, setUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [copied, setCopied] = useState(false)

  const loadCalendars = useCallback(async () => {
    if (!space) return
    setLoading(true)
    setCalendars(await listExternalCalendars(space.id))
    setLoading(false)
  }, [space])

  useEffect(() => {
    if (space) {
      loadCalendars()
      setUrl('')
      setSource('airbnb')
      const t = setTimeout(() => setVisible(true), 10)
      return () => clearTimeout(t)
    }
    setVisible(false)
  }, [space, loadCalendars])

  if (!space) return null

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!space || !url.trim()) return
    setAdding(true)
    const { error } = await addExternalCalendar(space.id, source, url.trim())
    setAdding(false)
    if (error) {
      showToast(error)
      return
    }
    setUrl('')
    loadCalendars()
  }

  async function handleRemove(id: string) {
    const { error } = await removeExternalCalendar(id)
    if (error) {
      showToast(error)
      return
    }
    loadCalendars()
  }

  async function handleSync() {
    if (!space) return
    setSyncing(true)
    const { error } = await syncCalendars(space.id)
    setSyncing(false)
    if (error) {
      showToast(error)
      return
    }
    showToast(t('calendarSync.syncSuccess'))
    loadCalendars()
  }

  function handleCopy() {
    if (!space) return
    navigator.clipboard.writeText(getExportFeedUrl(space.id))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md transition-all duration-300">
      <div
        className={`glass-modal relative max-h-[85vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-3xl p-6 shadow-2xl transition-all duration-300 ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-ink-muted transition hover:text-ink"
          aria-label={t('common.close')}
        >
          <X size={16} />
        </button>

        <div className="space-y-1">
          <h3 className="text-lg font-bold text-ink">{t('calendarSync.title')}</h3>
          <p className="text-xs text-ink-muted">{t('calendarSync.subtitle', { title: space.title })}</p>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-medium text-ink-muted">{t('calendarSync.exportLabel')}</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={getExportFeedUrl(space.id)}
              className="w-full truncate rounded-2xl border border-line/10 bg-well/40 px-3.5 py-2.5 text-[11px] text-ink-muted"
            />
            <button
              onClick={handleCopy}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line/10 bg-well/40 text-ink transition hover:bg-well/60"
              aria-label={t('calendarSync.copyUrl')}
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>
          <p className="text-[11px] text-ink-faint">{t('calendarSync.exportHint')}</p>
        </div>

        <div className="h-px bg-line/10" />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-ink-muted">{t('calendarSync.importLabel')}</p>
            <button
              onClick={handleSync}
              disabled={syncing || calendars.length === 0}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-3 py-1.5 text-[11px] font-semibold text-indigo-200 transition hover:bg-indigo-500/20 disabled:opacity-40"
            >
              {syncing ? <LoaderCircle size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              {t('calendarSync.syncNow')}
            </button>
          </div>

          {loading ? (
            <p className="py-3 text-center text-xs text-ink-faint">{t('common.loading')}</p>
          ) : calendars.length === 0 ? (
            <p className="rounded-2xl border border-line/10 bg-well/20 px-3.5 py-3 text-xs text-ink-faint">
              {t('calendarSync.noCalendars')}
            </p>
          ) : (
            <div className="space-y-2">
              {calendars.map((cal) => (
                <div key={cal.id} className="glass-card space-y-1 rounded-2xl p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-ink">{t(`calendarSync.source.${cal.source_name}`)}</p>
                      <p className="truncate text-[10px] text-ink-faint">{cal.ical_url}</p>
                    </div>
                    <button
                      onClick={() => handleRemove(cal.id)}
                      className="shrink-0 rounded-lg p-1.5 text-ink-faint transition hover:bg-red-500/10 hover:text-red-400"
                      aria-label={t('calendarSync.remove')}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {cal.last_sync_error ? (
                    <div className="flex items-center gap-1 text-[10px] text-red-400">
                      <AlertCircle size={11} />
                      <span className="truncate">{cal.last_sync_error}</span>
                    </div>
                  ) : cal.last_synced_at ? (
                    <p className="text-[10px] text-emerald-400">
                      {t('calendarSync.lastSynced', { date: new Date(cal.last_synced_at).toLocaleString() })}
                    </p>
                  ) : (
                    <p className="text-[10px] text-ink-faint">{t('calendarSync.neverSynced')}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleAdd} className="space-y-2">
          <p className="text-[11px] font-medium text-ink-muted">{t('calendarSync.addLabel')}</p>
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as CalendarSource)}
              className="rounded-2xl border border-line/10 bg-well/40 px-3 py-2.5 text-xs text-ink focus:border-indigo-500 focus:outline-none"
            >
              {SOURCE_OPTIONS.map((s) => (
                <option key={s} value={s} className="bg-staydark">
                  {t(`calendarSync.source.${s}`)}
                </option>
              ))}
            </select>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t('calendarSync.urlPlaceholder')}
              className="w-full rounded-2xl border border-line/10 bg-well/40 px-3.5 py-2.5 text-xs text-ink transition focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="glass-drop flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-bold text-ink disabled:opacity-60"
          >
            {adding && <LoaderCircle size={12} className="animate-spin" />}
            {t('calendarSync.addButton')}
          </button>
        </form>
      </div>
    </div>
  )
}
