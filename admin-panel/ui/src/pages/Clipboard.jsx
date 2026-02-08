import { useState, useEffect, useMemo } from 'react'
import {
  Clipboard as ClipboardIcon,
  Search,
  Copy,
  Eye,
  X,
  AlertTriangle,
  FileText,
  Clock,
  TrendingUp,
  Calendar,
  User,
  Download,
  RefreshCw,
  Activity,
  PieChart,
  Zap,
} from 'lucide-react'
import { BarChart } from '@tremor/react'
import Pagination from '../components/Pagination'
import ExportButton from '../components/ExportButton'

// Mock data toggle
const USE_MOCK_DATA = false

const MOCK_CLIPBOARD = [
  { id: 1, timestamp: new Date().toISOString(), employee_name: 'John Smith', content_type: 'text', content: 'Meeting notes: Discussed Q4 budget allocation and resource planning' },
  { id: 2, timestamp: new Date(Date.now() - 1800000).toISOString(), employee_name: 'Sarah Johnson', content_type: 'text', content: '4111-1111-1111-1111' },
  { id: 3, timestamp: new Date(Date.now() - 3600000).toISOString(), employee_name: 'Mike Davis', content_type: 'text', content: 'password123secure' },
  { id: 4, timestamp: new Date(Date.now() - 5400000).toISOString(), employee_name: 'Emily Chen', content_type: 'text', content: 'Hello team, please review the attached document' },
  { id: 5, timestamp: new Date(Date.now() - 7200000).toISOString(), employee_name: 'David Wilson', content_type: 'text', content: 'john.doe@company.com' },
  { id: 6, timestamp: new Date(Date.now() - 9000000).toISOString(), employee_name: 'Lisa Anderson', content_type: 'text', content: '123-45-6789' },
  { id: 7, timestamp: new Date(Date.now() - 10800000).toISOString(), employee_name: 'Robert Taylor', content_type: 'text', content: 'Project deadline extended to Friday' },
  { id: 8, timestamp: new Date(Date.now() - 12600000).toISOString(), employee_name: 'Jennifer Martin', content_type: 'text', content: 'API_KEY=sk_live_abc123xyz789' },
]

const MOCK_AGENTS = [
  { id: 'agent-1', employee_name: 'John Smith', pc_name: 'DESKTOP-001' },
  { id: 'agent-2', employee_name: 'Sarah Johnson', pc_name: 'DESKTOP-002' },
  { id: 'agent-3', employee_name: 'Mike Davis', pc_name: 'DESKTOP-003' },
]

