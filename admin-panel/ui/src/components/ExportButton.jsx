import { Button } from '@tremor/react'
import { Download } from 'lucide-react'

// Export data to CSV
export function exportToCSV(data, filename, columns) {
  if (!data || data.length === 0) return

  // Build header row
  const headers = columns.map(col => col.label).join(',')

  // Build data rows
  const rows = data.map(item => {
    return columns.map(col => {
      let value = col.accessor ? col.accessor(item) : item[col.key]
      // Escape commas and quotes
      if (typeof value === 'string') {
        value = value.replace(/"/g, '""')
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value}"`
        }
      }
      return value ?? ''
    }).join(',')
  }).join('\n')

  const csv = `${headers}\n${rows}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

// Reusable export button component
export default function ExportButton({ data, filename, columns, disabled = false }) {
  const handleExport = () => {
    exportToCSV(data, filename, columns)
  }

  return (
    <Button
      icon={Download}
      variant="secondary"
      onClick={handleExport}
      disabled={disabled || !data || data.length === 0}
      className="bg-stone-200 border-stone-300 text-stone-700 hover:bg-stone-300 disabled:opacity-50"
    >
      Export
    </Button>
  )
}
