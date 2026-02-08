import { useState, useEffect, useMemo } from 'react'
import {
  FolderOpen,
  FileText,
  FilePlus,
  FileX,
  FileEdit,
  Search,
  AlertTriangle,
  TrendingUp,
  HardDrive,
  Clock,
  Filter,
  Zap,
  RefreshCw,
} from 'lucide-react'
import DateRangeFilter from '../components/DateRangeFilter'
import ExportButton from '../components/ExportButton'
import Pagination from '../components/Pagination'
import { DonutChart } from '@tremor/react'

const USE_MOCK_DATA = false

const icons = {
  created: FilePlus,
  modified: FileEdit,
  deleted: FileX,
  renamed: FileText,
}

const actionStyles = {
  created: { bg: '#dcfce7', text: '#166534', border: '#86efac', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
  modified: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd', gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' },
  deleted: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
  renamed: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
  unknown: { bg: '#f3f4f6', text: '#374151', border: '#d1d5db', gradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)' },
}

const fileTypeColors = {
  'Documents': { bg: '#dbeafe', text: '#1e40af' },
  'Images': { bg: '#fce7f3', text: '#9d174d' },
  'Audio': { bg: '#e0e7ff', text: '#3730a3' },
  'Video': { bg: '#fee2e2', text: '#991b1b' },
  'Archives': { bg: '#fef3c7', text: '#92400e' },
  'Executables': { bg: '#fee2e2', text: '#991b1b' },
  'Code': { bg: '#dcfce7', text: '#166534' },
  'Other': { bg: '#f3f4f6', text: '#374151' },
}

const suspiciousExtensions = [
  '.exe', '.bat', '.cmd', '.ps1', '.vbs', '.js', '.msi', '.dll',
  '.zip', '.rar', '.7z', '.iso', '.torrent'
]

const sensitiveExtensions = [
  '.key', '.pem', '.crt', '.cer', '.pfx', '.p12', '.env',
  '.config', '.json', '.yml', '.yaml'
]

const mockEvents = [
  { id: 1, file_path: 'C:\\Users\\John\\Documents\\Q4_Report.docx', action: 'modified', file_size: 245760, timestamp: '2024-01-15T09:15:00', employee_name: 'John Smith', pc_name: 'DESKTOP-001' },
  { id: 2, file_path: 'C:\\Users\\Sarah\\Downloads\\installer.exe', action: 'created', file_size: 15728640, timestamp: '2024-01-15T09:30:00', employee_name: 'Sarah Johnson', pc_name: 'DESKTOP-002' },
  { id: 3, file_path: 'C:\\Projects\\app\\src\\index.tsx', action: 'modified', file_size: 8192, timestamp: '2024-01-15T10:00:00', employee_name: 'Mike Wilson', pc_name: 'DESKTOP-003' },
  { id: 4, file_path: 'C:\\Users\\Emily\\.env', action: 'created', file_size: 512, timestamp: '2024-01-15T10:15:00', employee_name: 'Emily Davis', pc_name: 'DESKTOP-004' },
  { id: 5, file_path: 'C:\\Users\\John\\Pictures\\photo.jpg', action: 'created', file_size: 2097152, timestamp: '2024-01-15T10:30:00', employee_name: 'John Smith', pc_name: 'DESKTOP-001' },
  { id: 6, file_path: 'C:\\Temp\\backup.zip', action: 'created', file_size: 52428800, timestamp: '2024-01-15T11:00:00', employee_name: 'Sarah Johnson', pc_name: 'DESKTOP-002' },
  { id: 7, file_path: 'C:\\Users\\Mike\\Documents\\old_file.txt', action: 'deleted', file_size: 1024, timestamp: '2024-01-15T11:15:00', employee_name: 'Mike Wilson', pc_name: 'DESKTOP-003' },
  { id: 8, file_path: 'C:\\Projects\\config\\database.yml', action: 'modified', file_size: 2048, timestamp: '2024-01-15T11:30:00', employee_name: 'Emily Davis', pc_name: 'DESKTOP-004' },
  { id: 9, file_path: 'C:\\Users\\John\\Documents\\report_v1.docx', action: 'renamed', file_size: 245760, timestamp: '2024-01-15T11:45:00', employee_name: 'John Smith', pc_name: 'DESKTOP-001' },
  { id: 10, file_path: 'C:\\Users\\Sarah\\Music\\song.mp3', action: 'created', file_size: 5242880, timestamp: '2024-01-15T12:00:00', employee_name: 'Sarah Johnson', pc_name: 'DESKTOP-002' },
  { id: 11, file_path: 'C:\\Secrets\\credentials.key', action: 'modified', file_size: 256, timestamp: '2024-01-15T12:15:00', employee_name: 'Mike Wilson', pc_name: 'DESKTOP-003' },
  { id: 12, file_path: 'C:\\Users\\Emily\\Videos\\presentation.mp4', action: 'created', file_size: 104857600, timestamp: '2024-01-15T12:30:00', employee_name: 'Emily Davis', pc_name: 'DESKTOP-004' },
]

