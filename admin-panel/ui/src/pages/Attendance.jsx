import { useState, useEffect } from 'react'
import { Clock, Timer, CalendarCheck, Edit2, Save, RefreshCw, User, Zap } from 'lucide-react'

export default function Attendance() {
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [attendance, setAttendance] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    fetchAgents()
  }, [])

  useEffect(() => {
    if (selectedAgent) {
      fetchAttendance()
      fetchSchedule()
    }
  }, [selectedAgent])

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents')
      const data = await response.json()
      setAgents(data)
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    }
  }

  const fetchAttendance = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/monitoring/attendance/${selectedAgent}`)
      const data = await response.json()
      setAttendance(data)
    } catch (error) {
      console.error('Failed to fetch attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSchedule = async () => {
    try {
      const response = await fetch(`/api/monitoring/schedule/${selectedAgent}`)
      const data = await response.json()
      setSchedule(data.schedule || getDefaultSchedule())
    } catch (error) {
      console.error('Failed to fetch schedule:', error)
      setSchedule(getDefaultSchedule())
    }
  }

  const getDefaultSchedule = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    return days.map(day => ({
      day,
      start: '09:00',
      end: '17:00',
      enabled: day !== 'Saturday' && day !== 'Sunday'
    }))
  }

  const saveSchedule = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/monitoring/schedule/${selectedAgent}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schedule }),
      })
      if (response.ok) {
        await fetchSchedule()
      }
    } catch (error) {
      console.error('Failed to save schedule:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleScheduleChange = (index, field, value) => {
    const newSchedule = [...schedule]
    newSchedule[index] = { ...newSchedule[index], [field]: value }
    setSchedule(newSchedule)
  }

  const syncAttendance = async () => {
    setSyncing(true)
    try {
      await fetchAttendance()
    } finally {
      setSyncing(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'on_time':
        return '#10b981'
      case 'late':
        return '#f59e0b'
      case 'absent':
        return '#ef4444'
      default:
        return '#6b7280'
    }
  }

  const getStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
      case 'on_time':
        return 'On Time'
      case 'late':
        return 'Late'
      case 'absent':
        return 'Absent'
      default:
        return 'Unknown'
    }
  }

  const formatTime = (time) => {
    if (!time) return '--:--'
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDuration = (hours) => {
    if (hours === null || hours === undefined) return '--'
    return `${hours.toFixed(1)}h`
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
            Attendance Tracking
          </h1>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>Monitor employee attendance and manage work schedules</p>
        </div>
        {selectedAgent && (
          <button
            onClick={syncAttendance}
            disabled={syncing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: syncing ? 'not-allowed' : 'pointer',
              opacity: syncing ? 0.7 : 1,
              transition: 'all 0.2s',
              boxShadow: '0 4px 6px rgba(59, 130, 246, 0.25)',
            }}
          >
            <RefreshCw size={18} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
      </div>

      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        marginBottom: '24px'
      }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
          Select Employee
        </label>
        <div style={{ position: 'relative' }}>
          <User
            size={20}
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6b7280'
            }}
          />
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 48px',
              fontSize: '15px',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              backgroundColor: '#f9fafb',
              color: '#1f2937',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.2s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6'
              e.target.style.backgroundColor = '#ffffff'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e5e7eb'
              e.target.style.backgroundColor = '#f9fafb'
            }}
          >
            <option value="">-- Select an employee --</option>
            {agents.map((agent) => (
              <option key={agent.agent_id} value={agent.agent_id}>
                {agent.name} ({agent.email})
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedAgent ? (
        <div style={{
          background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
          borderRadius: '16px',
          padding: '64px 32px',
          textAlign: 'center',
          border: '2px dashed #d1d5db'
        }}>
          <User size={64} style={{ color: '#9ca3af', margin: '0 auto 24px' }} />
          <h3 style={{ fontSize: '24px', fontWeight: '600', color: '#4b5563', marginBottom: '12px' }}>
            No Employee Selected
          </h3>
          <p style={{ fontSize: '16px', color: '#6b7280' }}>
            Select an employee from the dropdown above to view their attendance and manage schedule
          </p>
        </div>
      ) : loading ? (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '64px 32px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <RefreshCw size={48} style={{ color: '#3b82f6', margin: '0 auto 24px', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: '16px', color: '#6b7280' }}>Loading attendance data...</p>
        </div>
      ) : (
        <>
          {/* Attendance Summary Section */}
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            marginBottom: '32px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
              Attendance Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {/* On Time Card */}
              <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '12px',
                padding: '20px',
                color: 'white',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
              }}>
                <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: '500' }}>On Time</div>
                <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
                  {attendance?.on_time_count || 0}
                </div>
              </div>

              {/* Late Card */}
              <div style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderRadius: '12px',
                padding: '20px',
                color: 'white',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)'
              }}>
                <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: '500' }}>Late</div>
                <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
                  {attendance?.late_count || 0}
                </div>
              </div>

              {/* Absent Card */}
              <div style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                borderRadius: '12px',
                padding: '20px',
                color: 'white',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)'
              }}>
                <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: '500' }}>Absent</div>
                <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
                  {attendance?.absent_count || 0}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              borderRadius: '16px',
              padding: '24px',
              color: 'white',
              boxShadow: '0 4px 6px rgba(59, 130, 246, 0.25)',
              transition: 'transform 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <Clock size={24} />
                <Zap size={20} style={{ opacity: 0.8 }} />
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: '500' }}>Clock In Time</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                {formatTime(attendance?.clock_in)}
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '16px',
              padding: '24px',
              color: 'white',
              boxShadow: '0 4px 6px rgba(16, 185, 129, 0.25)',
              transition: 'transform 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <Timer size={24} />
                <Zap size={20} style={{ opacity: 0.8 }} />
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: '500' }}>Total Hours</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                {formatDuration(attendance?.total_hours)}
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              borderRadius: '16px',
              padding: '24px',
              color: 'white',
              boxShadow: '0 4px 6px rgba(139, 92, 246, 0.25)',
              transition: 'transform 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <CalendarCheck size={24} />
                <Zap size={20} style={{ opacity: 0.8 }} />
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: '500' }}>Status</div>
              <div style={{
                display: 'inline-block',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                backgroundColor: getStatusColor(attendance?.status),
                color: 'white',
              }}>
                {getStatusLabel(attendance?.status)}
              </div>
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <Edit2 size={24} style={{ color: '#3b82f6' }} />
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>Work Schedule</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {schedule.map((item, index) => (
                <div key={item.day} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  backgroundColor: item.enabled ? '#f9fafb' : '#f3f4f6',
                  borderRadius: '12px',
                  border: '2px solid',
                  borderColor: item.enabled ? '#e5e7eb' : '#d1d5db',
                  transition: 'all 0.2s',
                }}>
                  <div style={{
                    minWidth: '120px',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: item.enabled ? '#1f2937' : '#9ca3af'
                  }}>
                    {item.day}
                  </div>

                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(e) => handleScheduleChange(index, 'enabled', e.target.checked)}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      accentColor: '#3b82f6',
                    }}
                  />

                  <input
                    type="time"
                    value={item.start}
                    onChange={(e) => handleScheduleChange(index, 'start', e.target.value)}
                    disabled={!item.enabled}
                    style={{
                      padding: '10px 14px',
                      fontSize: '14px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      backgroundColor: item.enabled ? 'white' : '#f3f4f6',
                      color: item.enabled ? '#1f2937' : '#9ca3af',
                      cursor: item.enabled ? 'text' : 'not-allowed',
                      outline: 'none',
                      transition: 'all 0.2s',
                    }}
                    onFocus={(e) => {
                      if (item.enabled) e.target.style.borderColor = '#3b82f6'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb'
                    }}
                  />

                  <span style={{ color: '#6b7280', fontWeight: '600' }}>-</span>

                  <input
                    type="time"
                    value={item.end}
                    onChange={(e) => handleScheduleChange(index, 'end', e.target.value)}
                    disabled={!item.enabled}
                    style={{
                      padding: '10px 14px',
                      fontSize: '14px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      backgroundColor: item.enabled ? 'white' : '#f3f4f6',
                      color: item.enabled ? '#1f2937' : '#9ca3af',
                      cursor: item.enabled ? 'text' : 'not-allowed',
                      outline: 'none',
                      transition: 'all 0.2s',
                    }}
                    onFocus={(e) => {
                      if (item.enabled) e.target.style.borderColor = '#3b82f6'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb'
                    }}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={saveSchedule}
              disabled={saving}
              style={{
                marginTop: '24px',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '14px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                transition: 'all 0.2s',
                boxShadow: '0 4px 6px rgba(59, 130, 246, 0.25)',
              }}
              onMouseEnter={(e) => {
                if (!saving) e.target.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
              }}
            >
              <Save size={20} />
              {saving ? 'Saving Schedule...' : 'Save Schedule'}
            </button>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
