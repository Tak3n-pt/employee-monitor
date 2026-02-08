import { useState, useEffect, useMemo } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  AlertOctagon,
  Info,
  Bell,
  Search,
  Shield,
  Clock,
  XCircle,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  User,
  TrendingUp,
  Activity,
} from 'lucide-react'
import { DonutChart } from '@tremor/react'
import Pagination from '../components/Pagination'
import ExportButton from '../components/ExportButton'

// Mock data toggle
const USE_MOCK_DATA = false

const MOCK_ALERTS = [
  { id: 1, timestamp: new Date().toISOString(), employee_name: 'John Smith', rule_name: 'USB Device Connected', severity: 'critical', risk_score: 95, acknowledged: false, description: 'Unauthorized USB device detected' },
  { id: 2, timestamp: new Date(Date.now() - 3600000).toISOString(), employee_name: 'Sarah Johnson', rule_name: 'After Hours Login', severity: 'high', risk_score: 78, acknowledged: false, description: 'Login attempt outside business hours' },
  { id: 3, timestamp: new Date(Date.now() - 7200000).toISOString(), employee_name: 'Mike Davis', rule_name: 'Large File Transfer', severity: 'medium', risk_score: 62, acknowledged: true, description: 'File over 100MB transferred' },
  { id: 4, timestamp: new Date(Date.now() - 10800000).toISOString(), employee_name: 'Emily Chen', rule_name: 'Multiple Failed Logins', severity: 'high', risk_score: 85, acknowledged: false, description: '5 failed login attempts' },
  { id: 5, timestamp: new Date(Date.now() - 14400000).toISOString(), employee_name: 'David Wilson', rule_name: 'Sensitive Data Access', severity: 'critical', risk_score: 92, acknowledged: false, description: 'Accessed restricted database' },
  { id: 6, timestamp: new Date(Date.now() - 18000000).toISOString(), employee_name: 'Lisa Anderson', rule_name: 'Unusual Download Pattern', severity: 'medium', risk_score: 55, acknowledged: true, description: 'Downloaded 50+ files in 1 hour' },
  { id: 7, timestamp: new Date(Date.now() - 21600000).toISOString(), employee_name: 'Robert Taylor', rule_name: 'VPN Connection Change', severity: 'low', risk_score: 25, acknowledged: true, description: 'VPN location changed' },
  { id: 8, timestamp: new Date(Date.now() - 25200000).toISOString(), employee_name: 'Jennifer Martin', rule_name: 'Email Forwarding Rule', severity: 'high', risk_score: 75, acknowledged: false, description: 'Auto-forward rule created' },
  { id: 9, timestamp: new Date(Date.now() - 28800000).toISOString(), employee_name: 'Chris Brown', rule_name: 'Application Install', severity: 'low', risk_score: 30, acknowledged: true, description: 'New software installed' },
  { id: 10, timestamp: new Date(Date.now() - 32400000).toISOString(), employee_name: 'Amanda White', rule_name: 'Network Anomaly', severity: 'medium', risk_score: 58, acknowledged: false, description: 'Unusual network traffic detected' },
]

const MOCK_AGENTS = [
  { id: 'agent-1', employee_name: 'John Smith', pc_name: 'DESKTOP-001' },
  { id: 'agent-2', employee_name: 'Sarah Johnson', pc_name: 'DESKTOP-002' },
  { id: 'agent-3', employee_name: 'Mike Davis', pc_name: 'DESKTOP-003' },
]