const mockAgents = [
  { id: '1', employee_name: 'John Smith', pc_name: 'DESKTOP-001' },
  { id: '2', employee_name: 'Sarah Johnson', pc_name: 'DESKTOP-002' },
  { id: '3', employee_name: 'Mike Wilson', pc_name: 'DESKTOP-003' },
  { id: '4', employee_name: 'Emily Davis', pc_name: 'DESKTOP-004' },
]

const getFileExtension = (path) => {
  if (!path) return ''
  const lastDot = path.lastIndexOf('.')
  if (lastDot === -1) return ''
  return path.substring(lastDot).toLowerCase()
}

const isSuspicious = (path) => {
  const ext = getFileExtension(path)
  return suspiciousExtensions.includes(ext)
}

const isSensitive = (path) => {
  const ext = getFileExtension(path)
  return sensitiveExtensions.includes(ext)
}

const getFileType = (path) => {
  const ext = getFileExtension(path)
  if (!ext) return 'Other'
  if (['.doc', '.docx', '.pdf', '.txt', '.rtf', '.odt'].includes(ext)) return 'Documents'
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'].includes(ext)) return 'Images'
  if (['.mp3', '.wav', '.flac', '.aac', '.ogg'].includes(ext)) return 'Audio'
  if (['.mp4', '.avi', '.mkv', '.mov', '.wmv'].includes(ext)) return 'Video'
  if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) return 'Archives'
  if (['.exe', '.dll', '.bat', '.cmd', '.msi'].includes(ext)) return 'Executables'
  if (['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.go', '.rs'].includes(ext)) return 'Code'
  return 'Other'
}

