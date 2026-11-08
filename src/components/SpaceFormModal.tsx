import { Check, ChevronLeft, ChevronRight, LoaderCircle, Star, Upload, Video, X } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { getAmenityOptions } from '../lib/amenities'
import { deleteSpaceMedia, uploadSpaceMedia } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabaseClient'
import type { AmenityKey, Space, SpaceCategory } from '../types'

interface SpaceFormModalProps {
  open: boolean
  space: Space | null
  onClose: () => void
  onSaved: () => void
  allowOwnerAssignment?: boolean
}

const CATEGORY_VALUES: SpaceCategory[] = ['hotel', 'estudio', 'oficina', 'reunion', 'coworking', 'evento']
const STEP_COUNT = 4

const emptyForm = {
  title: '',
  description: '',
  category: 'hotel' as SpaceCategory,
  capacity: '',
  city: '',
  address: '',
  price_per_hour: '',
  price_per_night: '',
}

export function SpaceFormModal({ open, space, onClose, onSaved, allowOwnerAssignment = false }: SpaceFormModalProps) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(emptyForm)
  const [images, setImages] = useState<string[]>([])
  const [videos, setVideos] = useState<string[]>([])
  const [amenities, setAmenities] = useState<AmenityKey[]>([])
  const [ownerEmail, setOwnerEmail] = useState('')
  const [uploadingImages, setUploadingImages] = useState(false)
  const [uploadingVideos, setUploadingVideos] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const isEditing = Boolean(space)
  const stepTitles = [t('spaceForm.step1Title'), t('spaceForm.step2Title'), t('spaceForm.step3Title'), t('spaceForm.step4Title')]

  useEffect(() => {
    if (open) {
      setForm(
        space
          ? {
              title: space.title,
              description: space.description ?? '',
              category: space.category,
              capacity: space.capacity != null ? String(space.capacity) : '',
              city: space.city,
              address: space.address ?? '',
              price_per_hour: String(space.price_per_hour),
              price_per_night: space.price_per_night != null ? String(space.price_per_night) : '',
            }
          : emptyForm,
      )
      setImages(space?.images ?? [])
      setVideos(space?.videos ?? [])
      setAmenities(space?.amenities ?? [])
      setOwnerEmail('')
      setStep(0)
      const t = setTimeout(() => setVisible(true), 10)
      return () => clearTimeout(t)
    }
    setVisible(false)
  }, [open, space])

  if (!open) return null

  function update<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleAmenity(key: AmenityKey) {
    setAmenities((prev) => (prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]))
  }

  async function handleImageSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0 || !user) return
    setUploadingImages(true)
    try {
      const urls = await Promise.all(files.map((f) => uploadSpaceMedia(f, 'images', user.id)))
      setImages((prev) => [...prev, ...urls])
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('spaceForm.imageUploadFailed'))
    } finally {
      setUploadingImages(false)
    }
  }

  async function handleVideoSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0 || !user) return
    setUploadingVideos(true)
    try {
      const urls = await Promise.all(files.map((f) => uploadSpaceMedia(f, 'videos', user.id)))
      setVideos((prev) => [...prev, ...urls])
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('spaceForm.videoUploadFailed'))
    } finally {
      setUploadingVideos(false)
    }
  }

  async function removeImage(url: string) {
    setImages((prev) => prev.filter((i) => i !== url))
    deleteSpaceMedia(url).catch(() => {})
  }

  async function removeVideo(url: string) {
    setVideos((prev) => prev.filter((v) => v !== url))
    deleteSpaceMedia(url).catch(() => {})
  }

  function setCover(index: number) {
    if (index === 0) return
    setImages((prev) => {
      const next = [...prev]
      const [item] = next.splice(index, 1)
      next.unshift(item)
      return next
    })
  }

  function moveImage(index: number, direction: -1 | 1) {
    setImages((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function stepIsValid(target: number): boolean {
    if (target === 0) return form.title.trim().length > 0
    if (target === 1) return form.city.trim().length > 0 && form.price_per_hour.trim().length > 0
    return true
  }

  function goToStep(target: number) {
    if (target > step) {
      for (let i = step; i < target; i++) {
        if (!stepIsValid(i)) {
          showToast(t('spaceForm.fillRequiredFields'))
          setStep(i)
          return
        }
      }
    }
    setStep(target)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return

    for (let i = 0; i < STEP_COUNT - 1; i++) {
      if (!stepIsValid(i)) {
        showToast(t('spaceForm.fillRequiredFields'))
        setStep(i)
        return
      }
    }
    if (images.length === 0) {
      showToast(t('spaceForm.needOneImage'))
      return
    }

    let assignedHostId: string | undefined
    if (allowOwnerAssignment && ownerEmail.trim()) {
      const { data: ownerProfile, error: lookupError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', ownerEmail.trim().toLowerCase())
        .maybeSingle()
      if (lookupError || !ownerProfile) {
        showToast(t('spaceForm.ownerNotFound'))
        return
      }
      assignedHostId = ownerProfile.id
    }

    setSubmitting(true)

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      capacity: form.capacity.trim() ? Number(form.capacity) : null,
      city: form.city.trim(),
      address: form.address.trim() || null,
      price_per_hour: Number(form.price_per_hour),
      price_per_night: form.price_per_night.trim() ? Number(form.price_per_night) : null,
      images,
      videos,
      amenities,
      ...(assignedHostId ? { host_id: assignedHostId } : {}),
    }

    const { error } = isEditing
      ? await supabase.from('spaces').update(payload).eq('id', space!.id)
      : await supabase.from('spaces').insert({ ...payload, host_id: assignedHostId ?? user.id })

    setSubmitting(false)

    if (error) {
      showToast(error.message)
      return
    }

    showToast(isEditing ? t('spaceForm.updated') : t('spaceForm.created'))
    onSaved()
    onClose()
  }

  const isLastStep = step === STEP_COUNT - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md transition-all duration-300">
      <div
        className={`glass-modal relative w-full max-w-2xl space-y-5 overflow-y-auto rounded-3xl p-6 shadow-2xl transition-all duration-300 max-h-[90vh] ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 text-ink-muted transition hover:text-ink"
          aria-label={t('common.close')}
        >
          <X size={16} />
        </button>

        <div className="space-y-1">
          <h3 className="text-lg font-bold text-ink">{isEditing ? t('spaceForm.editTitle') : t('spaceForm.createTitle')}</h3>
          <p className="text-xs text-ink-muted">{isEditing ? t('spaceForm.editSubtitle') : t('spaceForm.createSubtitle')}</p>
        </div>

        {/* Indicador de pasos */}
        <div className="flex items-center">
          {stepTitles.map((label, i) => (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                onClick={() => goToStep(i)}
                className="flex flex-col items-center space-y-1.5"
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition ${
                    i === step
                      ? 'bg-indigo-500 text-ink'
                      : i < step
                        ? 'bg-indigo-500/30 text-indigo-200'
                        : 'bg-well/40 text-ink-faint'
                  }`}
                >
                  {i < step ? <Check size={11} /> : i + 1}
                </span>
                <span className={`hidden text-[9.5px] sm:block ${i === step ? 'text-ink' : 'text-ink-faint'}`}>{label}</span>
              </button>
              {i < stepTitles.length - 1 && (
                <div className={`mx-1.5 h-px flex-1 ${i < step ? 'bg-indigo-500/50' : 'bg-line/10'}`} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Paso 1: Información básica */}
          {step === 0 && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-ink-muted">
                  {t('spaceForm.titleLabel')} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder={t('spaceForm.titlePlaceholder')}
                  className="w-full rounded-2xl border border-line/10 bg-well/40 px-3.5 py-2.5 text-xs text-ink transition focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-ink-muted">{t('spaceForm.descriptionLabel')}</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder={t('spaceForm.descriptionPlaceholder')}
                  className="w-full resize-none rounded-2xl border border-line/10 bg-well/40 px-3.5 py-2.5 text-xs text-ink transition focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-ink-muted">{t('spaceForm.categoryLabel')}</label>
                  <select
                    value={form.category}
                    onChange={(e) => update('category', e.target.value as SpaceCategory)}
                    className="w-full rounded-2xl border border-line/10 bg-well/40 px-3.5 py-2.5 text-xs text-ink focus:border-indigo-500 focus:outline-none"
                  >
                    {CATEGORY_VALUES.map((c) => (
                      <option key={c} value={c} className="bg-staydark">
                        {t(`categories.${c}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-ink-muted">
                    {t('spaceForm.capacityLabel')} <span className="text-ink-faint">{t('spaceForm.capacityHint')}</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="1"
                    value={form.capacity}
                    onChange={(e) => update('capacity', e.target.value)}
                    placeholder={t('spaceForm.capacityPlaceholder')}
                    className="w-full rounded-2xl border border-line/10 bg-well/40 px-3.5 py-2.5 text-xs text-ink transition focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Paso 2: Precio y ubicación */}
          {step === 1 && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-ink-muted">
                    {t('spaceForm.pricePerHourLabel')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.5"
                    value={form.price_per_hour}
                    onChange={(e) => update('price_per_hour', e.target.value)}
                    placeholder="25.00"
                    className="w-full rounded-2xl border border-line/10 bg-well/40 px-3.5 py-2.5 text-xs text-ink transition focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-ink-muted">
                    {t('spaceForm.pricePerNightLabel')} <span className="text-ink-faint">{t('spaceForm.pricePerNightHint')}</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={form.price_per_night}
                    onChange={(e) => update('price_per_night', e.target.value)}
                    placeholder={t('spaceForm.pricePerNightPlaceholder')}
                    className="w-full rounded-2xl border border-line/10 bg-well/40 px-3.5 py-2.5 text-xs text-ink transition focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-ink-muted">
                    {t('spaceForm.cityLabel')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => update('city', e.target.value)}
                    placeholder={t('spaceForm.cityPlaceholder')}
                    className="w-full rounded-2xl border border-line/10 bg-well/40 px-3.5 py-2.5 text-xs text-ink transition focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-ink-muted">{t('spaceForm.addressLabel')}</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => update('address', e.target.value)}
                    placeholder={t('spaceForm.addressPlaceholder')}
                    className="w-full rounded-2xl border border-line/10 bg-well/40 px-3.5 py-2.5 text-xs text-ink transition focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {allowOwnerAssignment && (
                <div className="space-y-1.5 rounded-2xl border border-indigo-400/20 bg-indigo-500/5 p-3">
                  <label className="text-[11px] font-medium text-ink-muted">{t('spaceForm.ownerEmailLabel')}</label>
                  {space?.host && (
                    <p className="text-[11px] text-ink-muted">
                      {t('spaceForm.currentlyAssignedTo')}{' '}
                      <span className="text-ink">{space.host.full_name || space.host.email}</span> ({space.host.email})
                    </p>
                  )}
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder={t('spaceForm.ownerEmailPlaceholder')}
                    className="w-full rounded-2xl border border-line/10 bg-well/40 px-3.5 py-2.5 text-xs text-ink transition focus:border-indigo-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-ink-faint">{t('spaceForm.ownerEmailHint')}</p>
                </div>
              )}
            </div>
          )}

          {/* Paso 3: Amenidades */}
          {step === 2 && (
            <div className="space-y-2 animate-fadeIn">
              <label className="text-[11px] font-medium text-ink-muted">{t('spaceForm.amenitiesLabel')}</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {getAmenityOptions().map(({ key, label, icon: Icon }) => {
                  const active = amenities.includes(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleAmenity(key)}
                      className={`flex items-center space-x-2 rounded-xl border px-3 py-2 text-left text-[11px] font-medium transition ${
                        active
                          ? 'border-indigo-400/60 bg-indigo-500/20 text-ink'
                          : 'border-line/10 bg-well/30 text-ink-muted hover:border-line/25 hover:text-ink'
                      }`}
                    >
                      <Icon size={13} className={active ? 'text-accent' : 'text-ink-faint'} />
                      <span>{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Paso 4: Fotos y video */}
          {step === 3 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-ink-muted">
                  {t('spaceForm.imagesLabel')} <span className="text-ink-faint">{t('spaceForm.imagesHint')}</span>
                </label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {images.map((url, i) => (
                    <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-line/10">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      {i === 0 && (
                        <span className="absolute left-1 top-1 rounded-full bg-indigo-500 px-1.5 py-0.5 text-[8.5px] font-bold text-white">
                          {t('spaceForm.coverBadge')}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(url)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
                      >
                        <X size={11} />
                      </button>
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center space-x-1 bg-black/60 py-1 opacity-0 transition group-hover:opacity-100">
                        {i !== 0 && (
                          <button
                            type="button"
                            title={t('spaceForm.setCover')}
                            onClick={() => setCover(i)}
                            className="flex h-5 w-5 items-center justify-center rounded-full text-amber-300 hover:bg-white/10"
                          >
                            <Star size={11} />
                          </button>
                        )}
                        {i > 0 && (
                          <button
                            type="button"
                            onClick={() => moveImage(i, -1)}
                            className="flex h-5 w-5 items-center justify-center rounded-full text-white hover:bg-white/10"
                          >
                            <ChevronLeft size={11} />
                          </button>
                        )}
                        {i < images.length - 1 && (
                          <button
                            type="button"
                            onClick={() => moveImage(i, 1)}
                            className="flex h-5 w-5 items-center justify-center rounded-full text-white hover:bg-white/10"
                          >
                            <ChevronRight size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImages}
                    className="flex aspect-square flex-col items-center justify-center space-y-1 rounded-xl border border-dashed border-line/20 text-ink-muted transition hover:border-indigo-400/60 hover:text-ink disabled:opacity-60"
                  >
                    {uploadingImages ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}
                    <span className="text-[10px]">{uploadingImages ? t('spaceForm.uploading') : t('spaceForm.add')}</span>
                  </button>
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-medium text-ink-muted">{t('spaceForm.videosLabel')}</label>
                <div className="flex flex-wrap gap-2">
                  {videos.map((url) => (
                    <div
                      key={url}
                      className="flex items-center space-x-2 rounded-xl border border-line/10 bg-well/30 px-3 py-2 text-[11px] text-ink-muted"
                    >
                      <Video size={13} className="text-accent" />
                      <span className="max-w-[140px] truncate">{url.split('/').pop()}</span>
                      <button type="button" onClick={() => removeVideo(url)} className="text-ink-faint hover:text-red-300">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={uploadingVideos}
                    className="flex items-center space-x-2 rounded-xl border border-dashed border-line/20 px-3 py-2 text-[11px] text-ink-muted transition hover:border-indigo-400/60 hover:text-ink disabled:opacity-60"
                  >
                    {uploadingVideos ? <LoaderCircle size={13} className="animate-spin" /> : <Upload size={13} />}
                    <span>{uploadingVideos ? t('spaceForm.uploading') : t('spaceForm.addVideo')}</span>
                  </button>
                </div>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  className="hidden"
                  onChange={handleVideoSelect}
                />
              </div>
            </div>
          )}

          {/* Navegación */}
          <div className="flex items-center gap-2 pt-1">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center justify-center space-x-1.5 rounded-2xl border border-line/10 bg-well/30 px-4 py-3 text-xs font-semibold text-ink transition hover:bg-well/40"
              >
                <ChevronLeft size={13} />
                <span>{t('spaceForm.back')}</span>
              </button>
            )}
            {!isLastStep ? (
              <button
                type="button"
                onClick={() => goToStep(step + 1)}
                className="glass-drop flex flex-1 items-center justify-center space-x-1.5 rounded-2xl py-3 text-xs font-bold text-ink"
              >
                <span>{t('spaceForm.next')}</span>
                <ChevronRight size={13} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting || uploadingImages || uploadingVideos}
                className="glass-drop flex flex-1 items-center justify-center space-x-2 rounded-2xl py-3 text-xs font-bold text-ink disabled:opacity-60"
              >
                {submitting && <LoaderCircle size={13} className="animate-spin" />}
                <span>{submitting ? t('spaceForm.saving') : isEditing ? t('spaceForm.saveChanges') : t('spaceForm.publish')}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
