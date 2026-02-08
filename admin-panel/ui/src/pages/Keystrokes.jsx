import { useState, useEffect } from 'react'
import { AreaChart, DonutChart } from '@tremor/react'
import {
  Keyboard,
  Search,
  AlertTriangle,
  Clock,
  Monitor,
  TrendingUp,
  Calendar,
  User,
  Filter,
  Download,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Activity,
  Hash,
  Type,
  Eye,
  EyeOff,
  ChevronDown,
  Sparkles,
  BarChart3,
  PieChart,
} from 'lucide-react'
import Pagination from '../components/Pagination'

// ==================== MOCK DATA FOR TESTING ====================
const MOCK_HOURLY_ACTIVITY = [
  { hour: '00:00', Keystrokes: 120 },
  { hour: '01:00', Keystrokes: 45 },
  { hour: '02:00', Keystrokes: 0 },
  { hour: '03:00', Keystrokes: 0 },
  { hour: '04:00', Keystrokes: 0 },
  { hour: '05:00', Keystrokes: 0 },
  { hour: '06:00', Keystrokes: 85 },
  { hour: '07:00', Keystrokes: 420 },
  { hour: '08:00', Keystrokes: 1850 },
  { hour: '09:00', Keystrokes: 3200 },
  { hour: '10:00', Keystrokes: 4100 },
  { hour: '11:00', Keystrokes: 3800 },
  { hour: '12:00', Keystrokes: 1200 },
  { hour: '13:00', Keystrokes: 2800 },
  { hour: '14:00', Keystrokes: 4500 },
  { hour: '15:00', Keystrokes: 4200 },
  { hour: '16:00', Keystrokes: 3600 },
  { hour: '17:00', Keystrokes: 2400 },
  { hour: '18:00', Keystrokes: 980 },
  { hour: '19:00', Keystrokes: 650 },
  { hour: '20:00', Keystrokes: 420 },
  { hour: '21:00', Keystrokes: 380 },
  { hour: '22:00', Keystrokes: 250 },
  { hour: '23:00', Keystrokes: 180 },
]

const MOCK_APP_BREAKDOWN = [
  { name: 'VS Code', value: 12500, color: '#3b82f6' },
  { name: 'Chrome', value: 8200, color: '#06b6d4' },
  { name: 'Slack', value: 4800, color: '#8b5cf6' },
  { name: 'Terminal', value: 3200, color: '#10b981' },
  { name: 'Word', value: 2400, color: '#f59e0b' },
  { name: 'Other', value: 3180, color: '#64748b' },
]

const MOCK_STATS = {
  totalKeystrokes: 34280,
  totalSessions: 156,
  topApp: 'VS Code',
  alertCount: 3,
  avgPerHour: 2856,
}

