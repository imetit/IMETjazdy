'use client'

import { X } from 'lucide-react'

export default function Modal({ title, onClose, children, maxWidth = 'max-w-lg' }: {
  title: string; onClose: () => void; children: React.ReactNode; maxWidth?: string
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className={`bg-white rounded-card shadow-xl w-full ${maxWidth} mx-4 p-6 max-h-[90vh] overflow-auto`}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
