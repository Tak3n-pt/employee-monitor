import { useState, useEffect } from 'react'
import { BarChart } from '@tremor/react'
import {
  Wifi,
  ArrowUp,
  ArrowDown,
  Activity,
  Search,
  RefreshCw,
  Download,
  Zap,
  Clock,
  User,
  Calendar,
  Hash,
  Network as NetworkIcon,
} from 'lucide-react'
import Pagination from '../components/Pagination'
import ExportButton from '../components/ExportButton'

// Helper function to format bytes
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function Network() {
  const [networkData, setNetworkData] = useState([])
  const [summary, setSummary] = useState(null)
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [chartData, setChartData] = useState([])
  const [stats, setStats] = useState({
    totalBandwidth: 0,
    totalUpload: 0,
    totalDownload: 0,
    activeProcesses: 0,
  })

  useEffect(() => {
    fetchAgents()
  }, [])

  useEffect(() => {
    fetchNetworkData()
  }, [selectedAgent])

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.data_type === 'network_usage') {
        setSyncing(false)
        fetchNetworkData()
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

  const fetchNetworkData = async () => {
    try {
      setLoading(true)

      // Fetch network data
      let url = '/api/monitoring/network?limit=100'
      if (selectedAgent) url += `&agent_id=${selectedAgent}`
      const response = await fetch(url)
      const data = await response.json()
      setNetworkData(data)

      // Fetch summary data
      let summaryUrl = '/api/monitoring/network/summary'
      if (selectedAgent) summaryUrl += `?agent_id=${selectedAgent}`
      const summaryResponse = await fetch(summaryUrl)
      const summaryData = await summaryResponse.json()
      setSummary(summaryData)

      // Process data for stats and chart
      processNetworkData(data, summaryData)

      setLoading(false)
    } catch (error) {
      console.error('Error fetching network data:', error)
      setLoading(false)
    }
  }

  const processNetworkData = (data, summaryData) => {
    // Calculate stats from summary data or raw data
    let totalUpload = 0
    let totalDownload = 0
    const uniqueProcesses = new Set()

    data.forEach(item => {
      totalUpload += item.bytes_sent || 0
      totalDownload += item.bytes_received || 0
      if (item.process_name) uniqueProcesses.add(item.process_name)
    })

    const totalBandwidth = totalUpload + totalDownload

    setStats({
      totalBandwidth,
      totalUpload,
      totalDownload,
      activeProcesses: uniqueProcesses.size,
    })

    // Process chart data - top bandwidth consumers by process
    if (summaryData && summaryData.top_processes) {
      const chartData = summaryData.top_processes.slice(0, 10).map(proc => ({
        name: proc.process_name || 'Unknown',
        'Bandwidth': (proc.bytes_sent + proc.bytes_received) / 1024 / 1024, // Convert to MB
      }))
      setChartData(chartData)
    } else {
      // Fallback: calculate from raw data
      const processBandwidth = {}
      data.forEach(item => {
        const name = item.process_name || 'Unknown'
        if (!processBandwidth[name]) {
          processBandwidth[name] = 0
        }
        processBandwidth[name] += (item.bytes_sent || 0) + (item.bytes_received || 0)
      })

      const chartData = Object.entries(processBandwidth)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, bytes]) => ({
          name,
          'Bandwidth': bytes / 1024 / 1024, // Convert to MB
        }))
      setChartData(chartData)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const filteredNetworkData = networkData.filter(item => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      (item.process_name && item.process_name.toLowerCase().includes(query)) ||
      (item.agent_id && item.agent_id.toLowerCase().includes(query))
    )
  })

  const requestLatest = () => {
    if (!selectedAgent || !window.ws) return
    setSyncing(true)
    window.ws.send(JSON.stringify({ type: 'request_data_sync', agent_id: selectedAgent, data_type: 'network_usage' }))
    setTimeout(() => setSyncing(false), 15000)
  }

  // Export columns for ExportButton
  const exportColumns = [
    { label: 'Time', key: 'captured_at', accessor: (item) => formatDate(item.captured_at || item.created_at) },
    { label: 'Agent', key: 'agent_id', accessor: (item) => item.agent_id || 'Unknown' },
    { label: 'Process', key: 'process_name', accessor: (item) => item.process_name || 'Unknown' },
    { label: 'Bytes Sent', key: 'bytes_sent', accessor: (item) => item.bytes_sent || 0 },
    { label: 'Bytes Received', key: 'bytes_received', accessor: (item) => item.bytes_received || 0 },
    { label: 'Connections', key: 'connections', accessor: (item) => item.connections || 0 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ==================== STATS CARDS ==================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px'
      }}>
        {/* Total Bandwidth */}
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
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
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
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)',
            flexShrink: 0
          }}>
            <Wifi style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Bandwidth</p>
            <p style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{formatBytes(stats.totalBandwidth)}</p>
          </div>
        </div>

        {/* Upload */}
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
            <ArrowUp style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Upload</p>
            <p style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{formatBytes(stats.totalUpload)}</p>
          </div>
        </div>

        {/* Download */}
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
            <ArrowDown style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Download</p>
            <p style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{formatBytes(stats.totalDownload)}</p>
          </div>
        </div>

        {/* Active Processes */}
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
            <Activity style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Processes</p>
            <p style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{stats.activeProcesses}</p>
          </div>
        </div>
      </div>

      {/* ==================== CHART SECTION ==================== */}
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
          background: 'linear-gradient(90deg, #3b82f6 0%, #06b6d4 50%, #10b981 100%)',
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
                <NetworkIcon style={{ width: '20px', height: '20px', color: '#ffffff' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '3px' }}>Top Bandwidth Consumers</h3>
                <p style={{ fontSize: '13px', color: '#64748b' }}>Network usage by process</p>
              </div>
            </div>
          </div>

          {/* Chart Container */}
          <div style={{
            background: 'linear-gradient(180deg, rgba(248, 250, 252, 0.5) 0%, rgba(241, 245, 249, 0.3) 100%)',
            borderRadius: '16px',
            padding: '16px 8px 8px 8px',
            border: '1px solid rgba(226, 232, 240, 0.5)'
          }}>
            {chartData.length > 0 ? (
              <BarChart
                className="h-72"
                data={chartData}
                index="name"
                categories={['Bandwidth']}
                colors={['blue']}
                showLegend={false}
                showGridLines={true}
                showAnimation={true}
                valueFormatter={(v) => `${v.toFixed(2)} MB`}
              />
            ) : (
              <div style={{
                height: '288px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <p style={{ fontSize: '14px', color: '#94a3b8' }}>No data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== NETWORK LOG TABLE ==================== */}
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
              placeholder="Search network data..."
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
              title={!selectedAgent ? 'Select an agent first' : 'Request latest network data from agent'}
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
              onClick={fetchNetworkData}
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
              data={filteredNetworkData}
              filename="network_data"
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
            <NetworkIcon style={{ width: '16px', height: '16px', color: '#64748b' }} />
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>Network Activity</span>
          </div>
          <div style={{
            padding: '6px 12px',
            background: '#f1f5f9',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#475569'
          }}>
            {filteredNetworkData.length} record{filteredNetworkData.length !== 1 ? 's' : ''}
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
              <p style={{ marginTop: '16px', fontSize: '14px', color: '#64748b' }}>Loading network data...</p>
            </div>
          ) : filteredNetworkData.length === 0 ? (
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
                <Wifi style={{ width: '36px', height: '36px', color: '#94a3b8' }} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>No network data</h3>
              <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center', maxWidth: '300px' }}>
                Network data will appear here once captured from connected agents.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Agent</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Process</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bytes Sent</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bytes Received</th>
                    <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Connections</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNetworkData.slice((currentPage - 1) * 50, currentPage * 50).map((item, index) => (
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
                          <Clock style={{ width: '14px', height: '14px', color: '#94a3b8', flexShrink: 0 }} />
                          <span style={{ fontSize: '13px', color: '#475569', whiteSpace: 'nowrap' }}>
                            {formatDate(item.captured_at || item.created_at)}
                          </span>
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
                            flexShrink: 0
                          }}>
                            <User style={{ width: '14px', height: '14px', color: '#ffffff' }} />
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>
                            {item.agent_id || 'Unknown'}
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
                          <Activity style={{ width: '12px', height: '12px', color: '#7c3aed' }} />
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#6d28d9' }}>
                            {item.process_name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #a7f3d0'
                          }}>
                            <ArrowUp style={{ width: '12px', height: '12px', color: '#059669' }} />
                          </div>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#0f172a',
                            fontFamily: 'monospace'
                          }}>
                            {formatBytes(item.bytes_sent || 0)}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #93c5fd'
                          }}>
                            <ArrowDown style={{ width: '12px', height: '12px', color: '#1d4ed8' }} />
                          </div>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#0f172a',
                            fontFamily: 'monospace'
                          }}>
                            {formatBytes(item.bytes_received || 0)}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #fcd34d'
                          }}>
                            <Hash style={{ width: '12px', height: '12px', color: '#d97706' }} />
                          </div>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#0f172a',
                            fontFamily: 'monospace'
                          }}>
                            {item.connections || 0}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredNetworkData.length > 0 && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9' }}>
            <Pagination
              totalItems={filteredNetworkData.length}
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
          background: #f8fafc !important;
        }
      `}</style>
    </div>
  )
}
