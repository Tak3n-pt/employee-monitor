import { useState, useEffect, useMemo } from 'react'
import {
  MessageSquare,
  Mail,
  Phone,
  Video,
  Search,
  Users,
  Clock,
  TrendingUp,
  Filter,
  ChevronDown,
  User,
  Zap,
  RefreshCw,
} from 'lucide-react'
import DateRangeFilter from '../components/DateRangeFilter'
import ExportButton from '../components/ExportButton'
import Pagination from '../components/Pagination'
import { DonutChart } from '@tremor/react'

// Mock data toggle - set to false to use real API
const USE_MOCK_DATA = false

// Icons for different communication types
const icons = {
  email: Mail,
  im: MessageSquare,
  call: Phone,
  video: Video,
  chat: MessageSquare,
  message: MessageSquare,
}

// Communication type styles
const commStyles = {
  email: {
    bg: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    light: 'rgba(59,130,246,0.15)',
    color: '#1d4ed8',
    shadow: 'rgba(59,130,246,0.25)',
  },
  im: {
    bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    light: 'rgba(139,92,246,0.15)',
    color: '#7c3aed',
    shadow: 'rgba(139,92,246,0.25)',
  },
  chat: {
    bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    light: 'rgba(139,92,246,0.15)',
    color: '#7c3aed',
    shadow: 'rgba(139,92,246,0.25)',
  },
  message: {
    bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    light: 'rgba(139,92,246,0.15)',
    color: '#7c3aed',
    shadow: 'rgba(139,92,246,0.25)',
  },
  call: {
    bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    light: 'rgba(16,185,129,0.15)',
    color: '#059669',
    shadow: 'rgba(16,185,129,0.25)',
  },
  video: {
    bg: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    light: 'rgba(6,182,212,0.15)',
    color: '#0891b2',
    shadow: 'rgba(6,182,212,0.25)',
  },
}

const getCommStyle = (commType) => {
  return commStyles[commType?.toLowerCase()] || commStyles.email
}

// Format duration in seconds to readable format
const formatDuration = (seconds) => {
  if (!seconds) return '-'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 60) return `${mins}m ${secs}s`
  const hours = Math.floor(mins / 60)
  const remainMins = mins % 60
  return `${hours}h ${remainMins}m`
}

// Mock data
const mockCommEvents = [
  { id: 1, employee_name: 'John Smith', timestamp: '2025-01-27T09:15:00', comm_type: 'email', app_name: 'Outlook', contact: 'client@company.com', subject: 'Project Update Q1', duration: null },
  { id: 2, employee_name: 'Sarah Johnson', timestamp: '2025-01-27T09:30:00', comm_type: 'im', app_name: 'Slack', contact: 'Mike Wilson', subject: 'Quick question about API', duration: null },
  { id: 3, employee_name: 'Mike Wilson', timestamp: '2025-01-27T10:00:00', comm_type: 'call', app_name: 'Teams', contact: '+1 555-0123', subject: null, duration: 1245 },
  { id: 4, employee_name: 'Emily Davis', timestamp: '2025-01-27T10:30:00', comm_type: 'video', app_name: 'Zoom', contact: 'Team Meeting', subject: 'Sprint Planning', duration: 3600 },
  { id: 5, employee_name: 'David Brown', timestamp: '2025-01-27T11:00:00', comm_type: 'email', app_name: 'Gmail', contact: 'vendor@supplier.com', subject: 'Invoice #12345', duration: null },
  { id: 6, employee_name: 'Lisa Anderson', timestamp: '2025-01-27T11:15:00', comm_type: 'chat', app_name: 'Discord', contact: 'dev-team', subject: 'Code review needed', duration: null },
  { id: 7, employee_name: 'James Taylor', timestamp: '2025-01-27T11:45:00', comm_type: 'call', app_name: 'Phone', contact: '+1 555-0456', subject: null, duration: 320 },
  { id: 8, employee_name: 'John Smith', timestamp: '2025-01-27T13:00:00', comm_type: 'video', app_name: 'Teams', contact: 'Client Call', subject: 'Demo presentation', duration: 2700 },
  { id: 9, employee_name: 'Sarah Johnson', timestamp: '2025-01-27T14:00:00', comm_type: 'email', app_name: 'Outlook', contact: 'hr@company.com', subject: 'Time off request', duration: null },
  { id: 10, employee_name: 'Mike Wilson', timestamp: '2025-01-27T14:30:00', comm_type: 'im', app_name: 'Slack', contact: 'Emily Davis', subject: 'Bug in production', duration: null },
  { id: 11, employee_name: 'Emily Davis', timestamp: '2025-01-27T15:00:00', comm_type: 'call', app_name: 'Teams', contact: '+1 555-0789', subject: null, duration: 890 },
  { id: 12, employee_name: 'David Brown', timestamp: '2025-01-27T15:30:00', comm_type: 'message', app_name: 'WhatsApp', contact: 'Support Team', subject: 'Customer issue resolved', duration: null },
]

