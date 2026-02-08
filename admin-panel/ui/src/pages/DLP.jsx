import { useState, useEffect, useMemo } from 'react'
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  Search,
  FileText,
  Eye,
  EyeOff,
  Lock,
  Clock,
  Calendar,
  User,
  Filter,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Zap,
} from 'lucide-react'
import { BarChart, DonutChart } from '@tremor/react'
import Pagination from '../components/Pagination'
import ExportButton from '../components/ExportButton'

// Mock data toggle
const USE_MOCK_DATA = false

const MOCK_EVENTS = [
  { id: 1, timestamp: new Date().toISOString(), employee_name: 'John Smith', pattern_name: 'Credit Card Number', severity: 'high', source: 'Clipboard', matched_content: '4111-1111-1111-1111' },
  { id: 2, timestamp: new Date(Date.now() - 3600000).toISOString(), employee_name: 'Sarah Johnson', pattern_name: 'Social Security Number', severity: 'critical', source: 'Email', matched_content: '123-45-6789' },
  { id: 3, timestamp: new Date(Date.now() - 7200000).toISOString(), employee_name: 'Mike Davis', pattern_name: 'Bank Account', severity: 'high', source: 'File', matched_content: '9876543210' },
  { id: 4, timestamp: new Date(Date.now() - 10800000).toISOString(), employee_name: 'Emily Chen', pattern_name: 'API Key', severity: 'medium', source: 'Clipboard', matched_content: 'sk_live_abc123xyz' },
  { id: 5, timestamp: new Date(Date.now() - 14400000).toISOString(), employee_name: 'David Wilson', pattern_name: 'Password Pattern', severity: 'high', source: 'Chat', matched_content: 'Pass@word123' },
  { id: 6, timestamp: new Date(Date.now() - 18000000).toISOString(), employee_name: 'Lisa Anderson', pattern_name: 'Email Address', severity: 'low', source: 'File', matched_content: 'private@secret.com' },
  { id: 7, timestamp: new Date(Date.now() - 21600000).toISOString(), employee_name: 'Robert Taylor', pattern_name: 'Phone Number', severity: 'low', source: 'Clipboard', matched_content: '+1-555-123-4567' },
  { id: 8, timestamp: new Date(Date.now() - 25200000).toISOString(), employee_name: 'Jennifer Martin', pattern_name: 'Credit Card Number', severity: 'high', source: 'Email', matched_content: '5500-0000-0000-0004' },
]

const MOCK_AGENTS = [
  { id: 'agent-1', employee_name: 'John Smith', pc_name: 'DESKTOP-001' },
  { id: 'agent-2', employee_name: 'Sarah Johnson', pc_name: 'DESKTOP-002' },
  { id: 'agent-3', employee_name: 'Mike Davis', pc_name: 'DESKTOP-003' },
]

