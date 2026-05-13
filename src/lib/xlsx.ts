import 'server-only'
import ExcelJS from 'exceljs'

export interface XlsxColumn {
  header: string
  width?: number
}

/**
 * Escape cell value against CSV/XLSX formula injection.
 *
 * Excel + LibreOffice + Google Sheets execute cell content that starts with
 * =, +, -, @, tab or CR as a formula. An attacker who controls a field that
 * gets exported (e.g. full_name) can plant `=HYPERLINK("http://evil")` or
 * `=cmd|'/c calc.exe'!A1` and trigger code execution on the recipient's
 * machine when the file is opened.
 *
 * Mitigation: prepend a leading apostrophe ' so the formula engine sees the
 * leading char as literal text. The apostrophe is hidden by Excel but visible
 * in CSV — acceptable tradeoff for safety.
 */
export function safeXlsxCell(v: unknown): string | number | null {
  if (v == null) return ''
  if (typeof v === 'number') return v
  const s = String(v)
  if (/^[=+\-@\t\r]/.test(s)) return `'${s}`
  return s
}

export async function generateXLSX(
  sheetName: string,
  columns: XlsxColumn[],
  rows: (string | number | null)[][],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(sheetName)

  // Header row (headers are developer-controlled — no escape needed)
  const headerRow = ws.addRow(columns.map(c => c.header))
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0D9488' },  // primary teal
  }
  headerRow.height = 22

  // Data rows — apply formula-injection escape per cell
  for (const row of rows) {
    ws.addRow(row.map(safeXlsxCell))
  }

  ws.columns = columns.map(c => ({ width: c.width || 15 }))

  // Freeze header
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  // Auto-filter
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  }

  return Buffer.from(await wb.xlsx.writeBuffer())
}
