import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { isAuthenticated } from './utils/api'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Agents from './pages/Agents'
import Screenshots from './pages/Screenshots'
import Activity from './pages/Activity'
import Keystrokes from './pages/Keystrokes'
import Clipboard from './pages/Clipboard'
import WebHistory from './pages/WebHistory'
import Files from './pages/Files'
import PrintJobs from './pages/PrintJobs'
import USB from './pages/USB'
import AppBlocker from './pages/AppBlocker'
import WebBlocker from './pages/WebBlocker'
import Logins from './pages/Logins'
import TimeTrack from './pages/TimeTrack'
import Communications from './pages/Communications'
import Productivity from './pages/Productivity'
import Alerts from './pages/Alerts'
import DLP from './pages/DLP'
import Emails from './pages/Emails'
import Network from './pages/Network'
import AppInstalls from './pages/AppInstalls'
import Attendance from './pages/Attendance'
import Reports from './pages/Reports'
import LiveView from './pages/LiveView'
import Settings from './pages/Settings'
import AuditLog from './pages/AuditLog'

function RequireAuth({ children }) {
  const location = useLocation()
  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="agents" element={<Agents />} />
        <Route path="screenshots" element={<Screenshots />} />
        <Route path="activity" element={<Activity />} />
        <Route path="keystrokes" element={<Keystrokes />} />
        <Route path="clipboard" element={<Clipboard />} />
        <Route path="web-history" element={<WebHistory />} />
        <Route path="files" element={<Files />} />
        <Route path="print-jobs" element={<PrintJobs />} />
        <Route path="usb" element={<USB />} />
        <Route path="app-blocker" element={<AppBlocker />} />
        <Route path="web-blocker" element={<WebBlocker />} />
        <Route path="logins" element={<Logins />} />
        <Route path="time-track" element={<TimeTrack />} />
        <Route path="communications" element={<Communications />} />
        <Route path="productivity" element={<Productivity />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="dlp" element={<DLP />} />
        <Route path="emails" element={<Emails />} />
        <Route path="network" element={<Network />} />
        <Route path="app-installs" element={<AppInstalls />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="reports" element={<Reports />} />
        <Route path="live-view" element={<LiveView />} />
        <Route path="settings" element={<Settings />} />
        <Route path="audit-log" element={<AuditLog />} />
      </Route>
    </Routes>
  )
}