const getSeverityConfig = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'critical':
    case 'high':
      return { color: '#ef4444', bg: '#fef2f2', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', icon: ShieldAlert }
    case 'medium':
      return { color: '#f59e0b', bg: '#fffbeb', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', icon: AlertTriangle }
    case 'low':
      return { color: '#3b82f6', bg: '#eff6ff', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', icon: Info }
    default:
      return { color: '#ef4444', bg: '#fef2f2', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', icon: ShieldAlert }
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'Unknown'
  return new Date(dateStr).toLocaleString()
}

const maskContent = (content, show = false) => {
  if (!content) return '-'
  if (show) return content
  if (content.length <= 4) return '****'
  return content.substring(0, 2) + '*'.repeat(Math.min(content.length - 4, 10)) + content.substring(content.length - 2)
}

export default function DLP() {
  const [events, setEvents] = useState([])
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [dateRange, setDateRange] = useState('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [showContent, setShowContent] = useState({})
  const [currentPage, setCurrentPage] = useState(1)
  const [stats, setStats] = useState({
    total: 0,
    high: 0,
    medium: 0,
    low: 0,
    patterns: 0,
  })

  useEffect(() => {
    fetchAgents()
    fetchEvents()
  }, [selectedAgent, dateRange])

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.data_type === 'dlp_alerts') {
        setSyncing(false)
        fetchEvents()
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

  const fetchEvents = async () => {
    if (USE_MOCK_DATA) {
      setLoading(true)
      setTimeout(() => {
        setEvents(MOCK_EVENTS)
        processEventsData(MOCK_EVENTS)
        setLoading(false)
      }, 500)
      return
    }
    setLoading(true)
    let url = '/api/monitoring/dlp-alerts?limit=500'
    if (selectedAgent) url += `&agent_id=${selectedAgent}`
    try {
      const response = await fetch(url)
      const data = await response.json()
      setEvents(data)
      processEventsData(data)
    } catch (error) {
      console.error('Error:', error)
    }
    setLoading(false)
  }

  const processEventsData = (data) => {
    let high = 0, medium = 0, low = 0
    const patternCounts = {}

    data.forEach(e => {
      const severity = e.severity?.toLowerCase() || 'high'
      if (severity === 'critical' || severity === 'high') high++
      else if (severity === 'medium') medium++
      else low++
      const pattern = e.pattern_name || 'Unknown'
      patternCounts[pattern] = (patternCounts[pattern] || 0) + 1
    })

    setStats({
      total: data.length,
      high,
      medium,
      low,
      patterns: Object.keys(patternCounts).length,
    })
  }

  const toggleShowContent = (index) => {
    setShowContent(prev => ({ ...prev, [index]: !prev[index] }))
  }

  const requestLatest = () => {
    if (!selectedAgent || !window.ws) return
    setSyncing(true)
    window.ws.send(JSON.stringify({ type: 'request_data_sync', agent_id: selectedAgent, data_type: 'dlp_alerts' }))
    setTimeout(() => setSyncing(false), 15000)
  }

  const alertsByTypeChartData = useMemo(() => {
    const typeCounts = {}
    events.forEach(e => {
      const type = e.pattern_name || 'Unknown'
      typeCounts[type] = (typeCounts[type] || 0) + 1
    })

    return Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type, count]) => ({
        type,
        Alerts: count
      }))
  }, [events])

  const alertsBySourceChartData = useMemo(() => {
    const sourceCounts = {}
    events.forEach(e => {
      const source = e.source || 'Unknown'
      sourceCounts[source] = (sourceCounts[source] || 0) + 1
    })

    return Object.entries(sourceCounts).map(([source, count]) => ({
      name: source,
      value: count
    }))
  }, [events])

  const filteredEvents = events.filter(e => {
    if (severityFilter !== 'all') {
      const severity = e.severity?.toLowerCase() || 'high'
      if (severityFilter === 'high' && severity !== 'critical' && severity !== 'high') return false
      if (severityFilter === 'medium' && severity !== 'medium') return false
      if (severityFilter === 'low' && severity !== 'low') return false
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        (e.pattern_name && e.pattern_name.toLowerCase().includes(query)) ||
        (e.employee_name && e.employee_name.toLowerCase().includes(query)) ||
        (e.source && e.source.toLowerCase().includes(query))
      )
    }
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Tremor Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Alerts by Type - BarChart */}
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '20px'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
            DLP Alerts by Type
          </h3>
          <BarChart
            data={alertsByTypeChartData}
            index="type"
            categories={["Alerts"]}
            colors={["red"]}
            className="h-52"
          />
        </div>

        {/* Alerts by Source - DonutChart */}
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '20px'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
            DLP Alerts by Source
          </h3>
          <DonutChart
            data={alertsBySourceChartData}
            category="value"
            index="name"
            colors={["blue", "purple", "cyan", "orange", "green"]}
            className="h-52"
          />
        </div>
      </div>

      {/* Stats Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
        {/* Total Alerts */}
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
            background: 'radial-gradient(circle at top right, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
            flexShrink: 0
          }}>
            <Shield style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Alerts</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{stats.total}</p>
          </div>
        </div>

        {/* High Severity */}
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
            background: 'radial-gradient(circle at top right, rgba(239, 68, 68, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
            flexShrink: 0
          }}>
            <ShieldAlert style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>High Severity</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{stats.high}</p>
          </div>
        </div>

        {/* Medium Severity */}
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
            background: 'radial-gradient(circle at top right, rgba(245, 158, 11, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
            flexShrink: 0
          }}>
            <AlertTriangle style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Medium Severity</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{stats.medium}</p>
          </div>
        </div>

        {/* Low Severity */}
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
            <Info style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Low Severity</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{stats.low}</p>
          </div>
        </div>

        {/* Pattern Types */}
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
            <FileText style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pattern Types</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{stats.patterns}</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Detection Patterns Chart */}
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
            background: 'linear-gradient(90deg, #ef4444 0%, #8b5cf6 100%)',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }} />
          <div style={{
            position: 'absolute',
            top: '4px',
            right: 0,
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle at top right, rgba(239, 68, 68, 0.06) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)'
              }}>
                <BarChart3 style={{ width: '20px', height: '20px', color: '#ffffff' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>Detection Patterns</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Top patterns by detection count</p>
              </div>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {[
                { name: 'Credit Card Number', count: 45, color: '#ef4444' },
                { name: 'Social Security Number', count: 32, color: '#f97316' },
                { name: 'Bank Account', count: 28, color: '#f59e0b' },
                { name: 'API Key', count: 24, color: '#84cc16' },
                { name: 'Password Pattern', count: 18, color: '#22c55e' },
                { name: 'Email Address', count: 12, color: '#14b8a6' },
              ].map((pattern, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#475569' }}>{pattern.name}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{pattern.count}</span>
                  </div>
                  <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${(pattern.count / 45) * 100}%`,
                      background: pattern.color,
                      borderRadius: '4px',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Severity Distribution */}
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
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>Severity Distribution</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Alerts by severity level</p>
              </div>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '120px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: `conic-gradient(#ef4444 0% ${(stats.high / stats.total) * 100 || 0}%, #f59e0b ${(stats.high / stats.total) * 100 || 0}% ${((stats.high + stats.medium) / stats.total) * 100 || 0}%, #3b82f6 ${((stats.high + stats.medium) / stats.total) * 100 || 0}% 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column'
                }}>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>{stats.total}</span>
                  <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Total</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              {[
                { label: 'High', value: stats.high, color: '#ef4444' },
                { label: 'Medium', value: stats.medium, color: '#f59e0b' },
                { label: 'Low', value: stats.low, color: '#3b82f6' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color }} />
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{item.label}: <strong style={{ color: '#1e293b' }}>{item.value}</strong></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* DLP Alerts Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        overflow: 'hidden'
      }}>
        {/* Premium Toolbar */}
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
              placeholder="Search DLP alerts..."
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
              <Filter style={{
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
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
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
                <option value="all">All Severity</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
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
                  <option key={a.id} value={a.id}>
                    {a.employee_name || a.pc_name}
                  </option>
                ))}
              </select>
            </div>

            <button onClick={requestLatest} disabled={!selectedAgent || syncing} title={!selectedAgent ? 'Select an agent first' : 'Request latest data from agent'} style={{ height: '40px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', background: selectedAgent && !syncing ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#e2e8f0', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: selectedAgent && !syncing ? '#ffffff' : '#94a3b8', cursor: selectedAgent && !syncing ? 'pointer' : 'not-allowed', boxShadow: selectedAgent && !syncing ? '0 2px 4px rgba(16, 185, 129, 0.3)' : 'none', transition: 'all 0.2s' }}>
              {syncing ? <RefreshCw style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} /> : <Zap style={{ width: '15px', height: '15px' }} />}
              {syncing ? 'Syncing...' : 'Request Latest'}
            </button>

            <button
              onClick={fetchEvents}
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
              data={filteredEvents}
              filename="dlp_alerts"
              columns={[
                { key: 'timestamp', label: 'Timestamp' },
                { key: 'employee_name', label: 'Employee Name' },
                { key: 'pattern_name', label: 'Pattern Name' },
                { key: 'severity', label: 'Severity' },
                { key: 'source', label: 'Source' },
                { key: 'matched_content', label: 'Matched Content' },
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
            {filteredEvents.length} alert{filteredEvents.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 20px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '3px solid #e2e8f0',
              borderTopColor: '#8b5cf6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ marginTop: '16px', fontSize: '14px', color: '#64748b' }}>Loading DLP alerts...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 20px'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)'
            }}>
              <ShieldCheck style={{ width: '36px', height: '36px', color: '#ffffff' }} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>No DLP alerts</h3>
            <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center' }}>No sensitive data detected</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Agent</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pattern</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Severity</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Source</th>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Matched Content</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.slice((currentPage - 1) * 50, currentPage * 50).map((e, i) => {
                  const config = getSeverityConfig(e.severity)
                  const IconComponent = config.icon

                  return (
                    <tr
                      key={e.id || i}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(ev) => ev.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(ev) => ev.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Clock style={{ width: '14px', height: '14px', color: '#94a3b8' }} />
                          <span style={{ fontSize: '13px', color: '#475569' }}>{formatDate(e.timestamp)}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#ffffff'
                          }}>
                            {(e.employee_name || 'U')[0]}
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>
                            {e.employee_name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                          {e.pattern_name || 'Sensitive Data'}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: config.bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <IconComponent style={{ width: '14px', height: '14px', color: config.color }} />
                          </div>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: config.bg,
                            fontSize: '11px',
                            fontWeight: 600,
                            color: config.color,
                            textTransform: 'uppercase'
                          }}>
                            {e.severity || 'HIGH'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        {e.source ? (
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: '#eff6ff',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#3b82f6'
                          }}>
                            {e.source}
                          </span>
                        ) : (
                          <span style={{ fontSize: '13px', color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        {e.matched_content ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              background: '#f1f5f9',
                              borderRadius: '8px',
                              fontFamily: 'monospace',
                              fontSize: '12px',
                              maxWidth: '200px'
                            }}>
                              <Lock style={{ width: '14px', height: '14px', color: '#64748b', flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' }}>
                                {maskContent(e.matched_content, showContent[i])}
                              </span>
                            </div>
                            <button
                              onClick={() => toggleShowContent(i)}
                              style={{
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#f1f5f9',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                color: '#64748b',
                                cursor: 'pointer'
                              }}
                            >
                              {showContent[i] ? (
                                <EyeOff style={{ width: '14px', height: '14px' }} />
                              ) : (
                                <Eye style={{ width: '14px', height: '14px' }} />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '13px', color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredEvents.length > 0 && (
          <Pagination
            totalItems={filteredEvents.length}
            itemsPerPage={50}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
