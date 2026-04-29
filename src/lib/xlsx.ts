import 'server-only'
import ExcelJS from 'exceljs'

export interface XlsxColumn {
  header: string
  width?: number
}

export async function generateXLSX(
  sheetName: string,
  columns: XlsxColumn[],
  rows: (string | number | null)[][],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(sheetName)

  // Header row
  const headerRow = ws.addRow(columns.map(c => c.header))
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0D9488' },  // primary teal
  }
  headerRow.height = 22

  for (const row of rows) {
    ws.addRow(row.map(v => v == null ? '' : v))
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
