import { useState, useEffect } from 'react'
import {
  AreaChart,
  DonutChart,
  BarChart,
} from '@tremor/react'
import {
  Activity as ActivityIcon,
  Clock,
  Monitor,
  TrendingUp,
  TrendingDown,
  Search,
  Calendar,
  User,
  Filter,
  Download,
  RefreshCw,
  AppWindow,
  Target,
  BarChart3,
  PieChart,
  Timer,
  Layers,
  Sparkles,
  Zap,
  Award,
} from 'lucide-react'
import Pagination from '../components/Pagination'
import ExportButton from '../components/ExportButton'

// App categorization
const appCategories = {
  'code': 'productive',
  'visual studio': 'productive',
  'vscode': 'productive',
  'terminal': 'productive',
  'cmd': 'productive',
  'powershell': 'productive',
  'word': 'productive',
  'excel': 'productive',
  'powerpoint': 'productive',
  'outlook': 'productive',
  'teams': 'productive',
  'slack': 'productive',
  'zoom': 'productive',
  'notion': 'productive',
  'jira': 'productive',
  'github': 'productive',
  'gitlab': 'productive',
  'postman': 'productive',
  'figma': 'productive',
  'photoshop': 'productive',
  'illustrator': 'productive',
  'youtube': 'unproductive',
  'netflix': 'unproductive',
  'twitch': 'unproductive',
  'spotify': 'unproductive',
  'discord': 'unproductive',
  'game': 'unproductive',
  'steam': 'unproductive',
  'reddit': 'unproductive',
  'twitter': 'unproductive',
  'facebook': 'unproductive',
  'instagram': 'unproductive',
  'tiktok': 'unproductive',
  'chrome': 'neutral',
  'firefox': 'neutral',
  'edge': 'neutral',
  'explorer': 'neutral',
  'finder': 'neutral',
  'settings': 'neutral',
}

const getAppCategory = (appName) => {
  if (!appName) return 'neutral'
  const lower = appName.toLowerCase()
  for (const [key, category] of Object.entries(appCategories)) {
    if (lower.includes(key)) return category
  }
  return 'neutral'
}

// ==================== MOCK DATA FOR TESTING ====================
const MOCK_HOURLY_ACTIVITY = [
  { hour: '06:00', Productive: 5, Unproductive: 2, Neutral: 3 },
  { hour: '07:00', Productive: 12, Unproductive: 5, Neutral: 8 },
  { hour: '08:00', Productive: 35, Unproductive: 8, Neutral: 12 },
  { hour: '09:00', Productive: 48, Unproductive: 5, Neutral: 7 },
  { hour: '10:00', Productive: 52, Unproductive: 3, Neutral: 5 },
  { hour: '11:00', Productive: 45, Unproductive: 8, Neutral: 7 },
  { hour: '12:00', Productive: 15, Unproductive: 25, Neutral: 20 },
  { hour: '13:00', Productive: 38, Unproductive: 12, Neutral: 10 },
  { hour: '14:00', Productive: 55, Unproductive: 2, Neutral: 3 },
  { hour: '15:00', Productive: 50, Unproductive: 5, Neutral: 5 },
  { hour: '16:00', Productive: 42, Unproductive: 10, Neutral: 8 },
  { hour: '17:00', Productive: 30, Unproductive: 15, Neutral: 15 },
  { hour: '18:00', Productive: 18, Unproductive: 20, Neutral: 22 },
  { hour: '19:00', Productive: 8, Unproductive: 25, Neutral: 27 },
  { hour: '20:00', Productive: 5, Unproductive: 30, Neutral: 25 },
  { hour: '21:00', Productive: 2, Unproductive: 35, Neutral: 23 },
  { hour: '22:00', Productive: 0, Unproductive: 20, Neutral: 10 },
]

const MOCK_CATEGORY_DISTRIBUTION = [
  { name: 'Productive', value: 460, color: 'emerald' },
  { name: 'Unproductive', value: 230, color: 'red' },
  { name: 'Neutral', value: 210, color: 'blue' },
]

const MOCK_TOP_APPS = [
  { name: 'VS Code', Minutes: 185, category: 'productive' },
  { name: 'Chrome', Minutes: 142, category: 'neutral' },
  { name: 'Slack', Minutes: 98, category: 'productive' },
  { name: 'Terminal', Minutes: 76, category: 'productive' },
  { name: 'YouTube', Minutes: 65, category: 'unproductive' },
  { name: 'Figma', Minutes: 58, category: 'productive' },
  { name: 'Discord', Minutes: 45, category: 'unproductive' },
  { name: 'Notion', Minutes: 38, category: 'productive' },
]

