'use client'

import { useState } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react'
import { importHistorickyhDochadzku, type ImportRow } from '@/actions/dochadzka-import'

export default function BulkImportForm() {
  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [preview, setPreview] = useState<ImportRow[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ inserted: number; skipped: number; errors: string[] } | null>(null)

  async function handleFile(f: File) {
    setFile(f)
    setParsing(true)
    setPreview([])
    setParseErrors([])

    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      const buffer = await f.arrayBuffer()
      await wb.xlsx.load(buffer)
      const ws = wb.worksheets[0]

      const rows: ImportRow[] = []
      const errors: string[] = []

      ws.eachRow((row, rowNum) => {
        if (rowNum === 1) return // header
        const values = row.values as (string | Date | number | null)[]
        // Očakávame stĺpce: email, datum, smer, dovod, cas
        const email = String(values[1] || '').trim()
        const datum = values[2] instanceof Date ? values[2].toISOString().split('T')[0] : String(values[2] || '').slice(0, 10)
        const smer = String(values[3] || '').trim().toLowerCase()
        const dovod = String(values[4] || '').trim().toLowerCase()
        const casValue = values[5]
        let cas = ''
        if (casValue instanceof Date) cas = casValue.toISOString()
        else if (typeof casValue === 'string') {
          // Parse "HH:MM" + datum
          if (/^\d{2}:\d{2}/.test(casValue)) {
            cas = new Date(`${datum}T${casValue}:00`).toISOString()
          } else cas = new Date(casValue).toISOString()
        }

        if (!email || !datum || !smer || !dovod || !cas) {
          errors.push(`Riadok ${rowNum}: chýbajú údaje`)
          return
        }
        if (!['prichod', 'odchod'].includes(smer)) {
          errors.push(`Riadok ${rowNum}: neplatný smer "${smer}"`)
          return
        }

        rows.push({ email, datum, smer: smer as 'prichod' | 'odchod', dovod, cas })
      })

      setPreview(rows)
      setParseErrors(errors)
    } catch (err) {
      setParseErrors([(err as Error).message])
    } finally {
      setParsing(false)
    }
  }

  async function handleImport() {
    if (preview.length === 0) return
    setImporting(true)
    const r = await importHistorickyhDochadzku(preview)
    setResult(r)
    setImporting(false)
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
        <h3 className="font-semibold mb-2">Formát XLSX súboru:</h3>
        <p>Hlavička v 1. riadku, dáta od 2. riadku.</p>
        <table className="mt-2 text-xs border-collapse">
          <thead>
            <tr className="bg-blue-100">
              <th className="border border-blue-300 px-2 py-1">email</th>
              <th className="border border-blue-300 px-2 py-1">datum</th>
              <th className="border border-blue-300 px-2 py-1">smer</th>
              <th className="border border-blue-300 px-2 py-1">dovod</th>
              <th className="border border-blue-300 px-2 py-1">cas</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-blue-200 px-2 py-1">jano@imet.sk</td>
              <td className="border border-blue-200 px-2 py-1">2026-04-01</td>
              <td className="border border-blue-200 px-2 py-1">prichod</td>
              <td className="border border-blue-200 px-2 py-1">praca</td>
              <td className="border border-blue-200 px-2 py-1">07:55</td>
            </tr>
          </tbody>
        </table>
      </div>

      {!file && (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-primary/50 transition-colors">
          <Upload size={32} className="text-gray-400 mb-2" />
          <span className="text-sm text-gray-600">Klikni alebo pretiahni XLSX súbor</span>
          <input type="file" accept=".xlsx,.xls" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </label>
      )}

      {parsing && <div className="text-center text-gray-500">Spracovávam súbor…</div>}

      {file && !parsing && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <FileSpreadsheet size={16} />
            <span className="font-medium">{file.name}</span>
            <button onClick={() => { setFile(null); setPreview([]); setParseErrors([]); setResult(null) }} className="text-xs text-gray-500 hover:text-red-600">Zmeniť súbor</button>
          </div>

          {parseErrors.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-900">
              <strong>{parseErrors.length} chýb pri parsovaní:</strong>
              <ul className="mt-1 list-disc list-inside text-xs">
                {parseErrors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                {parseErrors.length > 10 && <li>… a {parseErrors.length - 10} ďalších</li>}
              </ul>
            </div>
          )}

          {preview.length > 0 && !result && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-900">
                <strong>Pripravených {preview.length} záznamov na import.</strong>
              </div>
              <div className="overflow-x-auto bg-white border rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-2 py-1">email</th>
                      <th className="text-left px-2 py-1">datum</th>
                      <th className="text-left px-2 py-1">smer</th>
                      <th className="text-left px-2 py-1">dovod</th>
                      <th className="text-left px-2 py-1">cas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 20).map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1">{r.email}</td>
                        <td className="px-2 py-1">{r.datum}</td>
                        <td className="px-2 py-1">{r.smer}</td>
                        <td className="px-2 py-1">{r.dovod}</td>
                        <td className="px-2 py-1">{new Date(r.cas).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 20 && <div className="text-center text-xs text-gray-500 py-2">… a {preview.length - 20} ďalších</div>}
              </div>
              <button onClick={handleImport} disabled={importing}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-50">
                {importing ? 'Importujem…' : `Importovať ${preview.length} záznamov`}
              </button>
            </>
          )}

          {result && (
            <div className={`rounded-xl p-4 ${result.errors.length === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'} border`}>
              <div className="flex items-center gap-2 font-semibold mb-2">
                {result.errors.length === 0 ? <CheckCircle size={18} className="text-green-700" /> : <AlertCircle size={18} className="text-yellow-700" />}
                Import hotový — {result.inserted} pridaných, {result.skipped} preskočených
              </div>
              {result.errors.length > 0 && (
                <ul className="text-xs list-disc list-inside text-yellow-900">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
