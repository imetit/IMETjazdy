/**
 * CSV export utility s BOM pre správne zobrazenie diakritiky v Excel
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: string; label: string; format?: (item: T) => string }[],
  filename: string
) {
  const BOM = '\uFEFF'
  const separator = ';' // Excel SK/CZ uses semicolon

  // Header
  const header = columns.map(c => escapeCSV(c.label)).join(separator)

  // Rows
  const rows = data.map(item =>
    columns.map(col => {
      const value = col.format ? col.format(item) : String(item[col.key] ?? '')
      return escapeCSV(value)
    }).join(separator)
  )

  const csv = BOM + [header, ...rows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function escapeCSV(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
