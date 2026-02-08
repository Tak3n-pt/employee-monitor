import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback, useRef } from 'react'
import { getToken, getUser, logout, apiFetch } from '../utils/api'
import {
  LayoutDashboard,
  Users,
  Camera,
  Activity,
  Keyboard,
  Clipboard,
  Globe,
  FolderOpen,
  Printer,
  Usb,
  AppWindow,
  Ban,
  LogIn,
  Clock,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  Shield,
  Bell,
  Search,
  Settings,
  Mail,
  Wifi,
  Package,
  CalendarCheck,
  FileText,
  MonitorPlay,
  ScrollText,
  LogOut,
  X,
  ChevronRight,
} from 'lucide-react'

const navigationGroups = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Agents', href: '/agents', icon: Users },
    ]
  },
  {
    label: 'Monitoring',
    items: [
      { name: 'Screenshots', href: '/screenshots', icon: Camera },
      { name: 'Activity', href: '/activity', icon: Activity },
      { name: 'Keystrokes', href: '/keystrokes', icon: Keyboard },
      { name: 'Clipboard', href: '/clipboard', icon: Clipboard },
      { name: 'Web History', href: '/web-history', icon: Globe },
      { name: 'Files', href: '/files', icon: FolderOpen },
      { name: 'Emails', href: '/emails', icon: Mail },
      { name: 'Network', href: '/network', icon: Wifi },
      { name: 'App Installs', href: '/app-installs', icon: Package },
    ]
  },
  {
    label: 'Controls',
    items: [
      { name: 'Print Jobs', href: '/print-jobs', icon: Printer },
      { name: 'Live View', href: '/live-view', icon: MonitorPlay },
      { name: 'USB', href: '/usb', icon: Usb },
      { name: 'App Blocker', href: '/app-blocker', icon: AppWindow },
      { name: 'Web Blocker', href: '/web-blocker', icon: Ban },
    ]
  },
  {
    label: 'Analytics',
    items: [
      { name: 'Logins', href: '/logins', icon: LogIn },
      { name: 'Time Track', href: '/time-track', icon: Clock },
      { name: 'Communications', href: '/communications', icon: MessageSquare },
      { name: 'Productivity', href: '/productivity', icon: TrendingUp },
      { name: 'Attendance', href: '/attendance', icon: CalendarCheck },
      { name: 'Reports', href: '/reports', icon: FileText },
    ]
  },
  {
    label: 'Security',
    items: [
      { name: 'Alerts', href: '/alerts', icon: AlertTriangle, badge: true },
      { name: 'DLP', href: '/dlp', icon: Shield, badge: true },
    ]
  },
  {
    label: 'System',
    items: [
      { name: 'Settings', href: '/settings', icon: Settings },
      { name: 'Audit Log', href: '/audit-log', icon: ScrollText },
    ]
  },
]

// Flatten for search
const navigation = navigationGroups.flatMap(g => g.items)

// Get page title from path
const getPageTitle = (pathname) => {
  if (pathname === '/') return 'Dashboard'
  const item = navigation.find(n => n.href === pathname)
  return item?.name || 'Employee Monitor'
}

