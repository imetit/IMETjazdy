'use client'

import { useState, useRef } from 'react'
import { Upload, X, FileIcon } from 'lucide-react'

export default function FileUpload({ name, maxFiles = 5, maxSizeMB = 5 }: {
  name: string; maxFiles?: number; maxSizeMB?: number
}) {
  const [files, setFiles] = useState<File[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  function addFiles(newFiles: FileList | null) {
    if (!newFiles) return
    const arr = Array.from(newFiles).filter(f => f.size <= maxSizeMB * 1024 * 1024)
    setFiles(prev => [...prev, ...arr].slice(0, maxFiles))
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div>
      <div
        onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
      >
        <Upload size={24} className="mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">Kliknite alebo pretiahnite súbory</p>
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF — max {maxSizeMB}MB, max {maxFiles} súborov</p>
        <input ref={inputRef} type="file" multiple accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => addFiles(e.target.files)} className="hidden" />
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
      {files.map((file, i) => {
        const dt = new DataTransfer()
        dt.items.add(file)
        return <input key={i} type="file" name={name} className="hidden" ref={(el) => { if (el) el.files = dt.files }} />
      })}
    </div>
  )
}