const MOCK_STATS = {
  totalTime: 900,
  productiveTime: 460,
  unproductiveTime: 230,
  topApp: 'VS Code',
  productivityScore: 67,
}

const MOCK_ACTIVITIES = [
  { id: 1, started_at: new Date().toISOString(), employee_name: 'John Smith', pc_name: 'DESKTOP-001', app_name: 'VS Code', window_title: 'Activity.jsx - employee-monitor', duration_seconds: 3600 },
  { id: 2, started_at: new Date(Date.now() - 3600000).toISOString(), employee_name: 'John Smith', pc_name: 'DESKTOP-001', app_name: 'Chrome', window_title: 'Stack Overflow - React hooks', duration_seconds: 1800 },
  { id: 3, started_at: new Date(Date.now() - 7200000).toISOString(), employee_name: 'Sarah Johnson', pc_name: 'LAPTOP-002', app_name: 'Slack', window_title: '#development - Team Chat', duration_seconds: 2400 },
  { id: 4, started_at: new Date(Date.now() - 10800000).toISOString(), employee_name: 'Mike Wilson', pc_name: 'DESKTOP-003', app_name: 'YouTube', window_title: 'React Tutorial 2024', duration_seconds: 1200 },
  { id: 5, started_at: new Date(Date.now() - 14400000).toISOString(), employee_name: 'Sarah Johnson', pc_name: 'LAPTOP-002', app_name: 'Figma', window_title: 'Dashboard Design v2', duration_seconds: 5400 },
  { id: 6, started_at: new Date(Date.now() - 18000000).toISOString(), employee_name: 'John Smith', pc_name: 'DESKTOP-001', app_name: 'Terminal', window_title: 'npm run dev', duration_seconds: 900 },
  { id: 7, started_at: new Date(Date.now() - 21600000).toISOString(), employee_name: 'Mike Wilson', pc_name: 'DESKTOP-003', app_name: 'Discord', window_title: 'Gaming Server', duration_seconds: 2700 },
  { id: 8, started_at: new Date(Date.now() - 25200000).toISOString(), employee_name: 'Emily Davis', pc_name: 'LAPTOP-004', app_name: 'Notion', window_title: 'Project Documentation', duration_seconds: 1800 },
  { id: 9, started_at: new Date(Date.now() - 28800000).toISOString(), employee_name: 'Emily Davis', pc_name: 'LAPTOP-004', app_name: 'VS Code', window_title: 'index.js - api-server', duration_seconds: 4200 },
  { id: 10, started_at: new Date(Date.now() - 32400000).toISOString(), employee_name: 'John Smith', pc_name: 'DESKTOP-001', app_name: 'Postman', window_title: 'API Testing Collection', duration_seconds: 1500 },
]

const USE_MOCK_DATA = false // Toggle this to switch between mock and real data
// ==================== END MOCK DATA ====================

