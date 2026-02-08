import { useState, useEffect } from 'react'
import { Globe, Plus, Trash2, Ban, Search, Shield, Users, X } from 'lucide-react'
import ExportButton from '../components/ExportButton'
import Pagination from '../components/Pagination'

export default function WebBlocker() {
  const [websites, setWebsites] = useState([])
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [newSite, setNewSite] = useState({ domain: '', agent_id: '' })

  useEffect(() => {
    fetch('/api/agents').then(r => r.json()).then(setAgents)
    fetchSites()
  }, [])

  const fetchSites = async () => {
    setLoading(true)
    const res = await fetch('/api/monitoring/blocked-websites')
    setWebsites(await res.json())
    setLoading(false)
  }

  const blockSite = async () => {
    if (!newSite.domain) return
    await fetch('/api/monitoring/blocked-websites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSite)
    })
    if (newSite.agent_id && window.ws && window.ws.readyState === WebSocket.OPEN) {
      window.ws.send(JSON.stringify({
        type: 'block_website', agent_id: newSite.agent_id, domain: newSite.domain
      }))
    }
    setShowModal(false)
    setNewSite({ domain: '', agent_id: '' })
    fetchSites()
  }

  const unblockSite = async (id) => {
    await fetch(`/api/monitoring/blocked-websites/${id}`, { method: 'DELETE' })
    fetchSites()
  }

  // Calculate stats
  const stats = {
    total: websites.length,
    global: websites.filter(w => !w.agent_id).length,
    perAgent: websites.filter(w => w.agent_id).length,
  }

  // Filter websites
  const filteredWebsites = websites.filter(w => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        (w.domain && w.domain.toLowerCase().includes(query)) ||
        (w.employee_name && w.employee_name.toLowerCase().includes(query))
      )
    }
    return true
  })

  // Export columns
  const exportColumns = [
    { label: 'Domain', key: 'domain', accessor: (w) => w.domain || 'Unknown' },
    { label: 'Applied To', key: 'employee_name', accessor: (w) => w.employee_name || 'All Agents' },
    { label: 'Created', key: 'created_at', accessor: (w) => w.created_at ? new Date(w.created_at).toLocaleString() : '-' },
  ]

  // Scope badge styling
  const getScopeStyle = (isPerAgent) => {
    if (isPerAgent) {
      return {
        bg: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        light: 'rgba(59,130,246,0.12)',
        color: '#1d4ed8',
        shadow: 'rgba(59,130,246,0.25)',
        text: 'Per Agent'
      }
    }
    return {
      bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      light: 'rgba(245,158,11,0.12)',
      color: '#d97706',
      shadow: 'rgba(245,158,11,0.25)',
      text: 'Global'
    }
  }

  return (
    <div style={{ padding: '24px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', minHeight: '100vh' }}>
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Total Blocked */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '16px',
          padding: '20px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #ef4444, #dc2626)',
          }} />
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
            }}>
              <Ban size={24} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Blocked
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b' }}>{stats.total}</div>
            </div>
          </div>
        </div>

        {/* Global Rules */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '16px',
          padding: '20px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #f59e0b, #d97706)',
          }} />
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
            }}>
              <Shield size={24} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Global Rules
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b' }}>{stats.global}</div>
            </div>
          </div>
        </div>

        {/* Per-Agent Rules */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '16px',
          padding: '20px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
          }} />
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
            }}>
              <Users size={24} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Per-Agent Rules
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b' }}>{stats.perAgent}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Blocked Websites Table Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Blocked Websites</h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Prevent access to specific domains</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '8px 12px 8px 36px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '13px',
                    width: '180px',
                    background: '#f8fafc',
                    outline: 'none',
                  }}
                />
              </div>
              <ExportButton data={filteredWebsites} filename="blocked_websites" columns={exportColumns} />
              <button
                onClick={() => setShowModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(239,68,68,0.25)',
                }}
              >
                <Plus size={16} />
                Block Website
              </button>
            </div>
          </div>
        </div>

        {/* Count Row */}
        <div style={{
          padding: '12px 24px',
          background: '#fafafa',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white',
            padding: '2px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
          }}>
            {filteredWebsites.length}
          </span>
          <span style={{ fontSize: '13px', color: '#64748b' }}>blocked website{filteredWebsites.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#ef4444', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
            Loading...
          </div>
        ) : filteredWebsites.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Globe size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
            <p style={{ color: '#64748b', margin: 0 }}>No blocked websites</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Domain</th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Applied To</th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Scope</th>
                <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredWebsites.slice((currentPage - 1) * 50, currentPage * 50).map((w, idx) => {
                const scopeStyle = getScopeStyle(!!w.agent_id)
                return (
                  <tr
                    key={w.id}
                    style={{
                      borderBottom: idx < filteredWebsites.length - 1 ? '1px solid #f1f5f9' : 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(239,68,68,0.2)',
                        }}>
                          <Globe size={18} color="white" />
                        </div>
                        <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>{w.domain}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', color: '#64748b', fontSize: '14px' }}>
                      {w.employee_name || 'All Agents'}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: scopeStyle.light,
                        color: scopeStyle.color,
                      }}>
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: scopeStyle.bg,
                        }} />
                        {scopeStyle.text}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <button
                        onClick={() => unblockSite(w.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(16,185,129,0.25)',
                        }}
                      >
                        <Trash2 size={14} />
                        Unblock
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {filteredWebsites.length > 0 && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9' }}>
            <Pagination
              totalItems={filteredWebsites.length}
              itemsPerPage={50}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Add Block Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
              borderRadius: '20px',
              padding: '0',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #f1f5f9',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Globe size={24} color="white" />
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', margin: 0 }}>Block Website</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} color="white" />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                  Domain
                </label>
                <input
                  type="text"
                  value={newSite.domain}
                  onChange={e => setNewSite({...newSite, domain: e.target.value})}
                  placeholder="e.g., facebook.com"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px',
                    background: '#f8fafc',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                  Apply To
                </label>
                <select
                  value={newSite.agent_id}
                  onChange={e => setNewSite({...newSite, agent_id: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px',
                    background: '#f8fafc',
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">All Agents (Global)</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.employee_name || a.pc_name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={blockSite}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
                }}
              >
                Block Website
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
