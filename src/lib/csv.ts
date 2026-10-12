function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function exportRowsToCsv<T extends Record<string, unknown>>({
  filename,
  columns,
  rows,
}: {
  filename: string
  columns: { key: keyof T & string; label: string }[]
  rows: T[]
}): void {
  const header = columns.map((c) => escapeCell(c.label)).join(',')
  const body = rows
    .map((row) => columns.map((c) => escapeCell(row[c.key])).join(','))
    .join('\n')
  const csv = [header, body].filter(Boolean).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
