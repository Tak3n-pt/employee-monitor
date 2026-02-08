import { useState, useEffect, useMemo } from 'react'
import { Globe, Search, ExternalLink, Clock, TrendingUp, AlertTriangle, Link2, Filter, Download, Zap, RefreshCw } from 'lucide-react'
import DateRangeFilter from '../components/DateRangeFilter'
import ExportButton from '../components/ExportButton'
import Pagination from '../components/Pagination'
import { BarChart } from '@tremor/react'

const USE_MOCK_DATA = false

// Website categorization
const siteCategories = {
  'facebook.com': { category: 'Social', color: '#3b82f6' },
  'twitter.com': { category: 'Social', color: '#3b82f6' },
  'x.com': { category: 'Social', color: '#3b82f6' },
  'instagram.com': { category: 'Social', color: '#3b82f6' },
  'linkedin.com': { category: 'Work', color: '#10b981' },
  'tiktok.com': { category: 'Social', color: '#3b82f6' },
  'reddit.com': { category: 'Social', color: '#3b82f6' },
  'youtube.com': { category: 'Entertainment', color: '#ef4444' },
  'netflix.com': { category: 'Entertainment', color: '#ef4444' },
  'twitch.tv': { category: 'Entertainment', color: '#ef4444' },
  'spotify.com': { category: 'Entertainment', color: '#ef4444' },
  'amazon.com': { category: 'Shopping', color: '#f59e0b' },
  'ebay.com': { category: 'Shopping', color: '#f59e0b' },
  'aliexpress.com': { category: 'Shopping', color: '#f59e0b' },
  'github.com': { category: 'Work', color: '#10b981' },
  'gitlab.com': { category: 'Work', color: '#10b981' },
  'stackoverflow.com': { category: 'Work', color: '#10b981' },
  'docs.google.com': { category: 'Work', color: '#10b981' },
  'drive.google.com': { category: 'Work', color: '#10b981' },
  'notion.so': { category: 'Work', color: '#10b981' },
  'slack.com': { category: 'Work', color: '#10b981' },
  'trello.com': { category: 'Work', color: '#10b981' },
  'jira.atlassian.com': { category: 'Work', color: '#10b981' },
  'cnn.com': { category: 'News', color: '#06b6d4' },
  'bbc.com': { category: 'News', color: '#06b6d4' },
  'nytimes.com': { category: 'News', color: '#06b6d4' },
}

