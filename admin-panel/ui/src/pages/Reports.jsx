import { useState, useEffect } from 'react'
import { FileText, Calendar, Play, Download, RefreshCw, Settings, Zap, Clock, User, FileDown } from 'lucide-react'

export default function Reports() {
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [reportType, setReportType] = useState('daily')
  const [history, setHistory] = useState([])
  const [generatedReport, setGeneratedReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [stats, setStats] = useState({
    generated: 0,
    scheduled: 0
  })

  useEffect(() => {
    fetchAgents()
    fetchHistory()
  }, [])

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents')
      const data = await response.json()
      setAgents(data)
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    }
  }

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/reports/history')
      const data = await response.json()
      setHistory(data)

      // Calculate stats
      const generated = data.filter(r => r.status === 'completed').length
      const scheduled = data.filter(r => r.status === 'pending').length
      setStats({ generated, scheduled })
    } catch (error) {
      console.error('Failed to fetch report history:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async () => {
    if (!selectedAgent || !reportType) {
      alert('Please select both agent and report type')
      return
    }

    setGenerating(true)
    setGeneratedReport(null)
    try {
      const response = await fetch(
        `/api/reports/generate?type=${reportType}&agent_id=${selectedAgent}`
      )
      const data = await response.json()
      setGeneratedReport(data)
      fetchHistory()
      // Show success notification
      if (window.showNotification) {
        window.showNotification(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report generated successfully`, 'success')
      }
    } catch (error) {
      console.error('Failed to generate report:', error)
      if (window.showNotification) {
        window.showNotification('Failed to generate report', 'error')
      }
    } finally {
      setGenerating(false)
    }
  }

  const getReportTypeBadgeColor = (type) => {
    const colors = {
      daily: '#3b82f6',
      weekly: '#8b5cf6',
      monthly: '#ec4899',
      productivity: '#10b981',
      security: '#f59e0b'
    }
    return colors[type] || '#6b7280'
  }

  const getStatusBadgeStyle = (status) => {
    const styles = {
      completed: {
        backgroundColor: '#dcfce7',
        color: '#166534',
        border: '1px solid #86efac'
      },
      pending: {
        backgroundColor: '#fef9c3',
        color: '#854d0e',
        border: '1px solid #fde047'
      },
      failed: {
        backgroundColor: '#fee2e2',
        color: '#991b1b',
        border: '1px solid #fca5a5'
      }
    }
    return styles[status] || styles.pending
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#111827',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <FileText size={32} style={{ color: '#3b82f6' }} />
          Reports
        </h1>
        <p style={{ fontSize: '16px', color: '#6b7280' }}>
          Generate and manage system reports
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Generated Reports */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={24} style={{ color: 'white' }} />
            </div>
            <RefreshCw
              size={20}
              style={{ color: '#9ca3af', cursor: 'pointer' }}
              onClick={fetchHistory}
            />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
            {stats.generated}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Generated Reports</div>
        </div>

        {/* Scheduled Reports */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={24} style={{ color: 'white' }} />
            </div>
            <Calendar size={20} style={{ color: '#9ca3af' }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
            {stats.scheduled}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Scheduled Reports</div>
        </div>
      </div>

      {/* Generate Report Panel */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Play size={20} style={{ color: 'white' }} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>
            Generate Report
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr auto',
          gap: '16px',
          alignItems: 'end'
        }}>
          {/* Agent Selector */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              <User size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              Agent
            </label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              disabled={generating}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#111827',
                backgroundColor: 'white',
                cursor: generating ? 'not-allowed' : 'pointer',
                opacity: generating ? 0.6 : 1
              }}
            >
              <option value="">Select Agent</option>
              {agents.map(agent => (
                <option key={agent._id} value={agent._id}>
                  {agent.name} ({agent.computer_name})
                </option>
              ))}
            </select>
          </div>

          {/* Report Type Selector */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              <Zap size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              disabled={generating}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#111827',
                backgroundColor: 'white',
                cursor: generating ? 'not-allowed' : 'pointer',
                opacity: generating ? 0.6 : 1
              }}
            >
              <option value="daily">Daily Report</option>
              <option value="weekly">Weekly Report</option>
              <option value="monthly">Monthly Report</option>
              <option value="productivity">Productivity Report</option>
              <option value="security">Security Report</option>
            </select>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateReport}
            disabled={generating || !selectedAgent || !reportType}
            style={{
              padding: '12px 32px',
              background: generating || !selectedAgent || !reportType
                ? '#9ca3af'
                : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: generating || !selectedAgent || !reportType ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: generating || !selectedAgent || !reportType
                ? 'none'
                : '0 4px 6px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.3s ease'
            }}
          >
            {generating ? (
              <>
                <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Generating...
              </>
            ) : (
              <>
                <Play size={16} />
                Generate
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Report Display */}
      {generatedReport && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
              Generated Report
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  // Download PDF from API
                  window.open(`/api/reports/pdf?type=${reportType}&agent_id=${selectedAgent}`, '_blank')
                }}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FileDown size={14} />
                PDF
              </button>
              <button
                onClick={() => {
                  const dataStr = JSON.stringify(generatedReport, null, 2)
                  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
                  const exportFileDefaultName = `report_${reportType}_${new Date().toISOString()}.json`
                  const linkElement = document.createElement('a')
                  linkElement.setAttribute('href', dataUri)
                  linkElement.setAttribute('download', exportFileDefaultName)
                  linkElement.click()
                }}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Download size={14} />
                JSON
              </button>
            </div>
          </div>
          <div style={{
            background: '#f9fafb',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #e5e7eb',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            <pre style={{
              margin: 0,
              fontSize: '13px',
              color: '#374151',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}>
              {JSON.stringify(generatedReport, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Report History */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
            Report History
          </h2>
          <button
            onClick={fetchHistory}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: '#3b82f6',
              border: '1px solid #3b82f6',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: loading ? 0.6 : 1
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} />
            <p style={{ marginTop: '12px' }}>Loading history...</p>
          </div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            <FileText size={48} style={{ color: '#d1d5db', display: 'inline-block' }} />
            <p style={{ marginTop: '12px' }}>No reports generated yet</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Time
                  </th>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Type
                  </th>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Agent
                  </th>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((report, index) => (
                  <tr
                    key={index}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '16px', fontSize: '14px', color: '#374151' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={16} style={{ color: '#9ca3af' }} />
                        {new Date(report.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#374151' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: getReportTypeBadgeColor(report.type) + '20',
                        color: getReportTypeBadgeColor(report.type),
                        border: `1px solid ${getReportTypeBadgeColor(report.type)}40`,
                        textTransform: 'capitalize'
                      }}>
                        {report.type}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#374151' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={16} style={{ color: '#9ca3af' }} />
                        {report.agent_name || report.agent_id}
                      </div>
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'capitalize',
                        ...getStatusBadgeStyle(report.status)
                      }}>
                        {report.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  )
}
