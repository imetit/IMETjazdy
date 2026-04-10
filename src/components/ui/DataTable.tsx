'use client'

import { useState, useMemo } from 'react'
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { exportToCSV } from '@/lib/export'

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (item: T) => React.ReactNode
  className?: string
}

export interface FilterDef {
  key: string
  label: string
  options: { value: string; label: string }[]
}

export interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  searchable?: boolean
  searchPlaceholder?: string
  filters?: FilterDef[]
  pageSize?: number
  emptyMessage?: string
  onRowClick?: (item: T) => void
  rowKey?: (item: T) => string
  exportFilename?: string
}

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchable = false,
  searchPlaceholder = 'Hľadať...',
  filters = [],
  pageSize: initialPageSize = 25,
  emptyMessage = 'Žiadne záznamy.',
  onRowClick,
  rowKey,
  exportFilename,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  function handleFilterChange(key: string, value: string) {
    setActiveFilters((prev) => {
      const next = { ...prev }
      if (value === '') delete next[key]
      else next[key] = value
      return next
    })
    setPage(1)
  }

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize)
    setPage(1)
  }

  const filtered = useMemo(() => {
    let result = data

    // Text search across all columns
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((item) =>
        columns.some((col) => {
          const val = item[col.key]
          return val != null && String(val).toLowerCase().includes(q)
        })
      )
    }

    // Apply select filters (AND)
    for (const [key, value] of Object.entries(activeFilters)) {
      result = result.filter((item) => String(item[key]) === value)
    }

    // Sort
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortKey] ?? ''
        const bVal = b[sortKey] ?? ''
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [data, search, activeFilters, sortKey, sortDir, columns])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIdx = (safePage - 1) * pageSize
  const endIdx = Math.min(startIdx + pageSize, filtered.length)
  const pageData = filtered.slice(startIdx, endIdx)

  // Generate page numbers to show
  const pageNumbers = useMemo(() => {
    const pages: number[] = []
    const maxVisible = 5
    let start = Math.max(1, safePage - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages, start + maxVisible - 1)
    start = Math.max(1, end - maxVisible + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }, [safePage, totalPages])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Toolbar */}
      {(searchable || filters.length > 0) && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200">
          {searchable && (
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {exportFilename && (
              <button
                onClick={() => {
                  const exportCols = columns.filter(c => c.key !== 'akcie').map(c => ({
                    key: c.key,
                    label: c.label,
                    format: (item: T) => String(item[c.key] ?? ''),
                  }))
                  exportToCSV(filtered, exportCols, exportFilename)
                }}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                title="Exportovať do CSV"
              >
                <Download size={14} />
                CSV
              </button>
            )}
            {filters.map((f) => (
              <select
                key={f.key}
                value={activeFilters[f.key] || ''}
                onChange={(e) => handleFilterChange(f.key, e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">{f.label}</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${col.sortable ? 'cursor-pointer select-none hover:text-gray-700' : ''} ${col.className || ''}`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc'
                        ? <ChevronUp size={14} className="text-primary" />
                        : <ChevronDown size={14} className="text-primary" />
                    )}
                    {col.sortable && sortKey !== col.key && (
                      <ChevronUp size={14} className="text-gray-300" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {pageData.map((item, idx) => (
              <tr
                key={rowKey ? rowKey(item) : idx}
                className={`border-b border-gray-100 ${idx % 2 === 1 ? 'bg-gray-50/50' : ''} ${onRowClick ? 'cursor-pointer hover:bg-primary/5 transition-colors' : ''}`}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-sm text-gray-600 ${col.className || ''}`}>
                    {col.render ? col.render(item) : (item[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 text-sm">
        <div className="flex items-center gap-3 text-gray-500">
          <span>
            Zobrazujem {filtered.length === 0 ? 0 : startIdx + 1}-{endIdx} z {filtered.length}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400">Riadkov na stránku</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {[10, 25, 50, 100].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="p-1.5 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          {pageNumbers.map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition-colors ${
                n === safePage
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="p-1.5 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
