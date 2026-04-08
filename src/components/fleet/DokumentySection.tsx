'use client'

import { useState } from 'react'
import { Upload, Trash2, FileText } from 'lucide-react'
import { TYP_DOKUMENTU_LABELS, type VozidloDokument, type TypDokumentu } from '@/lib/fleet-types'
import { formatDate } from '@/lib/fleet-utils'
import StatusIndicator from './StatusIndicator'

interface Props {
  vozidloId: string
  dokumenty: VozidloDokument[]
  readonly?: boolean
  onUpload?: (formData: FormData) => Promise<{ error?: string } | undefined>
  onDelete?: (id: string, filePath: string) => Promise<{ error?: string } | undefined>
}

export default function DokumentySection({ vozidloId, dokumenty, readonly, onUpload, onDelete }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!onUpload) return
    setUploading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    formData.set('vozidlo_id', vozidloId)
    const result = await onUpload(formData)
    if (result?.error) {
      setError(result.error)
    } else {
      e.currentTarget.reset()
    }
    setUploading(false)
  }

  async function handleDelete(id: string, filePath: string) {
    if (!onDelete) return
    setDeleting(id)
    await onDelete(id, filePath)
    setDeleting(null)
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {!readonly && onUpload && (
        <form onSubmit={handleUpload} className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <select name="typ" required className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {Object.entries(TYP_DOKUMENTU_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <input name="nazov" placeholder="Názov dokumentu" required className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input name="platnost_do" type="date" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex items-center gap-3">
            <input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required className="text-sm" />
            <button type="submit" disabled={uploading} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              <Upload size={16} className="inline mr-1" /> {uploading ? 'Nahrávam...' : 'Nahrať'}
            </button>
          </div>
        </form>
      )}

      {dokumenty.length === 0 ? (
        <p className="text-gray-500 text-sm">Žiadne dokumenty</p>
      ) : (
        <div className="space-y-2">
          {dokumenty.map(doc => (
            <div key={doc.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium">{doc.nazov}</p>
                  <p className="text-xs text-gray-500">
                    {TYP_DOKUMENTU_LABELS[doc.typ as TypDokumentu]}
                    {doc.platnost_do && <> · Platnosť do: {formatDate(doc.platnost_do)}</>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {doc.platnost_do && <StatusIndicator platnostDo={doc.platnost_do} />}
                {!readonly && onDelete && (
                  <button onClick={() => handleDelete(doc.id, doc.file_path)} disabled={deleting === doc.id} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
