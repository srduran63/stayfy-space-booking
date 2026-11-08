import { ArrowLeft, MessageCircleQuestion, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { playPop } from '../lib/sound'
import { StayBotIcon } from './StayBotIcon'

const FAQ_IDS = [1, 2, 3, 4, 5, 6, 7, 8]

export function StayBot() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState<number | null>(null)

  function close() {
    setOpen(false)
    setActiveId(null)
  }

  return (
    <>
      {open && (
        <div className="glass-modal fixed bottom-24 right-4 z-50 flex max-h-[70vh] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-3xl shadow-2xl sm:right-6 sm:bottom-28">
          <div className="flex items-center justify-between border-b border-line/10 px-4 py-3.5">
            <div className="flex items-center space-x-2.5">
              <StayBotIcon className="h-7 w-7" />
              <div>
                <p className="text-sm font-bold text-ink">StayBot</p>
                <p className="text-[10px] text-ink-muted">{t('staybot.subtitle')}</p>
              </div>
            </div>
            <button
              onClick={close}
              className="text-ink-muted transition hover:text-ink"
              aria-label={t('common.close')}
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            <div className="flex items-start space-x-2">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center">
                <StayBotIcon className="h-6 w-6" />
              </div>
              <div className="glass-card max-w-[85%] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-ink">
                {t('staybot.greeting')}
              </div>
            </div>

            {activeId && (
              <>
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-indigo-500/25 px-3.5 py-2.5 text-xs text-ink">
                    {t(`staybot.faq${activeId}Q`)}
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center">
                    <StayBotIcon className="h-6 w-6" />
                  </div>
                  <div className="glass-card max-w-[85%] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs leading-relaxed text-ink">
                    {t(`staybot.faq${activeId}A`)}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="border-t border-line/10 p-3">
            {activeId && (
              <button
                onClick={() => setActiveId(null)}
                className="mb-2 flex items-center space-x-1.5 text-[11px] font-semibold text-accent transition hover:text-indigo-200"
              >
                <ArrowLeft size={12} />
                <span>{t('staybot.backToQuestions')}</span>
              </button>
            )}
            <div className="flex max-h-32 flex-col gap-1.5 overflow-y-auto">
              {FAQ_IDS.filter((id) => id !== activeId).map((id) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveId(id)
                    playPop()
                  }}
                  className="rounded-xl border border-line/10 bg-well/30 px-3 py-2 text-left text-[11px] text-ink-muted transition hover:border-indigo-400/40 hover:text-ink"
                >
                  {t(`staybot.faq${id}Q`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="glass-drop !fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full sm:right-6 sm:bottom-6"
        aria-label="StayBot"
      >
        {open ? <MessageCircleQuestion size={22} className="text-indigo-200" /> : <StayBotIcon className="h-8 w-8" />}
      </button>
    </>
  )
}
