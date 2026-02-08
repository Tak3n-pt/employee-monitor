import { useState, useEffect } from 'react'
import { ScrollText, User, Filter, RefreshCw } from 'lucide-react'
import { apiFetch } from '../utils/api'
import Pagination from '../components/Pagination'
import ExportButton from '../components/ExportButton'

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const perPage = 50

  useEffect(() => {
    fetchLogs()
  }, [actionFilter, currentPage])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      let url = `/api/audit-log?limit=${perPage}&offset=${(currentPage - 1) * perPage}`
      if (actionFilter) url += `&action=${actionFilter}`
      const res = await apiFetch(url)
      const data = await res.json()
      setLogs(data.logs || [])
      setTotal(data.total || 0)
    } catch (e) {
      console.error('Error fetching audit logs:', e)
    }
    setLoading(false)
  }

  const formatDate = (d) => {
    if (!d) return '-'
    return new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const actionColors = {
    login: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
    change_password: { bg: '#eff6ff', color: '#2563eb', border: '#93c5fd' },
    update_settings: { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
    data_retention: { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
  }

  const exportColumns = [
    { label: 'Time', key: 'created_at' },
    { label: 'User', key: 'user_name' },
    { label: 'Action', key: 'action' },
    { label: 'Target', key: 'target_type' },
    { label: 'Details', key: 'details' },
    { label: 'IP', key: 'ip_address' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ScrollText size={22} style={{ color: '#64748b' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Audit Log</h2>
          <span style={{
            padding: '4px 12px', borderRadius: '20px', background: '#f1f5f9',
            fontSize: '12px', fontWeight: 600, color: '#475569',
          }}>
            {total} entries
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1) }}
            style={{
              height: '38px', padding: '0 12px', background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: '10px', fontSize: '13px', color: '#475569', outline: 'none',
            }}
          >
            <option value="">All Actions</option>
            <option value="login">Login</option>
            <option value="change_password">Password Change</option>
            <option value="update_settings">Settings Update</option>
            <option value="data_retention">Data Retention</option>
          </select>
          <ExportButton data={logs} filename="audit_log" columns={exportColumns} />
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px' }}>
            <RefreshCw size={24} style={{ color: '#64748b', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '80px 20px', textAlign: 'center' }}>
            <ScrollText size={48} style={{ color: '#e2e8f0', marginBottom: '16px' }} />
            <p style={{ fontSize: '16px', fontWeight: 600, color: '#334155' }}>No audit logs</p>
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>Activity will be recorded here</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>User</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Action</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Details</th>
                    <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => {
                    const colors = actionColors[log.action] || { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' }
                    return (
                      <tr key={log.id || i} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row-hover">
                        <td style={{ padding: '14px 24px', fontSize: '13px', color: '#475569', whiteSpace: 'nowrap' }}>{formatDate(log.created_at)}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <User size={14} style={{ color: '#fff' }} />
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>{log.user_name || log.username || 'System'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                            background: colors.bg, color: colors.color, border: `1px solid ${colors.border}`,
                          }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{log.target_type || '-'}</td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.details || '-'}</td>
                        <td style={{ padding: '14px 24px', fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>{log.ip_address || '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              totalItems={total}
              itemsPerPage={perPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .table-row-hover:hover { background: #f8fafc; }
      `}</style>
    </div>
  )
}