const sensitivePatterns = [
  { name: 'Credit Card', pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/ },
  { name: 'SSN', pattern: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/ },
  { name: 'Email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ },
  { name: 'Password', pattern: /password|pwd|secret|token|api[_-]?key/i },
]

const detectSensitiveData = (content) => {
  if (!content) return []
  const detected = []
  sensitivePatterns.forEach(({ name, pattern }) => {
    if (pattern.test(content)) detected.push(name)
  })
  return detected
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'Unknown'
  return new Date(dateStr).toLocaleString()
}

export default function Clipboard() {
  const [clipboard, setClipboard] = useState([])
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [dateRange, setDateRange] = useState('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState(null)
  const [copyFeedback, setCopyFeedback] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [stats, setStats] = useState({
    totalEntries: 0,
    sensitiveCount: 0,
    textCount: 0,
    avgLength: 0,
  })

  useEffect(() => {
    fetchAgents()
    fetchClipboard()
  }, [selectedAgent, dateRange])

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.data_type === 'clipboard') {
        setSyncing(false)
        fetchClipboard()
      }
    }
    window.addEventListener('data_sync_complete', handler)
    return () => window.removeEventListener('data_sync_complete', handler)
  }, [selectedAgent])

  const fetchAgents = async () => {
    if (USE_MOCK_DATA) {
      setAgents(MOCK_AGENTS)
      return
    }
    try {
      const response = await fetch('/api/agents')
      setAgents(await response.json())
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const fetchClipboard = async () => {
    if (USE_MOCK_DATA) {
      setLoading(true)
      setTimeout(() => {
        setClipboard(MOCK_CLIPBOARD)
        processClipboardData(MOCK_CLIPBOARD)
        setLoading(false)
      }, 500)
      return
    }
    setLoading(true)
    let url = '/api/monitoring/clipboard?limit=500'
    if (selectedAgent) url += `&agent_id=${selectedAgent}`
    try {
      const response = await fetch(url)
      const data = await response.json()
      setClipboard(data)
      processClipboardData(data)
    } catch (error) {
      console.error('Error:', error)
    }
    setLoading(false)
  }

  const processClipboardData = (data) => {
    let sensitiveCount = 0
    let totalLength = 0

    data.forEach(c => {
      const content = c.content || ''
      totalLength += content.length
      if (detectSensitiveData(content).length > 0) sensitiveCount++
    })

    setStats({
      totalEntries: data.length,
      sensitiveCount,
      textCount: data.length,
      avgLength: data.length > 0 ? Math.round(totalLength / data.length) : 0,
    })
  }

  // Process hourly data for Tremor chart
  const hourlyChartData = useMemo(() => {
    const hourCounts = {}
    clipboard.forEach(c => {
      if (c.timestamp || c.created_at) {
        const hour = new Date(c.timestamp || c.created_at).getHours()
        const key = `${hour}:00`
        hourCounts[key] = (hourCounts[key] || 0) + 1
      }
    })

    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      Events: hourCounts[`${i}:00`] || 0
    }))
  }, [clipboard])

  const requestLatest = () => {
    if (!selectedAgent || !window.ws) return
    setSyncing(true)
    window.ws.send(JSON.stringify({ type: 'request_data_sync', agent_id: selectedAgent, data_type: 'clipboard' }))
    setTimeout(() => setSyncing(false), 15000)
  }

  const copyToClipboard = async (content, index) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopyFeedback(index)
      setTimeout(() => setCopyFeedback(null), 2000)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  const filteredClipboard = clipboard.filter(c => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      (c.content && c.content.toLowerCase().includes(query)) ||
      (c.content_type && c.content_type.toLowerCase().includes(query))
    )
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Stats Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {/* Total Entries */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '16px',
          padding: '20px 24px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100px',
            height: '100px',
            background: 'radial-gradient(circle at top right, rgba(20, 184, 166, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
            flexShrink: 0
          }}>
            <ClipboardIcon style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Entries</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{stats.totalEntries}</p>
          </div>
        </div>

        {/* Sensitive Data */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '16px',
          padding: '20px 24px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100px',
            height: '100px',
            background: `radial-gradient(circle at top right, ${stats.sensitiveCount > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)'} 0%, transparent 70%)`,
            pointerEvents: 'none'
          }} />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: stats.sensitiveCount > 0
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: stats.sensitiveCount > 0
              ? '0 4px 12px rgba(239, 68, 68, 0.3)'
              : '0 4px 12px rgba(16, 185, 129, 0.3)',
            flexShrink: 0
          }}>
            <AlertTriangle style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sensitive Data</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{stats.sensitiveCount}</p>
          </div>
        </div>

        {/* Text Copies */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '16px',
          padding: '20px 24px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100px',
            height: '100px',
            background: 'radial-gradient(circle at top right, rgba(6, 182, 212, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)',
            flexShrink: 0
          }}>
            <FileText style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Text Copies</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{stats.textCount}</p>
          </div>
        </div>

        {/* Avg Length */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '16px',
          padding: '20px 24px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100px',
            height: '100px',
            background: 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            flexShrink: 0
          }}>
            <TrendingUp style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Length</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{stats.avgLength}</p>
          </div>
        </div>
      </div>

      {/* Tremor Bar Chart */}
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
          Clipboard Events Per Hour
        </h3>
        <BarChart
          data={hourlyChartData}
          index="hour"
          categories={["Events"]}
          colors={["blue"]}
          className="h-52"
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Activity Chart */}
        <div style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg, #14b8a6 0%, #06b6d4 100%)',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }} />
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(20, 184, 166, 0.25)'
              }}>
                <Activity style={{ width: '20px', height: '20px', color: '#ffffff' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>Copy Activity</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Clipboard activity by hour</p>
              </div>
            </div>
            <div style={{
              height: '200px',
              background: 'linear-gradient(180deg, rgba(248, 250, 252, 0.5) 0%, rgba(241, 245, 249, 0.8) 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-around',
              padding: '20px 16px 16px',
              gap: '8px'
            }}>
              {Array.from({ length: 12 }, (_, i) => {
                const height = Math.random() * 100 + 20
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <div style={{
                      width: '100%',
                      maxWidth: '24px',
                      height: `${height}px`,
                      background: 'linear-gradient(180deg, #14b8a6 0%, #0d9488 100%)',
                      borderRadius: '4px 4px 0 0'
                    }} />
                    <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>{i * 2}:00</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Content Types */}
        <div style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg, #8b5cf6 0%, #a855f7 100%)',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }} />
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)'
              }}>
                <PieChart style={{ width: '20px', height: '20px', color: '#ffffff' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>Content Types</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Distribution by type</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Text', value: 85, color: '#14b8a6' },
                { label: 'Code', value: 10, color: '#3b82f6' },
                { label: 'URL', value: 5, color: '#8b5cf6' },
              ].map((item, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#475569' }}>{item.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{item.value}%</span>
                  </div>
                  <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${item.value}%`,
                      background: item.color,
                      borderRadius: '4px'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Clipboard List */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        overflow: 'hidden'
      }}>
        {/* Toolbar */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ position: 'relative', flex: '1', maxWidth: '320px', minWidth: '200px' }}>
            <Search style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '18px',
              height: '18px',
              color: '#94a3b8',
              pointerEvents: 'none'
            }} />
            <input
              type="text"
              placeholder="Search clipboard..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: '44px',
                paddingLeft: '46px',
                paddingRight: '16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '14px',
                color: '#1e293b',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <Calendar style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '16px',
                height: '16px',
                color: '#64748b',
                pointerEvents: 'none'
              }} />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                style={{
                  height: '40px',
                  paddingLeft: '38px',
                  paddingRight: '32px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#475569',
                  cursor: 'pointer',
                  appearance: 'none',
                  outline: 'none'
                }}
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            <div style={{ position: 'relative' }}>
              <User style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '16px',
                height: '16px',
                color: '#64748b',
                pointerEvents: 'none'
              }} />
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                style={{
                  height: '40px',
                  paddingLeft: '38px',
                  paddingRight: '32px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#475569',
                  cursor: 'pointer',
                  appearance: 'none',
                  outline: 'none',
                  minWidth: '140px'
                }}
              >
                <option value="">All Agents</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.employee_name || a.pc_name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={requestLatest}
              disabled={!selectedAgent || syncing}
              title={!selectedAgent ? 'Select an agent first' : 'Request latest data from agent'}
              style={{
                height: '40px',
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: selectedAgent && !syncing ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#e2e8f0',
                border: 'none',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                color: selectedAgent && !syncing ? '#ffffff' : '#94a3b8',
                cursor: selectedAgent && !syncing ? 'pointer' : 'not-allowed',
                boxShadow: selectedAgent && !syncing ? '0 2px 4px rgba(16, 185, 129, 0.3)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {syncing ? (
                <RefreshCw style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} />
              ) : (
                <Zap style={{ width: '15px', height: '15px' }} />
              )}
              {syncing ? 'Syncing...' : 'Request Latest'}
            </button>

            <button
              onClick={fetchClipboard}
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              <RefreshCw style={{ width: '16px', height: '16px' }} />
            </button>

            <ExportButton
              data={filteredClipboard}
              filename="clipboard_data"
              columns={[
                { key: 'timestamp', label: 'Timestamp' },
                { key: 'employee_name', label: 'Employee Name' },
                { key: 'content_type', label: 'Content Type' },
                { key: 'content', label: 'Content' },
              ]}
            />
          </div>
        </div>

        {/* Count Row */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{
            padding: '6px 12px',
            background: '#f1f5f9',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#475569'
          }}>
            {filteredClipboard.length} entr{filteredClipboard.length !== 1 ? 'ies' : 'y'}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {loading ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '3px solid #e2e8f0',
                borderTopColor: '#14b8a6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ marginTop: '16px', fontSize: '14px', color: '#64748b' }}>Loading clipboard data...</p>
            </div>
          ) : filteredClipboard.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <ClipboardIcon style={{ width: '36px', height: '36px', color: '#94a3b8' }} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>No clipboard data</h3>
              <p style={{ fontSize: '14px', color: '#64748b' }}>Clipboard entries will appear here</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredClipboard.slice((currentPage - 1) * 50, currentPage * 50).map((c, i) => {
                const sensitiveTypes = detectSensitiveData(c.content)
                const hasSensitive = sensitiveTypes.length > 0

                return (
                  <div
                    key={c.id || i}
                    style={{
                      padding: '16px 20px',
                      borderRadius: '12px',
                      border: `1px solid ${hasSensitive ? '#fecaca' : '#e2e8f0'}`,
                      background: hasSensitive
                        ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
                        : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ClipboardIcon style={{ width: '16px', height: '16px', color: hasSensitive ? '#ef4444' : '#14b8a6' }} />
                        <span style={{ fontSize: '12px', color: '#64748b' }}>{formatDate(c.timestamp || c.created_at)}</span>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: hasSensitive ? '#fee2e2' : '#ccfbf1',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: hasSensitive ? '#dc2626' : '#0d9488'
                        }}>
                          {c.content_type || 'text'}
                        </span>
                        {hasSensitive && (
                          <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: '#fee2e2',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#dc2626'
                          }}>
                            <AlertTriangle style={{ width: '12px', height: '12px' }} />
                            {sensitiveTypes.join(', ')}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => setSelectedItem(c)}
                          style={{
                            height: '32px',
                            padding: '0 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: '#475569',
                            cursor: 'pointer'
                          }}
                        >
                          <Eye style={{ width: '14px', height: '14px' }} />
                          View
                        </button>
                        <button
                          onClick={() => copyToClipboard(c.content, i)}
                          style={{
                            height: '32px',
                            padding: '0 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: copyFeedback === i ? '#dcfce7' : '#ffffff',
                            border: `1px solid ${copyFeedback === i ? '#86efac' : '#e2e8f0'}`,
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: copyFeedback === i ? '#16a34a' : '#475569',
                            cursor: 'pointer'
                          }}
                        >
                          <Copy style={{ width: '14px', height: '14px' }} />
                          {copyFeedback === i ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                    <div style={{
                      padding: '12px',
                      background: 'rgba(255,255,255,0.6)',
                      borderRadius: '8px',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      color: '#1e293b',
                      lineHeight: 1.5
                    }}>
                      {(c.content || '').substring(0, 200)}
                      {(c.content || '').length > 200 ? '...' : ''}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '10px' }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{c.employee_name || c.pc_name || 'Unknown Agent'}</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{(c.content || '').length} characters</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {!loading && filteredClipboard.length > 0 && (
          <Pagination
            totalItems={filteredClipboard.length}
            itemsPerPage={50}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Modal */}
      {selectedItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', margin: 0 }}>Clipboard Content</h3>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{formatDate(selectedItem.timestamp || selectedItem.created_at)}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => copyToClipboard(selectedItem.content, 'modal')}
                  style={{
                    height: '36px',
                    padding: '0 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: copyFeedback === 'modal' ? '#dcfce7' : '#f8fafc',
                    border: `1px solid ${copyFeedback === 'modal' ? '#86efac' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: copyFeedback === 'modal' ? '#16a34a' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  <Copy style={{ width: '16px', height: '16px' }} />
                  {copyFeedback === 'modal' ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={() => setSelectedItem(null)}
                  style={{
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  <X style={{ width: '18px', height: '18px' }} />
                </button>
              </div>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: '#ccfbf1',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#0d9488'
                }}>
                  {selectedItem.content_type || 'text'}
                </span>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: '#dbeafe',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#2563eb'
                }}>
                  {(selectedItem.content || '').length} characters
                </span>
                {detectSensitiveData(selectedItem.content).map((type, i) => (
                  <span key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: '#fee2e2',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#dc2626'
                  }}>
                    <AlertTriangle style={{ width: '12px', height: '12px' }} />
                    {type}
                  </span>
                ))}
              </div>
              <div style={{
                padding: '16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#1e293b',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                lineHeight: 1.6
              }}>
                {selectedItem.content || 'No content'}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
