import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ totalItems, itemsPerPage = 50, currentPage, onPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  if (totalPages <= 1) return null

  const start = (currentPage - 1) * itemsPerPage + 1
  const end = Math.min(currentPage * itemsPerPage, totalItems)

  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    let endPage = Math.min(totalPages, startPage + maxVisible - 1)
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1)
    }
    for (let i = startPage; i <= endPage; i++) pages.push(i)
    return pages
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      borderTop: '1px solid #f1f5f9',
      background: '#fafbfc',
    }}>
      <span style={{ fontSize: '13px', color: '#64748b' }}>
        Showing {start}-{end} of {totalItems}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff',
            color: currentPage === 1 ? '#cbd5e1' : '#475569', cursor: currentPage === 1 ? 'default' : 'pointer',
          }}
        >
          <ChevronLeft size={16} />
        </button>
        {getPageNumbers().map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            style={{
              minWidth: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: page === currentPage ? '1px solid #3b82f6' : '1px solid #e2e8f0',
              borderRadius: '8px',
              background: page === currentPage ? '#3b82f6' : '#fff',
              color: page === currentPage ? '#fff' : '#475569',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff',
            color: currentPage === totalPages ? '#cbd5e1' : '#475569', cursor: currentPage === totalPages ? 'default' : 'pointer',
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
