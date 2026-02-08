import { useState, useEffect } from 'react'
import {
  Clock,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Timer,
  Filter,
  ChevronDown,
  User,
  Zap,
  RefreshCw,
} from 'lucide-react'
import DateRangeFilter from '../components/DateRangeFilter'
import ExportButton from '../components/ExportButton'
import Pagination from '../components/Pagination'

// Mock data toggle - set to false to use real API
const USE_MOCK_DATA = false

// Expected work hours configuration
const EXPECTED_START_HOUR = 9 // 9:00 AM
const EXPECTED_END_HOUR = 17 // 5:00 PM
const STANDARD_WORK_HOURS = 8

// Parse time string to hours (e.g., "09:30" -> 9.5)
const parseTimeToHours = (timeStr) => {
  if (!timeStr) return null
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours + (minutes || 0) / 60
}

// Check if clock in is late (after expected start)
const isLateArrival = (clockIn) => {
  const hours = parseTimeToHours(clockIn)
  if (hours === null) return false
  return hours > EXPECTED_START_HOUR + 0.25 // 15 min grace period
}

// Check if it's overtime (worked more than standard hours)
const isOvertime = (totalHours) => {
  return totalHours && totalHours > STANDARD_WORK_HOURS
}

// Mock data
const mockTimeEntries = [
  { id: 1, employee_name: 'John Smith', date: '2025-01-27', clock_in: '08:55', clock_out: '17:30', total_hours: 8.58, break_minutes: 30 },
  { id: 2, employee_name: 'Sarah Johnson', date: '2025-01-27', clock_in: '09:32', clock_out: '18:15', total_hours: 8.72, break_minutes: 45 },
  { id: 3, employee_name: 'Mike Wilson', date: '2025-01-27', clock_in: '08:45', clock_out: '17:00', total_hours: 8.25, break_minutes: 30 },
  { id: 4, employee_name: 'Emily Davis', date: '2025-01-27', clock_in: '09:05', clock_out: '19:30', total_hours: 10.42, break_minutes: 60 },
  { id: 5, employee_name: 'David Brown', date: '2025-01-27', clock_in: '09:45', clock_out: '17:15', total_hours: 7.50, break_minutes: 30 },
  { id: 6, employee_name: 'Lisa Anderson', date: '2025-01-26', clock_in: '08:30', clock_out: '17:00', total_hours: 8.50, break_minutes: 30 },
  { id: 7, employee_name: 'James Taylor', date: '2025-01-26', clock_in: '10:15', clock_out: '18:00', total_hours: 7.75, break_minutes: 30 },
  { id: 8, employee_name: 'John Smith', date: '2025-01-26', clock_in: '08:50', clock_out: '17:45', total_hours: 8.92, break_minutes: 45 },
  { id: 9, employee_name: 'Sarah Johnson', date: '2025-01-25', clock_in: '09:00', clock_out: '18:30', total_hours: 9.50, break_minutes: 30 },
  { id: 10, employee_name: 'Mike Wilson', date: '2025-01-25', clock_in: '08:40', clock_out: '16:45', total_hours: 8.08, break_minutes: 30 },
  { id: 11, employee_name: 'Emily Davis', date: '2025-01-24', clock_in: '09:20', clock_out: '20:00', total_hours: 10.67, break_minutes: 45 },
  { id: 12, employee_name: 'David Brown', date: '2025-01-24', clock_in: null, clock_out: null, total_hours: null, break_minutes: null },
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

export default function TimeTrack() {
  const [entries, setEntries] = useState([])
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [dateRange, setDateRange] = useState('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [stats, setStats] = useState({
    totalHours: 0,
    overtimeHours: 0,
    lateArrivals: 0,
    onTimeRate: 0,
    avgHoursPerDay: 0,
  })
  const [weeklyData, setWeeklyData] = useState([])
  const [punctualityData, setPunctualityData] = useState([])

  useEffect(() => {
    if (USE_MOCK_DATA) {
      setAgents(mockAgents)
    } else {
      fetch('/api/agents').then(r => r.json()).then(setAgents)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [selectedAgent, dateRange])

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.data_type === 'time_tracking') {
        setSyncing(false)
        fetchEntries()
      }
    }
    window.addEventListener('data_sync_complete', handler)
    return () => window.removeEventListener('data_sync_complete', handler)
  }, [selectedAgent])

  const fetchEntries = async () => {
    setLoading(true)

    if (USE_MOCK_DATA) {
      setTimeout(() => {
        let data = [...mockTimeEntries]
        if (selectedAgent) {
          const agent = mockAgents.find(a => a.id === selectedAgent)
          if (agent) {
            data = data.filter(e => e.employee_name === agent.employee_name)
          }
        }
        setEntries(data)
        processEntriesData(data)
        setLoading(false)
      }, 500)
      return
    }

    let url = '/api/monitoring/time-entries?limit=500'
    if (selectedAgent) url += `&agent_id=${selectedAgent}`
    try {
      const response = await fetch(url)
      const data = await response.json()
      setEntries(data)
      processEntriesData(data)
    } catch (error) {
      console.error('Error:', error)
    }
    setLoading(false)
  }

  const processEntriesData = (data) => {
    let totalHours = 0
    let overtimeHours = 0
    let lateArrivals = 0
    let onTimeCount = 0
    let entriesWithClockIn = 0
    const weeklyTotals = {}

    data.forEach(e => {
      // Total hours calculation
      if (e.total_hours) {
        totalHours += e.total_hours

        // Overtime calculation
        if (e.total_hours > STANDARD_WORK_HOURS) {
          overtimeHours += e.total_hours - STANDARD_WORK_HOURS
        }
      }

      // Late arrival tracking
      if (e.clock_in) {
        entriesWithClockIn++
        if (isLateArrival(e.clock_in)) {
          lateArrivals++
        } else {
          onTimeCount++
        }
      }

      // Weekly data (group by day of week)
      if (e.date) {
        const date = new Date(e.date)
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
        if (!weeklyTotals[dayName]) {
          weeklyTotals[dayName] = { hours: 0, count: 0 }
        }
        weeklyTotals[dayName].hours += e.total_hours || 0
        weeklyTotals[dayName].count++
      }
    })

    // Calculate on-time rate
    const onTimeRate = entriesWithClockIn > 0
      ? Math.round((onTimeCount / entriesWithClockIn) * 100)
      : 0

    // Average hours per day
    const uniqueDays = new Set(data.filter(e => e.date).map(e => e.date)).size
    const avgHoursPerDay = uniqueDays > 0 ? totalHours / uniqueDays : 0

    setStats({
      totalHours,
      overtimeHours,
      lateArrivals,
      onTimeRate,
      avgHoursPerDay,
    })

    // Weekly chart data
    const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const weeklyChartData = dayOrder.map(day => ({
      name: day,
      hours: weeklyTotals[day] ? Math.round(weeklyTotals[day].hours * 10) / 10 : 0,
    }))
    setWeeklyData(weeklyChartData)

    // Punctuality breakdown for donut chart
    const punctualityBreakdown = [
      { name: 'On Time', value: onTimeCount, color: '#10b981' },
      { name: 'Late', value: lateArrivals, color: '#f59e0b' },
      { name: 'No Clock In', value: data.length - entriesWithClockIn, color: '#94a3b8' },
    ].filter(d => d.value > 0)
    setPunctualityData(punctualityBreakdown)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString()
  }

  const requestLatest = () => {
    if (!selectedAgent || !window.ws) return
    setSyncing(true)
    window.ws.send(JSON.stringify({ type: 'request_data_sync', agent_id: selectedAgent, data_type: 'time_tracking' }))
    setTimeout(() => setSyncing(false), 15000)
  }

  // Filter entries
  const filteredEntries = entries.filter(e => {
    // Status filter
    if (statusFilter === 'late' && !isLateArrival(e.clock_in)) return false
    if (statusFilter === 'ontime' && isLateArrival(e.clock_in)) return false
    if (statusFilter === 'overtime' && !isOvertime(e.total_hours)) return false

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        (e.employee_name && e.employee_name.toLowerCase().includes(query)) ||
        (e.date && e.date.toLowerCase().includes(query))
      )
    }
    return true
  })

  // Export columns
  const exportColumns = [
    { label: 'Date', key: 'date', accessor: (e) => formatDate(e.date) },
    { label: 'Agent', key: 'employee_name', accessor: (e) => e.employee_name || 'Unknown' },
    { label: 'Clock In', key: 'clock_in', accessor: (e) => e.clock_in || '-' },
    { label: 'Clock Out', key: 'clock_out', accessor: (e) => e.clock_out || '-' },
    { label: 'Total Hours', key: 'total_hours', accessor: (e) => e.total_hours?.toFixed(2) || '0' },
    { label: 'Break (min)', key: 'break_minutes', accessor: (e) => e.break_minutes || '0' },
    { label: 'Status', key: 'status', accessor: (e) => isLateArrival(e.clock_in) ? 'Late' : 'On Time' },
    { label: 'Overtime', key: 'overtime', accessor: (e) => isOvertime(e.total_hours) ? 'Yes' : 'No' },
  ]

  // Calculate max hours for chart scaling
  const maxHours = Math.max(...weeklyData.map(d => d.hours), 1)

  // Calculate total for punctuality percentages
  const punctualityTotal = punctualityData.reduce((sum, d) => sum + d.value, 0)

  // Get hours badge style
  const getHoursBadgeStyle = (hours) => {
    if (!hours) return { background: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' }
    if (hours >= 8) return { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }
    if (hours >= 6) return { background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }
    if (hours >= 4) return { background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }
    return { background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }
  }

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px', marginBottom: '24px' }}>
        {/* Total Hours */}
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
              <Clock style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Total Hours</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', lineHeight: '1' }}>{stats.totalHours.toFixed(1)}h</p>
            </div>
          </div>
        </div>

        {/* Avg/Day */}
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
              <TrendingUp style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Avg/Day</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', lineHeight: '1' }}>{stats.avgHoursPerDay.toFixed(1)}h</p>
            </div>
          </div>
        </div>

        {/* Overtime */}
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
            background: 'radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(20,184,166,0.3)',
            }}>
              <Timer style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Overtime</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', lineHeight: '1' }}>{stats.overtimeHours.toFixed(1)}h</p>
            </div>
          </div>
        </div>

        {/* Late Arrivals */}
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
            background: `radial-gradient(circle, ${stats.lateArrivals > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)'} 0%, transparent 70%)`,
            borderRadius: '50%',
          }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: stats.lateArrivals > 0
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: stats.lateArrivals > 0
                ? '0 4px 12px rgba(245,158,11,0.3)'
                : '0 4px 12px rgba(16,185,129,0.3)',
            }}>
              <AlertTriangle style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Late Arrivals</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', lineHeight: '1' }}>{stats.lateArrivals}</p>
            </div>
          </div>
        </div>

        {/* On-Time Rate */}
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
              <CheckCircle style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>On-Time Rate</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', lineHeight: '1' }}>{stats.onTimeRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Weekly Hours Chart */}
        <div style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
          borderRadius: '24px',
          padding: '0',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Green gradient top bar */}
          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg, #10b981 0%, #059669 50%, #047857 100%)',
          }} />

          {/* Corner glow */}
          <div style={{
            position: 'absolute',
            top: '0',
            right: '0',
            width: '150px',
            height: '150px',
            background: 'radial-gradient(circle at top right, rgba(16,185,129,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <TrendingUp style={{ width: '20px', height: '20px', color: 'white' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 }}>Weekly Hours</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Total hours by day of week</p>
              </div>
            </div>

            {/* Bar Chart */}
            <div style={{
              background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
              borderRadius: '16px',
              padding: '24px',
              minHeight: '220px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', gap: '12px' }}>
                {weeklyData.map((day, i) => {
                  const heightPercent = maxHours > 0 ? (day.hours / maxHours) * 100 : 0
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#10b981',
                        marginBottom: '8px',
                      }}>
                        {day.hours > 0 ? `${day.hours}h` : ''}
                      </div>
                      <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                        <div style={{
                          width: '100%',
                          height: `${Math.max(heightPercent, 4)}%`,
                          background: day.hours > 0
                            ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)'
                            : '#e2e8f0',
                          borderRadius: '8px 8px 4px 4px',
                          boxShadow: day.hours > 0 ? '0 4px 12px rgba(16,185,129,0.2)' : 'none',
                          transition: 'height 0.3s ease',
                        }} />
                      </div>
                      <div style={{
                        marginTop: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#64748b',
                      }}>
                        {day.name}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Punctuality Breakdown */}
        <div style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
          borderRadius: '24px',
          padding: '0',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Blue gradient top bar */}
          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 50%, #1e40af 100%)',
          }} />

          {/* Corner glow */}
          <div style={{
            position: 'absolute',
            top: '0',
            right: '0',
            width: '120px',
            height: '120px',
            background: 'radial-gradient(circle at top right, rgba(59,130,246,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <CheckCircle style={{ width: '20px', height: '20px', color: 'white' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 }}>Punctuality</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Arrival time distribution</p>
              </div>
            </div>

            {/* Donut Chart Visualization */}
            {punctualityData.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                {/* Simple Ring Chart */}
                <div style={{ position: 'relative', width: '140px', height: '140px' }}>
                  <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                    {punctualityData.reduce((acc, item, i) => {
                      const percentage = (item.value / punctualityTotal) * 100
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
                    <span style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>{punctualityTotal}</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Total</span>
                  </div>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  {punctualityData.map((item, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
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
                        <span style={{ fontSize: '13px', color: '#374151' }}>{item.name}</span>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
                        {item.value} ({Math.round((item.value / punctualityTotal) * 100)}%)
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

      {/* Time Entries Table */}
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
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', margin: 0 }}>Time Entries</h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Work hours and attendance records</p>
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
                    e.target.style.borderColor = '#3b82f6'
                    e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>

              {/* Status Filter */}
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
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
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
                  <option value="all">All Status</option>
                  <option value="ontime">On Time</option>
                  <option value="late">Late</option>
                  <option value="overtime">Overtime</option>
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
                data={filteredEntries}
                filename="time_entries"
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
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
          }}>
            {filteredEntries.length} entries
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
              borderTopColor: '#10b981',
              borderRadius: '50%',
              margin: '0 auto 16px',
              animation: 'spin 1s linear infinite',
            }} />
            <p style={{ color: '#64748b', fontSize: '14px' }}>Loading time entries...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filteredEntries.length === 0 ? (
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
              <Clock style={{ width: '32px', height: '32px', color: '#94a3b8' }} />
            </div>
            <p style={{ color: '#64748b', fontSize: '14px' }}>No time entries found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agent</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Clock In</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Clock Out</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Hours</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Break</th>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.slice((currentPage - 1) * 50, currentPage * 50).map((e, i) => {
                  const late = isLateArrival(e.clock_in)
                  const overtime = isOvertime(e.total_hours)

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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <Calendar style={{ width: '16px', height: '16px', color: '#64748b' }} />
                          </div>
                          <span style={{ fontWeight: '500', color: '#0f172a', fontSize: '13px' }}>
                            {formatDate(e.date)}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
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
                        {e.clock_in ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '6px',
                              background: late
                                ? 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(217,119,6,0.15) 100%)'
                                : 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.15) 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              <Clock style={{
                                width: '12px',
                                height: '12px',
                                color: late ? '#d97706' : '#059669'
                              }} />
                            </div>
                            <span style={{
                              color: late ? '#d97706' : '#059669',
                              fontWeight: '500',
                              fontSize: '13px',
                            }}>
                              {e.clock_in}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '13px' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {e.clock_out ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '6px',
                              background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.15) 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              <Clock style={{ width: '12px', height: '12px', color: '#dc2626' }} />
                            </div>
                            <span style={{ color: '#dc2626', fontWeight: '500', fontSize: '13px' }}>
                              {e.clock_out}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '13px' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {e.total_hours ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              ...getHoursBadgeStyle(e.total_hours),
                              padding: '4px 10px',
                              borderRadius: '20px',
                              color: 'white',
                              fontSize: '12px',
                              fontWeight: '600',
                            }}>
                              {e.total_hours.toFixed(2)}h
                            </span>
                            {overtime && (
                              <span style={{
                                background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                color: 'white',
                                fontSize: '10px',
                                fontWeight: '600',
                              }}>
                                +OT
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '13px' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '13px' }}>
                        {e.break_minutes ? `${e.break_minutes}m` : '-'}
                      </td>
                      <td style={{ padding: '14px 24px' }}>
                        {e.clock_in ? (
                          <span style={{
                            background: late
                              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            padding: '5px 12px',
                            borderRadius: '20px',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '600',
                            boxShadow: late
                              ? '0 2px 8px rgba(245,158,11,0.25)'
                              : '0 2px 8px rgba(16,185,129,0.25)',
                          }}>
                            {late ? 'Late' : 'On Time'}
                          </span>
                        ) : (
                          <span style={{
                            background: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                            padding: '5px 12px',
                            borderRadius: '20px',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}>
                            No Clock In
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filteredEntries.length > 0 && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9' }}>
            <Pagination
              totalItems={filteredEntries.length}
              itemsPerPage={50}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  )
}