const getSeverityConfig = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return { color: '#ef4444', bg: '#fef2f2', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', icon: AlertOctagon }
    case 'high':
      return { color: '#f97316', bg: '#fff7ed', gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', icon: AlertTriangle }
    case 'medium':
      return { color: '#f59e0b', bg: '#fffbeb', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', icon: Bell }
    case 'low':
      return { color: '#3b82f6', bg: '#eff6ff', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', icon: Info }
    default:
      return { color: '#6b7280', bg: '#f3f4f6', gradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)', icon: Info }
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'Unknown'
  return new Date(dateStr).toLocaleString()
}

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [dateRange, setDateRange] = useState('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    warning: 0,
    info: 0,
    unresolved: 0,
  })

  useEffect(() => {
    fetchAgents()
    fetchAlerts()
  }, [selectedAgent, dateRange])

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

  const fetchAlerts = async () => {
    if (USE_MOCK_DATA) {
      setLoading(true)
      setTimeout(() => {
        setAlerts(MOCK_ALERTS)
        processAlertsData(MOCK_ALERTS)
        setLoading(false)
      }, 500)
      return
    }
    try {
      setLoading(true)
      let url = '/api/monitoring/alerts?limit=500'
      if (selectedAgent) url += `&agent_id=${selectedAgent}`
      const response = await fetch(url)
      const data = await response.json()
      setAlerts(data)
      processAlertsData(data)
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const processAlertsData = (data) => {
    let critical = 0
    let warning = 0
    let info = 0
    let unresolved = 0

    data.forEach(a => {
      const severity = a.severity?.toLowerCase() || 'low'
      if (severity === 'critical' || severity === 'high') critical++
      else if (severity === 'medium') warning++
      else info++
      if (!a.acknowledged) unresolved++
    })

    setStats({ total: data.length, critical, warning, info, unresolved })
  }

  const acknowledgeAlert = async (id) => {
    if (USE_MOCK_DATA) {
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a))
      if (window.showNotification) {
        window.showNotification('Alert acknowledged', 'success')
      }
      return
    }
    try {
      await fetch(`/api/monitoring/alerts/${id}/acknowledge`, { method: 'POST' })
      fetchAlerts()
      if (window.showNotification) {
        window.showNotification('Alert acknowledged successfully', 'success')
      }
    } catch (error) {
      console.error('Error:', error)
      if (window.showNotification) {
        window.showNotification('Failed to acknowledge alert', 'error')
      }
    }
  }

  const alertsByCategoryChartData = useMemo(() => {
    const categoryCounts = {}

    alerts.forEach(a => {
      const category = a.rule_name || 'Unknown'
      categoryCounts[category] = (categoryCounts[category] || 0) + 1
    })

    return Object.entries(categoryCounts).map(([category, count]) => ({
      name: category,
      value: count
    }))
  }, [alerts])

  const filteredAlerts = alerts.filter(a => {
    if (severityFilter !== 'all') {
      const severity = a.severity?.toLowerCase() || 'low'
      if (severityFilter === 'critical' && severity !== 'critical' && severity !== 'high') return false
      if (severityFilter === 'warning' && severity !== 'medium') return false
      if (severityFilter === 'info' && severity !== 'low') return false
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        (a.rule_name && a.rule_name.toLowerCase().includes(query)) ||
        (a.employee_name && a.employee_name.toLowerCase().includes(query)) ||
        (a.description && a.description.toLowerCase().includes(query))
      )
    }
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Tremor Chart Section */}
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '20px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
          Alerts by Category
        </h3>
        <DonutChart
          data={alertsByCategoryChartData}
          category="value"
          index="name"
          colors={["red", "orange", "amber", "yellow", "lime", "green"]}
          className="h-52"
        />
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
            background: 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            flexShrink: 0
          }}>
            <Shield style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Alerts</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{stats.total}</p>
          </div>
        </div>

        {/* Critical/High */}
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
            <AlertOctagon style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Critical/High</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{stats.critical}</p>
          </div>
        </div>

        {/* Warnings */}
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
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Warnings</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{stats.warning}</p>
          </div>
        </div>

        {/* Info */}
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
            <Info style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Info</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{stats.info}</p>
          </div>
        </div>

        {/* Unresolved */}
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
            background: `radial-gradient(circle at top right, ${stats.unresolved > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)'} 0%, transparent 70%)`,
            pointerEvents: 'none'
          }} />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: stats.unresolved > 0
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: stats.unresolved > 0
              ? '0 4px 12px rgba(239, 68, 68, 0.3)'
              : '0 4px 12px rgba(16, 185, 129, 0.3)',
            flexShrink: 0
          }}>
            {stats.unresolved > 0 ? (
              <XCircle style={{ width: '22px', height: '22px', color: '#ffffff' }} />
            ) : (
              <CheckCircle style={{ width: '22px', height: '22px', color: '#ffffff' }} />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unresolved</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{stats.unresolved}</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Alerts Timeline Chart */}
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
            background: 'linear-gradient(90deg, #ef4444 0%, #f97316 50%, #f59e0b 100%)',
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
                <Activity style={{ width: '20px', height: '20px', color: '#ffffff' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>Alert Activity Timeline</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Alerts distribution over the last 24 hours</p>
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
                      background: height > 80
                        ? 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)'
                        : height > 50
                        ? 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)'
                        : 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease'
                    }} />
                    <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>{i * 2}:00</span>
                  </div>
                )
              })}
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
                <TrendingUp style={{ width: '20px', height: '20px', color: '#ffffff' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>Severity Distribution</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Breakdown by severity level</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Critical/High', value: stats.critical, color: '#ef4444', total: stats.total },
                { label: 'Warning', value: stats.warning, color: '#f59e0b', total: stats.total },
                { label: 'Info', value: stats.info, color: '#3b82f6', total: stats.total },
              ].map((item, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#475569' }}>{item.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{item.value}</span>
                  </div>
                  <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${item.total ? (item.value / item.total) * 100 : 0}%`,
                      background: item.color,
                      borderRadius: '4px',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Table */}
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
              placeholder="Search alerts..."
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
                <option value="critical">Critical/High</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
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
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.employee_name || agent.pc_name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchAlerts}
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
              data={filteredAlerts}
              filename="alerts"
              columns={[
                { key: 'timestamp', label: 'Timestamp' },
                { key: 'employee_name', label: 'Employee Name' },
                { key: 'rule_name', label: 'Alert Type' },
                { key: 'severity', label: 'Severity' },
                { key: 'description', label: 'Description' },
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
            {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''}
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
              borderTopColor: '#ef4444',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ marginTop: '16px', fontSize: '14px', color: '#64748b' }}>Loading alerts...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
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
              <CheckCircle style={{ width: '36px', height: '36px', color: '#ffffff' }} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>No alerts found</h3>
            <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center' }}>All systems are operating normally</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Agent</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Alert</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Severity</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Risk Score</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                  <th style={{ padding: '14px 24px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.slice((currentPage - 1) * 50, currentPage * 50).map((alert, i) => {
                  const config = getSeverityConfig(alert.severity)
                  const IconComponent = config.icon

                  return (
                    <tr
                      key={alert.id || i}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Clock style={{ width: '14px', height: '14px', color: '#94a3b8' }} />
                          <span style={{ fontSize: '13px', color: '#475569' }}>{formatDate(alert.timestamp)}</span>
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
                            {(alert.employee_name || 'U')[0]}
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>
                            {alert.employee_name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px', maxWidth: '200px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                          {alert.rule_name || 'Unknown Alert'}
                        </span>
                        {alert.description && (
                          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {alert.description}
                          </p>
                        )}
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
                            {alert.severity || 'LOW'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        {alert.risk_score !== undefined ? (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: alert.risk_score >= 80 ? '#fef2f2' : alert.risk_score >= 50 ? '#fffbeb' : '#f0fdf4',
                            fontSize: '13px',
                            fontWeight: 700,
                            color: alert.risk_score >= 80 ? '#dc2626' : alert.risk_score >= 50 ? '#d97706' : '#16a34a'
                          }}>
                            {alert.risk_score}
                          </div>
                        ) : (
                          <span style={{ fontSize: '13px', color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '16px' }}>
                        {alert.acknowledged ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#059669'
                          }}>
                            <CheckCircle style={{ width: '14px', height: '14px' }} />
                            Resolved
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#dc2626'
                          }}>
                            <XCircle style={{ width: '14px', height: '14px' }} />
                            Unresolved
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        {!alert.acknowledged && (
                          <button
                            onClick={() => acknowledgeAlert(alert.id)}
                            style={{
                              padding: '8px 16px',
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#ffffff',
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
                            }}
                          >
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredAlerts.length > 0 && (
          <Pagination
            totalItems={filteredAlerts.length}
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
