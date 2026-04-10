'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let toastCounter = 0

const typeConfig: Record<ToastType, { icon: typeof CheckCircle; borderColor: string; iconColor: string; bgColor: string }> = {
  success: { icon: CheckCircle, borderColor: 'border-l-green-500', iconColor: 'text-green-500', bgColor: 'bg-green-50' },
  error: { icon: XCircle, borderColor: 'border-l-red-500', iconColor: 'text-red-500', bgColor: 'bg-red-50' },
  warning: { icon: AlertTriangle, borderColor: 'border-l-yellow-500', iconColor: 'text-yellow-500', bgColor: 'bg-yellow-50' },
  info: { icon: Info, borderColor: 'border-l-blue-500', iconColor: 'text-blue-500', bgColor: 'bg-blue-50' },
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false)
  const [removing, setRemoving] = useState(false)
  const config = typeConfig[toast.type]
  const Icon = config.icon

  useEffect(() => {
    // Trigger slide-in on mount
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setRemoving(true)
      setTimeout(() => onRemove(toast.id), 300)
    }, 5000)
    return () => clearTimeout(timer)
  }, [toast.id, onRemove])

  function handleClose() {
    setRemoving(true)
    setTimeout(() => onRemove(toast.id), 300)
  }

  return (
    <div
      className={`flex items-start gap-3 max-w-[400px] w-full p-4 rounded-lg shadow-lg border-l-4 ${config.borderColor} ${config.bgColor} transition-all duration-300 ease-out ${
        visible && !removing ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <Icon size={20} className={`${config.iconColor} shrink-0 mt-0.5`} />
      <p className="flex-1 text-sm text-gray-700">{toast.message}</p>
      <button onClick={handleClose} className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
        <X size={16} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `toast-${++toastCounter}`
    setToasts((prev) => [...prev, { id, type, message }])
  }, [])

  const value: ToastContextValue = {
    success: useCallback((msg: string) => addToast('success', msg), [addToast]),
    error: useCallback((msg: string) => addToast('error', msg), [addToast]),
    warning: useCallback((msg: string) => addToast('warning', msg), [addToast]),
    info: useCallback((msg: string) => addToast('info', msg), [addToast]),
  }

  return (
    <ToastContext value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