const mockAgents = [
  { id: '1', employee_name: 'John Smith', pc_name: 'DESKTOP-001' },
  { id: '2', employee_name: 'Sarah Johnson', pc_name: 'LAPTOP-002' },
  { id: '3', employee_name: 'Mike Wilson', pc_name: 'DESKTOP-003' },
  { id: '4', employee_name: 'Emily Davis', pc_name: 'LAPTOP-004' },
  { id: '5', employee_name: 'David Brown', pc_name: 'DESKTOP-005' },
  { id: '6', employee_name: 'Lisa Anderson', pc_name: 'LAPTOP-006' },
  { id: '7', employee_name: 'James Taylor', pc_name: 'DESKTOP-007' },
]

export default function Communications() {
  const [events, setEvents] = useState([])
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [dateRange, setDateRange] = useState('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [stats, setStats] = useState({
    totalEvents: 0,
    emails: 0,
    messages: 0,
    calls: 0,
    totalDuration: 0,
  })
  const [hourlyData, setHourlyData] = useState([])
  const [typeBreakdown, setTypeBreakdown] = useState([])

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
      if (e.detail?.data_type === 'comm_events') {
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
        let data = [...mockCommEvents]
        if (selectedAgent) {
          const agent = mockAgents.find(a => a.id === selectedAgent)
          if (agent) {
            data = data.filter(e => e.employee_name === agent.employee_name)
          }
        }
        setEvents(data)
        processEventsData(data)
        setLoading(false)
      }, 500)
      return
    }

    let url = '/api/monitoring/comm-events?limit=500'
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

  const requestLatest = () => {
    if (!selectedAgent || !window.ws) return
    setSyncing(true)
    window.ws.send(JSON.stringify({ type: 'request_data_sync', agent_id: selectedAgent, data_type: 'comm_events' }))
    setTimeout(() => setSyncing(false), 15000)
  }

  const processEventsData = (data) => {
    let emails = 0
    let messages = 0
    let calls = 0
    let totalDuration = 0
    const typeCounts = {}
    const hourCounts = {}

    data.forEach(e => {
      const type = e.comm_type?.toLowerCase() || 'unknown'
      typeCounts[type] = (typeCounts[type] || 0) + 1

      // Count by category
      if (type === 'email') {
        emails++
      } else if (['im', 'chat', 'message'].includes(type)) {
        messages++
      } else if (['call', 'video'].includes(type)) {
        calls++
        if (e.duration) totalDuration += e.duration
      }

      // Hourly breakdown
      if (e.timestamp) {
        const hour = new Date(e.timestamp).getHours()
        hourCounts[hour] = (hourCounts[hour] || 0) + 1
      }
    })

    setStats({
      totalEvents: data.length,
      emails,
      messages,
      calls,
      totalDuration,
    })

    // Hourly chart data
    const hourlyChartData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${i}:00`,
      count: hourCounts[i] || 0,
    }))
    setHourlyData(hourlyChartData)

    // Type breakdown for donut chart
    const typeColors = {
      email: '#3b82f6',
      im: '#8b5cf6',
      chat: '#8b5cf6',
      message: '#8b5cf6',
      call: '#10b981',
      video: '#06b6d4',
    }
    const typeData = Object.entries(typeCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: typeColors[name] || '#94a3b8',
    }))
    setTypeBreakdown(typeData)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown'
    return new Date(dateStr).toLocaleString()
  }

  const timeByAppChartData = useMemo(() => {
    const appDurations = {}

    events.forEach(e => {
      const app = e.app_name || 'Unknown'
      const duration = e.duration || 0

      if (!appDurations[app]) {
        appDurations[app] = 0
      }
      appDurations[app] += duration
    })

    return Object.entries(appDurations)
      .map(([app, duration]) => ({
        name: app,
        value: Math.round(duration / 60) // Convert to minutes
      }))
      .filter(item => item.value > 0)
  }, [events])

  // Get all unique communication types for filter
  const allTypes = [...new Set(events.map(e => e.comm_type?.toLowerCase()).filter(Boolean))]

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, typeFilter, selectedAgent, dateRange])

  // Filter events
  const filteredEvents = events.filter(e => {
    // Type filter
    if (typeFilter !== 'all' && e.comm_type?.toLowerCase() !== typeFilter) return false

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        (e.app_name && e.app_name.toLowerCase().includes(query)) ||
        (e.contact && e.contact.toLowerCase().includes(query)) ||
        (e.subject && e.subject.toLowerCase().includes(query)) ||
        (e.employee_name && e.employee_name.toLowerCase().includes(query))
      )
    }
    return true
  })

  // Export columns
  const exportColumns = [
    { label: 'Time', key: 'timestamp', accessor: (e) => formatDate(e.timestamp) },
    { label: 'Agent', key: 'employee_name', accessor: (e) => e.employee_name || 'Unknown' },
    { label: 'Type', key: 'comm_type', accessor: (e) => e.comm_type || 'Unknown' },
    { label: 'App', key: 'app_name', accessor: (e) => e.app_name || '-' },
    { label: 'Contact', key: 'contact', accessor: (e) => e.contact || '-' },
    { label: 'Subject', key: 'subject', accessor: (e) => e.subject || '-' },
    { label: 'Duration', key: 'duration', accessor: (e) => formatDuration(e.duration) },
  ]

  // Calculate max for chart scaling
  const maxCount = Math.max(...hourlyData.map(d => d.count), 1)

  // Calculate total for type percentages
  const typeTotal = typeBreakdown.reduce((sum, d) => sum + d.value, 0)

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Tremor Chart Section */}
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
          Communication Time by App (Minutes)
        </h3>
        <DonutChart
          data={timeByAppChartData}
          category="value"
          index="name"
          colors={["blue", "purple", "green", "cyan", "orange"]}
          className="h-52"
        />
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px', marginBottom: '24px' }}>
        {/* Total Events */}
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
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(139,92,246,0.3)',
            }}>
              <MessageSquare style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Total Events</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', lineHeight: '1' }}>{stats.totalEvents}</p>
            </div>
          </div>
        </div>

        {/* Emails */}
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
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
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
              <Mail style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Emails</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', lineHeight: '1' }}>{stats.emails}</p>
            </div>
          </div>
        </div>

        {/* Messages */}
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
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(6,182,212,0.3)',
            }}>
              <Users style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Messages</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', lineHeight: '1' }}>{stats.messages}</p>
            </div>
          </div>
        </div>

        {/* Calls/Video */}
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
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
            }}>
              <Phone style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Calls/Video</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', lineHeight: '1' }}>{stats.calls}</p>
            </div>
          </div>
        </div>

        {/* Call Duration */}
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
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
            }}>
              <Clock style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Call Duration</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', lineHeight: '1' }}>{formatDuration(stats.totalDuration)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Hourly Activity Chart */}
        <div style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
          borderRadius: '24px',
          padding: '0',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Purple gradient top bar */}
          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)',
          }} />

          {/* Corner glow */}
          <div style={{
            position: 'absolute',
            top: '0',
            right: '0',
            width: '150px',
            height: '150px',
            background: 'radial-gradient(circle at top right, rgba(139,92,246,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
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
              }}>
                <TrendingUp style={{ width: '20px', height: '20px', color: 'white' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 }}>Communication Activity</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Events by hour of day</p>
              </div>
            </div>

            {/* Bar Chart */}
            <div style={{
              background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
              borderRadius: '16px',
              padding: '24px',
              minHeight: '220px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', gap: '4px' }}>
                {hourlyData.map((item, i) => {
                  const heightPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0
                  const showLabel = i % 3 === 0
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                      <div style={{
                        fontSize: '10px',
                        fontWeight: '600',
                        color: '#8b5cf6',
                        marginBottom: '4px',
                        visibility: item.count > 0 ? 'visible' : 'hidden',
                      }}>
                        {item.count}
                      </div>
                      <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                        <div style={{
                          width: '100%',
                          height: `${Math.max(heightPercent, 2)}%`,
                          background: item.count > 0
                            ? 'linear-gradient(180deg, #8b5cf6 0%, #7c3aed 100%)'
                            : '#e2e8f0',
                          borderRadius: '4px 4px 2px 2px',
                          boxShadow: item.count > 0 ? '0 2px 8px rgba(139,92,246,0.2)' : 'none',
                          transition: 'height 0.3s ease',
                        }} />
                      </div>
                      {showLabel && (
                        <div style={{
                          marginTop: '8px',
                          fontSize: '10px',
                          fontWeight: '500',
                          color: '#64748b',
                        }}>
                          {item.hour}h
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Type Breakdown */}
        <div style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
          borderRadius: '24px',
          padding: '0',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Cyan gradient top bar */}
          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)',
          }} />

          {/* Corner glow */}
          <div style={{
            position: 'absolute',
            top: '0',
            right: '0',
            width: '120px',
            height: '120px',
            background: 'radial-gradient(circle at top right, rgba(6,182,212,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MessageSquare style={{ width: '20px', height: '20px', color: 'white' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 }}>Communication Types</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Distribution by type</p>
              </div>
            </div>

            {/* Donut Chart Visualization */}
            {typeBreakdown.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                {/* Simple Ring Chart */}
                <div style={{ position: 'relative', width: '140px', height: '140px' }}>
                  <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                    {typeBreakdown.reduce((acc, item, i) => {
                      const percentage = (item.value / typeTotal) * 100
                      const offset = acc.offset
                      acc.elements.push(
                        <circle
                          key={i}
                          cx="18"
                          cy="18"
                          r="15.91549430918954"
                          fill="transparent"
                          stroke={item.color}
                          strokeWidth="3"
                          strokeDasharray={`${percentage} ${100 - percentage}`}
                          strokeDashoffset={-offset}
                        />
                      )
                      acc.offset += percentage
                      return acc
                    }, { elements: [], offset: 0 }).elements}
                  </svg>
                  <div style={{
                    position: 'absolute',
                    inset: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>{typeTotal}</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Total</span>
                  </div>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  {typeBreakdown.map((item, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: 'rgba(255,255,255,0.8)',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: item.color,
                        }} />
                        <span style={{ fontSize: '12px', color: '#374151' }}>{item.name}</span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>
                        {item.value} ({Math.round((item.value / typeTotal) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{
                height: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                fontSize: '14px',
              }}>
                No data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Communications Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        overflow: 'hidden',
      }}>
        {/* Table Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', margin: 0 }}>Communication Events</h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Messaging and communication activity</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <DateRangeFilter value={dateRange} onChange={setDateRange} />

              <button onClick={requestLatest} disabled={!selectedAgent || syncing} title={!selectedAgent ? 'Select an agent first' : 'Request latest data from agent'} style={{ height: '40px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', background: selectedAgent && !syncing ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#e2e8f0', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: selectedAgent && !syncing ? '#ffffff' : '#94a3b8', cursor: selectedAgent && !syncing ? 'pointer' : 'not-allowed', boxShadow: selectedAgent && !syncing ? '0 2px 4px rgba(16, 185, 129, 0.3)' : 'none', transition: 'all 0.2s' }}>
                {syncing ? <RefreshCw style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} /> : <Zap style={{ width: '15px', height: '15px' }} />}
                {syncing ? 'Syncing...' : 'Request Latest'}
              </button>

              {/* Search Input */}
              <div style={{ position: 'relative' }}>
                <Search style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '16px',
                  height: '16px',
                  color: '#94a3b8',
                }} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '8px 12px 8px 36px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '13px',
                    width: '160px',
                    background: '#f8fafc',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#8b5cf6'
                    e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>

              {/* Type Filter */}
              <div style={{ position: 'relative' }}>
                <Filter style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '14px',
                  height: '14px',
                  color: '#94a3b8',
                  pointerEvents: 'none',
                }} />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={{
                    padding: '8px 32px 8px 36px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '13px',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    outline: 'none',
                    appearance: 'none',
                  }}
                >
                  <option value="all">All Types</option>
                  {allTypes.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
                <ChevronDown style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '14px',
                  height: '14px',
                  color: '#94a3b8',
                  pointerEvents: 'none',
                }} />
              </div>

              {/* Agent Filter */}
              <div style={{ position: 'relative' }}>
                <User style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '14px',
                  height: '14px',
                  color: '#94a3b8',
                  pointerEvents: 'none',
                }} />
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  style={{
                    padding: '8px 32px 8px 36px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '13px',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    outline: 'none',
                    appearance: 'none',
                    minWidth: '140px',
                  }}
                >
                  <option value="">All Agents</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.employee_name || a.pc_name}
                    </option>
                  ))}
                </select>
                <ChevronDown style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '14px',
                  height: '14px',
                  color: '#94a3b8',
                  pointerEvents: 'none',
                }} />
              </div>

              <ExportButton
                data={filteredEvents}
                filename="communications"
                columns={exportColumns}
              />
            </div>
          </div>
        </div>

        {/* Count Row */}
        <div style={{
          padding: '12px 24px',
          background: '#f8fafc',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
          }}>
            {filteredEvents.length} events
          </span>
          {searchQuery && (
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              matching "{searchQuery}"
            </span>
          )}
        </div>

        {/* Table Content */}
        {loading ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '3px solid #e2e8f0',
              borderTopColor: '#8b5cf6',
              borderRadius: '50%',
              margin: '0 auto 16px',
              animation: 'spin 1s linear infinite',
            }} />
            <p style={{ color: '#64748b', fontSize: '14px' }}>Loading communications...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <MessageSquare style={{ width: '32px', height: '32px', color: '#94a3b8' }} />
            </div>
            <p style={{ color: '#64748b', fontSize: '14px' }}>No communication events found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agent</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>App</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</th>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.slice((currentPage - 1) * 50, currentPage * 50).map((e, i) => {
                  const Icon = icons[e.comm_type?.toLowerCase()] || MessageSquare
                  const style = getCommStyle(e.comm_type)

                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(ev) => ev.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(ev) => ev.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 24px' }}>
                        <span style={{ fontSize: '13px', color: '#374151' }}>
                          {formatDate(e.timestamp)}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}>
                            {(e.employee_name || 'U').charAt(0)}
                          </div>
                          <span style={{ color: '#374151', fontSize: '13px' }}>{e.employee_name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: style.light,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <Icon style={{ width: '14px', height: '14px', color: style.color }} />
                          </div>
                          <span style={{
                            background: style.bg,
                            padding: '4px 10px',
                            borderRadius: '20px',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: '600',
                            boxShadow: `0 2px 6px ${style.shadow}`,
                          }}>
                            {e.comm_type || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#374151', fontSize: '13px' }}>
                        {e.app_name || '-'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#374151', fontSize: '13px', maxWidth: '150px' }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.contact || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#374151', fontSize: '13px', maxWidth: '200px' }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.subject || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 24px' }}>
                        {e.duration ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '6px',
                              background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(79,70,229,0.15) 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              <TrendingUp style={{ width: '12px', height: '12px', color: '#4f46e5' }} />
                            </div>
                            <span style={{ color: '#4f46e5', fontWeight: '500', fontSize: '13px' }}>
                              {formatDuration(e.duration)}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '13px' }}>-</span>
                        )}
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
