'use client'

import { useState, useRef } from 'react'
import { Save, Send, Upload, X, FileIcon } from 'lucide-react'
import { createJazda } from '@/actions/jazdy'
import type { Vozidlo } from '@/lib/types'
import { PALIVO_LABELS } from '@/lib/types'

export default function JazdaForm({ vozidlo, userName, canUpload }: { vozidlo: Vozidlo; userName: string; canUpload?: boolean }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function addFiles(newFiles: FileList | null) {
    if (!newFiles) return
    const arr = Array.from(newFiles).filter(f => f.size <= 5 * 1024 * 1024)
    setFiles(prev => [...prev, ...arr].slice(0, 5))
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(stav: string) {
    if (!formRef.current) return
    setLoading(true)
    setError(null)

    const formData = new FormData(formRef.current)
    formData.set('stav', stav)

    // Remove any existing file entries and add our tracked files
    formData.delete('files')
    for (const file of files) {
      formData.append('files', file)
    }

    const result = await createJazda(formData)
    if (result?.error) { setError(result.error); setLoading(false) }
  }

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()}>
      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200 mb-6">{error}</div>}

      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
        <p className="text-sm font-medium text-teal-900 mb-1">Vaše vozidlo</p>
        <p className="text-sm text-teal-700">
          {vozidlo.znacka} {vozidlo.variant} — <span className="font-mono">{vozidlo.spz}</span> — {PALIVO_LABELS[vozidlo.palivo]} — {vozidlo.spotreba_tp} l/100km
        </p>
      </div>

      <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mesiac</label>
            <input type="month" name="mesiac" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">KM</label>
            <input type="number" name="km" step="0.1" min="0.1" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
        </div>
      </div>

      {canUpload && (<div className="bg-white rounded-card shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Bločky / Prílohy</h3>
        <div
          onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <Upload size={24} className="mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">Kliknite alebo pretiahnite súbory</p>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF — max 5MB, max 5 súborov</p>
          <input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => addFiles(e.target.files)} className="hidden" />
        </div>
        {files.length > 0 && (
          <div className="mt-3 space-y-2">
            {files.map((file, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <FileIcon size={16} className="text-gray-400 shrink-0" />
                <span className="flex-1 truncate">{file.name}</span>
                <span className="text-gray-400 text-xs">{(file.size / 1024).toFixed(0)} KB</span>
                <button type="button" onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>)}

      <div className="flex gap-3">
        <button type="button" onClick={() => handleSubmit('rozpracovana')} disabled={loading} className="flex items-center gap-2 border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
          <Save size={16} /> Uložiť rozpracované
        </button>
        <button type="button" onClick={() => handleSubmit('odoslana')} disabled={loading} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
          <Send size={16} /> {loading ? 'Odosielam...' : 'Odoslať'}
        </button>
      </div>
    </form>
  )
}