export default function Activity() {
  const [activities, setActivities] = useState(USE_MOCK_DATA ? MOCK_ACTIVITIES : [])
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [dateRange, setDateRange] = useState('today')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [summary, setSummary] = useState(USE_MOCK_DATA ? MOCK_TOP_APPS : [])
  const [categoryDistribution, setCategoryDistribution] = useState(USE_MOCK_DATA ? MOCK_CATEGORY_DISTRIBUTION : [])
  const [hourlyActivity, setHourlyActivity] = useState(USE_MOCK_DATA ? MOCK_HOURLY_ACTIVITY : [])
  const [currentPage, setCurrentPage] = useState(1)
  const [stats, setStats] = useState(USE_MOCK_DATA ? MOCK_STATS : {
    totalTime: 0,
    productiveTime: 0,
    unproductiveTime: 0,
    topApp: '',
    productivityScore: 0,
  })

  useEffect(() => {
    fetchAgents()
  }, [])

  useEffect(() => {
    fetchActivities()
  }, [selectedAgent, dateRange])

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.data_type === 'activities') {
        setSyncing(false)
        fetchActivities()
      }
    }
    window.addEventListener('data_sync_complete', handler)
    return () => window.removeEventListener('data_sync_complete', handler)
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

  const fetchActivities = async () => {
    // Skip API call if using mock data
    if (USE_MOCK_DATA) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      let url = '/api/monitoring/activities?limit=500'
      if (selectedAgent) url += `&agent_id=${selectedAgent}`
      const response = await fetch(url)
      const data = await response.json()
      setActivities(data)
      processActivityData(data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching activities:', error)
      setLoading(false)
    }
  }

  const requestLatest = () => {
    if (!selectedAgent || !window.ws) return
    setSyncing(true)
    window.ws.send(JSON.stringify({ type: 'request_data_sync', agent_id: selectedAgent, data_type: 'activities' }))
    setTimeout(() => setSyncing(false), 15000)
  }

  const processActivityData = (data) => {
    const appTimes = {}
    let totalSeconds = 0
    let productiveSeconds = 0
    let unproductiveSeconds = 0

    data.forEach(a => {
      const app = a.app_name || 'Unknown'
      const seconds = a.duration_seconds || 0
      appTimes[app] = (appTimes[app] || 0) + seconds
      totalSeconds += seconds

      const category = getAppCategory(app)
      if (category === 'productive') productiveSeconds += seconds
      else if (category === 'unproductive') unproductiveSeconds += seconds
    })

    const sortedApps = Object.entries(appTimes).sort((a, b) => b[1] - a[1])
    const topApp = sortedApps[0] ? sortedApps[0][0] : 'None'

    const summaryData = sortedApps.slice(0, 8).map(([name, seconds]) => ({
      name: name.length > 12 ? name.substring(0, 12) + '...' : name,
      'Minutes': Math.round(seconds / 60),
      category: getAppCategory(name),
    }))
    setSummary(summaryData)

    const categoryData = [
      { name: 'Productive', value: Math.round(productiveSeconds / 60), color: 'emerald' },
      { name: 'Unproductive', value: Math.round(unproductiveSeconds / 60), color: 'red' },
      { name: 'Neutral', value: Math.round((totalSeconds - productiveSeconds - unproductiveSeconds) / 60), color: 'blue' },
    ].filter(d => d.value > 0)
    setCategoryDistribution(categoryData)

    const hourlyData = {}
    data.forEach(a => {
      const hour = new Date(a.started_at || a.created_at).getHours()
      const hourKey = `${hour.toString().padStart(2, '0')}:00`
      const category = getAppCategory(a.app_name)

      if (!hourlyData[hourKey]) {
        hourlyData[hourKey] = { hour: hourKey, Productive: 0, Unproductive: 0, Neutral: 0 }
      }

      const minutes = Math.round((a.duration_seconds || 0) / 60)
      if (category === 'productive') hourlyData[hourKey].Productive += minutes
      else if (category === 'unproductive') hourlyData[hourKey].Unproductive += minutes
      else hourlyData[hourKey].Neutral += minutes
    })

    const timelineData = []
    for (let h = 6; h <= 22; h++) {
      const hourKey = `${h.toString().padStart(2, '0')}:00`
      timelineData.push(hourlyData[hourKey] || { hour: hourKey, Productive: 0, Unproductive: 0, Neutral: 0 })
    }
    setHourlyActivity(timelineData)

    const productivityScore = totalSeconds > 0
      ? Math.round((productiveSeconds / totalSeconds) * 100)
      : 0

    setStats({
      totalTime: Math.round(totalSeconds / 60),
      productiveTime: Math.round(productiveSeconds / 60),
      unproductiveTime: Math.round(unproductiveSeconds / 60),
      topApp,
      productivityScore,
    })
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '-'
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  const formatMinutes = (minutes) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const filteredActivities = activities.filter(a => {
    const matchesCategory = categoryFilter === 'all' || getAppCategory(a.app_name) === categoryFilter
    const matchesSearch = !searchQuery ||
      a.app_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.window_title?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Export columns for ExportButton
  const exportColumns = [
    { label: 'Time', key: 'started_at', accessor: (a) => formatDate(a.started_at || a.created_at) },
    { label: 'Agent', key: 'employee_name', accessor: (a) => a.employee_name || a.pc_name || 'Unknown' },
    { label: 'Application', key: 'app_name', accessor: (a) => a.app_name || 'Unknown' },
    { label: 'Window Title', key: 'window_title', accessor: (a) => (a.window_title || '').replace(/,/g, ';') },
    { label: 'Duration', key: 'duration_seconds', accessor: (a) => formatDuration(a.duration_seconds) },
    { label: 'Category', key: 'category', accessor: (a) => getAppCategory(a.app_name) },
  ]

  const getCategoryStyle = (category) => {
    switch (category) {
      case 'productive':
        return { background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', color: '#059669', border: '1px solid #a7f3d0' }
      case 'unproductive':
        return { background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)', color: '#dc2626', border: '1px solid #fca5a5' }
      default:
        return { background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', color: '#2563eb', border: '1px solid #93c5fd' }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Stats Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '16px'
      }}>
        {/* Total Time */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '16px',
          padding: '20px 24px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
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
            <Clock style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Time</p>
            <p style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{formatMinutes(stats.totalTime)}</p>
          </div>
        </div>

        {/* Productive Time */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '16px',
          padding: '20px 24px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            flexShrink: 0
          }}>
            <TrendingUp style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Productive</p>
            <p style={{ fontSize: '26px', fontWeight: 700, color: '#059669', lineHeight: 1 }}>{formatMinutes(stats.productiveTime)}</p>
          </div>
        </div>

        {/* Unproductive Time */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '16px',
          padding: '20px 24px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
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
            <TrendingDown style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unproductive</p>
            <p style={{ fontSize: '26px', fontWeight: 700, color: '#ef4444', lineHeight: 1 }}>{formatMinutes(stats.unproductiveTime)}</p>
          </div>
        </div>

        {/* Productivity Score */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '16px',
          padding: '20px 24px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
            flexShrink: 0
          }}>
            <Target style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Score</p>
            <p style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{stats.productivityScore}%</p>
          </div>
        </div>

        {/* Top App */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '16px',
          padding: '20px 24px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
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
            <AppWindow style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top App</p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stats.topApp || 'None'}</p>
          </div>
        </div>
      </div>

      {/* ==================== STUNNING CHARTS SECTION ==================== */}

      {/* Main Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Hourly Activity - Premium Card */}
        <div style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* Decorative top gradient bar */}
          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
          }} />

          {/* Decorative corner glow */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '150px',
            height: '150px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)'
                }}>
                  <BarChart3 style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '3px' }}>Activity Timeline</h3>
                  <p style={{ fontSize: '13px', color: '#64748b' }}>Hourly breakdown by category</p>
                </div>
              </div>

              {/* Legend - Floating Pills */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                  borderRadius: '20px',
                  border: '1px solid #a7f3d0'
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px rgba(16, 185, 129, 0.5)' }} />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#059669' }}>Productive</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
                  borderRadius: '20px',
                  border: '1px solid #fca5a5'
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px rgba(239, 68, 68, 0.5)' }} />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#dc2626' }}>Unproductive</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  borderRadius: '20px',
                  border: '1px solid #93c5fd'
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 6px rgba(59, 130, 246, 0.5)' }} />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb' }}>Neutral</span>
                </div>
              </div>
            </div>

            {/* Chart Container with subtle background */}
            <div style={{
              background: 'linear-gradient(180deg, rgba(248, 250, 252, 0.5) 0%, rgba(241, 245, 249, 0.3) 100%)',
              borderRadius: '16px',
              padding: '16px 8px 8px 8px',
              border: '1px solid rgba(226, 232, 240, 0.5)'
            }}>
              <AreaChart
                className="h-72"
                data={hourlyActivity}
                index="hour"
                categories={['Productive', 'Unproductive', 'Neutral']}
                colors={['emerald', 'red', 'blue']}
                showLegend={false}
                showGridLines={true}
                showAnimation={true}
                curveType="monotone"
                stack
              />
            </div>
          </div>
        </div>

        {/* Productivity Score - Premium Gauge Card */}
        <div style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #faf5ff 50%, #f3e8ff 100%)',
          borderRadius: '24px',
          border: '1px solid #e9d5ff',
          boxShadow: '0 4px 20px rgba(139, 92, 246, 0.08), 0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* Decorative top gradient bar */}
          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg, #a855f7 0%, #6366f1 50%, #8b5cf6 100%)',
          }} />

          {/* Decorative elements */}
          <div style={{
            position: 'absolute',
            top: '-30px',
            left: '-30px',
            width: '120px',
            height: '120px',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-40px',
            right: '-40px',
            width: '140px',
            height: '140px',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{ padding: '24px', position: 'relative' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)'
              }}>
                <PieChart style={{ width: '20px', height: '20px', color: '#ffffff' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '3px' }}>Time Distribution</h3>
                <p style={{ fontSize: '13px', color: '#64748b' }}>By productivity category</p>
              </div>
            </div>

            {/* Donut Chart with Center Score */}
            <div style={{ position: 'relative' }}>
              {categoryDistribution.length > 0 ? (
                <>
                  <DonutChart
                    className="h-64"
                    data={categoryDistribution}
                    category="value"
                    index="name"
                    colors={['emerald', 'red', 'blue']}
                    valueFormatter={(v) => `${v}m`}
                    showLabel={false}
                    showAnimation={true}
                  />
                  {/* Center overlay with score */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.08), inset 0 2px 4px rgba(255,255,255,0.8)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{stats.productivityScore}%</span>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Score</span>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{
                  height: '256px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <p style={{ fontSize: '14px', color: '#94a3b8' }}>No data available</p>
                </div>
              )}
            </div>

            {/* Stats Pills Row */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              {categoryDistribution.map((cat, idx) => (
                <div key={idx} style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: cat.name === 'Productive' ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' :
                              cat.name === 'Unproductive' ? 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)' :
                              'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  border: cat.name === 'Productive' ? '1px solid #a7f3d0' :
                          cat.name === 'Unproductive' ? '1px solid #fca5a5' :
                          '1px solid #93c5fd',
                  textAlign: 'center'
                }}>
                  <p style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: cat.name === 'Productive' ? '#059669' :
                           cat.name === 'Unproductive' ? '#dc2626' : '#2563eb',
                    marginBottom: '2px'
                  }}>{cat.value}m</p>
                  <p style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>{cat.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Applications - Stunning Horizontal Bar Chart */}
      {summary.length > 0 && (
        <div style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #fffbeb 50%, #fef3c7 100%)',
          borderRadius: '24px',
          border: '1px solid #fde68a',
          boxShadow: '0 4px 20px rgba(245, 158, 11, 0.08), 0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* Decorative top gradient bar */}
          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg, #f59e0b 0%, #eab308 50%, #f97316 100%)',
          }} />

          {/* Decorative corner */}
          <div style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '130px',
            height: '130px',
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)'
                }}>
                  <Layers style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '3px' }}>Top Applications</h3>
                  <p style={{ fontSize: '13px', color: '#64748b' }}>Most used applications by time</p>
                </div>
              </div>

              {/* Top App Badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                borderRadius: '12px',
                border: '1px solid #fcd34d'
              }}>
                <Award style={{ width: '16px', height: '16px', color: '#d97706' }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#92400e' }}>Top: {stats.topApp}</span>
              </div>
            </div>

            {/* Custom App List with Bars */}
            <div style={{
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.8) 0%, rgba(254, 249, 195, 0.3) 100%)',
              borderRadius: '16px',
              padding: '20px 24px',
              border: '1px solid rgba(253, 230, 138, 0.5)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {summary.map((app, idx) => {
                  const maxMinutes = Math.max(...summary.map(a => a.Minutes))
                  const percentage = (app.Minutes / maxMinutes) * 100
                  const categoryColor = app.category === 'productive' ? '#10b981' :
                                        app.category === 'unproductive' ? '#ef4444' : '#3b82f6'
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {/* Rank */}
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: idx === 0 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
                                    idx === 1 ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' :
                                    idx === 2 ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' :
                                    '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: idx < 3 ? '0 2px 6px rgba(0,0,0,0.15)' : 'none'
                      }}>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: idx < 3 ? '#ffffff' : '#64748b'
                        }}>{idx + 1}</span>
                      </div>

                      {/* App Name */}
                      <div style={{ width: '100px', flexShrink: 0 }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#1e293b'
                        }}>{app.name}</span>
                      </div>

                      {/* Bar Container */}
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          flex: 1,
                          height: '24px',
                          background: '#f8fafc',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: '1px solid #e2e8f0'
                        }}>
                          <div style={{
                            width: `${percentage}%`,
                            height: '100%',
                            background: `linear-gradient(90deg, ${categoryColor}dd 0%, ${categoryColor} 100%)`,
                            borderRadius: '5px',
                            transition: 'width 0.5s ease-out',
                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3)`
                          }} />
                        </div>

                        {/* Time */}
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#0f172a',
                          minWidth: '50px',
                          textAlign: 'right',
                          fontFamily: 'monospace'
                        }}>{app.Minutes}m</span>

                        {/* Category Dot */}
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: categoryColor,
                          boxShadow: `0 0 6px ${categoryColor}80`,
                          flexShrink: 0
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== END CHARTS SECTION ==================== */}

      {/* Activity Table Card */}
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
          {/* Left: Search */}
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
              placeholder="Search activities..."
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

          {/* Center: Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Date Range */}
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
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="all">All Time</option>
              </select>
            </div>

            {/* Agent Selector */}
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

            {/* Category Filter */}
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
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
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
                <option value="all">All Categories</option>
                <option value="productive">Productive</option>
                <option value="unproductive">Unproductive</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={requestLatest} disabled={!selectedAgent || syncing} title={!selectedAgent ? 'Select an agent first' : 'Request latest data from agent'} style={{ height: '40px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', background: selectedAgent && !syncing ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#e2e8f0', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: selectedAgent && !syncing ? '#ffffff' : '#94a3b8', cursor: selectedAgent && !syncing ? 'pointer' : 'not-allowed', boxShadow: selectedAgent && !syncing ? '0 2px 4px rgba(16, 185, 129, 0.3)' : 'none', transition: 'all 0.2s' }}>
              {syncing ? <RefreshCw style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} /> : <Zap style={{ width: '15px', height: '15px' }} />}
              {syncing ? 'Syncing...' : 'Request Latest'}
            </button>
            <button
              onClick={fetchActivities}
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
              data={filteredActivities}
              filename="activity_log"
              columns={exportColumns}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ActivityIcon style={{ width: '16px', height: '16px', color: '#64748b' }} />
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>Activity Log</span>
          </div>
          <div style={{
            padding: '6px 12px',
            background: '#f1f5f9',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#475569'
          }}>
            {filteredActivities.length} activit{filteredActivities.length !== 1 ? 'ies' : 'y'}
          </div>
        </div>

        {/* Table Content */}
        <div style={{ padding: '0' }}>
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
                borderTopColor: '#3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ marginTop: '16px', fontSize: '14px', color: '#64748b' }}>Loading activities...</p>
            </div>
          ) : filteredActivities.length === 0 ? (
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
                background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <ActivityIcon style={{ width: '36px', height: '36px', color: '#94a3b8' }} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>No activities found</h3>
              <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center', maxWidth: '300px' }}>
                Activity data will appear here once captured from connected agents.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Agent</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Application</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Window Title</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Duration</th>
                    <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActivities.slice((currentPage - 1) * 50, currentPage * 50).map((activity, index) => {
                    const category = getAppCategory(activity.app_name)
                    const categoryStyle = getCategoryStyle(category)
                    return (
                      <tr
                        key={index}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s'
                        }}
                        className="table-row-hover"
                      >
                        <td style={{ padding: '14px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Timer style={{ width: '14px', height: '14px', color: '#94a3b8', flexShrink: 0 }} />
                            <span style={{ fontSize: '13px', color: '#475569', whiteSpace: 'nowrap' }}>
                              {formatDate(activity.started_at || activity.created_at)}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <Monitor style={{ width: '14px', height: '14px', color: '#ffffff' }} />
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>
                              {activity.employee_name || activity.pc_name || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            background: '#eff6ff',
                            borderRadius: '8px',
                            border: '1px solid #dbeafe'
                          }}>
                            <AppWindow style={{ width: '12px', height: '12px', color: '#3b82f6' }} />
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#1d4ed8' }}>
                              {activity.app_name || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', maxWidth: '300px' }}>
                          <span style={{
                            fontSize: '13px',
                            color: '#64748b',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {activity.window_title || '-'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#0f172a',
                            fontFamily: 'monospace'
                          }}>
                            {formatDuration(activity.duration_seconds)}
                          </span>
                        </td>
                        <td style={{ padding: '14px 24px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '5px 12px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            ...categoryStyle
                          }}>
                            {category}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredActivities.length > 0 && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9' }}>
            <Pagination
              totalItems={filteredActivities.length}
              itemsPerPage={50}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* CSS */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .table-row-hover:hover {
          background: #f8fafc;
        }
      `}</style>
    </div>
  )
}
