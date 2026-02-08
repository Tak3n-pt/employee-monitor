import { useState, useEffect, useMemo } from 'react'
import {
  Usb,
  Plus,
  Trash2,
  Shield,
  ShieldOff,
  Search,
  HardDrive,
  CheckCircle,
  X,
  ChevronDown,
  Activity,
  Smartphone,
  Keyboard,
  Mouse,
  Printer,
} from 'lucide-react'
import DateRangeFilter from '../components/DateRangeFilter'
import ExportButton from '../components/ExportButton'
import Pagination from '../components/Pagination'
import { BarChart } from '@tremor/react'

const USE_MOCK_DATA = false

const mockLogs = [
  { id: 1, timestamp: '2025-01-27T09:15:00', employee_name: 'John Smith', pc_name: 'WS-001', device_name: 'SanDisk Ultra 64GB', device_class: 'storage', serial_number: 'SD-2847261', action: 'allowed' },
  { id: 2, timestamp: '2025-01-27T09:30:00', employee_name: 'Sarah Johnson', pc_name: 'WS-002', device_name: 'iPhone 14 Pro', device_class: 'phone', serial_number: 'DNPW3827', action: 'blocked' },
  { id: 3, timestamp: '2025-01-27T10:00:00', employee_name: 'Mike Wilson', pc_name: 'WS-003', device_name: 'Seagate Backup Plus 1TB', device_class: 'storage', serial_number: 'NA8K47X2', action: 'allowed' },
  { id: 4, timestamp: '2025-01-27T10:15:00', employee_name: 'Emily Brown', pc_name: 'WS-004', device_name: 'Samsung Galaxy S23', device_class: 'phone', serial_number: 'RF8W50H7L', action: 'blocked' },
  { id: 5, timestamp: '2025-01-27T10:45:00', employee_name: 'David Lee', pc_name: 'WS-005', device_name: 'Kingston DataTraveler 32GB', device_class: 'storage', serial_number: 'KT-9284756', action: 'allowed' },
  { id: 6, timestamp: '2025-01-27T11:00:00', employee_name: 'Lisa Chen', pc_name: 'WS-006', device_name: 'Logitech MX Keys', device_class: 'keyboard', serial_number: 'LG-4829571', action: 'allowed' },
  { id: 7, timestamp: '2025-01-27T11:30:00', employee_name: 'James Taylor', pc_name: 'WS-007', device_name: 'WD My Passport 2TB', device_class: 'storage', serial_number: 'WD-8472615', action: 'blocked' },
  { id: 8, timestamp: '2025-01-27T12:00:00', employee_name: 'Anna Martinez', pc_name: 'WS-008', device_name: 'Logitech MX Master 3', device_class: 'mouse', serial_number: 'LG-5728461', action: 'allowed' },
  { id: 9, timestamp: '2025-01-27T13:15:00', employee_name: 'Robert Garcia', pc_name: 'WS-009', device_name: 'HP LaserJet USB', device_class: 'printer', serial_number: 'HP-2947562', action: 'allowed' },
  { id: 10, timestamp: '2025-01-27T13:45:00', employee_name: 'Jennifer White', pc_name: 'WS-010', device_name: 'Crucial X8 500GB', device_class: 'storage', serial_number: 'CT-7294851', action: 'allowed' },
  { id: 11, timestamp: '2025-01-27T14:00:00', employee_name: 'Chris Anderson', pc_name: 'WS-011', device_name: 'Google Pixel 8', device_class: 'phone', serial_number: 'GP-8294751', action: 'blocked' },
  { id: 12, timestamp: '2025-01-27T14:30:00', employee_name: 'Michelle Thomas', pc_name: 'WS-012', device_name: 'Toshiba Canvio 4TB', device_class: 'storage', serial_number: 'TB-5829471', action: 'blocked' },
]

