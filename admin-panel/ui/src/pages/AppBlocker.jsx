import { useState, useEffect } from 'react'
import { AppWindow, Plus, Trash2, Ban, Search, Shield, Users, X } from 'lucide-react'
import ExportButton from '../components/ExportButton'
import Pagination from '../components/Pagination'

// Common apps with their process names
const COMMON_APPS = [
  { name: 'Google Chrome', process: 'chrome.exe' },
  { name: 'Microsoft Edge', process: 'msedge.exe' },
  { name: 'Firefox', process: 'firefox.exe' },
  { name: 'Opera', process: 'opera.exe' },
  { name: 'Brave', process: 'brave.exe' },
  { name: 'Internet Explorer', process: 'iexplore.exe' },
  { name: 'Notepad', process: 'notepad.exe' },
  { name: 'Notepad++', process: 'notepad++.exe' },
  { name: 'VS Code', process: 'Code.exe' },
  { name: 'Discord', process: 'Discord.exe' },
  { name: 'Slack', process: 'slack.exe' },
  { name: 'Telegram', process: 'Telegram.exe' },
  { name: 'WhatsApp', process: 'WhatsApp.exe' },
  { name: 'Spotify', process: 'Spotify.exe' },
  { name: 'Steam', process: 'steam.exe' },
  { name: 'Epic Games', process: 'EpicGamesLauncher.exe' },
  { name: 'VLC', process: 'vlc.exe' },
  { name: 'Zoom', process: 'Zoom.exe' },
  { name: 'Microsoft Teams', process: 'Teams.exe' },
  { name: 'Skype', process: 'Skype.exe' },
  { name: 'Word', process: 'WINWORD.EXE' },
  { name: 'Excel', process: 'EXCEL.EXE' },
  { name: 'PowerPoint', process: 'POWERPNT.EXE' },
  { name: 'Outlook', process: 'OUTLOOK.EXE' },
  { name: 'File Explorer', process: 'explorer.exe' },
  { name: 'Command Prompt', process: 'cmd.exe' },
  { name: 'PowerShell', process: 'powershell.exe' },
  { name: 'Task Manager', process: 'Taskmgr.exe' },
  { name: 'Control Panel', process: 'control.exe' },
  { name: 'Calculator', process: 'Calculator.exe' },
  { name: 'Paint', process: 'mspaint.exe' },
  { name: 'Snipping Tool', process: 'SnippingTool.exe' },
  { name: 'TikTok', process: 'TikTok.exe' },
  { name: 'Facebook', process: 'Facebook.exe' },
  { name: 'OBS Studio', process: 'obs64.exe' },
  { name: 'Audacity', process: 'Audacity.exe' },
  { name: 'GIMP', process: 'gimp-2.10.exe' },
  { name: 'Photoshop', process: 'Photoshop.exe' },
  { name: 'Premiere Pro', process: 'Adobe Premiere Pro.exe' },
  { name: 'After Effects', process: 'AfterFX.exe' },
]

