import { useState, useEffect, useMemo } from 'react'
import {
  LogIn,
  LogOut,
  Lock,
  Unlock,
  AlertTriangle,
  Search,
  Clock,
  ShieldAlert,
  TrendingUp,
  Zap,
  RefreshCw,
} from 'lucide-react'
import DateRangeFilter from '../components/DateRangeFilter'
import ExportButton from '../components/ExportButton'
import Pagination from '../components/Pagination'
import { BarChart } from '@tremor/react'

const USE_MOCK_DATA = false

const icons = {
  login: LogIn,
  logout: LogOut,
  lock: Lock,
  unlock: Unlock,
  failed: AlertTriangle,
  failure: AlertTriangle,
}

const eventStyles = {
  login: { bg: '#dcfce7', text: '#166534', border: '#86efac', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
  unlock: { bg: '#dcfce7', text: '#166534', border: '#86efac', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
  logout: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
  lock: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
  failed: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
  failure: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
  unknown: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd', gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' },
}

const mockEvents = [
  { id: 1, event_type: 'login', timestamp: '2024-01-15T08:30:00', employee_name: 'John Smith', pc_name: 'DESKTOP-001', username: 'jsmith', ip_address: '192.168.1.101' },
  { id: 2, event_type: 'login', timestamp: '2024-01-15T08:45:00', employee_name: 'Sarah Johnson', pc_name: 'DESKTOP-002', username: 'sjohnson', ip_address: '192.168.1.102' },
  { id: 3, event_type: 'failed', timestamp: '2024-01-15T09:00:00', employee_name: 'Mike Wilson', pc_name: 'DESKTOP-003', username: 'mwilson', ip_address: '192.168.1.103' },
  { id: 4, event_type: 'login', timestamp: '2024-01-15T09:05:00', employee_name: 'Mike Wilson', pc_name: 'DESKTOP-003', username: 'mwilson', ip_address: '192.168.1.103' },
  { id: 5, event_type: 'lock', timestamp: '2024-01-15T12:00:00', employee_name: 'John Smith', pc_name: 'DESKTOP-001', username: 'jsmith', ip_address: '192.168.1.101' },
  { id: 6, event_type: 'unlock', timestamp: '2024-01-15T13:00:00', employee_name: 'John Smith', pc_name: 'DESKTOP-001', username: 'jsmith', ip_address: '192.168.1.101' },
  { id: 7, event_type: 'logout', timestamp: '2024-01-15T17:30:00', employee_name: 'Sarah Johnson', pc_name: 'DESKTOP-002', username: 'sjohnson', ip_address: '192.168.1.102' },
  { id: 8, event_type: 'login', timestamp: '2024-01-15T03:15:00', employee_name: 'Emily Davis', pc_name: 'DESKTOP-004', username: 'edavis', ip_address: '192.168.1.104' },
  { id: 9, event_type: 'failed', timestamp: '2024-01-15T23:45:00', employee_name: 'Unknown', pc_name: 'DESKTOP-005', username: 'admin', ip_address: '10.0.0.50' },
  { id: 10, event_type: 'logout', timestamp: '2024-01-15T18:00:00', employee_name: 'John Smith', pc_name: 'DESKTOP-001', username: 'jsmith', ip_address: '192.168.1.101' },
  { id: 11, event_type: 'login', timestamp: '2024-01-15T09:15:00', employee_name: 'Emily Davis', pc_name: 'DESKTOP-004', username: 'edavis', ip_address: '192.168.1.104' },
  { id: 12, event_type: 'lock', timestamp: '2024-01-15T14:30:00', employee_name: 'Mike Wilson', pc_name: 'DESKTOP-003', username: 'mwilson', ip_address: '192.168.1.103' },
]

const mockAgents = [
  { id: '1', employee_name: 'John Smith', pc_name: 'DESKTOP-001' },
  { id: '2', employee_name: 'Sarah Johnson', pc_name: 'DESKTOP-002' },
  { id: '3', employee_name: 'Mike Wilson', pc_name: 'DESKTOP-003' },
  { id: '4', employee_name: 'Emily Davis', pc_name: 'DESKTOP-004' },
]

const isUnusualTime = (timestamp) => {
  const hour = new Date(timestamp).getHours()
  return hour < 6 || hour > 22
}

export default function Logins() {
  const [events, setEvents] = useState([])
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [dateRange, setDateRange] = useState('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [eventFilter, setEventFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [stats, setStats] = useState({
    totalEvents: 0,
    logins: 0,
    logouts: 0,
    failed: 0,
    unusual: 0,
  })
  const [eventTypeBreakdown, setEventTypeBreakdown] = useState([])
  const [hourlyActivity, setHourlyActivity] = useState([])

  useEffect(() => {
    if (USE_MOCK_DATA) {
      setAgents(mockAgents)
    } else {
      fetch('/api/agents').then(r => r.json()).then(setAgents)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [selectedAgent, dateRange])

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.data_type === 'login_events') {
        setSyncing(false)
        fetchEvents()
      }
    }
    window.addEventListener('data_sync_complete', handler)
    return () => window.removeEventListener('data_sync_complete', handler)
  }, [selectedAgent])

  const fetchEvents = async () => {
    setLoading(true)

    if (USE_MOCK_DATA) {
      setTimeout(() => {
        let data = mockEvents
        if (selectedAgent) {
          data = data.filter(e => {
            const agent = mockAgents.find(a => a.id === selectedAgent)
            return agent && e.employee_name === agent.employee_name
          })
        }
        setEvents(data)
        processEventData(data)
        setLoading(false)
      }, 500)
      return
    }

    let url = '/api/monitoring/login-events?limit=500'
    if (selectedAgent) url += `&agent_id=${selectedAgent}`
    try {
      const response = await fetch(url)
      const data = await response.json()
      setEvents(data)
      processEventData(data)
    } catch (error) {
      console.error('Error:', error)
    }
    setLoading(false)
  }

  const processEventData = (data) => {
    let logins = 0
    let logouts = 0
    let failed = 0
    let unusual = 0
    const eventCounts = {}
    const hourlyData = {}

    data.forEach(e => {
      const eventType = e.event_type?.toLowerCase() || 'unknown'
      eventCounts[eventType] = (eventCounts[eventType] || 0) + 1

      if (eventType === 'login' || eventType === 'unlock') logins++
      if (eventType === 'logout' || eventType === 'lock') logouts++
      if (eventType === 'failed' || eventType === 'failure') failed++

      if (isUnusualTime(e.timestamp)) unusual++

      const hour = new Date(e.timestamp).getHours()
      const hourKey = `${hour.toString().padStart(2, '0')}:00`
      if (!hourlyData[hourKey]) {
        hourlyData[hourKey] = { hour: hourKey, Login: 0, Logout: 0, Failed: 0 }
      }

      if (eventType === 'login' || eventType === 'unlock') {
        hourlyData[hourKey].Login++
      } else if (eventType === 'logout' || eventType === 'lock') {
        hourlyData[hourKey].Logout++
      } else if (eventType === 'failed' || eventType === 'failure') {
        hourlyData[hourKey].Failed++
      }
    })

    setStats({
      totalEvents: data.length,
      logins,
      logouts,
      failed,
      unusual,
    })

    const eventData = Object.entries(eventCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }))
    setEventTypeBreakdown(eventData)

    const timelineData = []
    for (let h = 0; h < 24; h++) {
      const hourKey = `${h.toString().padStart(2, '0')}:00`
      timelineData.push(hourlyData[hourKey] || { hour: hourKey, Login: 0, Logout: 0, Failed: 0 })
    }
    setHourlyActivity(timelineData)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown'
    return new Date(dateStr).toLocaleString()
  }

  const requestLatest = () => {
    if (!selectedAgent || !window.ws) return
    setSyncing(true)
    window.ws.send(JSON.stringify({ type: 'request_data_sync', agent_id: selectedAgent, data_type: 'login_events' }))
    setTimeout(() => setSyncing(false), 15000)
  }

  const loginEventsPerDayChartData = useMemo(() => {
    const now = new Date()
    const last7Days = []

    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      last7Days.push({ date: dateStr, Events: 0 })
    }

    // Count login events per day
    events.forEach(e => {
      if (e.timestamp) {
        const eventDate = new Date(e.timestamp).toISOString().split('T')[0]
        const dayData = last7Days.find(d => d.date === eventDate)
        if (dayData) {
          dayData.Events++
        }
      }
    })

    return last7Days.map(d => ({
      day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      Events: d.Events
    }))
  }, [events])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, eventFilter, selectedAgent, dateRange])

  const filteredEvents = events.filter(e => {
    const eventType = e.event_type?.toLowerCase() || ''

    if (eventFilter !== 'all') {
      if (eventFilter === 'login' && eventType !== 'login' && eventType !== 'unlock') return false
      if (eventFilter === 'logout' && eventType !== 'logout' && eventType !== 'lock') return false
      if (eventFilter === 'failed' && eventType !== 'failed' && eventType !== 'failure') return false
      if (eventFilter === 'unusual' && !isUnusualTime(e.timestamp)) return false
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        (e.employee_name && e.employee_name.toLowerCase().includes(query)) ||
        (e.username && e.username.toLowerCase().includes(query)) ||
        (e.event_type && e.event_type.toLowerCase().includes(query))
      )
    }
    return true
  })

  const exportColumns = [
    { label: 'Time', key: 'timestamp', accessor: (e) => formatDate(e.timestamp) },
    { label: 'Agent', key: 'employee_name', accessor: (e) => e.employee_name || e.pc_name || 'Unknown' },
    { label: 'Username', key: 'username', accessor: (e) => e.username || '-' },
    { label: 'Event Type', key: 'event_type', accessor: (e) => e.event_type || 'Unknown' },
    { label: 'Unusual', key: 'unusual', accessor: (e) => isUnusualTime(e.timestamp) ? 'Yes' : 'No' },
    { label: 'IP Address', key: 'ip_address', accessor: (e) => e.ip_address || '-' },
  ]

  const maxHourlyValue = Math.max(...hourlyActivity.map(h => h.Login + h.Logout + h.Failed), 1)
  const totalEventValue = eventTypeBreakdown.reduce((sum, e) => sum + e.value, 0)

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Tremor Chart Section */}
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
          Login Events Per Day
        </h3>
        <BarChart
          data={loginEventsPerDayChartData}
          index="day"
          categories={["Events"]}
          colors={["green"]}
          className="h-52"
        />
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Total Events */}
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
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
          }}>
            <Clock size={24} color="white" />
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Total Events</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{stats.totalEvents}</p>
          </div>
        </div>

        {/* Logins */}
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
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
          }}>
            <LogIn size={24} color="white" />
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Logins</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{stats.logins}</p>
          </div>
        </div>

        {/* Logouts */}
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
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(239,68,68,0.3)'
          }}>
            <LogOut size={24} color="white" />
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Logouts</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{stats.logouts}</p>
          </div>
        </div>

        {/* Failed */}
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
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(245,158,11,0.3)'
          }}>
            <AlertTriangle size={24} color="white" />
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Failed</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{stats.failed}</p>
          </div>
        </div>

        {/* Unusual Hours */}
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
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            background: `radial-gradient(circle, ${stats.unusual > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)'} 0%, transparent 70%)`,
            borderRadius: '50%'
          }} />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: stats.unusual > 0
              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: stats.unusual > 0
              ? '0 4px 12px rgba(245,158,11,0.3)'
              : '0 4px 12px rgba(16,185,129,0.3)'
          }}>
            <ShieldAlert size={24} color="white" />
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Unusual Hours</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{stats.unusual}</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Hourly Activity Chart */}
        <div style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
          borderRadius: '24px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 50%, #f59e0b 100%)',
            borderRadius: '24px 24px 0 0'
          }} />
          <div style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '120px',
            height: '120px',
            background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={18} color="white" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 }}>Login Activity Pattern</h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Events by hour of day</p>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981' }} />
              <span style={{ fontSize: '12px', color: '#64748b' }}>Login</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ef4444' }} />
              <span style={{ fontSize: '12px', color: '#64748b' }}>Logout</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f59e0b' }} />
              <span style={{ fontSize: '12px', color: '#64748b' }}>Failed</span>
            </div>
          </div>

          {/* Stacked Bar Chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '180px' }}>
            {hourlyActivity.map((hour, index) => {
              const total = hour.Login + hour.Logout + hour.Failed
              const loginHeight = total > 0 ? (hour.Login / maxHourlyValue) * 160 : 0
              const logoutHeight = total > 0 ? (hour.Logout / maxHourlyValue) * 160 : 0
              const failedHeight = total > 0 ? (hour.Failed / maxHourlyValue) * 160 : 0
              const isHighlighted = index < 6 || index > 22

              return (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column-reverse',
                    height: '160px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    background: isHighlighted ? 'rgba(245,158,11,0.1)' : '#f1f5f9'
                  }}>
                    {loginHeight > 0 && (
                      <div style={{ width: '100%', height: `${loginHeight}px`, background: '#10b981', transition: 'height 0.3s' }} />
                    )}
                    {logoutHeight > 0 && (
                      <div style={{ width: '100%', height: `${logoutHeight}px`, background: '#ef4444', transition: 'height 0.3s' }} />
                    )}
                    {failedHeight > 0 && (
                      <div style={{ width: '100%', height: `${failedHeight}px`, background: '#f59e0b', transition: 'height 0.3s' }} />
                    )}
                  </div>
                  {index % 4 === 0 && (
                    <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>{hour.hour}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Event Type Breakdown */}
        <div style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
          borderRadius: '24px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #10b981 0%, #ef4444 50%, #f59e0b 100%)',
            borderRadius: '24px 24px 0 0'
          }} />
          <div style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '120px',
            height: '120px',
            background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <LogIn size={18} color="white" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 }}>Event Types</h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Distribution by type</p>
            </div>
          </div>

          {eventTypeBreakdown.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {eventTypeBreakdown.map((event, index) => {
                const eventKey = event.name.toLowerCase()
                const style = eventStyles[eventKey] || eventStyles['unknown']
                const percentage = totalEventValue > 0 ? ((event.value / totalEventValue) * 100).toFixed(1) : 0
                return (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: style.bg,
                      color: style.text,
                      border: `1px solid ${style.border}`,
                      fontWeight: '500',
                      minWidth: '70px',
                      textAlign: 'center'
                    }}>
                      {event.name}
                    </span>
                    <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: style.gradient,
                        borderRadius: '4px',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', minWidth: '45px', textAlign: 'right' }}>
                      {percentage}%
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              No event data
            </div>
          )}
        </div>
      </div>

      {/* Events Table Card */}
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
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
        }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', margin: '0 0 4px 0' }}>Login Events</h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>User authentication activity</p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <button onClick={requestLatest} disabled={!selectedAgent || syncing} title={!selectedAgent ? 'Select an agent first' : 'Request latest data from agent'} style={{ height: '40px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', background: selectedAgent && !syncing ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#e2e8f0', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: selectedAgent && !syncing ? '#ffffff' : '#94a3b8', cursor: selectedAgent && !syncing ? 'pointer' : 'not-allowed', boxShadow: selectedAgent && !syncing ? '0 2px 4px rgba(16, 185, 129, 0.3)' : 'none', transition: 'all 0.2s' }}>
              {syncing ? <RefreshCw style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} /> : <Zap style={{ width: '15px', height: '15px' }} />}
              {syncing ? 'Syncing...' : 'Request Latest'}
            </button>

            <DateRangeFilter value={dateRange} onChange={setDateRange} />

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
                  width: '160px',
                  background: '#f8fafc',
                  outline: 'none'
                }}
              />
            </div>

            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '13px',
                background: '#f8fafc',
                color: '#374151',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="all">All Events</option>
              <option value="login">Logins</option>
              <option value="logout">Logouts</option>
              <option value="failed">Failed</option>
              <option value="unusual">Unusual</option>
            </select>

            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '13px',
                background: '#f8fafc',
                color: '#374151',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="">All Agents</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>
                  {a.employee_name || a.pc_name}
                </option>
              ))}
            </select>

            <ExportButton
              data={filteredEvents}
              filename="login_events"
              columns={exportColumns}
            />
          </div>
        </div>

        {/* Count Row */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid #f1f5f9',
          background: '#fafbfc',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{
            fontSize: '12px',
            padding: '4px 10px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            fontWeight: '600'
          }}>
            {filteredEvents.length}
          </span>
          <span style={{ fontSize: '13px', color: '#64748b' }}>login events</span>
        </div>

        {/* Table Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #e2e8f0',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              margin: '0 auto 16px',
              animation: 'spin 1s linear infinite'
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Loading login events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <LogIn size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
            <p style={{ color: '#64748b', margin: 0 }}>No login events found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Time</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Agent</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Username</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Event</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>IP Address</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.slice((currentPage - 1) * 50, currentPage * 50).map((e, i) => {
                  const Icon = icons[e.event_type?.toLowerCase()] || LogIn
                  const unusual = isUnusualTime(e.timestamp)
                  const eventKey = e.event_type?.toLowerCase() || 'unknown'
                  const style = eventStyles[eventKey] || eventStyles['unknown']
                  const isFailed = eventKey === 'failed' || eventKey === 'failure'

                  return (
                    <tr key={i} style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background-color 0.15s',
                      backgroundColor: isFailed ? '#fef2f2' : unusual ? '#fffbeb' : 'transparent',
                      cursor: 'default'
                    }}
                    onMouseEnter={(ev) => ev.currentTarget.style.backgroundColor = isFailed ? '#fee2e2' : unusual ? '#fef3c7' : '#f8fafc'}
                    onMouseLeave={(ev) => ev.currentTarget.style.backgroundColor = isFailed ? '#fef2f2' : unusual ? '#fffbeb' : 'transparent'}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Clock size={14} style={{ color: '#94a3b8' }} />
                          <span style={{ fontSize: '13px', color: '#374151' }}>{formatDate(e.timestamp)}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {(e.employee_name || e.pc_name || 'U')[0].toUpperCase()}
                          </div>
                          <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>
                            {e.employee_name || e.pc_name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '13px', color: '#374151', fontFamily: 'monospace' }}>
                          {e.username || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            background: style.bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Icon size={12} style={{ color: style.text }} />
                          </div>
                          <span style={{
                            fontSize: '11px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: style.bg,
                            color: style.text,
                            border: `1px solid ${style.border}`,
                            fontWeight: '500'
                          }}>
                            {e.event_type || 'unknown'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }}>
                          {e.ip_address || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {unusual && (
                            <span style={{
                              fontSize: '11px',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              background: '#fef3c7',
                              color: '#92400e',
                              border: '1px solid #fcd34d',
                              fontWeight: '500',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <ShieldAlert size={10} />
                              Unusual
                            </span>
                          )}
                          {isFailed ? (
                            <span style={{
                              fontSize: '11px',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              background: '#fee2e2',
                              color: '#991b1b',
                              border: '1px solid #fca5a5',
                              fontWeight: '500',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <AlertTriangle size={10} />
                              Failed
                            </span>
                          ) : !unusual && (
                            <span style={{
                              fontSize: '11px',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              background: '#dcfce7',
                              color: '#166534',
                              border: '1px solid #86efac',
                              fontWeight: '500'
                            }}>
                              Normal
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          totalItems={filteredEvents.length}
          itemsPerPage={50}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  )
}
