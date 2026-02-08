import { useState, useEffect, useMemo } from 'react'
import {
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  FileText,
  DollarSign,
  ChevronDown,
  User,
  Filter,
  AlertTriangle,
  Zap,
  RefreshCw,
} from 'lucide-react'
import DateRangeFilter from '../components/DateRangeFilter'
import ExportButton from '../components/ExportButton'
import Pagination from '../components/Pagination'
import { BarChart } from '@tremor/react'

// Mock data toggle - set to false to use real API
const USE_MOCK_DATA = false

// Cost per page estimate (configurable)
const COST_PER_PAGE_BW = 0.02 // $0.02 per B&W page
const COST_PER_PAGE_COLOR = 0.10 // $0.10 per color page

// Mock data
const mockJobs = [
  { id: 1, timestamp: '2025-01-27T09:15:00', employee_name: 'John Smith', pc_name: 'WS-001', document_name: 'Q4_Financial_Report.pdf', printer_name: 'HP LaserJet Pro', pages: 24, status: 'completed' },
  { id: 2, timestamp: '2025-01-27T09:30:00', employee_name: 'Sarah Johnson', pc_name: 'WS-002', document_name: 'Marketing_Presentation.pptx', printer_name: 'Canon ImageRunner', pages: 45, status: 'completed' },
  { id: 3, timestamp: '2025-01-27T10:00:00', employee_name: 'Mike Wilson', pc_name: 'WS-003', document_name: 'Employee_Handbook_2025.docx', printer_name: 'Xerox WorkCentre', pages: 128, status: 'printing' },
  { id: 4, timestamp: '2025-01-27T10:15:00', employee_name: 'Emily Brown', pc_name: 'WS-004', document_name: 'Invoice_12847.pdf', printer_name: 'HP LaserJet Pro', pages: 2, status: 'completed' },
  { id: 5, timestamp: '2025-01-27T10:45:00', employee_name: 'David Lee', pc_name: 'WS-005', document_name: 'Contract_Draft_v3.docx', printer_name: 'Brother MFC', pages: 18, status: 'failed' },
  { id: 6, timestamp: '2025-01-27T11:00:00', employee_name: 'Lisa Chen', pc_name: 'WS-006', document_name: 'Project_Timeline.xlsx', printer_name: 'Canon ImageRunner', pages: 6, status: 'completed' },
  { id: 7, timestamp: '2025-01-27T11:30:00', employee_name: 'James Taylor', pc_name: 'WS-007', document_name: 'Board_Meeting_Notes.pdf', printer_name: 'HP LaserJet Pro', pages: 12, status: 'pending' },
  { id: 8, timestamp: '2025-01-27T12:00:00', employee_name: 'Anna Martinez', pc_name: 'WS-008', document_name: 'Training_Materials.pptx', printer_name: 'Xerox WorkCentre', pages: 85, status: 'completed' },
  { id: 9, timestamp: '2025-01-27T13:15:00', employee_name: 'Robert Garcia', pc_name: 'WS-009', document_name: 'Expense_Report_Jan.xlsx', printer_name: 'Brother MFC', pages: 4, status: 'completed' },
  { id: 10, timestamp: '2025-01-27T13:45:00', employee_name: 'Jennifer White', pc_name: 'WS-010', document_name: 'Policy_Update_Memo.docx', printer_name: 'HP LaserJet Pro', pages: 3, status: 'queued' },
  { id: 11, timestamp: '2025-01-27T14:00:00', employee_name: 'Chris Anderson', pc_name: 'WS-011', document_name: 'Sales_Forecast_Q1.pdf', printer_name: 'Canon ImageRunner', pages: 32, status: 'error' },
  { id: 12, timestamp: '2025-01-27T14:30:00', employee_name: 'Michelle Thomas', pc_name: 'WS-012', document_name: 'Client_Proposal.docx', printer_name: 'Xerox WorkCentre', pages: 28, status: 'completed' },
]

const mockAgents = [
  { id: 'agent-1', employee_name: 'John Smith', pc_name: 'WS-001' },
  { id: 'agent-2', employee_name: 'Sarah Johnson', pc_name: 'WS-002' },
  { id: 'agent-3', employee_name: 'Mike Wilson', pc_name: 'WS-003' },
  { id: 'agent-4', employee_name: 'Emily Brown', pc_name: 'WS-004' },
  { id: 'agent-5', employee_name: 'David Lee', pc_name: 'WS-005' },
]

