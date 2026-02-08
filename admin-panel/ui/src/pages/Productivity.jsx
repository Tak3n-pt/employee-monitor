import { useState, useEffect } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Award,
  AlertTriangle,
  BarChart3,
  Target,
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

// Productivity color scale
const getScoreStyle = (score) => {
  if (score >= 80) return {
    bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    light: 'rgba(16,185,129,0.15)',
    color: '#059669',
    shadow: 'rgba(16,185,129,0.25)',
  }
  if (score >= 60) return {
    bg: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    light: 'rgba(59,130,246,0.15)',
    color: '#1d4ed8',
    shadow: 'rgba(59,130,246,0.25)',
  }
  if (score >= 40) return {
    bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    light: 'rgba(245,158,11,0.15)',
    color: '#d97706',
    shadow: 'rgba(245,158,11,0.25)',
  }
  return {
    bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    light: 'rgba(239,68,68,0.15)',
    color: '#dc2626',
    shadow: 'rgba(239,68,68,0.25)',
  }
}

const getGrade = (score) => {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

const getGradeLabel = (score) => {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Needs Improvement'
}

const getTrendIcon = (score) => {
  if (score >= 70) return TrendingUp
  if (score >= 40) return Minus
  return TrendingDown
}

// Mock data
const mockProductivityScores = [
  { id: 1, employee_name: 'John Smith', timestamp: '2025-01-27T09:00:00', score: 92, active_time: '7h 45m', idle_time: '15m' },
  { id: 2, employee_name: 'Sarah Johnson', timestamp: '2025-01-27T09:00:00', score: 78, active_time: '6h 30m', idle_time: '1h 30m' },
  { id: 3, employee_name: 'Mike Wilson', timestamp: '2025-01-27T09:00:00', score: 85, active_time: '7h 00m', idle_time: '1h 00m' },
  { id: 4, employee_name: 'Emily Davis', timestamp: '2025-01-27T09:00:00', score: 65, active_time: '5h 15m', idle_time: '2h 45m' },
  { id: 5, employee_name: 'David Brown', timestamp: '2025-01-27T09:00:00', score: 45, active_time: '3h 45m', idle_time: '4h 15m' },
  { id: 6, employee_name: 'Lisa Anderson', timestamp: '2025-01-26T09:00:00', score: 88, active_time: '7h 20m', idle_time: '40m' },
  { id: 7, employee_name: 'James Taylor', timestamp: '2025-01-26T09:00:00', score: 72, active_time: '6h 00m', idle_time: '2h 00m' },
  { id: 8, employee_name: 'John Smith', timestamp: '2025-01-26T09:00:00', score: 95, active_time: '7h 55m', idle_time: '5m' },
  { id: 9, employee_name: 'Sarah Johnson', timestamp: '2025-01-25T09:00:00', score: 82, active_time: '6h 45m', idle_time: '1h 15m' },
  { id: 10, employee_name: 'Mike Wilson', timestamp: '2025-01-25T09:00:00', score: 55, active_time: '4h 30m', idle_time: '3h 30m' },
  { id: 11, employee_name: 'Emily Davis', timestamp: '2025-01-24T09:00:00', score: 35, active_time: '2h 50m', idle_time: '5h 10m' },
  { id: 12, employee_name: 'David Brown', timestamp: '2025-01-24T09:00:00', score: 68, active_time: '5h 30m', idle_time: '2h 30m' },
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

export default function Productivity() {
  const [scores, setScores] = useState([])
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [dateRange, setDateRange] = useState('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [stats, setStats] = useState({
    avgScore: 0,
    topPerformer: '',
    topScore: 0,
    needsImprovement: 0,
    excellent: 0,
  })
  const [trendData, setTrendData] = useState([])
  const [distributionData, setDistributionData] = useState([])

  useEffect(() => {
    if (USE_MOCK_DATA) {
      setAgents(mockAgents)
    } else {
      fetch('/api/agents').then(r => r.json()).then(setAgents)
    }
  }, [])

  useEffect(() => {
    fetchScores()
  }, [selectedAgent, dateRange])

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.data_type === 'productivity') {
        setSyncing(false)
        fetchScores()
      }
    }
    window.addEventListener('data_sync_complete', handler)
    return () => window.removeEventListener('data_sync_complete', handler)
  }, [selectedAgent])

  const fetchScores = async () => {
    setLoading(true)

    if (USE_MOCK_DATA) {
      setTimeout(() => {
        let data = [...mockProductivityScores]
        if (selectedAgent) {
          const agent = mockAgents.find(a => a.id === selectedAgent)
          if (agent) {
            data = data.filter(s => s.employee_name === agent.employee_name)
          }
        }
        setScores(data)
        processScoresData(data)
        setLoading(false)
      }, 500)
      return
    }

    let url = '/api/monitoring/productivity?limit=500'
    if (selectedAgent) url += `&agent_id=${selectedAgent}`
    try {
      const response = await fetch(url)
      const data = await response.json()
      setScores(data)
      processScoresData(data)
    } catch (error) {
      console.error('Error:', error)
    }
    setLoading(false)
  }

  const processScoresData = (data) => {
    if (data.length === 0) {
      setStats({ avgScore: 0, topPerformer: '', topScore: 0, needsImprovement: 0, excellent: 0 })
      setTrendData([])
      setDistributionData([])
      return
    }

    // Calculate stats
    let totalScore = 0
    let topScore = 0
    let topPerformer = ''
    let needsImprovement = 0
    let excellent = 0
    const dateScores = {}
    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 }

    data.forEach(s => {
      const score = s.score || 0
      totalScore += score

      // Track top performer
      if (score > topScore) {
        topScore = score
        topPerformer = s.employee_name || 'Unknown'
      }

      // Count needs improvement
      if (score < 60) needsImprovement++
      if (score >= 80) excellent++

      // Grade distribution
      const grade = getGrade(score)
      gradeDistribution[grade]++

      // Trend by date
      if (s.timestamp) {
        const date = new Date(s.timestamp).toLocaleDateString()
        if (!dateScores[date]) {
          dateScores[date] = { total: 0, count: 0 }
        }
        dateScores[date].total += score
        dateScores[date].count++
      }
    })

    const avgScore = Math.round(totalScore / data.length)

    setStats({
      avgScore,
      topPerformer,
      topScore,
      needsImprovement,
      excellent,
    })

    // Trend data for area chart
    const trendChartData = Object.entries(dateScores)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .slice(-14) // Last 14 days
      .map(([date, d]) => ({
        date,
        score: Math.round(d.total / d.count),
      }))
    setTrendData(trendChartData)

    // Distribution for donut chart
    const gradeColors = {
      A: '#10b981',
      B: '#3b82f6',
      C: '#06b6d4',
      D: '#f59e0b',
      F: '#ef4444',
    }
    const distributionChartData = Object.entries(gradeDistribution)
      .filter(([_, value]) => value > 0)
      .map(([grade, count]) => ({
        name: `Grade ${grade}`,
        value: count,
        color: gradeColors[grade],
      }))
    setDistributionData(distributionChartData)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString()
  }

  const requestLatest = () => {
    if (!selectedAgent || !window.ws) return
    setSyncing(true)
    window.ws.send(JSON.stringify({ type: 'request_data_sync', agent_id: selectedAgent, data_type: 'productivity' }))
    setTimeout(() => setSyncing(false), 15000)
  }

  // Filter scores
  const filteredScores = scores.filter(s => {
    const score = s.score || 0
    const grade = getGrade(score)

    // Grade filter
    if (gradeFilter !== 'all' && grade !== gradeFilter) return false

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        (s.employee_name && s.employee_name.toLowerCase().includes(query))
      )
    }
    return true
  })

  // Export columns
  const exportColumns = [
    { label: 'Date', key: 'timestamp', accessor: (s) => formatDate(s.timestamp) },
    { label: 'Agent', key: 'employee_name', accessor: (s) => s.employee_name || 'Unknown' },
    { label: 'Score', key: 'score', accessor: (s) => `${s.score || 0}%` },
    { label: 'Grade', key: 'grade', accessor: (s) => getGrade(s.score || 0) },
    { label: 'Rating', key: 'rating', accessor: (s) => getGradeLabel(s.score || 0) },
    { label: 'Active Time', key: 'active_time', accessor: (s) => s.active_time || '-' },
    { label: 'Idle Time', key: 'idle_time', accessor: (s) => s.idle_time || '-' },
  ]

  // Calculate max for chart scaling
  const maxScore = Math.max(...trendData.map(d => d.score), 100)

  // Calculate total for distribution percentages
  const distributionTotal = distributionData.reduce((sum, d) => sum + d.value, 0)

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px', marginBottom: '24px' }}>
        {/* Average Score */}
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
              <BarChart3 style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Average Score</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', lineHeight: '1' }}>{stats.avgScore}%</p>
            </div>
          </div>
        </div>

        {/* Top Performer */}
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
              <Award style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Top Performer</p>
              <p style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', lineHeight: '1.2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {stats.topPerformer || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Top Score */}
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
              <Target style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Top Score</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', lineHeight: '1' }}>{stats.topScore}%</p>
            </div>
          </div>
        </div>

        {/* Excellent */}
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
              <TrendingUp style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Excellent (80%+)</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', lineHeight: '1' }}>{stats.excellent}</p>
            </div>
          </div>
        </div>

        {/* Needs Improvement */}
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
            background: `radial-gradient(circle, ${stats.needsImprovement > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)'} 0%, transparent 70%)`,
            borderRadius: '50%',
          }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: stats.needsImprovement > 0
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: stats.needsImprovement > 0
                ? '0 4px 12px rgba(245,158,11,0.3)'
                : '0 4px 12px rgba(16,185,129,0.3)',
            }}>
              <AlertTriangle style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Needs Improvement</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', lineHeight: '1' }}>{stats.needsImprovement}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Productivity Trend */}
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
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 }}>Productivity Trend</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Average score over time</p>
              </div>
            </div>

            {/* Area Chart */}
            {trendData.length > 0 ? (
              <div style={{
                background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                borderRadius: '16px',
                padding: '24px',
                minHeight: '220px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', gap: '8px' }}>
                  {trendData.map((item, i) => {
                    const heightPercent = maxScore > 0 ? (item.score / maxScore) * 100 : 0
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                        <div style={{
                          fontSize: '10px',
                          fontWeight: '600',
                          color: '#10b981',
                          marginBottom: '4px',
                        }}>
                          {item.score}%
                        </div>
                        <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                          <div style={{
                            width: '100%',
                            height: `${Math.max(heightPercent, 4)}%`,
                            background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                            borderRadius: '6px 6px 2px 2px',
                            boxShadow: '0 4px 12px rgba(16,185,129,0.2)',
                            transition: 'height 0.3s ease',
                          }} />
                        </div>
                        <div style={{
                          marginTop: '8px',
                          fontSize: '9px',
                          fontWeight: '500',
                          color: '#64748b',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {item.date.split('/').slice(0, 2).join('/')}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div style={{
                height: '220px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                fontSize: '14px',
              }}>
                No trend data available
              </div>
            )}
          </div>
        </div>

        {/* Grade Distribution */}
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
                <Award style={{ width: '20px', height: '20px', color: 'white' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 }}>Grade Distribution</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Score breakdown by grade</p>
              </div>
            </div>

            {/* Donut Chart Visualization */}
            {distributionData.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                {/* Simple Ring Chart */}
                <div style={{ position: 'relative', width: '140px', height: '140px' }}>
                  <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                    {distributionData.reduce((acc, item, i) => {
                      const percentage = (item.value / distributionTotal) * 100
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
                    <span style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>{distributionTotal}</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Total</span>
                  </div>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  {distributionData.map((item, i) => (
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
                        {item.value} ({Math.round((item.value / distributionTotal) * 100)}%)
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

      {/* Productivity Table */}
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
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', margin: 0 }}>Productivity Scores</h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Employee performance metrics</p>
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
                    e.target.style.borderColor = '#10b981'
                    e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>

              {/* Grade Filter */}
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
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
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
                  <option value="all">All Grades</option>
                  <option value="A">Grade A</option>
                  <option value="B">Grade B</option>
                  <option value="C">Grade C</option>
                  <option value="D">Grade D</option>
                  <option value="F">Grade F</option>
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
                data={filteredScores}
                filename="productivity"
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
            {filteredScores.length} scores
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
            <p style={{ color: '#64748b', fontSize: '14px' }}>Loading productivity data...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filteredScores.length === 0 ? (
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
              <TrendingUp style={{ width: '32px', height: '32px', color: '#94a3b8' }} />
            </div>
            <p style={{ color: '#64748b', fontSize: '14px' }}>No productivity data found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agent</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '180px' }}>Progress</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Grade</th>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rating</th>
                </tr>
              </thead>
              <tbody>
                {filteredScores.slice((currentPage - 1) * 50, currentPage * 50).map((s, i) => {
                  const score = s.score || 0
                  const style = getScoreStyle(score)
                  const TrendIcon = getTrendIcon(score)

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
                      <td style={{ padding: '14px 24px', color: '#374151', fontSize: '13px' }}>
                        {formatDate(s.timestamp)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: style.bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}>
                            {(s.employee_name || 'U').charAt(0)}
                          </div>
                          <span style={{ color: '#0f172a', fontWeight: '500', fontSize: '13px' }}>
                            {s.employee_name || 'Unknown'}
                          </span>
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
                            <TrendIcon style={{ width: '14px', height: '14px', color: style.color }} />
                          </div>
                          <span style={{ color: style.color, fontWeight: '600', fontSize: '14px' }}>
                            {score}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{
                          width: '100%',
                          height: '8px',
                          background: '#e2e8f0',
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${score}%`,
                            height: '100%',
                            background: style.bg,
                            borderRadius: '4px',
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          background: style.bg,
                          padding: '6px 14px',
                          borderRadius: '20px',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: '700',
                          boxShadow: `0 2px 8px ${style.shadow}`,
                        }}>
                          {getGrade(score)}
                        </span>
                      </td>
                      <td style={{ padding: '14px 24px', color: '#64748b', fontSize: '13px' }}>
                        {getGradeLabel(score)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filteredScores.length > 0 && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9' }}>
            <Pagination
              totalItems={filteredScores.length}
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