const formatFileSize = (bytes) => {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

const getFileName = (path) => {
  if (!path) return 'Unknown'
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || 'Unknown'
}

export default function Files() {
  const [events, setEvents] = useState([])
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [dateRange, setDateRange] = useState('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [stats, setStats] = useState({
    totalEvents: 0,
    created: 0,
    modified: 0,
    deleted: 0,
    suspicious: 0,
  })
  const [actionBreakdown, setActionBreakdown] = useState([])
  const [typeBreakdown, setTypeBreakdown] = useState([])

  useEffect(() => {
    if (USE_MOCK_DATA) {
      setAgents(mockAgents)
    } else {
      fetch('/api/agents').then(r => r.json()).then(setAgents)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [selectedAgent, dateRange])

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.data_type === 'file_events') {
        setSyncing(false)
        fetchEvents()
      }
    }
    window.addEventListener('data_sync_complete', handler)
    return () => window.removeEventListener('data_sync_complete', handler)
  }, [selectedAgent])

  const fetchEvents = async () => {
    setLoading(true)

    if (USE_MOCK_DATA) {
      setTimeout(() => {
        let data = mockEvents
        if (selectedAgent) {
          data = data.filter(e => {
            const agent = mockAgents.find(a => a.id === selectedAgent)
            return agent && e.employee_name === agent.employee_name
          })
        }
        setEvents(data)
        processEventData(data)
        setLoading(false)
      }, 500)
      return
    }

    let url = '/api/monitoring/file-events?limit=500'
    if (selectedAgent) url += `&agent_id=${selectedAgent}`
    try {
      const response = await fetch(url)
      const data = await response.json()
      setEvents(data)
      processEventData(data)
    } catch (error) {
      console.error('Error:', error)
    }
    setLoading(false)
  }

  const processEventData = (data) => {
    let created = 0, modified = 0, deleted = 0, suspicious = 0
    const actionCounts = {}
    const typeCounts = {}

    data.forEach(e => {
      const action = e.action || 'unknown'
      actionCounts[action] = (actionCounts[action] || 0) + 1

      if (action === 'created') created++
      if (action === 'modified') modified++
      if (action === 'deleted') deleted++

      if (isSuspicious(e.file_path) || isSensitive(e.file_path)) {
        suspicious++
      }

      const fileType = getFileType(e.file_path)
      typeCounts[fileType] = (typeCounts[fileType] || 0) + 1
    })

    setStats({
      totalEvents: data.length,
      created,
      modified,
      deleted,
      suspicious,
    })

    const actionData = Object.entries(actionCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }))
    setActionBreakdown(actionData)

    const typeData = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({
        name,
        count,
      }))
    setTypeBreakdown(typeData)
  }

  const requestLatest = () => {
    if (!selectedAgent || !window.ws) return
    setSyncing(true)
    window.ws.send(JSON.stringify({ type: 'request_data_sync', agent_id: selectedAgent, data_type: 'file_events' }))
    setTimeout(() => setSyncing(false), 15000)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown'
    return new Date(dateStr).toLocaleString()
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, actionFilter, typeFilter, selectedAgent, dateRange])

  const filteredEvents = events.filter(e => {
    if (actionFilter !== 'all' && e.action !== actionFilter) return false
    if (typeFilter !== 'all' && getFileType(e.file_path) !== typeFilter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return e.file_path && e.file_path.toLowerCase().includes(query)
    }
    return true
  })

  const allTypes = [...new Set(events.map(e => getFileType(e.file_path)))]

  const exportColumns = [
    { label: 'Time', key: 'timestamp', accessor: (e) => formatDate(e.timestamp) },
    { label: 'Agent', key: 'employee_name', accessor: (e) => e.employee_name || e.pc_name || 'Unknown' },
    { label: 'Action', key: 'action', accessor: (e) => e.action || 'unknown' },
    { label: 'File Path', key: 'file_path', accessor: (e) => e.file_path || '' },
    { label: 'File Type', key: 'file_type', accessor: (e) => getFileType(e.file_path) },
    { label: 'Size', key: 'size', accessor: (e) => formatFileSize(e.file_size) },
    { label: 'Suspicious', key: 'suspicious', accessor: (e) => isSuspicious(e.file_path) || isSensitive(e.file_path) ? 'Yes' : 'No' },
  ]

  const maxTypeCount = Math.max(...typeBreakdown.map(t => t.count), 1)
  const totalActionValue = actionBreakdown.reduce((sum, a) => sum + a.value, 0)

  // Process file actions for Tremor DonutChart
  const fileActionsChartData = useMemo(() => {
    const actionCounts = {}
    events.forEach(e => {
      const action = e.action || 'unknown'
      actionCounts[action] = (actionCounts[action] || 0) + 1
    })

    return Object.entries(actionCounts).map(([action, count]) => ({
      name: action.charAt(0).toUpperCase() + action.slice(1),
      value: count
    }))
  }, [events])

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Total Events */}
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
            <FolderOpen size={24} color="white" />
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Total Events</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{stats.totalEvents}</p>
          </div>
        </div>

        {/* Created */}
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
            <FilePlus size={24} color="white" />
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Created</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{stats.created}</p>
          </div>
        </div>

        {/* Modified */}
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
            <FileEdit size={24} color="white" />
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Modified</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{stats.modified}</p>
          </div>
        </div>

        {/* Deleted */}
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
            background: 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(239,68,68,0.3)'
          }}>
            <FileX size={24} color="white" />
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Deleted</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{stats.deleted}</p>
          </div>
        </div>

        {/* Suspicious */}
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
            background: `radial-gradient(circle, ${stats.suspicious > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)'} 0%, transparent 70%)`,
            borderRadius: '50%'
          }} />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: stats.suspicious > 0
              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: stats.suspicious > 0
              ? '0 4px 12px rgba(245,158,11,0.3)'
              : '0 4px 12px rgba(16,185,129,0.3)'
          }}>
            <AlertTriangle size={24} color="white" />
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Suspicious</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{stats.suspicious}</p>
          </div>
        </div>
      </div>

      {/* Tremor Donut Chart */}
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
          File Actions Breakdown
        </h3>
        <DonutChart
          data={fileActionsChartData}
          category="value"
          index="name"
          colors={["green", "blue", "red", "yellow"]}
          className="h-52"
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* File Types Chart */}
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
            background: 'linear-gradient(90deg, #3b82f6 0%, #f59e0b 100%)',
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
              <HardDrive size={18} color="white" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 }}>File Types</h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Distribution by file type</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {typeBreakdown.length > 0 ? typeBreakdown.map((type, index) => {
              const colors = fileTypeColors[type.name] || fileTypeColors['Other']
              return (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    fontSize: '12px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: colors.bg,
                    color: colors.text,
                    fontWeight: '500',
                    minWidth: '90px',
                    textAlign: 'center'
                  }}>
                    {type.name}
                  </span>
                  <div style={{ flex: 1, height: '24px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${(type.count / maxTypeCount) * 100}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #3b82f6 0%, #f59e0b 100%)',
                      borderRadius: '6px',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', width: '40px', textAlign: 'right' }}>{type.count}</span>
                </div>
              )
            }) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                No file type data available
              </div>
            )}
          </div>
        </div>

        {/* Actions Breakdown */}
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
            background: 'linear-gradient(90deg, #10b981 0%, #ef4444 50%, #3b82f6 100%)',
            borderRadius: '24px 24px 0 0'
          }} />
          <div style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '120px',
            height: '120px',
            background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={18} color="white" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 }}>Actions</h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Distribution by action type</p>
            </div>
          </div>

          {actionBreakdown.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {actionBreakdown.map((action, index) => {
                const actionKey = action.name.toLowerCase()
                const style = actionStyles[actionKey] || actionStyles['unknown']
                const percentage = totalActionValue > 0 ? ((action.value / totalActionValue) * 100).toFixed(1) : 0
                return (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: style.bg,
                      color: style.text,
                      border: `1px solid ${style.border}`,
                      fontWeight: '500',
                      minWidth: '75px',
                      textAlign: 'center'
                    }}>
                      {action.name}
                    </span>
                    <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: style.gradient,
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
              No action data
            </div>
          )}
        </div>
      </div>

      {/* File Events Table Card */}
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
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', margin: '0 0 4px 0' }}>File Activity</h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>File system events monitoring</p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <DateRangeFilter value={dateRange} onChange={setDateRange} />

            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '8px 12px 8px 36px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px',
                  width: '160px',
                  background: '#f8fafc',
                  outline: 'none'
                }}
              />
            </div>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
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
              <option value="all">All Actions</option>
              <option value="created">Created</option>
              <option value="modified">Modified</option>
              <option value="deleted">Deleted</option>
              <option value="renamed">Renamed</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
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
              <option value="all">All Types</option>
              {allTypes.map(type => (
                <option key={type} value={type}>{type}</option>
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

            <button onClick={requestLatest} disabled={!selectedAgent || syncing} title={!selectedAgent ? 'Select an agent first' : 'Request latest data from agent'} style={{ height: '40px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', background: selectedAgent && !syncing ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#e2e8f0', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: selectedAgent && !syncing ? '#ffffff' : '#94a3b8', cursor: selectedAgent && !syncing ? 'pointer' : 'not-allowed', boxShadow: selectedAgent && !syncing ? '0 2px 4px rgba(16, 185, 129, 0.3)' : 'none', transition: 'all 0.2s' }}>
              {syncing ? <RefreshCw style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} /> : <Zap style={{ width: '15px', height: '15px' }} />}
              {syncing ? 'Syncing...' : 'Request Latest'}
            </button>

            <ExportButton
              data={filteredEvents}
              filename="file_activity"
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
            {filteredEvents.length}
          </span>
          <span style={{ fontSize: '13px', color: '#64748b' }}>file events</span>
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
            Loading file events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <FolderOpen size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
            <p style={{ color: '#64748b', margin: 0 }}>No file events found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Time</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Agent</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Action</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>File</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Type</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Size</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.slice((currentPage - 1) * 50, currentPage * 50).map((e, i) => {
                  const Icon = icons[e.action] || FileText
                  const suspicious = isSuspicious(e.file_path)
                  const sensitive = isSensitive(e.file_path)
                  const actionStyle = actionStyles[e.action] || actionStyles['unknown']
                  const typeColor = fileTypeColors[getFileType(e.file_path)] || fileTypeColors['Other']

                  return (
                    <tr key={i} style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background-color 0.15s',
                      backgroundColor: (suspicious || sensitive) ? '#fffbeb' : 'transparent',
                      cursor: 'default'
                    }}
                    onMouseEnter={(ev) => ev.currentTarget.style.backgroundColor = (suspicious || sensitive) ? '#fef3c7' : '#f8fafc'}
                    onMouseLeave={(ev) => ev.currentTarget.style.backgroundColor = (suspicious || sensitive) ? '#fffbeb' : 'transparent'}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Clock size={14} style={{ color: '#94a3b8' }} />
                          <span style={{ fontSize: '13px', color: '#374151' }}>{formatDate(e.timestamp)}</span>
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
                            {(e.employee_name || e.pc_name || 'U')[0].toUpperCase()}
                          </div>
                          <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>
                            {e.employee_name || e.pc_name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            background: actionStyle.bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Icon size={12} style={{ color: actionStyle.text }} />
                          </div>
                          <span style={{
                            fontSize: '11px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: actionStyle.bg,
                            color: actionStyle.text,
                            border: `1px solid ${actionStyle.border}`,
                            fontWeight: '500'
                          }}>
                            {e.action || 'unknown'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', maxWidth: '280px' }}>
                        <div>
                          <p style={{ fontSize: '13px', color: '#0f172a', fontWeight: '500', margin: '0 0 2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {getFileName(e.file_path)}
                          </p>
                          <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.file_path}>
                            {e.file_path || 'Unknown'}
                          </p>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontSize: '11px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: typeColor.bg,
                          color: typeColor.text,
                          fontWeight: '500'
                        }}>
                          {getFileType(e.file_path)}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '13px', color: '#374151' }}>{formatFileSize(e.file_size)}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {suspicious ? (
                          <span style={{
                            fontSize: '11px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: '#fee2e2',
                            color: '#991b1b',
                            border: '1px solid #fca5a5',
                            fontWeight: '500',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <AlertTriangle size={10} />
                            Suspicious
                          </span>
                        ) : sensitive ? (
                          <span style={{
                            fontSize: '11px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: '#fef3c7',
                            color: '#92400e',
                            border: '1px solid #fcd34d',
                            fontWeight: '500',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <AlertTriangle size={10} />
                            Sensitive
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '11px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: '#dcfce7',
                            color: '#166534',
                            border: '1px solid #86efac',
                            fontWeight: '500'
                          }}>
                            Normal
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

        <Pagination
          totalItems={filteredEvents.length}
          itemsPerPage={50}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  )
}