const categoryColors = {
  'Work': { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  'Social': { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  'Entertainment': { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  'Shopping': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  'News': { bg: '#cffafe', text: '#0e7490', border: '#67e8f9' },
  'Education': { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
  'Government': { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  'Other': { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
}

const browserColors = {
  'Chrome': { bg: '#fef3c7', text: '#92400e' },
  'Firefox': { bg: '#fee2e2', text: '#991b1b' },
  'Edge': { bg: '#dbeafe', text: '#1e40af' },
  'Safari': { bg: '#f3f4f6', text: '#374151' },
  'Unknown': { bg: '#f3f4f6', text: '#374151' },
}

const mockHistory = [
  { id: 1, url: 'https://github.com/company/project', title: 'company/project - GitHub', browser: 'Chrome', timestamp: '2024-01-15T09:15:00', employee_name: 'John Smith', pc_name: 'DESKTOP-001' },
  { id: 2, url: 'https://stackoverflow.com/questions/12345', title: 'How to implement React hooks - Stack Overflow', browser: 'Chrome', timestamp: '2024-01-15T09:30:00', employee_name: 'John Smith', pc_name: 'DESKTOP-001' },
  { id: 3, url: 'https://youtube.com/watch?v=abc123', title: 'JavaScript Tutorial 2024 - YouTube', browser: 'Chrome', timestamp: '2024-01-15T10:00:00', employee_name: 'Sarah Johnson', pc_name: 'DESKTOP-002' },
  { id: 4, url: 'https://facebook.com/feed', title: 'Facebook', browser: 'Firefox', timestamp: '2024-01-15T10:15:00', employee_name: 'Mike Wilson', pc_name: 'DESKTOP-003' },
  { id: 5, url: 'https://docs.google.com/document/d/abc', title: 'Q4 Report - Google Docs', browser: 'Chrome', timestamp: '2024-01-15T10:30:00', employee_name: 'Sarah Johnson', pc_name: 'DESKTOP-002' },
  { id: 6, url: 'https://amazon.com/dp/B0123456', title: 'Wireless Mouse - Amazon.com', browser: 'Edge', timestamp: '2024-01-15T11:00:00', employee_name: 'Mike Wilson', pc_name: 'DESKTOP-003' },
  { id: 7, url: 'https://slack.com/messages/general', title: 'Slack - General Channel', browser: 'Chrome', timestamp: '2024-01-15T11:15:00', employee_name: 'John Smith', pc_name: 'DESKTOP-001' },
  { id: 8, url: 'https://reddit.com/r/programming', title: 'r/programming - Reddit', browser: 'Firefox', timestamp: '2024-01-15T11:30:00', employee_name: 'Emily Davis', pc_name: 'DESKTOP-004' },
  { id: 9, url: 'https://cnn.com/world/breaking-news', title: 'Breaking News - CNN', browser: 'Chrome', timestamp: '2024-01-15T11:45:00', employee_name: 'Emily Davis', pc_name: 'DESKTOP-004' },
  { id: 10, url: 'https://netflix.com/browse', title: 'Netflix - Browse', browser: 'Chrome', timestamp: '2024-01-15T12:00:00', employee_name: 'Mike Wilson', pc_name: 'DESKTOP-003' },
  { id: 11, url: 'https://linkedin.com/feed', title: 'LinkedIn Feed', browser: 'Chrome', timestamp: '2024-01-15T12:15:00', employee_name: 'Sarah Johnson', pc_name: 'DESKTOP-002' },
  { id: 12, url: 'https://notion.so/workspace/tasks', title: 'Tasks - Notion', browser: 'Chrome', timestamp: '2024-01-15T12:30:00', employee_name: 'John Smith', pc_name: 'DESKTOP-001' },
]

const mockAgents = [
  { id: '1', employee_name: 'John Smith', pc_name: 'DESKTOP-001' },
  { id: '2', employee_name: 'Sarah Johnson', pc_name: 'DESKTOP-002' },
  { id: '3', employee_name: 'Mike Wilson', pc_name: 'DESKTOP-003' },
  { id: '4', employee_name: 'Emily Davis', pc_name: 'DESKTOP-004' },
]

const extractDomain = (url) => {
  if (!url) return 'Unknown'
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return url.split('/')[0] || 'Unknown'
  }
}

const getCategoryInfo = (domain) => {
  const info = siteCategories[domain]
  if (info) return info
  if (domain.includes('.edu')) return { category: 'Education', color: '#6366f1' }
  if (domain.includes('.gov')) return { category: 'Government', color: '#64748b' }
  return { category: 'Other', color: '#9ca3af' }
}

export default function WebHistory() {
  const [history, setHistory] = useState([])
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [dateRange, setDateRange] = useState('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [stats, setStats] = useState({
    totalVisits: 0,
    uniqueDomains: 0,
    topDomain: '',
    socialTime: 0,
  })
  const [domainBreakdown, setDomainBreakdown] = useState([])
  const [categoryBreakdown, setCategoryBreakdown] = useState([])

  useEffect(() => {
    if (USE_MOCK_DATA) {
      setAgents(mockAgents)
    } else {
      fetch('/api/agents').then(r => r.json()).then(setAgents)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [selectedAgent, dateRange])

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.data_type === 'web_history') {
        setSyncing(false)
        fetchHistory()
      }
    }
    window.addEventListener('data_sync_complete', handler)
    return () => window.removeEventListener('data_sync_complete', handler)
  }, [selectedAgent])

  const fetchHistory = async () => {
    setLoading(true)

    if (USE_MOCK_DATA) {
      setTimeout(() => {
        let data = mockHistory
        if (selectedAgent) {
          data = data.filter(h => {
            const agent = mockAgents.find(a => a.id === selectedAgent)
            return agent && h.employee_name === agent.employee_name
          })
        }
        setHistory(data)
        processHistoryData(data)
        setLoading(false)
      }, 500)
      return
    }

    let url = '/api/monitoring/web-history?limit=500'
    if (selectedAgent) url += `&agent_id=${selectedAgent}`
    try {
      const response = await fetch(url)
      const data = await response.json()
      setHistory(data)
      processHistoryData(data)
    } catch (error) {
      console.error('Error:', error)
    }
    setLoading(false)
  }

  const requestLatest = () => {
    if (!selectedAgent || !window.ws) return
    setSyncing(true)
    window.ws.send(JSON.stringify({ type: 'request_data_sync', agent_id: selectedAgent, data_type: 'web_history' }))
    setTimeout(() => setSyncing(false), 15000)
  }

  const processHistoryData = (data) => {
    const domainCounts = {}
    const categoryCounts = {}
    let socialCount = 0

    data.forEach(h => {
      const domain = extractDomain(h.url)
      domainCounts[domain] = (domainCounts[domain] || 0) + 1

      const categoryInfo = getCategoryInfo(domain)
      categoryCounts[categoryInfo.category] = (categoryCounts[categoryInfo.category] || 0) + 1

      if (categoryInfo.category === 'Social' || categoryInfo.category === 'Entertainment') {
        socialCount++
      }
    })

    const uniqueDomains = Object.keys(domainCounts).length
    const sortedDomains = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])
    const topDomain = sortedDomains[0] ? sortedDomains[0][0] : 'None'

    setStats({
      totalVisits: data.length,
      uniqueDomains,
      topDomain,
      socialTime: socialCount,
    })

    const domainData = sortedDomains.slice(0, 8).map(([name, count]) => ({
      name: name.length > 15 ? name.substring(0, 15) + '...' : name,
      fullName: name,
      count,
    }))
    setDomainBreakdown(domainData)

    const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({
      name,
      value,
    }))
    setCategoryBreakdown(categoryData)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown'
    return new Date(dateStr).toLocaleString()
  }

  const allCategories = [...new Set(history.map(h => getCategoryInfo(extractDomain(h.url)).category))]

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, categoryFilter, selectedAgent, dateRange])

  const filteredHistory = history.filter(h => {
    const domain = extractDomain(h.url)
    const categoryInfo = getCategoryInfo(domain)

    if (categoryFilter !== 'all' && categoryInfo.category !== categoryFilter) return false

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        (h.url && h.url.toLowerCase().includes(query)) ||
        (h.title && h.title.toLowerCase().includes(query)) ||
        domain.toLowerCase().includes(query)
      )
    }
    return true
  })

  const exportColumns = [
    { label: 'Time', key: 'timestamp', accessor: (h) => formatDate(h.timestamp) },
    { label: 'Agent', key: 'employee_name', accessor: (h) => h.employee_name || h.pc_name || 'Unknown' },
    { label: 'Browser', key: 'browser', accessor: (h) => h.browser || 'Unknown' },
    { label: 'Domain', key: 'domain', accessor: (h) => extractDomain(h.url) },
    { label: 'URL', key: 'url', accessor: (h) => h.url || '' },
    { label: 'Title', key: 'title', accessor: (h) => h.title || '' },
    { label: 'Category', key: 'category', accessor: (h) => getCategoryInfo(extractDomain(h.url)).category },
  ]

  const maxDomainCount = Math.max(...domainBreakdown.map(d => d.count), 1)
  const totalCategoryValue = categoryBreakdown.reduce((sum, c) => sum + c.value, 0)

  // Process top 10 domains for Tremor BarChart
  const topDomainsChartData = useMemo(() => {
    const domainCounts = {}
    history.forEach(h => {
      const domain = extractDomain(h.url)
      domainCounts[domain] = (domainCounts[domain] || 0) + 1
    })

    return Object.entries(domainCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([domain, count]) => ({
        domain: domain.length > 25 ? domain.substring(0, 25) + '...' : domain,
        Visits: count
      }))
  }, [history])

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Total Visits */}
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
            <Globe size={24} color="white" />
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Total Visits</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{stats.totalVisits}</p>
          </div>
        </div>

        {/* Unique Domains */}
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
            background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(6,182,212,0.3)'
          }}>
            <Link2 size={24} color="white" />
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Unique Domains</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{stats.uniqueDomains}</p>
          </div>
        </div>

        {/* Top Domain */}
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
            <TrendingUp size={24} color="white" />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Top Domain</p>
            <p style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stats.topDomain}</p>
          </div>
        </div>

        {/* Non-Work Sites */}
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
            background: `radial-gradient(circle, ${stats.socialTime > 10 ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)'} 0%, transparent 70%)`,
            borderRadius: '50%'
          }} />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: stats.socialTime > 10
              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: stats.socialTime > 10
              ? '0 4px 12px rgba(245,158,11,0.3)'
              : '0 4px 12px rgba(16,185,129,0.3)'
          }}>
            <AlertTriangle size={24} color="white" />
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Non-Work Sites</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{stats.socialTime}</p>
          </div>
        </div>
      </div>

      {/* Tremor Bar Chart */}
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
          Top 10 Domains by Visit Count
        </h3>
        <BarChart
          data={topDomainsChartData}
          index="domain"
          categories={["Visits"]}
          colors={["blue"]}
          className="h-52"
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Top Domains Chart */}
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
            background: 'linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%)',
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
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 }}>Top Domains</h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Most visited websites</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {domainBreakdown.length > 0 ? domainBreakdown.map((domain, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: '#64748b', width: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={domain.fullName}>
                  {domain.name}
                </span>
                <div style={{ flex: 1, height: '24px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(domain.count / maxDomainCount) * 100}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%)`,
                    borderRadius: '6px',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', width: '40px', textAlign: 'right' }}>{domain.count}</span>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                No domain data available
              </div>
            )}
          </div>
        </div>

        {/* Category Distribution */}
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
            background: 'linear-gradient(90deg, #06b6d4 0%, #8b5cf6 100%)',
            borderRadius: '24px 24px 0 0'
          }} />
          <div style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '120px',
            height: '120px',
            background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Filter size={18} color="white" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 }}>Category Distribution</h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Visits by site category</p>
            </div>
          </div>

          {categoryBreakdown.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {categoryBreakdown.map((category, index) => {
                const colors = categoryColors[category.name] || categoryColors['Other']
                const percentage = ((category.value / totalCategoryValue) * 100).toFixed(1)
                return (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: colors.bg,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                      fontWeight: '500',
                      minWidth: '80px',
                      textAlign: 'center'
                    }}>
                      {category.name}
                    </span>
                    <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: colors.text,
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
              No category data
            </div>
          )}
        </div>
      </div>

      {/* History Table Card */}
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
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', margin: '0 0 4px 0' }}>Web History</h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Browser activity monitoring</p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
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
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
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
              <option value="all">All Categories</option>
              {allCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
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
              {syncing ? <RefreshCw style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} /> : <Zap style={{ width: '15px', height: '15px' }} />}
              {syncing ? 'Syncing...' : 'Request Latest'}
            </button>

            <ExportButton
              data={filteredHistory}
              filename="web_history"
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
            {filteredHistory.length}
          </span>
          <span style={{ fontSize: '13px', color: '#64748b' }}>web history entries</span>
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
            Loading web history...
          </div>
        ) : filteredHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <Globe size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
            <p style={{ color: '#64748b', margin: 0 }}>No web history found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Time</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Agent</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Domain</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Title</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Category</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.slice((currentPage - 1) * 50, currentPage * 50).map((h, i) => {
                  const domain = extractDomain(h.url)
                  const categoryInfo = getCategoryInfo(domain)
                  const catColors = categoryColors[categoryInfo.category] || categoryColors['Other']
                  const browserColor = browserColors[h.browser] || browserColors['Unknown']

                  return (
                    <tr key={i} style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background-color 0.15s',
                      cursor: 'default'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Clock size={14} style={{ color: '#94a3b8' }} />
                          <span style={{ fontSize: '13px', color: '#374151' }}>{formatDate(h.timestamp)}</span>
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
                            {(h.employee_name || h.pc_name || 'U')[0].toUpperCase()}
                          </div>
                          <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>
                            {h.employee_name || h.pc_name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: browserColor.bg,
                            color: browserColor.text,
                            fontWeight: '500'
                          }}>
                            {h.browser || 'Unknown'}
                          </span>
                          <span style={{ fontSize: '13px', color: '#374151', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={domain}>
                            {domain}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', maxWidth: '250px' }}>
                        <span style={{ fontSize: '13px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={h.title}>
                          {h.title || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontSize: '11px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: catColors.bg,
                          color: catColors.text,
                          border: `1px solid ${catColors.border}`,
                          fontWeight: '500'
                        }}>
                          {categoryInfo.category}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {h.url && (
                          <button
                            onClick={() => window.open(h.url, '_blank', 'noopener,noreferrer')}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                              color: '#374151',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                              e.currentTarget.style.color = 'white'
                              e.currentTarget.style.borderColor = '#3b82f6'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
                              e.currentTarget.style.color = '#374151'
                              e.currentTarget.style.borderColor = '#e2e8f0'
                            }}
                          >
                            <ExternalLink size={12} />
                            Visit
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

        <Pagination
          totalItems={filteredHistory.length}
          itemsPerPage={50}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  )
}
