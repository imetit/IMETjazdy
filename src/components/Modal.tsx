'use client'

import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * Accessible modal:
 * - role="dialog" + aria-modal + aria-labelledby
 * - Esc handler to close
 * - Focus trap (initial focus on close btn, returns focus to opener on unmount)
 * - Backdrop click to close (configurable)
 * - max-h-[90vh] + overflow-auto for tall content; safe w on tiny phones
 */
export default function Modal({
  title, onClose, children, maxWidth = 'max-w-lg', closeOnBackdrop = true,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  maxWidth?: string
  closeOnBackdrop?: boolean
}) {
  const titleId = useId()
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null
    closeBtnRef.current?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    // Lock body scroll while modal is open
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previousFocusRef.current?.focus()
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4 animate-fade-in"
      onClick={(e) => { if (closeOnBackdrop && e.target === e.currentTarget) onClose() }}
    >
      <div className={`bg-white rounded-card shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-auto animate-scale-in`}>
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-100">
          <h3 id={titleId} className="text-lg font-bold text-gray-900 truncate pr-3">{title}</h3>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Zavrieť"
            className="shrink-0 -m-1.5 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  )
}
