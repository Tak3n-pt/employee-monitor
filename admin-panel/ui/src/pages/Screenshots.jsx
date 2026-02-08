import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  RefreshCw,
  CheckSquare,
  Square,
  Grid3X3,
  LayoutList,
  Monitor,
  Clock,
  HardDrive,
  Search,
  SlidersHorizontal,
  Calendar,
  User,
  Maximize2,
  Image,
  Zap,
  Eye,
  Play,
} from 'lucide-react'
import { BarChart } from '@tremor/react'
import Pagination from '../components/Pagination'
import ExportButton from '../components/ExportButton'

export default function Screenshots() {
  const [screenshots, setScreenshots] = useState([])
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [dateRange, setDateRange] = useState('today')
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(null)
  const [selectedScreenshots, setSelectedScreenshots] = useState([])
  const [viewMode, setViewMode] = useState('grid')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [takingScreenshot, setTakingScreenshot] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [streamFrame, setStreamFrame] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const intervalRef = useRef(null)

  useEffect(() => {
    fetchAgents()
  }, [])

  useEffect(() => {
    fetchScreenshots()
  }, [selectedAgent, dateRange])

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchScreenshots, 10000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh, selectedAgent])

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents')
      const data = await response.json()
      setAgents(data)
    } catch (error) {
      console.error('Error fetching agents:', error)
    }
  }

  const fetchScreenshots = async () => {
    try {
      setLoading(true)
      const url = selectedAgent
        ? `/api/screenshots/agent/${selectedAgent}?limit=100`
        : '/api/screenshots?limit=100'
      const response = await fetch(url)
      const data = await response.json()
      setScreenshots(data.screenshots || data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching screenshots:', error)
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const openImage = (index) => {
    setSelectedImage(index)
  }

  const closeImage = () => {
    setSelectedImage(null)
  }

  const nextImage = () => {
    if (selectedImage < screenshots.length - 1) {
      setSelectedImage(selectedImage + 1)
    }
  }

  const prevImage = () => {
    if (selectedImage > 0) {
      setSelectedImage(selectedImage - 1)
    }
  }

  const downloadScreenshot = async (screenshot) => {
    try {
      const response = await fetch(`/api/screenshots/image/${screenshot.id}`)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = screenshot.filename || `screenshot_${screenshot.id}.png`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading screenshot:', error)
    }
  }

  const deleteScreenshot = async (id) => {
    if (!confirm('Are you sure you want to delete this screenshot?')) return
    try {
      await fetch(`/api/screenshots/${id}`, { method: 'DELETE' })
      fetchScreenshots()
    } catch (error) {
      console.error('Error deleting screenshot:', error)
    }
  }

  const toggleSelect = (id) => {
    setSelectedScreenshots(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedScreenshots.length === screenshots.length) {
      setSelectedScreenshots([])
    } else {
      setSelectedScreenshots(screenshots.map(s => s.id))
    }
  }

  const downloadSelected = async () => {
    for (const id of selectedScreenshots) {
      const screenshot = screenshots.find(s => s.id === id)
      if (screenshot) await downloadScreenshot(screenshot)
    }
    setSelectedScreenshots([])
  }

  const deleteSelected = async () => {
    if (!confirm(`Delete ${selectedScreenshots.length} screenshots?`)) return
    try {
      await Promise.all(selectedScreenshots.map(id =>
        fetch(`/api/screenshots/${id}`, { method: 'DELETE' })
      ))
      setSelectedScreenshots([])
      fetchScreenshots()
    } catch (error) {
      console.error('Error deleting screenshots:', error)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedImage === null) return
      if (e.key === 'ArrowRight') nextImage()
      if (e.key === 'ArrowLeft') prevImage()
      if (e.key === 'Escape') closeImage()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedImage, screenshots.length])

  // Listen for screenshot_ready and screen_frame events
  useEffect(() => {
    const handleScreenshotReady = () => {
      setTakingScreenshot(false)
      fetchScreenshots()
    }
    const handleScreenFrame = (e) => {
      if (streaming && e.detail?.agent_id === selectedAgent) {
        setStreamFrame(e.detail.frame || e.detail.image)
      }
    }
    window.addEventListener('screenshot_ready', handleScreenshotReady)
    window.addEventListener('screen_frame', handleScreenFrame)
    return () => {
      window.removeEventListener('screenshot_ready', handleScreenshotReady)
      window.removeEventListener('screen_frame', handleScreenFrame)
    }
  }, [streaming, selectedAgent])

  const takeScreenshot = () => {
    if (!selectedAgent || !window.ws) return
    setTakingScreenshot(true)
    window.ws.send(JSON.stringify({ type: 'request_screenshot', agent_id: selectedAgent }))
    setTimeout(() => setTakingScreenshot(false), 15000)
  }

  const toggleStream = () => {
    if (!selectedAgent || !window.ws) return
    if (streaming) {
      window.ws.send(JSON.stringify({ type: 'stop_screen_stream', agent_id: selectedAgent }))
      setStreaming(false)
      setStreamFrame(null)
    } else {
      window.ws.send(JSON.stringify({ type: 'start_screen_stream', agent_id: selectedAgent, fps: 1, quality: 30 }))
      setStreaming(true)
    }
  }

  // Filter screenshots by search
  const filteredScreenshots = screenshots.filter(s =>
    !searchQuery ||
    s.filename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.agent_id?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Stats calculations
  const todayCount = screenshots.filter(s => {
    const today = new Date().toDateString()
    return new Date(s.captured_at).toDateString() === today
  }).length

  const totalSize = screenshots.reduce((acc, s) => acc + (s.file_size || 0), 0)
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const uniqueAgents = [...new Set(screenshots.map(s => s.agent_id))].length

  const screenshotsPerHourChartData = useMemo(() => {
    const hourCounts = {}
    const today = new Date().toDateString()

    screenshots.forEach(s => {
      if (s.timestamp) {
        const date = new Date(s.timestamp)
        // Only count screenshots from today
        if (date.toDateString() === today) {
          const hour = date.getHours()
          const key = `${hour}:00`
          hourCounts[key] = (hourCounts[key] || 0) + 1
        }
      }
    })

    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      Screenshots: hourCounts[`${i}:00`] || 0
    }))
  }, [screenshots])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Tremor Chart Section */}
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '20px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
          Screenshots Per Hour Today
        </h3>
        <BarChart
          data={screenshotsPerHourChartData}
          index="hour"
          categories={["Screenshots"]}
          colors={["blue"]}
          className="h-52"
        />
      </div>

      {/* Stats Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px'
      }}>
        {/* Total Screenshots */}
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
            <Image style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Screenshots</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{screenshots.length}</p>
          </div>
        </div>

        {/* Today's Captures */}
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
            <Zap style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Today's Captures</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{todayCount}</p>
          </div>
        </div>

        {/* Active Agents */}
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
            <Monitor style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Agents</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{uniqueAgents}</p>
          </div>
        </div>

        {/* Storage Used */}
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
            <HardDrive style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Storage Used</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{formatSize(totalSize)}</p>
          </div>
        </div>
      </div>

      {/* Live Stream Frame */}
      {streaming && streamFrame && (
        <div style={{
          background: '#0f172a',
          borderRadius: '20px',
          border: '1px solid #334155',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>Live Stream</span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {agents.find(a => a.id === selectedAgent)?.employee_name || selectedAgent}
              </span>
            </div>
            <button onClick={toggleStream} style={{
              padding: '6px 14px', background: '#ef4444', border: 'none', borderRadius: '8px',
              fontSize: '12px', fontWeight: 600, color: '#fff', cursor: 'pointer'
            }}>Stop</button>
          </div>
          <div style={{ padding: '8px', display: 'flex', justifyContent: 'center' }}>
            <img src={`data:image/jpeg;base64,${streamFrame}`} alt="Live stream" style={{ maxWidth: '100%', maxHeight: '500px', borderRadius: '8px' }} />
          </div>
        </div>
      )}

      {/* Main Content Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        overflow: 'hidden'
      }}>

        {/* Premium Toolbar */}
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
              placeholder="Search screenshots..."
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
                outline: 'none',
                transition: 'all 0.2s'
              }}
            />
          </div>

          {/* Center: Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Date Range Selector */}
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
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Take Screenshot */}
            <button
              onClick={takeScreenshot}
              disabled={!selectedAgent || takingScreenshot}
              title={!selectedAgent ? 'Select an agent first' : 'Take Screenshot'}
              style={{
                height: '40px',
                padding: '0 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: selectedAgent && !takingScreenshot ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#e2e8f0',
                border: 'none',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                color: selectedAgent && !takingScreenshot ? '#ffffff' : '#94a3b8',
                cursor: selectedAgent && !takingScreenshot ? 'pointer' : 'not-allowed',
                boxShadow: selectedAgent && !takingScreenshot ? '0 2px 4px rgba(59, 130, 246, 0.3)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {takingScreenshot ? (
                <RefreshCw style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} />
              ) : (
                <Camera style={{ width: '15px', height: '15px' }} />
              )}
              {takingScreenshot ? 'Capturing...' : 'Take Screenshot'}
            </button>

            {/* Start/Stop Live View */}
            <button
              onClick={toggleStream}
              disabled={!selectedAgent}
              title={!selectedAgent ? 'Select an agent first' : streaming ? 'Stop Live View' : 'Start Live View'}
              style={{
                height: '40px',
                padding: '0 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: !selectedAgent ? '#e2e8f0' : streaming ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                color: selectedAgent ? '#ffffff' : '#94a3b8',
                cursor: selectedAgent ? 'pointer' : 'not-allowed',
                boxShadow: selectedAgent ? (streaming ? '0 2px 4px rgba(239, 68, 68, 0.3)' : '0 2px 4px rgba(16, 185, 129, 0.3)') : 'none',
                transition: 'all 0.2s'
              }}
            >
              {streaming ? (
                <Square style={{ width: '15px', height: '15px', fill: 'currentColor' }} />
              ) : (
                <Play style={{ width: '15px', height: '15px', fill: 'currentColor' }} />
              )}
              {streaming ? 'Stop Live' : 'Live View'}
            </button>

            {/* Divider */}
            <div style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 4px' }} />

            {/* Auto Refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              style={{
                height: '40px',
                padding: '0 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: autoRefresh ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#f8fafc',
                border: autoRefresh ? 'none' : '1px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                color: autoRefresh ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <RefreshCw style={{
                width: '15px',
                height: '15px',
                animation: autoRefresh ? 'spin 1s linear infinite' : 'none'
              }} />
              <span>Live</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={fetchScreenshots}
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
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <RefreshCw style={{ width: '16px', height: '16px' }} />
            </button>

            {/* Divider */}
            <div style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 4px' }} />

            {/* View Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#f1f5f9',
              borderRadius: '10px',
              padding: '4px',
              gap: '4px'
            }}>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: viewMode === 'grid' ? '#1e293b' : '#94a3b8',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <Grid3X3 style={{ width: '16px', height: '16px' }} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: viewMode === 'list' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: viewMode === 'list' ? '#1e293b' : '#94a3b8',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <LayoutList style={{ width: '16px', height: '16px' }} />
              </button>
            </div>

            {/* Export Button */}
            <ExportButton
              data={filteredScreenshots}
              filename="screenshots"
              columns={[
                { key: 'captured_at', label: 'Timestamp' },
                { key: 'agent_id', label: 'Agent' },
                { key: 'filename', label: 'Filename' },
                { key: 'file_size', label: 'Resolution' },
              ]}
            />
          </div>
        </div>

        {/* Selection Bar */}
        {selectedScreenshots.length > 0 && (
          <div style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            borderBottom: '1px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckSquare style={{ width: '16px', height: '16px', color: '#ffffff' }} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e40af' }}>
                {selectedScreenshots.length} screenshot{selectedScreenshots.length > 1 ? 's' : ''} selected
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={downloadSelected}
                style={{
                  height: '36px',
                  padding: '0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)'
                }}
              >
                <Download style={{ width: '14px', height: '14px' }} />
                Download
              </button>
              <button
                onClick={deleteSelected}
                style={{
                  height: '36px',
                  padding: '0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)'
                }}
              >
                <Trash2 style={{ width: '14px', height: '14px' }} />
                Delete
              </button>
              <button
                onClick={() => setSelectedScreenshots([])}
                style={{
                  height: '36px',
                  padding: '0 14px',
                  background: 'transparent',
                  border: '1px solid #93c5fd',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#2563eb',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Select All Row */}
        {filteredScreenshots.length > 0 && (
          <div style={{
            padding: '12px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <button
              onClick={toggleSelectAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 10px',
                marginLeft: '-10px',
                borderRadius: '8px',
                transition: 'background 0.2s'
              }}
            >
              {selectedScreenshots.length === filteredScreenshots.length ? (
                <CheckSquare style={{ width: '18px', height: '18px', color: '#3b82f6' }} />
              ) : (
                <Square style={{ width: '18px', height: '18px', color: '#94a3b8' }} />
              )}
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>Select All</span>
            </button>
            <div style={{
              padding: '6px 12px',
              background: '#f1f5f9',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569'
            }}>
              {filteredScreenshots.length} screenshot{filteredScreenshots.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div style={{ padding: '24px' }}>
          {loading ? (
            /* Loading State */
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
              <p style={{ marginTop: '16px', fontSize: '14px', color: '#64748b' }}>Loading screenshots...</p>
            </div>
          ) : filteredScreenshots.length === 0 ? (
            /* Empty State */
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
                <Camera style={{ width: '36px', height: '36px', color: '#94a3b8' }} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>No screenshots found</h3>
              <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center', maxWidth: '300px' }}>
                Screenshots will appear here once captured from connected agents.
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px'
            }}>
              {filteredScreenshots.slice((currentPage - 1) * 50, currentPage * 50).map((screenshot, index) => (
                <div
                  key={screenshot.id}
                  style={{
                    position: 'relative',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: '#0f172a',
                    aspectRatio: '16/10',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  className="screenshot-card"
                  onClick={() => openImage(index)}
                >
                  {/* Selection Checkbox */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(screenshot.id); }}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      zIndex: 10,
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: selectedScreenshots.includes(screenshot.id) ? '#3b82f6' : 'rgba(15, 23, 42, 0.6)',
                      backdropFilter: 'blur(8px)',
                      border: selectedScreenshots.includes(screenshot.id) ? 'none' : '1px solid rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {selectedScreenshots.includes(screenshot.id) ? (
                      <CheckSquare style={{ width: '16px', height: '16px', color: '#ffffff' }} />
                    ) : (
                      <Square style={{ width: '16px', height: '16px', color: 'rgba(255,255,255,0.8)' }} />
                    )}
                  </button>

                  {/* Image */}
                  <img
                    src={`/api/screenshots/image/${screenshot.id}`}
                    alt={screenshot.filename}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />

                  {/* Hover Overlay */}
                  <div
                    className="screenshot-overlay"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, transparent 0%, transparent 40%, rgba(0,0,0,0.8) 100%)',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      padding: '16px'
                    }}
                  >
                    {/* Info */}
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#ffffff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginBottom: '4px'
                      }}>
                        {screenshot.filename || 'Screenshot'}
                      </p>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                        {formatDate(screenshot.captured_at)}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); openImage(index); }}
                        style={{
                          flex: 1,
                          height: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          background: 'rgba(255,255,255,0.15)',
                          backdropFilter: 'blur(8px)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: '#ffffff',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                      >
                        <Eye style={{ width: '14px', height: '14px' }} />
                        View
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadScreenshot(screenshot); }}
                        style={{
                          width: '36px',
                          height: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(59, 130, 246, 0.8)',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#ffffff',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                      >
                        <Download style={{ width: '14px', height: '14px' }} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteScreenshot(screenshot.id); }}
                        style={{
                          width: '36px',
                          height: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(239, 68, 68, 0.8)',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#ffffff',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                      >
                        <Trash2 style={{ width: '14px', height: '14px' }} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredScreenshots.slice((currentPage - 1) * 50, currentPage * 50).map((screenshot, index) => (
                <div
                  key={screenshot.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '12px 16px',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onClick={() => openImage(index)}
                >
                  {/* Checkbox */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(screenshot.id); }}
                    style={{
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    {selectedScreenshots.includes(screenshot.id) ? (
                      <CheckSquare style={{ width: '18px', height: '18px', color: '#3b82f6' }} />
                    ) : (
                      <Square style={{ width: '18px', height: '18px', color: '#94a3b8' }} />
                    )}
                  </button>

                  {/* Thumbnail */}
                  <div style={{
                    width: '120px',
                    height: '68px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: '#0f172a',
                    flexShrink: 0
                  }}>
                    <img
                      src={`/api/screenshots/image/${screenshot.id}`}
                      alt={screenshot.filename}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#1e293b',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: '4px'
                    }}>
                      {screenshot.filename || 'Screenshot'}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b' }}>
                        <Clock style={{ width: '12px', height: '12px' }} />
                        {formatDate(screenshot.captured_at)}
                      </span>
                      {screenshot.agent_id && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b' }}>
                          <Monitor style={{ width: '12px', height: '12px' }} />
                          {screenshot.agent_id}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadScreenshot(screenshot); }}
                      style={{
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        color: '#64748b',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Download style={{ width: '16px', height: '16px' }} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteScreenshot(screenshot.id); }}
                      style={{
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        color: '#64748b',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Trash2 style={{ width: '16px', height: '16px' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!loading && filteredScreenshots.length > 0 && (
          <Pagination
            totalItems={filteredScreenshots.length}
            itemsPerPage={50}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedImage !== null && filteredScreenshots[selectedImage] && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(8px)'
          }}
          onClick={closeImage}
        >
          {/* Top Bar */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '72px',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            zIndex: 10
          }}>
            {/* Info */}
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', marginBottom: '2px' }}>
                {filteredScreenshots[selectedImage].filename || 'Screenshot'}
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                {formatDate(filteredScreenshots[selectedImage].captured_at)}
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={(e) => { e.stopPropagation(); downloadScreenshot(filteredScreenshots[selectedImage]); }}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#ffffff',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                <Download style={{ width: '16px', height: '16px' }} />
                Download
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteScreenshot(filteredScreenshots[selectedImage].id); closeImage(); }}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(239, 68, 68, 0.8)',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#ffffff',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                <Trash2 style={{ width: '16px', height: '16px' }} />
                Delete
              </button>
              <button
                onClick={closeImage}
                style={{
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>
          </div>

          {/* Navigation - Previous */}
          <button
            onClick={(e) => { e.stopPropagation(); prevImage(); }}
            disabled={selectedImage === 0}
            style={{
              position: 'absolute',
              left: '24px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '56px',
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '16px',
              color: '#ffffff',
              cursor: selectedImage === 0 ? 'not-allowed' : 'pointer',
              opacity: selectedImage === 0 ? 0.3 : 1,
              transition: 'all 0.2s',
              zIndex: 10
            }}
          >
            <ChevronLeft style={{ width: '28px', height: '28px' }} />
          </button>

          {/* Navigation - Next */}
          <button
            onClick={(e) => { e.stopPropagation(); nextImage(); }}
            disabled={selectedImage === filteredScreenshots.length - 1}
            style={{
              position: 'absolute',
              right: '24px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '56px',
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '16px',
              color: '#ffffff',
              cursor: selectedImage === filteredScreenshots.length - 1 ? 'not-allowed' : 'pointer',
              opacity: selectedImage === filteredScreenshots.length - 1 ? 0.3 : 1,
              transition: 'all 0.2s',
              zIndex: 10
            }}
          >
            <ChevronRight style={{ width: '28px', height: '28px' }} />
          </button>

          {/* Counter */}
          <div style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 20px',
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            zIndex: 10
          }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>
              {selectedImage + 1} / {filteredScreenshots.length}
            </span>
          </div>

          {/* Main Image */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '80vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img
              src={`/api/screenshots/image/${filteredScreenshots[selectedImage].id}`}
              alt={filteredScreenshots[selectedImage].filename}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
              }}
            />
          </div>
        </div>
      )}

      {/* CSS for hover effects and animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .screenshot-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }

        .screenshot-card:hover .screenshot-overlay {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  )
}
