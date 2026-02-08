import { useState, useEffect, useRef } from 'react'
import { AreaChart, BarChart, LineChart, DonutChart } from '@tremor/react'
import {
  Users,
  Wifi,
  AlertTriangle,
  TrendingUp,
  Camera,
  Shield,
  Clock,
} from 'lucide-react'

// Animated number counter
function AnimatedNumber({ value, suffix = '', duration = 800 }) {
  const [display, setDisplay] = useState(0)
  const prevRef = useRef(0)
  useEffect(() => {
    const start = prevRef.current
    const end = typeof value === 'number' ? value : parseInt(value) || 0
    if (start === end) return
    const startTime = performance.now()
    const step = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(start + (end - start) * eased))
      if (progress < 1) requestAnimationFrame(step)
      else prevRef.current = end
    }
    requestAnimationFrame(step)
  }, [value, duration])
  return <>{display}{suffix}</>
}

export default function Dashboard() {
  const [agents, setAgents] = useState([])
  const [stats, setStats] = useState({
    total: 0, online: 0, offline: 0, alerts: 0,
    alertsTrend: 0, avgProductivity: 0, productivityTrend: 0,
  })
  const [activityData, setActivityData] = useState([])
  const [productivityDistribution, setProductivityDistribution] = useState([])
  const [recentAlerts, setRecentAlerts] = useState([])
  const [productivityTrend, setProductivityTrend] = useState([])
  const [topApps, setTopApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('today')
  const [serverStatus, setServerStatus] = useState('online')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [hoveredCard, setHoveredCard] = useState(null)

  useEffect(() => {
    fetchAllData()
    const interval = setInterval(fetchAllData, 30000)
    return () => clearInterval(interval)
  }, [dateRange])

  const fetchAllData = async () => {
    await Promise.all([
      fetchAgents(), fetchStats(), fetchActivityData(),
      fetchRecentAlerts(), fetchProductivityTrend(), fetchTopApps(),
    ])
    setLoading(false)
    setLastUpdated(new Date())
  }

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents')
      const data = await response.json()
      setAgents(data)
      const online = data.filter(a => a.status === 'online').length
      setStats(prev => ({ ...prev, total: data.length, online, offline: data.length - online }))
      setServerStatus('online')
    } catch (error) {
      console.error('Error fetching agents:', error)
      setServerStatus('offline')
    }
  }

  const fetchStats = async () => {
    try {
      const [alertsRes, prodRes] = await Promise.all([
        fetch('/api/monitoring/alerts?limit=100'),
        fetch('/api/monitoring/productivity'),
      ])
      const alerts = await alertsRes.json()
      const productivity = await prodRes.json()
      const todayAlerts = alerts.filter(a => new Date(a.timestamp).toDateString() === new Date().toDateString())
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayAlerts = alerts.filter(a => new Date(a.timestamp).toDateString() === yesterday.toDateString())
      const alertsTrend = yesterdayAlerts.length > 0 ? Math.round(((todayAlerts.length - yesterdayAlerts.length) / yesterdayAlerts.length) * 100) : 0
      const avgProd = productivity.length > 0 ? Math.round(productivity.reduce((sum, p) => sum + (p.score || 0), 0) / productivity.length) : 0
      const distribution = [
        { name: 'High (80-100%)', value: productivity.filter(p => p.score >= 80).length },
        { name: 'Good (60-79%)', value: productivity.filter(p => p.score >= 60 && p.score < 80).length },
        { name: 'Low (40-59%)', value: productivity.filter(p => p.score >= 40 && p.score < 60).length },
        { name: 'Poor (<40%)', value: productivity.filter(p => p.score < 40).length },
      ].filter(d => d.value > 0)
      setProductivityDistribution(distribution)
      setStats(prev => ({ ...prev, alerts: todayAlerts.length, alertsTrend, avgProductivity: avgProd, productivityTrend: 5 }))
    } catch (error) { console.error('Error fetching stats:', error) }
  }

  const fetchActivityData = async () => {
    try {
      const response = await fetch('/api/monitoring/activities?limit=500')
      const activities = await response.json()
      const hourlyData = {}
      activities.forEach(activity => {
        const hour = new Date(activity.started_at || activity.created_at).getHours()
        const hourKey = `${hour.toString().padStart(2, '0')}:00`
        if (!hourlyData[hourKey]) hourlyData[hourKey] = { hour: hourKey, Active: 0, Idle: 0 }
        if (activity.duration_seconds > 0) hourlyData[hourKey].Active += 1
        else hourlyData[hourKey].Idle += 1
      })
      const chartData = []
      for (let h = 8; h <= 18; h++) {
        const hourKey = `${h.toString().padStart(2, '0')}:00`
        chartData.push(hourlyData[hourKey] || { hour: hourKey, Active: 0, Idle: 0 })
      }
      setActivityData(chartData)
    } catch (error) { console.error('Error fetching activity data:', error) }
  }

  const fetchRecentAlerts = async () => {
    try {
      const response = await fetch('/api/monitoring/alerts?limit=5')
      setRecentAlerts(await response.json())
    } catch (error) { console.error('Error fetching recent alerts:', error) }
  }

  const fetchProductivityTrend = async () => {
    try {
      const response = await fetch('/api/monitoring/productivity')
      const data = await response.json()
      const byDate = {}
      data.forEach(p => {
        const date = p.score_date || new Date(p.created_at).toISOString().split('T')[0]
        if (!byDate[date]) byDate[date] = { date, scores: [] }
        byDate[date].scores.push(p.score || 0)
      })
      setProductivityTrend(Object.values(byDate)
        .map(d => ({ date: d.date, Score: Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length) }))
        .sort((a, b) => a.date.localeCompare(b.date)).slice(-30))
    } catch (error) { console.error('Error fetching productivity trend:', error) }
  }

  const fetchTopApps = async () => {
    try {
      const response = await fetch('/api/monitoring/activities?limit=1000')
      const data = await response.json()
      const appTimes = {}
      data.forEach(a => { const app = a.app_name || 'Unknown'; appTimes[app] = (appTimes[app] || 0) + (a.duration_seconds || 0) })
      setTopApps(Object.entries(appTimes).sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([name, seconds]) => ({ name: name.length > 20 ? name.substring(0, 20) + '...' : name, Minutes: Math.round(seconds / 60) })))
    } catch (error) { console.error('Error fetching top apps:', error) }
  }

  const requestAllScreenshots = () => {
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
      agents.filter(a => a.status === 'online').forEach(agent => {
        window.ws.send(JSON.stringify({ type: 'request_screenshot', agent_id: agent.id }))
      })
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never'
    const diff = new Date() - new Date(dateStr)
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return new Date(dateStr).toLocaleDateString()
  }

  const getSeverityStyle = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return { dotBg: '#ef4444', badgeBg: '#fef2f2', badgeColor: '#dc2626', label: 'CRIT' }
      case 'high':
        return { dotBg: '#f97316', badgeBg: '#fff7ed', badgeColor: '#ea580c', label: 'HIGH' }
      case 'medium':
        return { dotBg: '#3b82f6', badgeBg: '#eff6ff', badgeColor: '#2563eb', label: 'MED' }
      default:
        return { dotBg: '#94a3b8', badgeBg: '#f1f5f9', badgeColor: '#64748b', label: 'LOW' }
    }
  }

  // Compute activity stats
  const totalActive = activityData.reduce((sum, d) => sum + (d.Active || 0), 0)
  const totalIdle = activityData.reduce((sum, d) => sum + (d.Idle || 0), 0)
  const totalSessions = totalActive + totalIdle
  const activeRate = totalSessions > 0 ? Math.round((totalActive / totalSessions) * 100) : 0
  const formattedActivityData = activityData.map(d => ({ ...d, hour: d.hour.replace(':00', 'h') }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Dashboard</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: serverStatus === 'online' ? '#10b981' : '#ef4444',
              display: 'inline-block',
            }} />
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
              {serverStatus === 'online' ? 'System operational' : 'Connection lost'}
              {lastUpdated && ` · Updated ${formatDate(lastUpdated)}`}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={requestAllScreenshots}
            disabled={stats.online === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569',
              cursor: stats.online === 0 ? 'not-allowed' : 'pointer',
              opacity: stats.online === 0 ? 0.4 : 1,
            }}
          >
            <Camera style={{ width: '14px', height: '14px' }} />
            <span>Capture All</span>
          </button>
          <a
            href="/alerts"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569',
              textDecoration: 'none',
            }}
          >
            <Shield style={{ width: '14px', height: '14px' }} />
            <span>Alerts</span>
            {stats.alerts > 0 && (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 700,
              }}>{stats.alerts}</span>
            )}
          </a>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {/* Total Agents */}
        <div
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '16px',
            padding: '20px 24px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: hoveredCard === 'total' ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'box-shadow 0.2s',
            position: 'relative',
            overflow: 'hidden',
          }}
          onMouseEnter={() => setHoveredCard('total')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100px',
            height: '100px',
            background: 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
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
            flexShrink: 0,
          }}>
            <Users style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Agents</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>
              <AnimatedNumber value={stats.total} />
            </p>
          </div>
        </div>

        {/* Online */}
        <div
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '16px',
            padding: '20px 24px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: hoveredCard === 'online' ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'box-shadow 0.2s',
            position: 'relative',
            overflow: 'hidden',
          }}
          onMouseEnter={() => setHoveredCard('online')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100px',
            height: '100px',
            background: 'radial-gradient(circle at top right, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            flexShrink: 0,
          }}>
            <Wifi style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Online</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>
              <AnimatedNumber value={stats.online} />
            </p>
          </div>
        </div>

        {/* Today's Alerts */}
        <div
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '16px',
            padding: '20px 24px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: hoveredCard === 'alerts' ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'box-shadow 0.2s',
            position: 'relative',
            overflow: 'hidden',
          }}
          onMouseEnter={() => setHoveredCard('alerts')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100px',
            height: '100px',
            background: `radial-gradient(circle at top right, ${stats.alerts > 5 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)'} 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: stats.alerts > 5
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
              : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: stats.alerts > 5
              ? '0 4px 12px rgba(239, 68, 68, 0.3)'
              : '0 4px 12px rgba(245, 158, 11, 0.3)',
            flexShrink: 0,
          }}>
            <AlertTriangle style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Today's Alerts</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>
              <AnimatedNumber value={stats.alerts} />
            </p>
          </div>
        </div>

        {/* Avg Productivity */}
        <div
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '16px',
            padding: '20px 24px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: hoveredCard === 'prod' ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'box-shadow 0.2s',
            position: 'relative',
            overflow: 'hidden',
          }}
          onMouseEnter={() => setHoveredCard('prod')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100px',
            height: '100px',
            background: 'radial-gradient(circle at top right, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
            flexShrink: 0,
          }}>
            <TrendingUp style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Productivity</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>
              <AnimatedNumber value={stats.avgProductivity} suffix="%" />
            </p>
          </div>
        </div>
      </div>

      {/* Activity Timeline - Full Width */}
      <div style={{
        background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
        borderRadius: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Top bar */}
        <div style={{
          height: '4px',
          background: 'linear-gradient(90deg, #3b82f6 0%, #6366f1 50%, #06b6d4 100%)',
        }} />
        {/* Corner glow */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '150px',
          height: '150px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 12H18L15 21L9 3L6 12H2" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Activity Timeline</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Hourly breakdown</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '6px', borderRadius: '3px', background: 'linear-gradient(90deg, #3b82f6, #2563eb)', display: 'inline-block' }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{totalActive} active</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '6px', borderRadius: '3px', background: '#cbd5e1', display: 'inline-block' }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{totalIdle} idle</span>
              </div>
              <div style={{
                padding: '4px 10px',
                borderRadius: '8px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>{activeRate}%</span>
              </div>
            </div>
          </div>
          {formattedActivityData.length > 0 ? (
            <AreaChart
              data={formattedActivityData}
              index="hour"
              categories={["Active", "Idle"]}
              colors={["blue", "slate"]}
              showLegend={false}
              showGridLines={true}
              showYAxis={false}
              showAnimation={true}
              curveType="monotone"
              className="h-56"
            />
          ) : (
            <div style={{ height: '224px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px' }}>
              No activity data yet
            </div>
          )}
        </div>
      </div>

      {/* Productivity Trend + Distribution Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* 30-Day Productivity Trend */}
        <div style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg, #8b5cf6 0%, #a855f7 50%, #6d28d9 100%)',
          }} />
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '150px',
            height: '150px',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)',
              }}>
                <TrendingUp style={{ width: '18px', height: '18px', color: '#ffffff' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>30-Day Productivity</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Average score trend</p>
              </div>
            </div>
            {productivityTrend.length > 0 ? (
              <LineChart
                data={productivityTrend}
                index="date"
                categories={["Score"]}
                colors={["violet"]}
                className="h-52"
                showLegend={false}
                showAnimation={true}
                curveType="monotone"
                valueFormatter={(v) => `${v}%`}
              />
            ) : (
              <div style={{ height: '208px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px' }}>
                No trend data yet
              </div>
            )}
          </div>
        </div>

        {/* Productivity Distribution */}
        <div style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg, #10b981 0%, #059669 50%, #047857 100%)',
          }} />
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '150px',
            height: '150px',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white" opacity="0.9"/>
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Distribution</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Performance breakdown</p>
              </div>
            </div>
            {productivityDistribution.length > 0 ? (
              <DonutChart
                data={productivityDistribution}
                category="value"
                index="name"
                colors={["emerald", "blue", "amber", "red"]}
                className="h-52"
                showAnimation={true}
                valueFormatter={(v) => `${v} agents`}
              />
            ) : (
              <div style={{ height: '208px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="48" height="48" viewBox="0 0 48 48" style={{ color: '#d1d5db', marginBottom: '12px' }}>
                  <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="8 4"/>
                </svg>
                <span style={{ fontSize: '14px', color: '#94a3b8' }}>No data available</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Applications + Recent Alerts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Top Applications */}
        <div style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%)',
          }} />
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '150px',
            height: '150px',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="white" strokeWidth="2"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="white" strokeWidth="2"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="white" strokeWidth="2"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="white" strokeWidth="2"/></svg>
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Top Applications</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>By usage time</p>
              </div>
            </div>
            {topApps.length > 0 ? (
              <BarChart
                data={topApps}
                index="name"
                categories={["Minutes"]}
                colors={["indigo"]}
                className="h-64"
                showLegend={false}
                showAnimation={true}
                layout="vertical"
              />
            ) : (
              <div style={{ height: '256px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px' }}>
                No app data yet
              </div>
            )}
          </div>
        </div>

        {/* Recent Alerts */}
        <div style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg, #ef4444 0%, #f97316 50%, #f59e0b 100%)',
          }} />
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '150px',
            height: '150px',
            background: 'radial-gradient(circle, rgba(239, 68, 68, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 9V13M12 17H12.01M5.07 19H18.93C20.47 19 21.45 17.33 20.68 16L13.75 4C12.98 2.67 11.02 2.67 10.25 4L3.32 16C2.55 17.33 3.53 19 5.07 19Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Recent Alerts</h3>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{recentAlerts.length} incidents</p>
                </div>
              </div>
              <a href="/alerts" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#64748b',
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}>
                <span>View all</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>

            {recentAlerts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {recentAlerts.slice(0, 4).map((alert, i) => {
                  const sev = getSeverityStyle(alert.severity)
                  return (
                    <div key={alert.id || i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '12px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.6)',
                      border: '1px solid #f1f5f9',
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: sev.badgeBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 9V13M12 17H12.01" stroke={sev.dotBg} strokeWidth="2.5" strokeLinecap="round"/></svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {alert.type || 'Security Alert'}
                          </span>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            letterSpacing: '0.5px',
                            color: sev.badgeColor,
                            background: sev.badgeBg,
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}>{sev.label}</span>
                        </div>
                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {alert.employee_name || 'System'} · {alert.details?.substring(0, 35) || 'Alert triggered'}
                        </p>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: '#cbd5e1', flexShrink: 0 }}>{formatDate(alert.timestamp)}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>All clear</span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>No alerts to display</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Devices - Full Width */}
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, #eff6ff 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="2" width="18" height="12" rx="2" fill="white" fillOpacity="0.9"/>
                <path d="M7 18H17" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <path d="M12 14V18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Active Devices</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#059669' }}>{stats.online} connected</span>
                </div>
                <span style={{ color: '#e2e8f0' }}>·</span>
                <span style={{ fontSize: '11px', fontWeight: 500, color: '#94a3b8' }}>{stats.offline} away</span>
              </div>
            </div>
          </div>
          <a href="/agents" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#64748b',
            textDecoration: 'none',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}>
            <span>Manage</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>

        {agents.length > 0 ? (
          <div>
            {agents.slice(0, 6).map((agent, i) => (
              <div
                key={agent.id || i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '14px 24px',
                  borderBottom: i < Math.min(agents.length, 6) - 1 ? '1px solid #f8fafc' : 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: agent.status === 'online'
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="3" width="20" height="14" rx="2" stroke="white" strokeWidth="2"/>
                      <path d="M8 21H16M12 17V21" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  {agent.status === 'online' && (
                    <div style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      width: '10px',
                      height: '10px',
                      background: '#10b981',
                      borderRadius: '50%',
                      border: '2px solid #ffffff',
                    }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {agent.employee_name || agent.pc_name}
                  </p>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>{agent.pc_name}</p>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: agent.status === 'online' ? '#ecfdf5' : '#f1f5f9',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: agent.status === 'online' ? '#059669' : '#94a3b8',
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: agent.status === 'online' ? '#10b981' : '#cbd5e1',
                    display: 'inline-block',
                  }} />
                  {agent.status === 'online' ? 'Active' : 'Away'}
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: '#d1d5db', flexShrink: 0 }}>
                  <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: '#f1f5f9',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: '#cbd5e1' }}>
                <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 21H16M12 17V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>No devices connected</p>
            <p style={{ fontSize: '11px', color: '#94a3b8' }}>Waiting for agents to come online</p>
          </div>
        )}
      </div>
    </div>
  )
}