const MOCK_KEYSTROKES = [
  { id: 1, captured_at: new Date().toISOString(), employee_name: 'John Smith', pc_name: 'DESKTOP-001', app_name: 'VS Code', window_title: 'Keystrokes.jsx - employee-monitor', keystroke_count: 1247, content: '' },
  { id: 2, captured_at: new Date(Date.now() - 1800000).toISOString(), employee_name: 'John Smith', pc_name: 'DESKTOP-001', app_name: 'Chrome', window_title: 'React Documentation - Hooks', keystroke_count: 856, content: '' },
  { id: 3, captured_at: new Date(Date.now() - 3600000).toISOString(), employee_name: 'Sarah Johnson', pc_name: 'LAPTOP-002', app_name: 'Slack', window_title: '#development - password reset discussion', keystroke_count: 432, content: 'password' },
  { id: 4, captured_at: new Date(Date.now() - 5400000).toISOString(), employee_name: 'Mike Wilson', pc_name: 'DESKTOP-003', app_name: 'Word', window_title: 'Project Proposal.docx', keystroke_count: 2156, content: '' },
  { id: 5, captured_at: new Date(Date.now() - 7200000).toISOString(), employee_name: 'Sarah Johnson', pc_name: 'LAPTOP-002', app_name: 'VS Code', window_title: 'api-routes.ts - backend', keystroke_count: 1823, content: '' },
  { id: 6, captured_at: new Date(Date.now() - 9000000).toISOString(), employee_name: 'Emily Davis', pc_name: 'LAPTOP-004', app_name: 'Terminal', window_title: 'npm run build', keystroke_count: 234, content: '' },
  { id: 7, captured_at: new Date(Date.now() - 10800000).toISOString(), employee_name: 'John Smith', pc_name: 'DESKTOP-001', app_name: 'Chrome', window_title: 'Bank Account - Login', keystroke_count: 89, content: 'bank account' },
  { id: 8, captured_at: new Date(Date.now() - 12600000).toISOString(), employee_name: 'Mike Wilson', pc_name: 'DESKTOP-003', app_name: 'Slack', window_title: '#general - Team Updates', keystroke_count: 567, content: '' },
  { id: 9, captured_at: new Date(Date.now() - 14400000).toISOString(), employee_name: 'Emily Davis', pc_name: 'LAPTOP-004', app_name: 'VS Code', window_title: 'database.config.ts', keystroke_count: 1456, content: '' },
  { id: 10, captured_at: new Date(Date.now() - 16200000).toISOString(), employee_name: 'Sarah Johnson', pc_name: 'LAPTOP-002', app_name: 'Chrome', window_title: 'Credit Card Application - Form', keystroke_count: 234, content: 'credit card' },
  { id: 11, captured_at: new Date(Date.now() - 18000000).toISOString(), employee_name: 'John Smith', pc_name: 'DESKTOP-001', app_name: 'VS Code', window_title: 'utils.ts - helpers', keystroke_count: 987, content: '' },
  { id: 12, captured_at: new Date(Date.now() - 19800000).toISOString(), employee_name: 'Mike Wilson', pc_name: 'DESKTOP-003', app_name: 'Excel', window_title: 'Q4 Budget Report.xlsx', keystroke_count: 1234, content: '' },
]

const USE_MOCK_DATA = false
// ==================== END MOCK DATA ====================

// Configurable sensitive keywords for alerts
const sensitiveKeywords = [
  'password', 'pwd', 'secret', 'credit card', 'ssn', 'social security',
  'bank account', 'routing number', 'cvv', 'pin', 'confidential'
]

const checkForSensitiveContent = (text) => {
  if (!text) return false
  const lower = text.toLowerCase()
  return sensitiveKeywords.some(keyword => lower.includes(keyword))
}

// Extract app name from window title as fallback
const extractAppName = (windowTitle, appName) => {
  if (appName && appName !== 'Unknown' && appName !== '') return appName
  if (!windowTitle) return 'Unknown'

  const title = windowTitle.toLowerCase()

  // Known app patterns with display names
  const knownApps = [
    { pattern: 'google chrome', display: 'Chrome' },
    { pattern: 'chrome', display: 'Chrome' },
    { pattern: 'firefox', display: 'Firefox' },
    { pattern: 'edge', display: 'Edge' },
    { pattern: 'safari', display: 'Safari' },
    { pattern: 'vs code', display: 'VS Code' },
    { pattern: 'visual studio code', display: 'VS Code' },
    { pattern: 'code -', display: 'VS Code' },
    { pattern: 'notepad++', display: 'Notepad++' },
    { pattern: 'notepad', display: 'Notepad' },
    { pattern: 'word', display: 'Word' },
    { pattern: 'excel', display: 'Excel' },
    { pattern: 'powerpoint', display: 'PowerPoint' },
    { pattern: 'outlook', display: 'Outlook' },
    { pattern: 'slack', display: 'Slack' },
    { pattern: 'discord', display: 'Discord' },
    { pattern: 'teams', display: 'Teams' },
    { pattern: 'zoom', display: 'Zoom' },
    { pattern: 'terminal', display: 'Terminal' },
    { pattern: 'powershell', display: 'PowerShell' },
    { pattern: 'cmd.exe', display: 'CMD' },
    { pattern: 'explorateur', display: 'Explorer' },
    { pattern: 'file explorer', display: 'Explorer' },
    { pattern: 'explorer', display: 'Explorer' },
    { pattern: 'tiktok', display: 'TikTok' },
    { pattern: 'facebook', display: 'Facebook' },
    { pattern: 'instagram', display: 'Instagram' },
    { pattern: 'twitter', display: 'Twitter' },
    { pattern: 'youtube', display: 'YouTube' },
    { pattern: 'whatsapp', display: 'WhatsApp' },
    { pattern: 'telegram', display: 'Telegram' },
  ]

  for (const app of knownApps) {
    if (title.includes(app.pattern)) {
      return app.display
    }
  }

  // Try to extract from "- AppName" pattern at end
  const dashMatch = windowTitle.match(/[-–—:]\s*([^-–—:]+)$/)
  if (dashMatch && dashMatch[1]) {
    const extracted = dashMatch[1].trim()
    if (extracted.length < 30 && extracted.length > 1) return extracted
  }

  return 'Unknown'
}