// Status styling
const getStatusStyle = (status) => {
  const s = status?.toLowerCase() || ''
  if (['completed', 'printed', 'success'].includes(s)) {
    return {
      bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      light: 'rgba(16,185,129,0.12)',
      color: '#059669',
      shadow: 'rgba(16,185,129,0.25)',
    }
  }
  if (['pending', 'printing', 'queued'].includes(s)) {
    return {
      bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      light: 'rgba(245,158,11,0.12)',
      color: '#d97706',
      shadow: 'rgba(245,158,11,0.25)',
    }
  }
  if (['failed', 'error', 'cancelled'].includes(s)) {
    return {
      bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      light: 'rgba(239,68,68,0.12)',
      color: '#dc2626',
      shadow: 'rgba(239,68,68,0.25)',
    }
  }
  return {
    bg: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
    light: 'rgba(100,116,139,0.12)',
    color: '#475569',
    shadow: 'rgba(100,116,139,0.25)',
  }
}

const getStatusIcon = (status) => {
  const s = status?.toLowerCase() || ''
  if (['completed', 'printed', 'success'].includes(s)) return CheckCircle
  if (['failed', 'error', 'cancelled'].includes(s)) return XCircle
  return Clock
}

export default function PrintJobs() {
  const [jobs, setJobs] = useState([])
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [dateRange, setDateRange] = useState('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalPages: 0,
    completed: 0,
    failed: 0,
    estimatedCost: 0,
  })
  const [statusBreakdown, setStatusBreakdown] = useState([])
  const [printerBreakdown, setPrinterBreakdown] = useState([])

  useEffect(() => {
    if (USE_MOCK_DATA) {
      setAgents(mockAgents)
    } else {
      fetch('/api/agents').then(r => r.json()).then(setAgents)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [selectedAgent, dateRange])

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.data_type === 'print_jobs') {
        setSyncing(false)
        fetchJobs()
      }
    }
    window.addEventListener('data_sync_complete', handler)
    return () => window.removeEventListener('data_sync_complete', handler)
  }, [selectedAgent])

  const fetchJobs = async () => {
    setLoading(true)

    if (USE_MOCK_DATA) {
      setTimeout(() => {
        let data = [...mockJobs]
        if (selectedAgent) {
          const agent = mockAgents.find(a => a.id === selectedAgent)
          if (agent) {
            data = data.filter(j => j.employee_name === agent.employee_name)
          }
        }
        setJobs(data)
        processJobsData(data)
        setLoading(false)
      }, 500)
      return
    }

    let url = '/api/monitoring/print-jobs?limit=500'
    if (selectedAgent) url += `&agent_id=${selectedAgent}`
    try {
      const response = await fetch(url)
      const data = await response.json()
      setJobs(data)
      processJobsData(data)
    } catch (error) {
      console.error('Error:', error)
    }
    setLoading(false)
  }

  const processJobsData = (data) => {
    let totalPages = 0
    let completed = 0
    let failed = 0
    const statusCounts = {}
    const printerCounts = {}

    data.forEach(j => {
      const pages = j.pages || 0
      totalPages += pages

      const status = j.status?.toLowerCase() || 'unknown'
      statusCounts[status] = (statusCounts[status] || 0) + 1

      if (['completed', 'printed', 'success'].includes(status)) completed++
      if (['failed', 'error', 'cancelled'].includes(status)) failed++

      const printer = j.printer_name || 'Unknown'
      printerCounts[printer] = (printerCounts[printer] || 0) + pages
    })

    // Estimate cost (assuming B&W for simplicity)
    const estimatedCost = totalPages * COST_PER_PAGE_BW

    setStats({
      totalJobs: data.length,
      totalPages,
      completed,
      failed,
      estimatedCost,
    })

    // Status breakdown
    const statusColors = {
      completed: '#10b981',
      printed: '#10b981',
      success: '#10b981',
      pending: '#f59e0b',
      printing: '#f59e0b',
      queued: '#f59e0b',
      failed: '#ef4444',
      error: '#ef4444',
      cancelled: '#ef4444',
    }
    const statusData = Object.entries(statusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: statusColors[name] || '#64748b',
    }))
    setStatusBreakdown(statusData)

    // Printer breakdown for bar chart (by pages)
    const printerData = Object.entries(printerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, pages]) => ({
        name: name.length > 20 ? name.substring(0, 20) + '...' : name,
        pages,
      }))
    setPrinterBreakdown(printerData)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown'
    return new Date(dateStr).toLocaleString()
  }

  const requestLatest = () => {
    if (!selectedAgent || !window.ws) return
    setSyncing(true)
    window.ws.send(JSON.stringify({ type: 'request_data_sync', agent_id: selectedAgent, data_type: 'print_jobs' }))
    setTimeout(() => setSyncing(false), 15000)
  }

  const jobsPerDayChartData = useMemo(() => {
    const now = new Date()
    const last7Days = []

    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      last7Days.push({ date: dateStr, Jobs: 0 })
    }

    // Count jobs per day
    jobs.forEach(j => {
      if (j.timestamp) {
        const jobDate = new Date(j.timestamp).toISOString().split('T')[0]
        const dayData = last7Days.find(d => d.date === jobDate)
        if (dayData) {
          dayData.Jobs++
        }
      }
    })

    return last7Days.map(d => ({
      day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      Jobs: d.Jobs
    }))
  }, [jobs])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, selectedAgent, dateRange])

  // Filter jobs
  const filteredJobs = jobs.filter(j => {
    // Status filter
    if (statusFilter !== 'all') {
      const status = j.status?.toLowerCase() || ''
      if (statusFilter === 'completed' && !['completed', 'printed', 'success'].includes(status)) return false
      if (statusFilter === 'pending' && !['pending', 'printing', 'queued'].includes(status)) return false
      if (statusFilter === 'failed' && !['failed', 'error', 'cancelled'].includes(status)) return false
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        (j.document_name && j.document_name.toLowerCase().includes(query)) ||
        (j.printer_name && j.printer_name.toLowerCase().includes(query))
      )
    }
    return true
  })

  // Export columns
  const exportColumns = [
    { label: 'Time', key: 'timestamp', accessor: (j) => formatDate(j.timestamp) },
    { label: 'Agent', key: 'employee_name', accessor: (j) => j.employee_name || j.pc_name || 'Unknown' },
    { label: 'Document', key: 'document_name', accessor: (j) => j.document_name || 'Unknown' },
    { label: 'Printer', key: 'printer_name', accessor: (j) => j.printer_name || 'Unknown' },
    { label: 'Pages', key: 'pages', accessor: (j) => j.pages || 0 },
    { label: 'Status', key: 'status', accessor: (j) => j.status || 'Unknown' },
    { label: 'Est. Cost', key: 'cost', accessor: (j) => `$${((j.pages || 0) * COST_PER_PAGE_BW).toFixed(2)}` },
  ]

  // Chart calculations
  const maxPrinterPages = Math.max(...printerBreakdown.map(p => p.pages), 1)
  const totalStatusValue = statusBreakdown.reduce((sum, s) => sum + s.value, 0)

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
          Print Jobs Per Day (Last 7 Days)
        </h3>
        <BarChart
          data={jobsPerDayChartData}
          index="day"
          categories={["Jobs"]}
          colors={["cyan"]}
          className="h-52"
        />
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px', marginBottom: '24px' }}>
        {/* Total Jobs */}
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
              <Printer style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Total Jobs</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', lineHeight: '1' }}>{stats.totalJobs}</p>
            </div>
          </div>
        </div>

        {/* Total Pages */}
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
              <FileText style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Total Pages</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', lineHeight: '1' }}>{stats.totalPages.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Completed */}
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
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Completed</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', lineHeight: '1' }}>{stats.completed}</p>
            </div>
          </div>
        </div>

        {/* Failed */}
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
            background: `radial-gradient(circle, ${stats.failed > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)'} 0%, transparent 70%)`,
            borderRadius: '50%',
          }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: stats.failed > 0
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: stats.failed > 0
                ? '0 4px 12px rgba(239,68,68,0.3)'
                : '0 4px 12px rgba(16,185,129,0.3)',
            }}>
              {stats.failed > 0 ? (
                <XCircle style={{ width: '24px', height: '24px', color: 'white' }} />
              ) : (
                <CheckCircle style={{ width: '24px', height: '24px', color: 'white' }} />
              )}
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Failed</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', lineHeight: '1' }}>{stats.failed}</p>
            </div>
          </div>
        </div>

        {/* Estimated Cost */}
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
              <DollarSign style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Est. Cost</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', lineHeight: '1' }}>${stats.estimatedCost.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Printer Usage */}
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
            width: '150px',
            height: '150px',
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
                <Printer style={{ width: '20px', height: '20px', color: 'white' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 }}>Printer Usage</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Pages printed by printer</p>
              </div>
            </div>

            {/* Bar Chart */}
            {printerBreakdown.length > 0 ? (
              <div style={{
                background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                borderRadius: '16px',
                padding: '24px',
              }}>
                {printerBreakdown.map((printer, i) => (
                  <div key={i} style={{ marginBottom: i < printerBreakdown.length - 1 ? '16px' : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>{printer.name}</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#06b6d4' }}>{printer.pages} pages</span>
                    </div>
                    <div style={{
                      height: '10px',
                      background: 'rgba(6,182,212,0.1)',
                      borderRadius: '5px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${(printer.pages / maxPrinterPages) * 100}%`,
                        background: 'linear-gradient(90deg, #06b6d4 0%, #0891b2 100%)',
                        borderRadius: '5px',
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                ))}
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
                No printer data available
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution */}
        <div style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
          borderRadius: '24px',
          padding: '0',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Gray gradient top bar */}
          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg, #64748b 0%, #475569 50%, #334155 100%)',
          }} />

          {/* Corner glow */}
          <div style={{
            position: 'absolute',
            top: '0',
            right: '0',
            width: '120px',
            height: '120px',
            background: 'radial-gradient(circle at top right, rgba(100,116,139,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Clock style={{ width: '20px', height: '20px', color: 'white' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 }}>Job Status</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Distribution by status</p>
              </div>
            </div>

            {/* Donut Chart */}
            {statusBreakdown.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                {/* Simple Ring Chart */}
                <div style={{ position: 'relative', width: '140px', height: '140px' }}>
                  <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                    {statusBreakdown.reduce((acc, item, i) => {
                      const percentage = (item.value / totalStatusValue) * 100
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
                    <span style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>{totalStatusValue}</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Jobs</span>
                  </div>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  {statusBreakdown.map((item, i) => (
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
                        {item.value} ({Math.round((item.value / totalStatusValue) * 100)}%)
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

      {/* Print Jobs Table */}
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
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', margin: 0 }}>Print Jobs</h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Printing activity monitoring</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={requestLatest} disabled={!selectedAgent || syncing} title={!selectedAgent ? 'Select an agent first' : 'Request latest data from agent'} style={{ height: '40px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', background: selectedAgent && !syncing ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#e2e8f0', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: selectedAgent && !syncing ? '#ffffff' : '#94a3b8', cursor: selectedAgent && !syncing ? 'pointer' : 'not-allowed', boxShadow: selectedAgent && !syncing ? '0 2px 4px rgba(16, 185, 129, 0.3)' : 'none', transition: 'all 0.2s' }}>
                {syncing ? <RefreshCw style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} /> : <Zap style={{ width: '15px', height: '15px' }} />}
                {syncing ? 'Syncing...' : 'Request Latest'}
              </button>

              <DateRangeFilter value={dateRange} onChange={setDateRange} />

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
                    e.target.style.borderColor = '#06b6d4'
                    e.target.style.boxShadow = '0 0 0 3px rgba(6,182,212,0.1)'
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
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
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
                data={filteredJobs}
                filename="print_jobs"
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
            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
          }}>
            {filteredJobs.length} jobs
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
              borderTopColor: '#06b6d4',
              borderRadius: '50%',
              margin: '0 auto 16px',
              animation: 'spin 1s linear infinite',
            }} />
            <p style={{ color: '#64748b', fontSize: '14px' }}>Loading print jobs...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filteredJobs.length === 0 ? (
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
              <Printer style={{ width: '32px', height: '32px', color: '#94a3b8' }} />
            </div>
            <p style={{ color: '#64748b', fontSize: '14px' }}>No print jobs found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agent</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Document</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Printer</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pages</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cost</th>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.slice((currentPage - 1) * 50, currentPage * 50).map((j, i) => {
                  const style = getStatusStyle(j.status)
                  const StatusIcon = getStatusIcon(j.status)
                  const pages = j.pages || 0
                  const cost = pages * COST_PER_PAGE_BW

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
                        {formatDate(j.timestamp)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}>
                            {(j.employee_name || j.pc_name || 'U').charAt(0)}
                          </div>
                          <span style={{ color: '#0f172a', fontWeight: '500', fontSize: '13px' }}>
                            {j.employee_name || j.pc_name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#0f172a', fontSize: '13px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {j.document_name || 'Unknown'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: 'rgba(6,182,212,0.1)',
                          color: '#0891b2',
                        }}>
                          {j.printer_name || 'Unknown'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileText style={{ width: '14px', height: '14px', color: '#06b6d4' }} />
                          <span style={{ color: '#0f172a', fontWeight: '600', fontSize: '13px' }}>{pages}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#374151', fontSize: '13px', fontWeight: '500' }}>
                        ${cost.toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            background: style.light,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <StatusIcon style={{ width: '14px', height: '14px', color: style.color }} />
                          </div>
                          <span style={{
                            background: style.bg,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: '600',
                            textTransform: 'capitalize',
                            boxShadow: `0 2px 6px ${style.shadow}`,
                          }}>
                            {j.status || 'Unknown'}
                          </span>
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
          totalItems={filteredJobs.length}
          itemsPerPage={50}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  )
}
