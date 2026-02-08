import { useState, useEffect } from 'react'
import {
  Search,
  Camera,
  Trash2,
  RefreshCw,
  Monitor,
  Cpu,
  HardDrive,
  Wifi,
  Clock,
  Activity,
  Edit2,
  Check,
  X,
  MoreVertical,
  Users,
  Signal,
  SignalZero,
  ChevronRight,
  Grid3X3,
  List,
  Filter,
  CheckSquare,
  Square,
  Zap,
  Globe,
  Shield,
  Download,
  Power,
  Lock,
  MessageSquare,
  Info,
  Eye,
  EyeOff,
  Terminal,
} from 'lucide-react'
import Pagination from '../components/Pagination'

export default function Agents() {
  const [agents, setAgents] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedAgent, setExpandedAgent] = useState(null)
  const [selectedAgents, setSelectedAgents] = useState([])
  const [editingName, setEditingName] = useState(null)
  const [newName, setNewName] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'online', 'offline'
  const [screenshotLoading, setScreenshotLoading] = useState({})
  const [currentPage, setCurrentPage] = useState(1)
  const [commandMenuAgent, setCommandMenuAgent] = useState(null)
  const [messageModal, setMessageModal] = useState({ open: false, agentId: null })
  const [messageForm, setMessageForm] = useState({ title: '', message: '', type: 'info' })
  const [systemInfoModal, setSystemInfoModal] = useState({ open: false, data: null, loading: false })

  useEffect(() => {
    fetchAgents()
    const interval = setInterval(fetchAgents, 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleScreenshotReady = (e) => {
      const { agent_id } = e.detail || {}
      if (agent_id) {
        setScreenshotLoading(prev => ({ ...prev, [agent_id]: false }))
      }
    }
    const handleWsError = (e) => {
      const { agent_id } = e.detail || {}
      if (agent_id) {
        setScreenshotLoading(prev => ({ ...prev, [agent_id]: false }))
      }
    }
    window.addEventListener('screenshot_ready', handleScreenshotReady)
    window.addEventListener('ws_error', handleWsError)
    return () => {
      window.removeEventListener('screenshot_ready', handleScreenshotReady)
      window.removeEventListener('ws_error', handleWsError)
    }
  }, [])

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents')
      const data = await response.json()
      setAgents(data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching agents:', error)
      setLoading(false)
    }
  }

  const requestScreenshot = (agentId) => {
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
      window.ws.send(JSON.stringify({ type: 'request_screenshot', agent_id: agentId }))
      setScreenshotLoading(prev => ({ ...prev, [agentId]: true }))
      setTimeout(() => {
        setScreenshotLoading(prev => ({ ...prev, [agentId]: false }))
      }, 15000)
    }
  }

  const requestBulkScreenshots = () => {
    const onlineSelected = selectedAgents.filter(id => {
      const agent = agents.find(a => a.id === id)
      return agent && agent.status === 'online'
    })
    onlineSelected.forEach(agentId => requestScreenshot(agentId))
    setSelectedAgents([])
  }

  const deleteAgent = async (agentId) => {
    if (!confirm('Are you sure you want to delete this agent?')) return
    try {
      await fetch(`/api/agents/${agentId}`, { method: 'DELETE' })
      fetchAgents()
    } catch (error) {
      console.error('Error deleting agent:', error)
    }
  }

  const deleteBulkAgents = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedAgents.length} agents?`)) return
    try {
      await Promise.all(selectedAgents.map(id =>
        fetch(`/api/agents/${id}`, { method: 'DELETE' })
      ))
      setSelectedAgents([])
      fetchAgents()
    } catch (error) {
      console.error('Error deleting agents:', error)
    }
  }

  const updateAgentName = async (agentId) => {
    try {
      await fetch(`/api/agents/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_name: newName })
      })
      setEditingName(null)
      setNewName('')
      fetchAgents()
    } catch (error) {
      console.error('Error updating agent:', error)
    }
  }

  const startEditName = (agent) => {
    setEditingName(agent.id)
    setNewName(agent.employee_name || '')
  }

  const cancelEditName = () => {
    setEditingName(null)
    setNewName('')
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleString()
  }

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const formatUptime = (dateStr) => {
    if (!dateStr) return 'Unknown'
    const start = new Date(dateStr)
    const now = new Date()
    const diff = now - start
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d ${hours % 24}h`
    return `${hours}h`
  }

  const toggleAgentSelect = (agentId) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedAgents.length === filteredAgents.length) {
      setSelectedAgents([])
    } else {
      setSelectedAgents(filteredAgents.map(a => a.id))
    }
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getAvatarGradient = (name) => {
    const gradients = [
      'from-blue-500 to-indigo-600',
      'from-emerald-500 to-teal-600',
      'from-violet-500 to-purple-600',
      'from-rose-500 to-pink-600',
      'from-amber-500 to-orange-600',
      'from-cyan-500 to-blue-600',
    ]
    const index = (name || '').charCodeAt(0) % gradients.length
    return gradients[index]
  }

  // Remote command functions
  const sendRemoteCommand = (agentId, command, data = {}) => {
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
      window.ws.send(JSON.stringify({ type: command, agent_id: agentId, ...data }))
      return true
    }
    return false
  }

  const handleRestartAgent = (agentId) => {
    if (confirm('Are you sure you want to restart this agent?')) {
      sendRemoteCommand(agentId, 'restart_agent')
      setCommandMenuAgent(null)
    }
  }

  const handleLockScreen = (agentId) => {
    if (confirm('Lock this workstation?')) {
      sendRemoteCommand(agentId, 'lock_screen')
      setCommandMenuAgent(null)
    }
  }

  const handleSendMessage = () => {
    if (messageModal.agentId && messageForm.message) {
      sendRemoteCommand(messageModal.agentId, 'show_message', {
        title: messageForm.title || 'Message from IT',
        message: messageForm.message,
        msg_type: messageForm.type
      })
      setMessageModal({ open: false, agentId: null })
      setMessageForm({ title: '', message: '', type: 'info' })
    }
  }

  const handleGetSystemInfo = (agentId) => {
    setSystemInfoModal({ open: true, data: null, loading: true })
    sendRemoteCommand(agentId, 'get_system_info')
    setCommandMenuAgent(null)

    // Listen for response
    const handleResponse = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'system_info_response' && data.agent_id === agentId) {
          setSystemInfoModal({ open: true, data: data.data, loading: false })
          window.ws.removeEventListener('message', handleResponse)
        }
      } catch (err) {}
    }
    if (window.ws) {
      window.ws.addEventListener('message', handleResponse)
      setTimeout(() => {
        window.ws.removeEventListener('message', handleResponse)
        setSystemInfoModal(prev => prev.loading ? { ...prev, loading: false } : prev)
      }, 10000)
    }
  }

  const handleToggleStealth = (agentId, visible) => {
    sendRemoteCommand(agentId, 'toggle_stealth', { visible })
    setCommandMenuAgent(null)
  }

  // Filter agents
  const filteredAgents = agents
    .filter(agent => {
      const matchesSearch = (agent.employee_name || agent.pc_name || '').toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || agent.status === statusFilter
      return matchesSearch && matchesStatus
    })

  // Stats
  const onlineCount = agents.filter(a => a.status === 'online').length
  const offlineCount = agents.filter(a => a.status === 'offline').length
  const totalActivities = agents.reduce((sum, a) => sum + (a.activity_count || 0), 0)

  // Export columns configuration
  const exportColumns = [
    { label: 'Employee Name', key: 'employee_name', accessor: (a) => a.employee_name || 'Unknown' },
    { label: 'PC Name', key: 'pc_name' },
    { label: 'Status', key: 'status' },
    { label: 'Last Seen', key: 'last_seen', accessor: (a) => formatDate(a.last_seen) },
    { label: 'Activities', key: 'activity_count', accessor: (a) => a.activity_count || 0 },
    { label: 'OS', key: 'os_info', accessor: (a) => a.os_info || 'Unknown' },
    { label: 'IP Address', key: 'ip_address', accessor: (a) => a.ip_address || 'Unknown' },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Agents */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="font-medium text-slate-500" style={{ fontSize: '13px', marginBottom: '6px' }}>Total Agents</p>
              <p className="font-bold text-slate-900" style={{ fontSize: '28px', lineHeight: 1 }}>{agents.length}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center" style={{ width: '44px', height: '44px', flexShrink: 0 }}>
              <Users style={{ width: '22px', height: '22px', color: '#475569' }} />
            </div>
          </div>
        </div>

        {/* Online */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="font-medium text-slate-500" style={{ fontSize: '13px', marginBottom: '6px' }}>Online</p>
              <p className="font-bold text-emerald-600" style={{ fontSize: '28px', lineHeight: 1 }}>{onlineCount}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <div className="rounded-full bg-emerald-500 animate-pulse" style={{ width: '8px', height: '8px' }} />
                <span className="text-slate-500" style={{ fontSize: '11px' }}>Active now</span>
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center" style={{ width: '44px', height: '44px', flexShrink: 0 }}>
              <Signal style={{ width: '22px', height: '22px', color: '#059669' }} />
            </div>
          </div>
        </div>

        {/* Offline */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="font-medium text-slate-500" style={{ fontSize: '13px', marginBottom: '6px' }}>Offline</p>
              <p className="font-bold text-slate-400" style={{ fontSize: '28px', lineHeight: 1 }}>{offlineCount}</p>
              <div style={{ marginTop: '8px' }}>
                <span className="text-slate-400" style={{ fontSize: '11px' }}>Disconnected</span>
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center" style={{ width: '44px', height: '44px', flexShrink: 0 }}>
              <SignalZero style={{ width: '22px', height: '22px', color: '#94a3b8' }} />
            </div>
          </div>
        </div>

        {/* Total Activities */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="font-medium text-slate-500" style={{ fontSize: '13px', marginBottom: '6px' }}>Total Activities</p>
              <p className="font-bold text-blue-600" style={{ fontSize: '28px', lineHeight: 1 }}>{totalActivities.toLocaleString()}</p>
              <div style={{ marginTop: '8px' }}>
                <span className="text-slate-500" style={{ fontSize: '11px' }}>All time recorded</span>
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center" style={{ width: '44px', height: '44px', flexShrink: 0 }}>
              <Activity style={{ width: '22px', height: '22px', color: '#2563eb' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            {/* Left: Search and Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Search */}
              <div style={{ position: 'relative', width: '220px' }}>
                <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <Search style={{ width: '16px', height: '16px', color: '#94a3b8' }} />
                </div>
                <input
                  type="text"
                  placeholder="Search agents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    height: '40px',
                    paddingLeft: '42px',
                    paddingRight: '14px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '13px',
                    color: '#1e293b',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  className="focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Status Filter Pills - Premium Design */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setStatusFilter('all')}
                  style={{
                    height: '36px',
                    padding: '0 16px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: statusFilter === 'all' ? '#1e293b' : '#f1f5f9',
                    color: statusFilter === 'all' ? '#ffffff' : '#64748b'
                  }}
                  className={statusFilter !== 'all' ? 'hover:bg-slate-200' : ''}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('online')}
                  style={{
                    height: '36px',
                    padding: '0 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: statusFilter === 'online' ? '#059669' : '#f1f5f9',
                    color: statusFilter === 'online' ? '#ffffff' : '#64748b'
                  }}
                  className={statusFilter !== 'online' ? 'hover:bg-slate-200' : ''}
                >
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: statusFilter === 'online' ? '#ffffff' : '#10b981'
                  }} />
                  Online
                </button>
                <button
                  onClick={() => setStatusFilter('offline')}
                  style={{
                    height: '36px',
                    padding: '0 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: statusFilter === 'offline' ? '#64748b' : '#f1f5f9',
                    color: statusFilter === 'offline' ? '#ffffff' : '#64748b'
                  }}
                  className={statusFilter !== 'offline' ? 'hover:bg-slate-200' : ''}
                >
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: statusFilter === 'offline' ? '#ffffff' : '#94a3b8'
                  }} />
                  Offline
                </button>
              </div>
            </div>

            {/* Right: Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* View Toggle - Premium */}
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: '10px', padding: '4px' }}>
                <button
                  onClick={() => setViewMode('grid')}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    backgroundColor: viewMode === 'grid' ? '#ffffff' : 'transparent',
                    boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <Grid3X3 style={{ width: '16px', height: '16px', color: viewMode === 'grid' ? '#1e293b' : '#94a3b8' }} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    backgroundColor: viewMode === 'list' ? '#ffffff' : 'transparent',
                    boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <List style={{ width: '16px', height: '16px', color: viewMode === 'list' ? '#1e293b' : '#94a3b8' }} />
                </button>
              </div>

              {/* Divider */}
              <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }} />

              {/* Refresh Button - Premium */}
              <button
                onClick={fetchAgents}
                style={{
                  height: '40px',
                  padding: '0 18px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                className="hover:bg-slate-50 hover:border-slate-300"
              >
                <RefreshCw style={{ width: '15px', height: '15px' }} />
                Refresh
              </button>

              {/* Export Button - Premium */}
              <button
                onClick={() => {
                  if (filteredAgents.length > 0) {
                    const headers = exportColumns.map(col => col.label).join(',')
                    const rows = filteredAgents.map(item => {
                      return exportColumns.map(col => {
                        let value = col.accessor ? col.accessor(item) : item[col.key]
                        if (typeof value === 'string') {
                          value = value.replace(/"/g, '""')
                          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                            value = `"${value}"`
                          }
                        }
                        return value ?? ''
                      }).join(',')
                    }).join('\n')
                    const csv = `${headers}\n${rows}`
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                    const link = document.createElement('a')
                    link.href = URL.createObjectURL(blob)
                    link.download = `agents_${new Date().toISOString().split('T')[0]}.csv`
                    link.click()
                    URL.revokeObjectURL(link.href)
                  }
                }}
                disabled={filteredAgents.length === 0}
                style={{
                  height: '40px',
                  padding: '0 18px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: filteredAgents.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  opacity: filteredAgents.length === 0 ? 0.5 : 1,
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                }}
                className={filteredAgents.length > 0 ? 'hover:shadow-lg' : ''}
              >
                <Download style={{ width: '15px', height: '15px' }} />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedAgents.length > 0 && (
          <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <CheckSquare className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-blue-900">
                {selectedAgents.length} agent{selectedAgents.length > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={requestBulkScreenshots}
                className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                Screenshot All
              </button>
              <button
                onClick={deleteBulkAgents}
                className="h-8 px-3 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete All
              </button>
              <button
                onClick={() => setSelectedAgents([])}
                className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-medium transition-all"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
              <p className="mt-4 text-sm text-slate-500">Loading agents...</p>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Monitor className="w-10 h-10 text-slate-400" />
              </div>
              <p className="text-slate-900 font-medium">No agents found</p>
              <p className="text-sm text-slate-500 mt-1">
                {search ? 'Try a different search term' : 'Waiting for agents to connect'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredAgents.slice((currentPage - 1) * 50, currentPage * 50).map((agent) => (
                <div
                  key={agent.id}
                  className={`group relative bg-white rounded-xl border transition-all duration-200 ${
                    selectedAgents.includes(agent.id)
                      ? 'border-blue-500 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }`}
                  style={{ overflow: 'hidden' }}
                >
                  {/* Selection Checkbox */}
                  <button
                    onClick={() => toggleAgentSelect(agent.id)}
                    className="absolute top-4 right-4 z-10 w-6 h-6 rounded-md bg-white/90 border border-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {selectedAgents.includes(agent.id) ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {/* Card Header */}
                  <div style={{ padding: '20px 20px 16px 20px' }}>
                    <div className="flex items-start" style={{ gap: '14px' }}>
                      {/* Avatar */}
                      <div
                        className={`relative rounded-xl bg-gradient-to-br ${getAvatarGradient(agent.employee_name || agent.pc_name)} flex items-center justify-center shadow-lg`}
                        style={{ width: '48px', height: '48px', flexShrink: 0 }}
                      >
                        <span className="text-white font-bold" style={{ fontSize: '14px' }}>
                          {getInitials(agent.employee_name || agent.pc_name)}
                        </span>
                        {/* Status Indicator */}
                        <div
                          className={`absolute rounded-full border-2 border-white ${agent.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'}`}
                          style={{ width: '14px', height: '14px', bottom: '-2px', right: '-2px' }}
                        >
                          {agent.status === 'online' && (
                            <div className="w-full h-full rounded-full bg-emerald-500 animate-ping opacity-75" />
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        {editingName === agent.id ? (
                          <div className="flex items-center" style={{ gap: '6px' }}>
                            <input
                              type="text"
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              className="bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                              style={{ flex: 1, minWidth: 0, height: '28px', padding: '0 8px' }}
                              autoFocus
                            />
                            <button
                              onClick={() => updateAgentName(agent.id)}
                              className="rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200 transition-colors"
                              style={{ width: '28px', height: '28px', flexShrink: 0 }}
                            >
                              <Check style={{ width: '14px', height: '14px' }} />
                            </button>
                            <button
                              onClick={cancelEditName}
                              className="rounded-md bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors"
                              style={{ width: '28px', height: '28px', flexShrink: 0 }}
                            >
                              <X style={{ width: '14px', height: '14px' }} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center group/name" style={{ gap: '6px' }}>
                              <h3
                                className="font-semibold text-slate-900"
                                style={{
                                  fontSize: '15px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {agent.employee_name || 'Unknown'}
                              </h3>
                              <button
                                onClick={() => startEditName(agent)}
                                className="opacity-0 group-hover/name:opacity-100 text-slate-400 hover:text-blue-600 transition-all"
                                style={{ flexShrink: 0 }}
                              >
                                <Edit2 style={{ width: '12px', height: '12px' }} />
                              </button>
                            </div>
                            <p
                              className="text-slate-500"
                              style={{
                                fontSize: '12px',
                                marginTop: '2px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {agent.pc_name}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div
                    className="bg-slate-50/80 border-t border-slate-100"
                    style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}
                  >
                    <div style={{ textAlign: 'center', overflow: 'hidden' }}>
                      <p className="font-bold text-slate-900" style={{ fontSize: '16px' }}>{agent.activity_count || 0}</p>
                      <p className="text-slate-500 uppercase" style={{ fontSize: '9px', letterSpacing: '0.05em', marginTop: '2px' }}>Activities</p>
                    </div>
                    <div className="border-x border-slate-200" style={{ textAlign: 'center', overflow: 'hidden', padding: '0 4px' }}>
                      <p className="font-bold text-slate-900" style={{ fontSize: '16px' }}>{formatUptime(agent.first_seen)}</p>
                      <p className="text-slate-500 uppercase" style={{ fontSize: '9px', letterSpacing: '0.05em', marginTop: '2px' }}>Uptime</p>
                    </div>
                    <div style={{ textAlign: 'center', overflow: 'hidden' }}>
                      <p className="font-bold text-slate-900" style={{ fontSize: '16px' }}>{formatRelativeTime(agent.last_seen)}</p>
                      <p className="text-slate-500 uppercase" style={{ fontSize: '9px', letterSpacing: '0.05em', marginTop: '2px' }}>Last Seen</p>
                    </div>
                  </div>

                  {/* Quick Info */}
                  <div style={{ padding: '14px 20px' }}>
                    <div className="flex items-center text-slate-600" style={{ gap: '10px', fontSize: '12px', marginBottom: '8px' }}>
                      <Globe style={{ width: '14px', height: '14px', flexShrink: 0, color: '#94a3b8' }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {agent.ip_address || 'Unknown IP'}
                      </span>
                    </div>
                    <div className="flex items-center text-slate-600" style={{ gap: '10px', fontSize: '12px' }}>
                      <Monitor style={{ width: '14px', height: '14px', flexShrink: 0, color: '#94a3b8' }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {agent.os_info || 'Windows'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-slate-100" style={{ padding: '14px 20px', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => requestScreenshot(agent.id)}
                      disabled={agent.status !== 'online' || screenshotLoading[agent.id]}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center justify-center"
                      style={{ flex: 1, height: '36px', fontSize: '12px', gap: '6px' }}
                    >
                      {screenshotLoading[agent.id] ? (
                        <>
                          <RefreshCw style={{ width: '14px', height: '14px' }} className="animate-spin" />
                          Capturing...
                        </>
                      ) : (
                        <>
                          <Camera style={{ width: '14px', height: '14px' }} />
                          Screenshot
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setExpandedAgent(expandedAgent === agent.id ? null : agent.id)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all flex items-center justify-center"
                      style={{ width: '36px', height: '36px', flexShrink: 0 }}
                    >
                      <ChevronRight className={`transition-transform ${expandedAgent === agent.id ? 'rotate-90' : ''}`} style={{ width: '16px', height: '16px' }} />
                    </button>
                    <button
                      onClick={() => deleteAgent(agent.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all flex items-center justify-center"
                      style={{ width: '36px', height: '36px', flexShrink: 0 }}
                    >
                      <Trash2 style={{ width: '16px', height: '16px' }} />
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {expandedAgent === agent.id && (
                    <div className="bg-slate-50 border-t border-slate-200" style={{ padding: '16px 20px' }}>
                      <h4 className="font-semibold text-slate-500 uppercase" style={{ fontSize: '10px', letterSpacing: '0.05em', marginBottom: '12px' }}>System Details</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div className="bg-white rounded-lg border border-slate-200" style={{ padding: '10px' }}>
                          <div className="flex items-center" style={{ gap: '6px', marginBottom: '4px' }}>
                            <Cpu style={{ width: '12px', height: '12px', color: '#a855f7' }} />
                            <span className="text-slate-500 uppercase" style={{ fontSize: '9px' }}>Version</span>
                          </div>
                          <p className="font-medium text-slate-900" style={{ fontSize: '13px' }}>{agent.agent_version || '1.0.0'}</p>
                        </div>
                        <div className="bg-white rounded-lg border border-slate-200" style={{ padding: '10px', overflow: 'hidden' }}>
                          <div className="flex items-center" style={{ gap: '6px', marginBottom: '4px' }}>
                            <HardDrive style={{ width: '12px', height: '12px', color: '#06b6d4' }} />
                            <span className="text-slate-500 uppercase" style={{ fontSize: '9px' }}>Machine ID</span>
                          </div>
                          <p className="font-medium text-slate-900" style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(agent.machine_id || agent.id).slice(0, 12)}...</p>
                        </div>
                        <div className="bg-white rounded-lg border border-slate-200" style={{ padding: '10px' }}>
                          <div className="flex items-center" style={{ gap: '6px', marginBottom: '4px' }}>
                            <Clock style={{ width: '12px', height: '12px', color: '#f59e0b' }} />
                            <span className="text-slate-500 uppercase" style={{ fontSize: '9px' }}>First Seen</span>
                          </div>
                          <p className="font-medium text-slate-900" style={{ fontSize: '13px' }}>{formatDate(agent.first_seen)}</p>
                        </div>
                        <div className="bg-white rounded-lg border border-slate-200" style={{ padding: '10px' }}>
                          <div className="flex items-center" style={{ gap: '6px', marginBottom: '4px' }}>
                            <Shield style={{ width: '12px', height: '12px', color: '#10b981' }} />
                            <span className="text-slate-500 uppercase" style={{ fontSize: '9px' }}>Status</span>
                          </div>
                          <p className={`font-medium ${agent.status === 'online' ? 'text-emerald-600' : 'text-slate-500'}`} style={{ fontSize: '13px' }}>
                            {agent.status === 'online' ? 'Connected' : 'Disconnected'}
                          </p>
                        </div>
                      </div>

                      {/* Remote Commands */}
                      {agent.status === 'online' && (
                        <div style={{ marginTop: '16px' }}>
                          <h4 className="font-semibold text-slate-500 uppercase" style={{ fontSize: '10px', letterSpacing: '0.05em', marginBottom: '12px' }}>
                            <Terminal style={{ width: '12px', height: '12px', display: 'inline', marginRight: '6px' }} />
                            Remote Commands
                          </h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            <button
                              onClick={() => handleRestartAgent(agent.id)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-all flex items-center"
                              style={{ padding: '8px 12px', fontSize: '12px', gap: '6px' }}
                            >
                              <Power style={{ width: '14px', height: '14px' }} />
                              Restart
                            </button>
                            <button
                              onClick={() => handleLockScreen(agent.id)}
                              className="bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-all flex items-center"
                              style={{ padding: '8px 12px', fontSize: '12px', gap: '6px' }}
                            >
                              <Lock style={{ width: '14px', height: '14px' }} />
                              Lock Screen
                            </button>
                            <button
                              onClick={() => setMessageModal({ open: true, agentId: agent.id })}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all flex items-center"
                              style={{ padding: '8px 12px', fontSize: '12px', gap: '6px' }}
                            >
                              <MessageSquare style={{ width: '14px', height: '14px' }} />
                              Send Message
                            </button>
                            <button
                              onClick={() => handleGetSystemInfo(agent.id)}
                              className="bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded-lg transition-all flex items-center"
                              style={{ padding: '8px 12px', fontSize: '12px', gap: '6px' }}
                            >
                              <Info style={{ width: '14px', height: '14px' }} />
                              System Info
                            </button>
                            <button
                              onClick={() => handleToggleStealth(agent.id, true)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all flex items-center"
                              style={{ padding: '8px 12px', fontSize: '12px', gap: '6px' }}
                            >
                              <Eye style={{ width: '14px', height: '14px' }} />
                              Show Window
                            </button>
                            <button
                              onClick={() => handleToggleStealth(agent.id, false)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all flex items-center"
                              style={{ padding: '8px 12px', fontSize: '12px', gap: '6px' }}
                            >
                              <EyeOff style={{ width: '14px', height: '14px' }} />
                              Hide Window
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="space-y-2">
              {/* List Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <div className="col-span-1">
                  <button onClick={toggleSelectAll} className="w-5 h-5 flex items-center justify-center">
                    {selectedAgents.length === filteredAgents.length && filteredAgents.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
                <div className="col-span-3">Agent</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Last Seen</div>
                <div className="col-span-2">Activities</div>
                <div className="col-span-2">Actions</div>
              </div>

              {/* List Items */}
              {filteredAgents.slice((currentPage - 1) * 50, currentPage * 50).map((agent) => (
                <div
                  key={agent.id}
                  className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-xl border transition-all items-center ${
                    selectedAgents.includes(agent.id)
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="col-span-1">
                    <button
                      onClick={() => toggleAgentSelect(agent.id)}
                      className="w-5 h-5 flex items-center justify-center"
                    >
                      {selectedAgents.includes(agent.id) ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>

                  <div className="col-span-3 flex items-center gap-3">
                    <div className={`relative w-10 h-10 rounded-lg bg-gradient-to-br ${getAvatarGradient(agent.employee_name || agent.pc_name)} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white font-bold text-xs">
                        {getInitials(agent.employee_name || agent.pc_name)}
                      </span>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        agent.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'
                      }`} />
                    </div>
                    <div className="min-w-0">
                      {editingName === agent.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-24 h-6 px-2 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                          />
                          <button onClick={() => updateAgentName(agent.id)} className="text-emerald-600 hover:text-emerald-700">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={cancelEditName} className="text-slate-400 hover:text-slate-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 group/name">
                          <span className="font-medium text-slate-900 truncate">{agent.employee_name || 'Unknown'}</span>
                          <button onClick={() => startEditName(agent)} className="opacity-0 group-hover/name:opacity-100 text-slate-400 hover:text-blue-600">
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-slate-500 truncate">{agent.pc_name}</p>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      agent.status === 'online'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${agent.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {agent.status === 'online' ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-sm text-slate-600">{formatRelativeTime(agent.last_seen)}</span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-sm font-medium text-slate-900">{agent.activity_count || 0}</span>
                  </div>

                  <div className="col-span-2 flex items-center gap-2">
                    <button
                      onClick={() => requestScreenshot(agent.id)}
                      disabled={agent.status !== 'online' || screenshotLoading[agent.id]}
                      className="h-8 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                    >
                      {screenshotLoading[agent.id] ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Camera className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteAgent(agent.id)}
                      className="h-8 w-8 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Pagination
            totalItems={filteredAgents.length}
            itemsPerPage={50}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Send Message Modal */}
      {messageModal.open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 50
        }} onClick={() => setMessageModal({ open: false, agentId: null })}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '16px', padding: '24px', width: '100%',
              maxWidth: '440px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', color: '#1e293b' }}>
              <MessageSquare style={{ width: '20px', height: '20px', display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
              Send Message to Agent
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#475569', display: 'block', marginBottom: '6px' }}>Title</label>
                <input
                  type="text"
                  value={messageForm.title}
                  onChange={(e) => setMessageForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Message from IT"
                  style={{
                    width: '100%', height: '40px', padding: '0 12px', border: '1px solid #e2e8f0',
                    borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#475569', display: 'block', marginBottom: '6px' }}>Message</label>
                <textarea
                  value={messageForm.message}
                  onChange={(e) => setMessageForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Enter your message..."
                  rows={4}
                  style={{
                    width: '100%', padding: '12px', border: '1px solid #e2e8f0',
                    borderRadius: '8px', fontSize: '14px', outline: 'none', resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#475569', display: 'block', marginBottom: '6px' }}>Type</label>
                <select
                  value={messageForm.type}
                  onChange={(e) => setMessageForm(prev => ({ ...prev, type: e.target.value }))}
                  style={{
                    width: '100%', height: '40px', padding: '0 12px', border: '1px solid #e2e8f0',
                    borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                  }}
                >
                  <option value="info">Information</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => setMessageModal({ open: false, agentId: null })}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0',
                  background: '#fff', fontSize: '14px', fontWeight: 500, cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!messageForm.message}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: messageForm.message ? '#3b82f6' : '#cbd5e1',
                  color: '#fff', fontSize: '14px', fontWeight: 500,
                  cursor: messageForm.message ? 'pointer' : 'not-allowed'
                }}
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Info Modal */}
      {systemInfoModal.open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 50
        }} onClick={() => setSystemInfoModal({ open: false, data: null, loading: false })}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '16px', padding: '24px', width: '100%',
              maxWidth: '500px', maxHeight: '80vh', overflow: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', color: '#1e293b' }}>
              <Info style={{ width: '20px', height: '20px', display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
              System Information
            </h3>
            {systemInfoModal.loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <RefreshCw style={{ width: '32px', height: '32px', color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '12px', color: '#64748b' }}>Loading system info...</p>
              </div>
            ) : systemInfoModal.data ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {Object.entries(systemInfoModal.data).map(([key, value]) => (
                  <div key={key} style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                    <p style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                      {key.replace(/_/g, ' ')}
                    </p>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b', wordBreak: 'break-all' }}>
                      {Array.isArray(value) ? value.join(', ') : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: '#64748b' }}>No data available</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                onClick={() => setSystemInfoModal({ open: false, data: null, loading: false })}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: '#3b82f6', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