export default function AppBlocker() {
  const [apps, setApps] = useState([])
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [newApp, setNewApp] = useState({ app_name: '', agent_id: '' })
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [appSearch, setAppSearch] = useState('')

  useEffect(() => {
    fetch('/api/agents').then(r => r.json()).then(setAgents)
    fetchApps()
  }, [])

  const fetchApps = async () => {
    setLoading(true)
    const res = await fetch('/api/monitoring/blocked-apps')
    setApps(await res.json())
    setLoading(false)
  }

  const blockApp = async () => {
    if (!newApp.app_name) return
    // Auto-append .exe if not present
    let appName = newApp.app_name.trim()
    if (!appName.toLowerCase().endsWith('.exe')) {
      appName = appName + '.exe'
    }
    const payload = { ...newApp, app_name: appName }
    await fetch('/api/monitoring/blocked-apps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (newApp.agent_id && window.ws && window.ws.readyState === WebSocket.OPEN) {
      window.ws.send(JSON.stringify({
        type: 'block_app', agent_id: newApp.agent_id, app_name: appName
      }))
    }
    setShowModal(false)
    setNewApp({ app_name: '', agent_id: '' })
    setAppSearch('')
    fetchApps()
  }

  // Filter common apps based on search
  const filteredCommonApps = COMMON_APPS.filter(app =>
    app.name.toLowerCase().includes(appSearch.toLowerCase()) ||
    app.process.toLowerCase().includes(appSearch.toLowerCase())
  )

  const selectCommonApp = (app) => {
    setNewApp({ ...newApp, app_name: app.process })
    setAppSearch(app.name)
    setShowSuggestions(false)
  }

  const unblockApp = async (id) => {
    await fetch(`/api/monitoring/blocked-apps/${id}`, { method: 'DELETE' })
    fetchApps()
  }

  // Calculate stats
  const stats = {
    total: apps.length,
    global: apps.filter(a => !a.agent_id).length,
    perAgent: apps.filter(a => a.agent_id).length,
  }

  // Filter apps
  const filteredApps = apps.filter(a => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        (a.app_name && a.app_name.toLowerCase().includes(query)) ||
        (a.employee_name && a.employee_name.toLowerCase().includes(query))
      )
    }
    return true
  })

  // Export columns
  const exportColumns = [
    { label: 'Application', key: 'app_name', accessor: (a) => a.app_name || 'Unknown' },
    { label: 'Applied To', key: 'employee_name', accessor: (a) => a.employee_name || 'All Agents' },
    { label: 'Created', key: 'created_at', accessor: (a) => a.created_at ? new Date(a.created_at).toLocaleString() : '-' },
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

      {/* Blocked Apps Table Card */}
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
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Blocked Applications</h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Prevent specific applications from running</p>
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
              <ExportButton data={filteredApps} filename="blocked_apps" columns={exportColumns} />
              <button
                onClick={() => {
                  setShowModal(true)
                  setAppSearch('')
                  setNewApp({ app_name: '', agent_id: '' })
                  setShowSuggestions(false)
                }}
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
                Block App
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
            {filteredApps.length}
          </span>
          <span style={{ fontSize: '13px', color: '#64748b' }}>blocked application{filteredApps.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#ef4444', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
            Loading...
          </div>
        ) : filteredApps.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <AppWindow size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
            <p style={{ color: '#64748b', margin: 0 }}>No blocked applications</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Application</th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Applied To</th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Scope</th>
                <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.slice((currentPage - 1) * 50, currentPage * 50).map((a, idx) => {
                const scopeStyle = getScopeStyle(!!a.agent_id)
                return (
                  <tr
                    key={a.id}
                    style={{
                      borderBottom: idx < filteredApps.length - 1 ? '1px solid #f1f5f9' : 'none',
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
                          <Ban size={18} color="white" />
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px', display: 'block' }}>
                            {COMMON_APPS.find(ca => ca.process.toLowerCase() === a.app_name?.toLowerCase())?.name || a.app_name}
                          </span>
                          {COMMON_APPS.find(ca => ca.process.toLowerCase() === a.app_name?.toLowerCase()) && (
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{a.app_name}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', color: '#64748b', fontSize: '14px' }}>
                      {a.employee_name || 'All Agents'}
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
                        onClick={() => unblockApp(a.id)}
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
        {filteredApps.length > 0 && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9' }}>
            <Pagination
              totalItems={filteredApps.length}
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
                <Ban size={24} color="white" />
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', margin: 0 }}>Block Application</h3>
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
              <div style={{ marginBottom: '20px', position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                  Application Name
                </label>
                <input
                  type="text"
                  value={appSearch || newApp.app_name}
                  onChange={e => {
                    setAppSearch(e.target.value)
                    setNewApp({...newApp, app_name: e.target.value})
                    setShowSuggestions(true)
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search or type process name (e.g., msedge.exe)"
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
                {/* Suggestions dropdown */}
                {showSuggestions && filteredCommonApps.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 100,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    marginTop: '4px',
                  }}>
                    {filteredCommonApps.slice(0, 8).map((app, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectCommonApp(app)}
                        style={{
                          padding: '10px 16px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: idx < filteredCommonApps.length - 1 ? '1px solid #f1f5f9' : 'none',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      >
                        <span style={{ fontWeight: 500, color: '#1e293b' }}>{app.name}</span>
                        <span style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{app.process}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', marginBottom: 0 }}>
                  Select from list or type process name. Extension (.exe) will be added automatically.
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                  Apply To
                </label>
                <select
                  value={newApp.agent_id}
                  onChange={e => setNewApp({...newApp, agent_id: e.target.value})}
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
                onClick={blockApp}
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
                Block Application
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
