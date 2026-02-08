import { useState, useEffect, useMemo } from 'react'
import { Package, PlusCircle, MinusCircle, Search, RefreshCw, Download, Zap, Clock, User } from 'lucide-react'
import { BarChart } from '@tremor/react'
import Pagination from '../components/Pagination'
import ExportButton from '../components/ExportButton'

export default function AppInstalls() {
  const [installs, setInstalls] = useState([])
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [stats, setStats] = useState({ total: 0, installs: 0, uninstalls: 0 })

  useEffect(() => {
    fetchAgents()
    fetchInstalls()
  }, [])

  useEffect(() => {
    fetchInstalls()
  }, [selectedAgent])

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents')
      const data = await response.json()
      setAgents(data)
    } catch (error) {
      console.error('Error fetching agents:', error)
    }
  }

  const fetchInstalls = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedAgent) params.append('agent_id', selectedAgent)
      params.append('limit', '100')

      const response = await fetch(`/api/monitoring/installs?${params}`)
      const data = await response.json()

      setInstalls(data)
      calculateStats(data)
    } catch (error) {
      console.error('Error fetching installs:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data) => {
    const total = data.length
    const installs = data.filter(item => item.action === 'install').length
    const uninstalls = data.filter(item => item.action === 'uninstall').length
    setStats({ total, installs, uninstalls })
  }

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.data_type === 'app_installs') {
        setSyncing(false)
        fetchInstalls()
      }
    }
    window.addEventListener('data_sync_complete', handler)
    return () => window.removeEventListener('data_sync_complete', handler)
  }, [selectedAgent])

  const handleRequestLatest = () => {
    if (!selectedAgent || !window.ws) return
    setSyncing(true)
    window.ws.send(JSON.stringify({ type: 'request_data_sync', agent_id: selectedAgent, data_type: 'app_installs' }))
    setTimeout(() => setSyncing(false), 15000)
  }

  const exportToCSV = () => {
    const headers = ['Time', 'Agent', 'Action', 'App Name', 'Version', 'Publisher']
    const rows = filteredInstalls.map(item => [
      new Date(item.timestamp).toLocaleString(),
      agents.find(a => a.agent_id === item.agent_id)?.hostname || item.agent_id,
      item.action,
      item.app_name || 'N/A',
      item.version || 'N/A',
      item.publisher || 'N/A'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `app-installs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const installsVsUninstallsPerDayChartData = useMemo(() => {
    const now = new Date()
    const last7Days = []

    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      last7Days.push({ date: dateStr, Installs: 0, Uninstalls: 0 })
    }

    // Count installs and uninstalls per day
    installs.forEach(item => {
      if (item.timestamp) {
        const itemDate = new Date(item.timestamp).toISOString().split('T')[0]
        const dayData = last7Days.find(d => d.date === itemDate)
        if (dayData) {
          if (item.action === 'install') {
            dayData.Installs++
          } else if (item.action === 'uninstall') {
            dayData.Uninstalls++
          }
        }
      }
    })

    return last7Days.map(d => ({
      day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      Installs: d.Installs,
      Uninstalls: d.Uninstalls
    }))
  }, [installs])

  const filteredInstalls = installs.filter(item => {
    const matchesAction = !actionFilter || item.action === actionFilter
    const matchesSearch = !searchQuery ||
      item.app_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.publisher?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.version?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesAction && matchesSearch
  })

  return (
    <div style={{
      padding: '32px',
      backgroundColor: '#f9fafb',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Package size={32} style={{ color: '#3b82f6' }} />
          <h1 style={{
            fontSize: '30px',
            fontWeight: '700',
            color: '#111827',
            margin: 0
          }}>
            App Installs & Uninstalls
          </h1>
        </div>
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          margin: 0
        }}>
          Monitor application installations and removals across all agents
        </p>
      </div>

      {/* Tremor Chart Section */}
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        marginBottom: '32px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
          Installs vs Uninstalls Per Day
        </h3>
        <BarChart
          data={installsVsUninstallsPerDayChartData}
          index="day"
          categories={["Installs", "Uninstalls"]}
          colors={["green", "red"]}
          className="h-52"
        />
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Total Events */}
        <div style={{
          background: 'linear-gradient(to bottom right, #ffffff, #f9fafb)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#6b7280',
                margin: '0 0 8px 0'
              }}>
                Total Events
              </p>
              <p style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#111827',
                margin: 0
              }}>
                {stats.total}
              </p>
            </div>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Package size={24} style={{ color: 'white' }} />
            </div>
          </div>
        </div>

        {/* Installs */}
        <div style={{
          background: 'linear-gradient(to bottom right, #ffffff, #f9fafb)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#6b7280',
                margin: '0 0 8px 0'
              }}>
                Installs
              </p>
              <p style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#111827',
                margin: 0
              }}>
                {stats.installs}
              </p>
            </div>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PlusCircle size={24} style={{ color: 'white' }} />
            </div>
          </div>
        </div>

        {/* Uninstalls */}
        <div style={{
          background: 'linear-gradient(to bottom right, #ffffff, #f9fafb)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#6b7280',
                margin: '0 0 8px 0'
              }}>
                Uninstalls
              </p>
              <p style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#111827',
                margin: 0
              }}>
                {stats.uninstalls}
              </p>
            </div>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MinusCircle size={24} style={{ color: 'white' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        {/* Toolbar */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center'
        }}>
          {/* Agent Filter */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '200px' }}>
            <User size={18} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af',
              pointerEvents: 'none'
            }} />
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#374151',
                backgroundColor: 'white',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="">All Agents</option>
              {agents.map(agent => (
                <option key={agent.agent_id} value={agent.agent_id}>
                  {agent.hostname}
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div style={{ position: 'relative', flex: '1 1 180px', minWidth: '180px' }}>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#374151',
                backgroundColor: 'white',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="">All Actions</option>
              <option value="install">Install</option>
              <option value="uninstall">Uninstall</option>
            </select>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 250px', minWidth: '250px' }}>
            <Search size={18} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af',
              pointerEvents: 'none'
            }} />
            <input
              type="text"
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          {/* Request Latest Button */}
          <button
            onClick={handleRequestLatest}
            disabled={!selectedAgent || syncing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: selectedAgent && !syncing
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : '#d1d5db',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: selectedAgent && !syncing ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              opacity: syncing ? 0.7 : 1
            }}
          >
            {syncing ? (
              <>
                <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Syncing...
              </>
            ) : (
              <>
                <Zap size={18} />
                Request Latest
              </>
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchInstalls}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: 'white',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={18} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>

          {/* Export Button */}
          <ExportButton
            data={filteredInstalls}
            filename="app_installs"
            columns={[
              { key: 'timestamp', label: 'Timestamp' },
              { key: 'employee_name', label: 'Employee Name' },
              { key: 'app_name', label: 'App Name' },
              { key: 'action', label: 'Action' },
              { key: 'version', label: 'Version' },
            ]}
          />
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{
                  padding: '12px 24px',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} />
                    Time
                  </div>
                </th>
                <th style={{
                  padding: '12px 24px',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={16} />
                    Agent
                  </div>
                </th>
                <th style={{
                  padding: '12px 24px',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Action
                </th>
                <th style={{
                  padding: '12px 24px',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Package size={16} />
                    App Name
                  </div>
                </th>
                <th style={{
                  padding: '12px 24px',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Version
                </th>
                <th style={{
                  padding: '12px 24px',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Publisher
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{
                    padding: '48px',
                    textAlign: 'center',
                    color: '#6b7280'
                  }}>
                    <RefreshCw size={24} style={{
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 12px'
                    }} />
                    <div>Loading app installs...</div>
                  </td>
                </tr>
              ) : filteredInstalls.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{
                    padding: '48px',
                    textAlign: 'center',
                    color: '#6b7280'
                  }}>
                    <Package size={48} style={{
                      margin: '0 auto 16px',
                      opacity: 0.3
                    }} />
                    <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                      No app install events found
                    </div>
                    <div style={{ fontSize: '14px' }}>
                      {selectedAgent
                        ? 'Try requesting latest data from the agent'
                        : 'Select an agent to view installation history'
                      }
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInstalls.slice((currentPage - 1) * 50, currentPage * 50).map((item, index) => {
                  const agent = agents.find(a => a.agent_id === item.agent_id)
                  const isInstall = item.action === 'install'

                  return (
                    <tr
                      key={index}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '16px 24px', color: '#6b7280' }}>
                        {new Date(item.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '16px 24px', color: '#111827', fontWeight: '500' }}>
                        {agent?.hostname || item.agent_id}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '500',
                          backgroundColor: isInstall ? '#ecfdf5' : '#fef2f2',
                          border: `1px solid ${isInstall ? '#a7f3d0' : '#fecaca'}`,
                          color: isInstall ? '#059669' : '#dc2626'
                        }}>
                          {isInstall ? <PlusCircle size={14} /> : <MinusCircle size={14} />}
                          {item.action.charAt(0).toUpperCase() + item.action.slice(1)}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', color: '#111827', fontWeight: '500' }}>
                        {item.app_name || 'N/A'}
                      </td>
                      <td style={{ padding: '16px 24px', color: '#6b7280' }}>
                        {item.version || 'N/A'}
                      </td>
                      <td style={{ padding: '16px 24px', color: '#6b7280' }}>
                        {item.publisher || 'N/A'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredInstalls.length > 0 && (
          <Pagination
            totalItems={filteredInstalls.length}
            itemsPerPage={50}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  )
}
