'use client'

import { useState, useEffect } from 'react'
import { HelpCircle, X, ChevronRight } from 'lucide-react'

interface Props {
  id: string
  title: string
  children: React.ReactNode
  steps?: string[]
}

export default function HelpTip({ id, title, children, steps }: Props) {
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    const key = `help_dismissed_${id}`
    const wasDismissed = localStorage.getItem(key) === 'true'
    setDismissed(wasDismissed)
    if (!wasDismissed) setShow(true)
  }, [id])

  function dismiss() {
    localStorage.setItem(`help_dismissed_${id}`, 'true')
    setDismissed(true)
    setShow(false)
  }

  function toggle() {
    setShow(!show)
  }

  return (
    <div className="mb-4">
      {!show && (
        <button onClick={toggle} className="flex items-center gap-1.5 text-xs text-teal-500 hover:text-teal-700 transition-colors">
          <HelpCircle size={14} /> <span>Nápoveda: {title}</span>
        </button>
      )}

      {show && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 animate-fade-in">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-teal-100 rounded-lg shrink-0 mt-0.5">
                <HelpCircle size={16} className="text-teal-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-teal-900 mb-1">{title}</h4>
                <div className="text-sm text-teal-700 leading-relaxed">{children}</div>
                {steps && steps.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-teal-600">
                        <span className="w-5 h-5 rounded-full bg-teal-200 text-teal-800 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button onClick={dismiss} className="text-teal-400 hover:text-teal-600 shrink-0" title="Skryť nápovedu">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