const mockPolicies = [
  { id: 1, device_class: 'storage', agent_id: '', employee_name: null, allowed: true },
  { id: 2, device_class: 'phone', agent_id: '', employee_name: null, allowed: false },
  { id: 3, device_class: 'keyboard', agent_id: '', employee_name: null, allowed: true },
  { id: 4, device_class: 'mouse', agent_id: '', employee_name: null, allowed: true },
]

const mockAgents = [
  { id: 'agent-1', employee_name: 'John Smith', pc_name: 'WS-001' },
  { id: 'agent-2', employee_name: 'Sarah Johnson', pc_name: 'WS-002' },
  { id: 'agent-3', employee_name: 'Mike Wilson', pc_name: 'WS-003' },
  { id: 'agent-4', employee_name: 'Emily Brown', pc_name: 'WS-004' },
  { id: 'agent-5', employee_name: 'David Lee', pc_name: 'WS-005' },
]

export default function USB() {
  const [policies, setPolicies] = useState([])
  const [logs, setLogs] = useState([])
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [dateRange, setDateRange] = useState('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newPolicy, setNewPolicy] = useState({ device_class: 'storage', agent_id: '', allowed: true })
  const [showAgentDropdown, setShowAgentDropdown] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [stats, setStats] = useState({
    totalEvents: 0,
    blocked: 0,
    allowed: 0,
    uniqueDevices: 0,
  })
  const [actionBreakdown, setActionBreakdown] = useState([])
  const [deviceTypeBreakdown, setDeviceTypeBreakdown] = useState([])

  useEffect(() => {
    if (USE_MOCK_DATA) {
      setAgents(mockAgents)
    } else {
      fetch('/api/agents').then(r => r.json()).then(setAgents)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [selectedAgent, dateRange])

  const fetchData = async () => {
    setLoading(true)
    try {
      if (USE_MOCK_DATA) {
        setPolicies(mockPolicies)
        setLogs(mockLogs)
        processLogsData(mockLogs)
      } else {
        let logsUrl = '/api/usb/logs?limit=500'
        if (selectedAgent) logsUrl += `&agent_id=${selectedAgent}`

        const [policiesRes, logsRes] = await Promise.all([
          fetch('/api/usb/policies'),
          fetch(logsUrl)
        ])
        const policiesData = await policiesRes.json()
        const logsData = await logsRes.json()

        setPolicies(policiesData)
        setLogs(logsData)
        processLogsData(logsData)
      }
    } catch (error) {
      console.error('Error:', error)
    }
    setLoading(false)
  }

  const processLogsData = (data) => {
    let blocked = 0
    let allowed = 0
    const deviceNames = new Set()
    const actionCounts = {}
    const deviceTypeCounts = {}

    data.forEach(l => {
      const action = l.action || 'unknown'
      actionCounts[action] = (actionCounts[action] || 0) + 1

      if (action === 'blocked') blocked++
      else allowed++

      if (l.device_name) deviceNames.add(l.device_name)

      const deviceType = l.device_class || l.device_type || 'Unknown'
      deviceTypeCounts[deviceType] = (deviceTypeCounts[deviceType] || 0) + 1
    })

    setStats({
      totalEvents: data.length,
      blocked,
      allowed,
      uniqueDevices: deviceNames.size,
    })

    const actionData = Object.entries(actionCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }))
    setActionBreakdown(actionData)

    const deviceData = Object.entries(deviceTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        count,
      }))
    setDeviceTypeBreakdown(deviceData)
  }

  const savePolicy = async () => {
    if (USE_MOCK_DATA) {
      const newId = Math.max(...policies.map(p => p.id), 0) + 1
      setPolicies([...policies, { ...newPolicy, id: newId, employee_name: null }])
    } else {
      await fetch('/api/usb/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPolicy)
      })
      if (window.ws && window.ws.readyState === WebSocket.OPEN) {
        window.ws.send(JSON.stringify({
          type: 'update_usb_policy',
          agent_id: newPolicy.agent_id || null,
          policy: { device_class: newPolicy.device_class, allowed: newPolicy.allowed }
        }))
      }
      fetchData()
    }
    setShowModal(false)
    setNewPolicy({ device_class: 'storage', agent_id: '', allowed: true })
  }

  const deletePolicy = async (id) => {
    if (USE_MOCK_DATA) {
      setPolicies(policies.filter(p => p.id !== id))
    } else {
      await fetch(`/api/usb/policies/${id}`, { method: 'DELETE' })
      fetchData()
    }
  }

  const togglePolicy = async (id, allowed) => {
    if (USE_MOCK_DATA) {
      setPolicies(policies.map(p => p.id === id ? { ...p, allowed } : p))
    } else {
      await fetch(`/api/usb/policies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowed })
      })
      fetchData()
    }
  }

  const deviceLabels = {
    storage: 'USB Storage',
    phone: 'Mobile Phones',
    all: 'All USB Devices',
    keyboard: 'Keyboards',
    mouse: 'Mouse/Input',
    printer: 'Printers',
  }

  const getDeviceIcon = (deviceClass) => {
    switch (deviceClass) {
      case 'storage': return HardDrive
      case 'phone': return Smartphone
      case 'keyboard': return Keyboard
      case 'mouse': return Mouse
      case 'printer': return Printer
      default: return Usb
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown'
    return new Date(dateStr).toLocaleString()
  }

  const usbEventsPerDayChartData = useMemo(() => {
    const now = new Date()
    const last7Days = []

    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      last7Days.push({ date: dateStr, Events: 0 })
    }

    // Count USB events per day
    logs.forEach(l => {
      if (l.timestamp) {
        const logDate = new Date(l.timestamp).toISOString().split('T')[0]
        const dayData = last7Days.find(d => d.date === logDate)
        if (dayData) {
          dayData.Events++
        }
      }
    })

    return last7Days.map(d => ({
      day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      Events: d.Events
    }))
  }, [logs])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedAgent, dateRange])

  const filteredLogs = logs.filter(l => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        (l.device_name && l.device_name.toLowerCase().includes(query)) ||
        (l.device_class && l.device_class.toLowerCase().includes(query))
      )
    }
    return true
  })

  const exportColumns = [
    { label: 'Time', key: 'timestamp', accessor: (l) => formatDate(l.timestamp) },
    { label: 'Agent', key: 'employee_name', accessor: (l) => l.employee_name || l.pc_name || 'Unknown' },
    { label: 'Device Name', key: 'device_name', accessor: (l) => l.device_name || 'Unknown' },
    { label: 'Device Type', key: 'device_class', accessor: (l) => l.device_class || l.device_type || 'Unknown' },
    { label: 'Action', key: 'action', accessor: (l) => l.action || 'Unknown' },
    { label: 'Serial Number', key: 'serial_number', accessor: (l) => l.serial_number || '-' },
  ]

  // Calculate chart data
  const maxDeviceCount = Math.max(...deviceTypeBreakdown.map(d => d.count), 1)
  const totalActions = actionBreakdown.reduce((sum, a) => sum + a.value, 0)

  // Colors for action breakdown
  const actionColors = {
    Allowed: { bg: '#10b981', light: 'rgba(16,185,129,0.15)' },
    Blocked: { bg: '#ef4444', light: 'rgba(239,68,68,0.15)' },
  }

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
          USB Events Per Day
        </h3>
        <BarChart
          data={usbEventsPerDayChartData}
          index="day"
          categories={["Events"]}
          colors={["blue"]}
          className="h-52"
        />
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Total Events */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
              <Usb style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Events
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>
                {stats.totalEvents}
              </div>
            </div>
          </div>
        </div>

        {/* Allowed */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Allowed
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>
                {stats.allowed}
              </div>
            </div>
          </div>
        </div>

        {/* Blocked */}
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
            background: 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
            }}>
              <ShieldOff style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Blocked
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>
                {stats.blocked}
              </div>
            </div>
          </div>
        </div>

        {/* Unique Devices */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
              <HardDrive style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Unique Devices
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>
                {stats.uniqueDevices}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Device Types Bar Chart */}
        <div style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
          borderRadius: '24px',
          padding: '0',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 50%, #06b6d4 100%)',
            borderRadius: '24px 24px 0 0',
          }} />
          <div style={{
            position: 'absolute',
            top: '0',
            right: '0',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)',
            borderRadius: '50%',
            transform: 'translate(50%, -50%)',
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
                <HardDrive style={{ width: '20px', height: '20px', color: 'white' }} />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Device Types</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>USB activity by device type</div>
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              {deviceTypeBreakdown.map((device, idx) => (
                <div key={idx} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: '#475569' }}>
                      {deviceLabels[device.name.toLowerCase()] || device.name}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{device.count}</span>
                  </div>
                  <div style={{
                    height: '10px',
                    background: 'rgba(59,130,246,0.1)',
                    borderRadius: '5px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${(device.count / maxDeviceCount) * 100}%`,
                      background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
                      borderRadius: '5px',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              ))}
              {deviceTypeBreakdown.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  No device data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions Donut Chart */}
        <div style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
          borderRadius: '24px',
          padding: '0',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg, #10b981 0%, #ef4444 100%)',
            borderRadius: '24px 24px 0 0',
          }} />
          <div style={{
            position: 'absolute',
            top: '0',
            right: '0',
            width: '150px',
            height: '150px',
            background: 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 70%)',
            borderRadius: '50%',
            transform: 'translate(50%, -50%)',
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
                <Activity style={{ width: '20px', height: '20px', color: 'white' }} />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Actions</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>Allowed vs Blocked</div>
              </div>
            </div>

            {/* Donut Chart */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
              <div style={{ position: 'relative', width: '140px', height: '140px' }}>
                <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                  {totalActions > 0 ? (
                    <>
                      {/* Background circle */}
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                      {/* Allowed segment */}
                      <circle
                        cx="50" cy="50" r="40" fill="none"
                        stroke="#10b981"
                        strokeWidth="12"
                        strokeDasharray={`${(stats.allowed / totalActions) * 251.2} 251.2`}
                        strokeLinecap="round"
                      />
                      {/* Blocked segment */}
                      <circle
                        cx="50" cy="50" r="40" fill="none"
                        stroke="#ef4444"
                        strokeWidth="12"
                        strokeDasharray={`${(stats.blocked / totalActions) * 251.2} 251.2`}
                        strokeDashoffset={`${-(stats.allowed / totalActions) * 251.2}`}
                        strokeLinecap="round"
                      />
                    </>
                  ) : (
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                  )}
                </svg>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>{totalActions}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Total</div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981' }} />
                <span style={{ fontSize: '13px', color: '#475569' }}>Allowed ({stats.allowed})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ef4444' }} />
                <span style={{ fontSize: '13px', color: '#475569' }}>Blocked ({stats.blocked})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Policies and Recent Activity Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* USB Policies */}
        <div style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
          borderRadius: '24px',
          padding: '0',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
            borderRadius: '24px 24px 0 0',
          }} />
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Shield style={{ width: '20px', height: '20px', color: 'white' }} />
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>USB Policies</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>Control device access</div>
                </div>
              </div>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                }}
              >
                <Plus style={{ width: '16px', height: '16px' }} />
                Add Policy
              </button>
            </div>

            {policies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Shield style={{ width: '48px', height: '48px', color: '#cbd5e1', margin: '0 auto 12px' }} />
                <div style={{ fontSize: '14px', color: '#94a3b8' }}>No policies configured</div>
              </div>
            ) : (
              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {policies.map(p => {
                  const DeviceIcon = getDeviceIcon(p.device_class)
                  return (
                    <div key={p.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      background: p.allowed ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
                      borderRadius: '12px',
                      border: `1px solid ${p.allowed ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                      marginBottom: '12px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: p.allowed
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <DeviceIcon style={{ width: '20px', height: '20px', color: 'white' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                            {deviceLabels[p.device_class] || p.device_class}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {p.employee_name || 'All Agents'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                          onClick={() => togglePolicy(p.id, !p.allowed)}
                          style={{
                            position: 'relative',
                            width: '48px',
                            height: '24px',
                            borderRadius: '12px',
                            background: p.allowed ? '#10b981' : '#ef4444',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                          }}
                        >
                          <span style={{
                            position: 'absolute',
                            top: '2px',
                            left: p.allowed ? '26px' : '2px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: 'white',
                            transition: 'left 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          }} />
                        </button>
                        <button
                          onClick={() => deletePolicy(p.id)}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Trash2 style={{ width: '14px', height: '14px', color: 'white' }} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
          borderRadius: '24px',
          padding: '0',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg, #06b6d4 0%, #0891b2 100%)',
            borderRadius: '24px 24px 0 0',
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
                <Activity style={{ width: '20px', height: '20px', color: 'white' }} />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Recent Activity</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>Latest USB events</div>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>Loading...</div>
            ) : logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Usb style={{ width: '48px', height: '48px', color: '#cbd5e1', margin: '0 auto 12px' }} />
                <div style={{ fontSize: '14px', color: '#94a3b8' }}>No USB activity</div>
              </div>
            ) : (
              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {logs.slice(0, 10).map((l, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: l.action === 'blocked' ? 'rgba(239,68,68,0.05)' : 'rgba(16,185,129,0.05)',
                    borderRadius: '10px',
                    border: `1px solid ${l.action === 'blocked' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'}`,
                    marginBottom: '8px',
                  }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: l.action === 'blocked'
                        ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Usb style={{ width: '18px', height: '18px', color: 'white' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.device_name || 'Unknown'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {formatDate(l.timestamp)}
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: l.action === 'blocked'
                        ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      textTransform: 'capitalize',
                    }}>
                      {l.action}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Activity Log Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        overflow: 'hidden',
      }}>
        {/* Toolbar */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>USB Activity Log</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Complete device connection history</div>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
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
                placeholder="Search devices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '10px 12px 10px 36px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: 'white',
                  fontSize: '13px',
                  width: '160px',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: 'white',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  minWidth: '140px',
                }}
              >
                <span style={{ color: selectedAgent ? '#1e293b' : '#94a3b8' }}>
                  {selectedAgent ? agents.find(a => a.id === selectedAgent)?.employee_name || 'Agent' : 'All Agents'}
                </span>
                <ChevronDown style={{ width: '14px', height: '14px', color: '#94a3b8' }} />
              </button>
              {showAgentDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '0',
                  marginTop: '4px',
                  background: 'white',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                  zIndex: 50,
                  minWidth: '160px',
                  overflow: 'hidden',
                }}>
                  <div
                    onClick={() => { setSelectedAgent(''); setShowAgentDropdown(false) }}
                    style={{
                      padding: '10px 16px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#1e293b',
                      background: !selectedAgent ? '#f1f5f9' : 'transparent',
                    }}
                  >
                    All Agents
                  </div>
                  {agents.map(a => (
                    <div
                      key={a.id}
                      onClick={() => { setSelectedAgent(a.id); setShowAgentDropdown(false) }}
                      style={{
                        padding: '10px 16px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#1e293b',
                        background: selectedAgent === a.id ? '#f1f5f9' : 'transparent',
                      }}
                    >
                      {a.employee_name || a.pc_name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <ExportButton data={filteredLogs} filename="usb_activity" columns={exportColumns} />
          </div>
        </div>

        {/* Record Count */}
        <div style={{
          padding: '12px 24px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{
            padding: '4px 12px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
          }}>
            {filteredLogs.length}
          </span>
          <span style={{ fontSize: '13px', color: '#64748b' }}>USB events found</span>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>Loading...</div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Usb style={{ width: '48px', height: '48px', color: '#cbd5e1', margin: '0 auto 12px' }} />
            <div style={{ fontSize: '14px', color: '#94a3b8' }}>No USB activity found</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0' }}>Time</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0' }}>Agent</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0' }}>Device</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0' }}>Type</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0' }}>Serial</th>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.slice((currentPage - 1) * 50, currentPage * 50).map((l, i) => (
                  <tr
                    key={i}
                    style={{
                      background: l.action === 'blocked' ? 'rgba(239,68,68,0.03)' : (i % 2 === 0 ? '#ffffff' : '#fafbfc'),
                      transition: 'background 0.15s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = l.action === 'blocked' ? 'rgba(239,68,68,0.08)' : '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.background = l.action === 'blocked' ? 'rgba(239,68,68,0.03)' : (i % 2 === 0 ? '#ffffff' : '#fafbfc')}
                  >
                    <td style={{ padding: '14px 24px', fontSize: '13px', color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                      {formatDate(l.timestamp)}
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: 'white',
                        }}>
                          {(l.employee_name || l.pc_name || 'U')[0].toUpperCase()}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: '#1e293b' }}>
                          {l.employee_name || l.pc_name || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#1e293b', borderBottom: '1px solid #f1f5f9', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.device_name || 'Unknown'}
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: 'rgba(59,130,246,0.1)',
                        color: '#1d4ed8',
                      }}>
                        {deviceLabels[l.device_class] || l.device_class || l.device_type || 'Unknown'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#64748b', fontFamily: 'monospace', borderBottom: '1px solid #f1f5f9' }}>
                      {l.serial_number || '-'}
                    </td>
                    <td style={{ padding: '14px 24px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {l.action === 'blocked' ? (
                          <ShieldOff style={{ width: '14px', height: '14px', color: '#ef4444' }} />
                        ) : (
                          <CheckCircle style={{ width: '14px', height: '14px', color: '#10b981' }} />
                        )}
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: l.action === 'blocked'
                            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                            : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          textTransform: 'capitalize',
                        }}>
                          {l.action}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          totalItems={filteredLogs.length}
          itemsPerPage={50}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Add Policy Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
              borderRadius: '20px',
              padding: '28px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              border: '1px solid #e2e8f0',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Shield style={{ width: '20px', height: '20px', color: 'white' }} />
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>Add USB Policy</div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#f1f5f9',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X style={{ width: '16px', height: '16px', color: '#64748b' }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Device Type */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                  Device Type
                </label>
                <select
                  value={newPolicy.device_class}
                  onChange={e => setNewPolicy({...newPolicy, device_class: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    fontSize: '14px',
                    color: '#1e293b',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="storage">USB Storage</option>
                  <option value="phone">Mobile Phones</option>
                  <option value="keyboard">Keyboards</option>
                  <option value="mouse">Mouse/Input</option>
                  <option value="printer">Printers</option>
                  <option value="all">All USB Devices</option>
                </select>
              </div>

              {/* Apply To */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                  Apply To
                </label>
                <select
                  value={newPolicy.agent_id}
                  onChange={e => setNewPolicy({...newPolicy, agent_id: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    fontSize: '14px',
                    color: '#1e293b',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">All Agents</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.employee_name || a.pc_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Allow/Block Toggle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                background: newPolicy.allowed ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                borderRadius: '12px',
                border: `1px solid ${newPolicy.allowed ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {newPolicy.allowed ? (
                    <Shield style={{ width: '20px', height: '20px', color: '#10b981' }} />
                  ) : (
                    <ShieldOff style={{ width: '20px', height: '20px', color: '#ef4444' }} />
                  )}
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                    {newPolicy.allowed ? 'Allow Device' : 'Block Device'}
                  </span>
                </div>
                <button
                  onClick={() => setNewPolicy({...newPolicy, allowed: !newPolicy.allowed})}
                  style={{
                    position: 'relative',
                    width: '48px',
                    height: '24px',
                    borderRadius: '12px',
                    background: newPolicy.allowed ? '#10b981' : '#ef4444',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    left: newPolicy.allowed ? '26px' : '2px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'white',
                    transition: 'left 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={savePolicy}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'white',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                  }}
                >
                  Save Policy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
