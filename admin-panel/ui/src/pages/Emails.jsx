import { useState, useEffect, useMemo } from 'react'
import { Mail, Paperclip, Users, Zap, Search, Calendar, Download, RefreshCw, Clock, User } from 'lucide-react'
import { BarChart } from '@tremor/react'
import Pagination from '../components/Pagination'
import ExportButton from '../components/ExportButton'

export default function Emails() {
  const [emails, setEmails] = useState([])
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [stats, setStats] = useState({
    total: 0,
    withAttachments: 0,
    uniqueSenders: 0
  })

  useEffect(() => {
    fetchAgents()
  }, [])

  useEffect(() => {
    fetchEmails()
  }, [selectedAgent])

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.data_type === 'emails') {
        setSyncing(false)
        fetchEmails()
      }
    }
    window.addEventListener('data_sync_complete', handler)
    return () => window.removeEventListener('data_sync_complete', handler)
  }, [selectedAgent])

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents')
      setAgents(await response.json())
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const fetchEmails = async () => {
    try {
      setLoading(true)
      let url = '/api/monitoring/emails?limit=100'
      if (selectedAgent) url += `&agent_id=${selectedAgent}`
      const response = await fetch(url)
      const data = await response.json()
      setEmails(data)
      processData(data)
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const processData = (data) => {
    const total = data.length
    const withAttachments = data.filter(e => e.has_attachments || (e.attachment_count && e.attachment_count > 0)).length
    const senders = new Set(data.map(e => e.sender).filter(Boolean))

    setStats({
      total,
      withAttachments,
      uniqueSenders: senders.size
    })
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const emailsPerDayChartData = useMemo(() => {
    const now = new Date()
    const last7Days = []

    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      last7Days.push({ date: dateStr, Emails: 0 })
    }

    // Count emails per day
    emails.forEach(e => {
      const timestamp = e.received_at || e.sent_at || e.created_at
      if (timestamp) {
        const emailDate = new Date(timestamp).toISOString().split('T')[0]
        const dayData = last7Days.find(d => d.date === emailDate)
        if (dayData) {
          dayData.Emails++
        }
      }
    })

    return last7Days.map(d => ({
      day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      Emails: d.Emails
    }))
  }, [emails])

  const filteredEmails = emails.filter(e => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      (e.subject && e.subject.toLowerCase().includes(query)) ||
      (e.sender && e.sender.toLowerCase().includes(query)) ||
      (e.recipients && e.recipients.toLowerCase().includes(query)) ||
      (e.folder && e.folder.toLowerCase().includes(query))
    )
  })

  const requestLatest = () => {
    if (!selectedAgent || !window.ws) return
    setSyncing(true)
    window.ws.send(JSON.stringify({ type: 'request_data_sync', agent_id: selectedAgent, data_type: 'emails' }))
    setTimeout(() => setSyncing(false), 15000)
  }

  const exportToCSV = () => {
    if (!filteredEmails.length) return
    const headers = ['Time', 'Agent', 'Subject', 'Sender', 'Recipients', 'Folder', 'Attachments']
    const rows = filteredEmails.map(e => [
      formatDate(e.received_at || e.sent_at || e.created_at),
      e.employee_name || e.pc_name || 'Unknown',
      (e.subject || '').replace(/,/g, ';'),
      (e.sender || '').replace(/,/g, ';'),
      (e.recipients || '').replace(/,/g, ';'),
      e.folder || 'Unknown',
      e.attachment_count || 0
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `emails_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

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
          Emails Per Day
        </h3>
        <BarChart
          data={emailsPerDayChartData}
          index="day"
          categories={["Emails"]}
          colors={["blue"]}
          className="h-52"
        />
      </div>

      {/* ==================== STATS CARDS ==================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px'
      }}>
        {/* Total Emails */}
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
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)',
            flexShrink: 0
          }}>
            <Mail style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Emails</p>
            <p style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{stats.total.toLocaleString()}</p>
          </div>
        </div>

        {/* With Attachments */}
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
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
            flexShrink: 0
          }}>
            <Paperclip style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>With Attachments</p>
            <p style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{stats.withAttachments.toLocaleString()}</p>
          </div>
        </div>

        {/* Unique Senders */}
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
            <Users style={{ width: '22px', height: '22px', color: '#ffffff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unique Senders</p>
            <p style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{stats.uniqueSenders.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* ==================== EMAIL TABLE ==================== */}
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
              placeholder="Search emails..."
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
              {syncing ? (
                <RefreshCw style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} />
              ) : (
                <Zap style={{ width: '15px', height: '15px' }} />
              )}
              {syncing ? 'Syncing...' : 'Request Latest'}
            </button>
            <button
              onClick={fetchEmails}
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
              data={filteredEmails}
              filename="emails"
              columns={[
                { key: 'received_at', label: 'Time' },
                { key: 'sender', label: 'Sender' },
                { key: 'recipients', label: 'To' },
                { key: 'subject', label: 'Subject' },
                { key: 'folder', label: 'Folder' },
              ]}
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
            <Mail style={{ width: '16px', height: '16px', color: '#64748b' }} />
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>Email Records</span>
          </div>
          <div style={{
            padding: '6px 12px',
            background: '#f1f5f9',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#475569'
          }}>
            {filteredEmails.length} email{filteredEmails.length !== 1 ? 's' : ''}
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
                borderTopColor: '#6366f1',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ marginTop: '16px', fontSize: '14px', color: '#64748b' }}>Loading emails...</p>
            </div>
          ) : filteredEmails.length === 0 ? (
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
                <Mail style={{ width: '36px', height: '36px', color: '#94a3b8' }} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>No email data</h3>
              <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center', maxWidth: '300px' }}>
                Email data will appear here once captured from connected agents.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Agent</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Subject</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sender</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recipients</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Folder</th>
                    <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Attachments</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmails.slice((currentPage - 1) * 50, currentPage * 50).map((email, index) => {
                    const attachmentCount = email.attachment_count || 0
                    const hasAttachments = email.has_attachments || attachmentCount > 0

                    return (
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
                              {formatDate(email.received_at || email.sent_at || email.created_at)}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <User style={{ width: '14px', height: '14px', color: '#ffffff' }} />
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>
                              {email.employee_name || email.pc_name || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', maxWidth: '300px' }}>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: 500,
                            color: '#1e293b',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {email.subject || '(No subject)'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', maxWidth: '200px' }}>
                          <span style={{
                            fontSize: '13px',
                            color: '#64748b',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {email.sender || '-'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', maxWidth: '200px' }}>
                          <span style={{
                            fontSize: '13px',
                            color: '#64748b',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {email.recipients || '-'}
                          </span>
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
                            <Calendar style={{ width: '12px', height: '12px', color: '#7c3aed' }} />
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#6d28d9' }}>
                              {email.folder || 'Inbox'}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 24px' }}>
                          {hasAttachments ? (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                              borderRadius: '20px',
                              border: '1px solid #fcd34d'
                            }}>
                              <Paperclip style={{ width: '12px', height: '12px', color: '#92400e' }} />
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#92400e' }}>
                                {attachmentCount}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '13px', color: '#94a3b8' }}>-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && filteredEmails.length > 0 && (
          <Pagination
            totalItems={filteredEmails.length}
            itemsPerPage={50}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
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