export default function Keystrokes() {
  const [keystrokes, setKeystrokes] = useState(USE_MOCK_DATA ? MOCK_KEYSTROKES : [])
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [dateRange, setDateRange] = useState('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandedRow, setExpandedRow] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [stats, setStats] = useState(USE_MOCK_DATA ? MOCK_STATS : {
    totalKeystrokes: 0,
    totalSessions: 0,
    topApp: '',
    alertCount: 0,
    avgPerHour: 0,
  })
  const [hourlyActivity, setHourlyActivity] = useState(USE_MOCK_DATA ? MOCK_HOURLY_ACTIVITY : [])
  const [appBreakdown, setAppBreakdown] = useState(USE_MOCK_DATA ? MOCK_APP_BREAKDOWN : [])

  useEffect(() => {
    fetchAgents()
  }, [])

  useEffect(() => {
    fetchKeystrokes()
  }, [selectedAgent, dateRange])

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.data_type === 'keystrokes') {
        setSyncing(false)
        fetchKeystrokes()
      }
    }
    window.addEventListener('data_sync_complete', handler)
    return () => window.removeEventListener('data_sync_complete', handler)
  }, [selectedAgent])

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents')
      setAgents(await response.json())
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const fetchKeystrokes = async () => {
    if (USE_MOCK_DATA) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      let url = '/api/monitoring/keystrokes?limit=500'
      if (selectedAgent) url += `&agent_id=${selectedAgent}`
      const response = await fetch(url)
      const data = await response.json()
      setKeystrokes(data)
      processKeystrokeData(data)
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const processKeystrokeData = (data) => {
    let totalKeys = 0
    let alertCount = 0
    const appCounts = {}

    data.forEach(k => {
      totalKeys += k.keystroke_count || 0
      const app = k.app_name || 'Unknown'
      appCounts[app] = (appCounts[app] || 0) + (k.keystroke_count || 0)

      if (checkForSensitiveContent(k.content || k.window_title)) {
        alertCount++
      }
    })

    const sortedApps = Object.entries(appCounts).sort((a, b) => b[1] - a[1])
    const topApp = sortedApps[0] ? sortedApps[0][0] : 'None'

    setStats({
      totalKeystrokes: totalKeys,
      totalSessions: data.length,
      topApp,
      alertCount,
      avgPerHour: Math.round(totalKeys / 24),
    })

    const breakdownData = sortedApps.slice(0, 6).map(([name, count]) => ({
      name,
      value: count,
    }))
    setAppBreakdown(breakdownData)

    const hourlyData = {}
    data.forEach(k => {
      const hour = new Date(k.captured_at || k.created_at).getHours()
      const hourKey = `${hour.toString().padStart(2, '0')}:00`
      hourlyData[hourKey] = (hourlyData[hourKey] || 0) + (k.keystroke_count || 0)
    })

    const timelineData = []
    for (let h = 0; h < 24; h++) {
      const hourKey = `${h.toString().padStart(2, '0')}:00`
      timelineData.push({
        hour: hourKey,
        Keystrokes: hourlyData[hourKey] || 0,
      })
    }
    setHourlyActivity(timelineData)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown'
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return 'Unknown'
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch {
      return 'Unknown'
    }
  }

  const filteredKeystrokes = keystrokes.filter(k => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      (k.app_name && k.app_name.toLowerCase().includes(query)) ||
      (k.window_title && k.window_title.toLowerCase().includes(query)) ||
      (k.content && k.content.toLowerCase().includes(query))
    )
  })

  const requestLatest = () => {
    if (!selectedAgent || !window.ws) return
    setSyncing(true)
    window.ws.send(JSON.stringify({ type: 'request_data_sync', agent_id: selectedAgent, data_type: 'keystrokes' }))
    setTimeout(() => setSyncing(false), 15000)
  }

  const exportToCSV = () => {
    if (!filteredKeystrokes.length) return
    const headers = ['Time', 'Agent', 'Application', 'Window Title', 'Keystrokes', 'Alert']
    const rows = filteredKeystrokes.map(k => [
      formatDate(k.captured_at || k.created_at),
      k.employee_name || k.pc_name || 'Unknown',
      k.app_name || 'Unknown',
      (k.window_title || '').replace(/,/g, ';'),
      k.keystroke_count || 0,
      checkForSensitiveContent(k.content || k.window_title) ? 'Yes' : 'No'
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `keystrokes_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ==================== STATS CARDS ==================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '16px'
      }}>
        {/* Total Keystrokes */}
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
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
            flexShrink: 0
          }}>
            <Keyboard style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Keystrokes</p>
            <p style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{stats.totalKeystrokes.toLocaleString()}</p>
          </div>
        </div>

        {/* Sessions */}
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
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, transparent 70%)',
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
            boxShadow: '0 4px 12px rgba(6, 182, 212, 0.35)',
            flexShrink: 0
          }}>
            <Activity style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sessions</p>
            <p style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{stats.totalSessions}</p>
          </div>
        </div>

        {/* Avg per Hour */}
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
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
            flexShrink: 0
          }}>
            <Zap style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg/Hour</p>
            <p style={{ fontSize: '26px', fontWeight: 700, color: '#10b981', lineHeight: 1 }}>{stats.avgPerHour?.toLocaleString() || 0}</p>
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
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
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
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.35)',
            flexShrink: 0
          }}>
            <Monitor style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top App</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stats.topApp || 'None'}</p>
          </div>
        </div>

        {/* Alerts */}
        <div style={{
          background: stats.alertCount > 0
            ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
            : 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          borderRadius: '16px',
          padding: '20px 24px',
          border: stats.alertCount > 0 ? '1px solid #fecaca' : '1px solid #a7f3d0',
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
            background: stats.alertCount > 0
              ? 'radial-gradient(circle, rgba(239, 68, 68, 0.1) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: stats.alertCount > 0
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: stats.alertCount > 0
              ? '0 4px 12px rgba(239, 68, 68, 0.35)'
              : '0 4px 12px rgba(16, 185, 129, 0.35)',
            flexShrink: 0
          }}>
            {stats.alertCount > 0
              ? <ShieldAlert style={{ width: '22px', height: '22px', color: '#ffffff' }} />
              : <ShieldCheck style={{ width: '22px', height: '22px', color: '#ffffff' }} />
            }
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Keyword Alerts</p>
            <p style={{ fontSize: '26px', fontWeight: 700, color: stats.alertCount > 0 ? '#dc2626' : '#059669', lineHeight: 1 }}>{stats.alertCount}</p>
          </div>
        </div>
      </div>

      {/* ==================== CHARTS SECTION ==================== */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>

        {/* Keystroke Activity Timeline */}
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
            background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
          }} />

          {/* Decorative corner glow */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '150px',
            height: '150px',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
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
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
                }}>
                  <BarChart3 style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '3px' }}>Keystroke Activity</h3>
                  <p style={{ fontSize: '13px', color: '#64748b' }}>24-hour typing activity overview</p>
                </div>
              </div>

              {/* Peak indicator */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                borderRadius: '12px',
                border: '1px solid #c4b5fd'
              }}>
                <Sparkles style={{ width: '14px', height: '14px', color: '#7c3aed' }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#6d28d9' }}>Peak: 2-4 PM</span>
              </div>
            </div>

            {/* Chart Container */}
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
                categories={['Keystrokes']}
                colors={['indigo']}
                showLegend={false}
                showGridLines={true}
                showAnimation={true}
                curveType="monotone"
                valueFormatter={(v) => v.toLocaleString()}
              />
            </div>
          </div>
        </div>

        {/* App Breakdown Donut */}
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
            background: 'linear-gradient(90deg, #a855f7 0%, #8b5cf6 50%, #6366f1 100%)',
          }} />

          {/* Decorative elements */}
          <div style={{
            position: 'absolute',
            top: '-30px',
            left: '-30px',
            width: '100px',
            height: '100px',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{ padding: '24px', position: 'relative' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(168, 85, 247, 0.35)'
              }}>
                <PieChart style={{ width: '20px', height: '20px', color: '#ffffff' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '3px' }}>App Breakdown</h3>
                <p style={{ fontSize: '13px', color: '#64748b' }}>Keystrokes by application</p>
              </div>
            </div>

            {/* Donut Chart */}
            <div style={{ position: 'relative' }}>
              {appBreakdown.length > 0 ? (
                <>
                  <DonutChart
                    className="h-52"
                    data={appBreakdown}
                    category="value"
                    index="name"
                    colors={['indigo', 'cyan', 'violet', 'emerald', 'amber', 'slate']}
                    valueFormatter={(v) => v.toLocaleString()}
                    showLabel={false}
                    showAnimation={true}
                  />
                  {/* Center overlay */}
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
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.08), inset 0 2px 4px rgba(255,255,255,0.8)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>6</span>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Apps</span>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{
                  height: '208px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <p style={{ fontSize: '14px', color: '#94a3b8' }}>No data available</p>
                </div>
              )}
            </div>

            {/* App Legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
              {appBreakdown.slice(0, 4).map((app, idx) => {
                const colors = ['#6366f1', '#06b6d4', '#8b5cf6', '#10b981']
                return (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    background: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: colors[idx],
                      boxShadow: `0 0 6px ${colors[idx]}50`
                    }} />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>{app.name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== KEYSTROKE LOG TABLE ==================== */}
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
              placeholder="Search keystrokes..."
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

          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              onClick={fetchKeystrokes}
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
            <button
              onClick={exportToCSV}
              disabled={!filteredKeystrokes.length}
              style={{
                height: '40px',
                padding: '0 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: filteredKeystrokes.length ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : '#e2e8f0',
                border: 'none',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                color: filteredKeystrokes.length ? '#ffffff' : '#94a3b8',
                cursor: filteredKeystrokes.length ? 'pointer' : 'not-allowed',
                boxShadow: filteredKeystrokes.length ? '0 2px 4px rgba(99, 102, 241, 0.2)' : 'none'
              }}
            >
              <Download style={{ width: '15px', height: '15px' }} />
              Export
            </button>
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
            <Keyboard style={{ width: '16px', height: '16px', color: '#64748b' }} />
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>Keystroke Sessions</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {stats.alertCount > 0 && (
              <div style={{
                padding: '5px 12px',
                background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <AlertTriangle style={{ width: '12px', height: '12px' }} />
                {stats.alertCount} alert{stats.alertCount !== 1 ? 's' : ''}
              </div>
            )}
            <div style={{
              padding: '6px 12px',
              background: '#f1f5f9',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569'
            }}>
              {filteredKeystrokes.length} session{filteredKeystrokes.length !== 1 ? 's' : ''}
            </div>
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
                borderTopColor: '#6366f1',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ marginTop: '16px', fontSize: '14px', color: '#64748b' }}>Loading keystrokes...</p>
            </div>
          ) : filteredKeystrokes.length === 0 ? (
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
                <Keyboard style={{ width: '36px', height: '36px', color: '#94a3b8' }} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>No keystroke data</h3>
              <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center', maxWidth: '300px' }}>
                Keystroke data will appear here once captured from connected agents.
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
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Count</th>
                    <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKeystrokes.slice((currentPage - 1) * 50, currentPage * 50).map((k, index) => {
                    const hasAlert = checkForSensitiveContent(k.content || k.window_title)
                    const isExpanded = expandedRow === index
                    const typedContent = k.content || k.key_data || k.keystrokes || ''
                    return (
                      <>
                        <tr
                          key={index}
                          onClick={() => setExpandedRow(isExpanded ? null : index)}
                          style={{
                            borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9',
                            background: hasAlert ? 'linear-gradient(90deg, #fef2f2 0%, #ffffff 100%)' : isExpanded ? '#f8fafc' : 'transparent',
                            transition: 'background 0.15s',
                            cursor: 'pointer'
                          }}
                          className="table-row-hover"
                        >
                          <td style={{ padding: '14px 24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <ChevronDown style={{
                                width: '16px',
                                height: '16px',
                                color: '#6366f1',
                                flexShrink: 0,
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s'
                              }} />
                              <Clock style={{ width: '14px', height: '14px', color: '#94a3b8', flexShrink: 0 }} />
                              <span style={{ fontSize: '13px', color: '#475569', whiteSpace: 'nowrap' }}>
                                {formatDate(k.captured_at || k.created_at)}
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
                                {k.employee_name || k.pc_name || 'Unknown'}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                              borderRadius: '8px',
                              border: '1px solid #c4b5fd'
                            }}>
                              <Type style={{ width: '12px', height: '12px', color: '#7c3aed' }} />
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#6d28d9' }}>
                                {extractAppName(k.window_title, k.app_name)}
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
                              {k.window_title || '-'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid #a7f3d0'
                              }}>
                                <Hash style={{ width: '14px', height: '14px', color: '#059669' }} />
                              </div>
                              <span style={{
                                fontSize: '15px',
                                fontWeight: 700,
                                color: '#0f172a',
                                fontFamily: 'monospace'
                              }}>
                                {(k.keystroke_count || 0).toLocaleString()}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 24px' }}>
                            {hasAlert ? (
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
                                borderRadius: '20px',
                                border: '1px solid #fca5a5'
                              }}>
                                <AlertTriangle style={{ width: '12px', height: '12px', color: '#dc2626' }} />
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#dc2626' }}>ALERT</span>
                              </div>
                            ) : (
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                                borderRadius: '20px',
                                border: '1px solid #a7f3d0'
                              }}>
                                <ShieldCheck style={{ width: '12px', height: '12px', color: '#059669' }} />
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#059669' }}>Normal</span>
                              </div>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${index}-expanded`}>
                            <td colSpan={6} style={{ padding: '0 24px 16px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                              <div style={{
                                padding: '16px',
                                background: '#1e293b',
                                borderRadius: '12px',
                                marginTop: '4px'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                  <Keyboard style={{ width: '16px', height: '16px', color: '#94a3b8' }} />
                                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Typed Content</span>
                                </div>
                                <div style={{
                                  fontFamily: 'monospace',
                                  fontSize: '14px',
                                  color: '#e2e8f0',
                                  lineHeight: 1.6,
                                  wordBreak: 'break-all',
                                  whiteSpace: 'pre-wrap',
                                  maxHeight: '200px',
                                  overflow: 'auto'
                                }}>
                                  {typedContent || <span style={{ color: '#64748b', fontStyle: 'italic' }}>No content captured</span>}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        <Pagination
          totalItems={filteredKeystrokes.length}
          itemsPerPage={50}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* CSS */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .table-row-hover:hover {
          background: #f8fafc !important;
        }
      `}</style>
    </div>
  )
}
