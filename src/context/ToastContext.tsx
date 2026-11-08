import { Bell } from 'lucide-react'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

interface ToastContextValue {
  showToast: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((msg: string) => {
    setMessage(msg)
    setVisible(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setVisible(false), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className={`glass-modal fixed bottom-6 right-6 z-[100] flex items-center space-x-3 rounded-2xl border border-indigo-500/30 px-4 py-3 text-ink shadow-2xl transition-all duration-300 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-ink shadow-md">
          <Bell size={12} />
        </div>
        <span className="text-xs font-medium">{message}</span>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}