export default function Layout() {
  const [connected, setConnected] = useState(false)
  const [alertCount, setAlertCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [recentAlerts, setRecentAlerts] = useState([])
  const [showBellDropdown, setShowBellDropdown] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const searchRef = useRef(null)
  const bellRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const user = getUser()

  const showNotification = useCallback((message, type = 'info') => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 4000)
  }, [])

  useEffect(() => {
    const token = getToken()
    const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`)

    ws.onopen = () => {
      setConnected(true)
      ws.send(JSON.stringify({ type: 'admin_connect', token }))
    }

    ws.onclose = () => {
      setConnected(false)
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'alert') {
        setAlertCount(prev => prev + 1)
        setRecentAlerts(prev => [data.alert || data, ...prev].slice(0, 10))
        // Show notification for critical/high alerts
        const alert = data.alert || data
        if (alert.severity === 'critical' || alert.severity === 'high') {
          showNotification(`${alert.severity.toUpperCase()}: ${alert.rule_name || 'Alert triggered'}`, 'error')
        }
      } else if (data.type === 'screenshot_requested') {
        showNotification('Screenshot requested - waiting for agent...', 'info')
      } else if (data.type === 'screenshot_ready') {
        showNotification('Screenshot captured successfully!', 'success')
        window.dispatchEvent(new CustomEvent('screenshot_ready', { detail: data }))
      } else if (data.type === 'data_sync_complete') {
        showNotification(`Data sync complete: ${data.data_type}`, 'success')
        window.dispatchEvent(new CustomEvent('data_sync_complete', { detail: data }))
      } else if (data.type === 'screen_frame') {
        window.dispatchEvent(new CustomEvent('screen_frame', { detail: data }))
      } else if (data.type === 'error') {
        showNotification(data.message || 'An error occurred', 'error')
        window.dispatchEvent(new CustomEvent('ws_error', { detail: data }))
      } else if (data.type === 'agent_connected') {
        showNotification(`Agent connected: ${data.agent_id?.substring(0, 8)}...`, 'success')
        window.dispatchEvent(new CustomEvent('agent_status_changed', { detail: { ...data, status: 'online' } }))
      } else if (data.type === 'agent_disconnected') {
        showNotification(`Agent disconnected: ${data.agent_id?.substring(0, 8)}...`, 'warning')
        window.dispatchEvent(new CustomEvent('agent_status_changed', { detail: { ...data, status: 'offline' } }))
      } else if (data.type === 'command_sent') {
        showNotification(`Command "${data.command}" sent to agent`, 'info')
      } else if (data.type === 'command_response') {
        if (data.status === 'success' || data.status === 'displayed' || data.status === 'restarting') {
          showNotification(`Command "${data.command}" executed successfully`, 'success')
        } else if (data.status === 'error') {
          showNotification(`Command "${data.command}" failed: ${data.error || 'Unknown error'}`, 'error')
        }
      } else if (data.type === 'system_info_response') {
        window.dispatchEvent(new CustomEvent('system_info_response', { detail: data }))
      } else if (data.type === 'report_ready') {
        showNotification(`Report "${data.name || 'Report'}" is ready for download`, 'success')
      }
    }

    window.ws = ws
    window.showNotification = showNotification
    return () => ws.close()
  }, [])

  // Global search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults(null)
      setShowSearchResults(false)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=5`)
        const data = await res.json()
        setSearchResults(data.results)
        setShowSearchResults(true)
      } catch (e) {
        // ignore
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Close dropdowns on click outside
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearchResults(false)
      if (bellRef.current && !bellRef.current.contains(e.target)) setShowBellDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const navigateToResult = (type, item) => {
    setShowSearchResults(false)
    setSearchQuery('')
    const routes = {
      agents: '/agents',
      activities: '/activity',
      web_history: '/web-history',
      files: '/files',
      alerts: '/alerts',
      emails: '/emails',
    }
    navigate(routes[type] || '/')
  }

  const resultLabels = {
    agents: 'Agents',
    activities: 'Activities',
    web_history: 'Web History',
    files: 'Files',
    alerts: 'Alerts',
    emails: 'Emails',
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar - Merged with navbar visually */}
      <aside className="w-[240px] flex flex-col bg-white/80 backdrop-blur-xl border-r border-slate-200 flex-shrink-0">

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-4 pb-4 space-y-4 overflow-hidden">
          {navigationGroups.map((group, index) => (
            <div key={group.label}>
              {/* Group divider line (except first) */}
              {index > 0 && (
                <div className="mx-3 mb-3 h-px bg-slate-200/80"></div>
              )}
              <p className="px-3 mb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) =>
                      `relative flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 group ${
                        isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active indicator */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-blue-600 rounded-full"></div>
                        )}
                        {/* Icon */}
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200 ${
                          isActive
                            ? 'bg-blue-100'
                            : 'bg-transparent group-hover:bg-slate-200/50'
                        }`}>
                          <item.icon size={16} strokeWidth={isActive ? 2.5 : 2} className={`transition-all duration-200 ${
                            isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                          }`} />
                        </div>
                        <span className={`flex-1 text-[13px] transition-all duration-200 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                          {item.name}
                        </span>
                        {item.badge && alertCount > 0 && (
                          <span className="min-w-[20px] h-[20px] flex items-center justify-center px-1.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                            {alertCount > 99 ? '99+' : alertCount}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header - unified with sidebar */}
        <header className="h-16 bg-white/80 backdrop-blur-xl flex items-center flex-shrink-0" style={{ padding: '0 24px' }}>
          {/* Left: Page Title - 200px fixed */}
          <div className="flex items-center gap-3" style={{ width: '200px', flexShrink: 0 }}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="8" height="8" rx="2" fill="white"/>
                <rect x="13" y="3" width="8" height="5" rx="1.5" fill="white" fillOpacity="0.7"/>
                <rect x="13" y="10" width="8" height="11" rx="2" fill="white" fillOpacity="0.85"/>
                <rect x="3" y="13" width="8" height="8" rx="2" fill="white" fillOpacity="0.7"/>
              </svg>
            </div>
            <h1 className="text-base font-semibold text-gray-900">{getPageTitle(location.pathname)}</h1>
          </div>

          {/* Center: Search - flexible */}
          <div className="flex-1 flex justify-center" style={{ margin: '0 20px' }} ref={searchRef}>
            <div className="relative" style={{ width: '100%', maxWidth: '320px' }}>
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search agents, activities, alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults && setShowSearchResults(true)}
                style={{ paddingLeft: '40px' }}
                className="w-full h-9 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              />
              {/* Search Results Dropdown */}
              {showSearchResults && searchResults && Object.keys(searchResults).length > 0 && (
                <div style={{
                  position: 'absolute', top: '44px', left: 0, right: 0,
                  background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.12)', zIndex: 100,
                  maxHeight: '400px', overflow: 'auto', padding: '8px',
                }}>
                  {Object.entries(searchResults).map(([type, items]) => (
                    <div key={type}>
                      <p style={{
                        fontSize: '11px', fontWeight: 600, color: '#94a3b8',
                        textTransform: 'uppercase', padding: '8px 12px 4px', letterSpacing: '0.5px',
                      }}>
                        {resultLabels[type] || type}
                      </p>
                      {items.slice(0, 3).map((item, i) => (
                        <button
                          key={i}
                          onClick={() => navigateToResult(type, item)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            width: '100%', padding: '8px 12px', borderRadius: '8px',
                            border: 'none', background: 'transparent', cursor: 'pointer',
                            textAlign: 'left', fontSize: '13px', color: '#1e293b',
                          }}
                          onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                          onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.employee_name || item.pc_name || item.app_name || item.window_title || item.url || item.title || item.filename || item.rule_name || item.subject || item.sender || 'Unknown'}
                          </span>
                          <ChevronRight size={14} style={{ color: '#cbd5e1', flexShrink: 0 }} />
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Actions + Admin - 240px fixed */}
          <div className="flex items-center justify-end gap-2" style={{ width: '240px', flexShrink: 0 }}>
            {/* Notification Bell */}
            <div style={{ position: 'relative' }} ref={bellRef}>
              <button
                onClick={() => setShowBellDropdown(!showBellDropdown)}
                className="relative w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Bell size={18} />
                {alertCount > 0 && (
                  <span className="absolute top-0 right-0 min-w-[16px] h-[16px] flex items-center justify-center px-1 bg-red-500 text-white text-[9px] font-bold rounded-full">
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
              </button>

              {/* Bell Dropdown */}
              {showBellDropdown && (
                <div style={{
                  position: 'absolute', top: '44px', right: 0, width: '320px',
                  background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.12)', zIndex: 100, overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '12px 16px', borderBottom: '1px solid #f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Notifications</span>
                    {alertCount > 0 && (
                      <button
                        onClick={() => { setAlertCount(0); setRecentAlerts([]) }}
                        style={{
                          fontSize: '12px', color: '#3b82f6', background: 'none', border: 'none',
                          cursor: 'pointer', fontWeight: 500,
                        }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                    {recentAlerts.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                        <Bell size={32} style={{ color: '#e2e8f0', margin: '0 auto 8px' }} />
                        <p style={{ fontSize: '13px', color: '#94a3b8' }}>No new notifications</p>
                      </div>
                    ) : (
                      recentAlerts.map((alert, i) => (
                        <div
                          key={i}
                          onClick={() => { setShowBellDropdown(false); navigate('/alerts') }}
                          style={{
                            padding: '12px 16px', borderBottom: '1px solid #f8fafc',
                            cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '10px',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{
                            width: '8px', height: '8px', borderRadius: '50%', marginTop: '5px', flexShrink: 0,
                            background: alert.severity === 'critical' ? '#ef4444' : alert.severity === 'high' ? '#f59e0b' : '#3b82f6',
                          }} />
                          <div>
                            <p style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>
                              {alert.rule_name || alert.type || 'Alert'}
                            </p>
                            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                              {alert.description?.substring(0, 60) || 'Security alert triggered'}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div
                    onClick={() => { setShowBellDropdown(false); navigate('/alerts') }}
                    style={{
                      padding: '10px 16px', borderTop: '1px solid #f1f5f9',
                      textAlign: 'center', fontSize: '13px', fontWeight: 500,
                      color: '#3b82f6', cursor: 'pointer',
                    }}
                  >
                    View all alerts
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <button
              onClick={() => navigate('/settings')}
              className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Settings size={18} />
            </button>

            <div className="w-px h-6 bg-slate-200 mx-1" />

            {/* Admin Profile + Logout */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md relative">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" fill="white"/>
                  <path d="M5 20C5 17 8 15 12 15C16 15 19 17 19 20V21H5V20Z" fill="white" fillOpacity="0.9"/>
                </svg>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                <span className="text-sm font-medium text-gray-900">{user?.name || 'Admin'}</span>
                <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'capitalize' }}>{user?.role || 'admin'}</span>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors ml-1"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>

      {/* Toast Notifications */}
      {notifications.length > 0 && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '360px' }}>
          {notifications.map(n => (
            <div
              key={n.id}
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                backgroundColor: n.type === 'success' ? '#ecfdf5' : n.type === 'error' ? '#fef2f2' : n.type === 'warning' ? '#fffbeb' : '#eff6ff',
                border: `1px solid ${n.type === 'success' ? '#a7f3d0' : n.type === 'error' ? '#fecaca' : n.type === 'warning' ? '#fde68a' : '#bfdbfe'}`,
                color: n.type === 'success' ? '#065f46' : n.type === 'error' ? '#991b1b' : n.type === 'warning' ? '#92400e' : '#1e40af',
              }}
            >
              <span style={{ fontSize: '16px', flexShrink: 0 }}>
                {n.type === 'success' ? '\u2713' : n.type === 'error' ? '\u2717' : n.type === 'warning' ? '\u26A0' : '\u2139'}
              </span>
              <span>{n.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
