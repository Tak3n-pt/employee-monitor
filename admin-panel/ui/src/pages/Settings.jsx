import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Save, Server, Database, Bell, Shield, Clock, RefreshCw, Globe } from 'lucide-react'
import { apiFetch } from '../utils/api'
import { useTranslation } from 'react-i18next'
import { languageOptions } from '../i18n'

export default function Settings() {
  const { t, i18n } = useTranslation()
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await apiFetch('/api/settings')
      const data = await res.json()
      setSettings(data)
    } catch (e) {
      console.error('Error fetching settings:', e)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      // Show notification
      if (window.showNotification) {
        window.showNotification(t('settings.saved') || 'Settings saved!', 'success')
      }
    } catch (e) {
      console.error('Error saving settings:', e)
      if (window.showNotification) {
        window.showNotification('Failed to save settings', 'error')
      }
    }
    setSaving(false)
  }

  const update = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const Section = ({ icon: Icon, title, children }) => (
    <div style={{
      background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden',
    }}>
      <div style={{
        padding: '20px 24px', borderBottom: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} style={{ color: '#fff' }} />
        </div>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>{title}</h3>
      </div>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {children}
      </div>
    </div>
  )

  const Field = ({ label, type = 'text', value, onChange, placeholder }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
      <label style={{ fontSize: '14px', fontWeight: 500, color: '#334155', minWidth: '180px' }}>{label}</label>
      {type === 'toggle' ? (
        <button
          onClick={() => onChange(!value)}
          style={{
            width: '44px', height: '24px', borderRadius: '12px', border: 'none',
            background: value ? '#3b82f6' : '#cbd5e1', cursor: 'pointer',
            position: 'relative', transition: 'background 0.2s',
          }}
        >
          <div style={{
            width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
            position: 'absolute', top: '2px', left: value ? '22px' : '2px',
            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </button>
      ) : type === 'select' ? (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          style={{
            height: '40px', padding: '0 12px', background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: '10px', fontSize: '14px', color: '#334155', flex: 1, maxWidth: '300px',
            outline: 'none',
          }}
        >
          {placeholder}
        </select>
      ) : (
        <input
          type={type}
          value={value ?? ''}
          onChange={(e) => onChange(type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)}
          placeholder={placeholder}
          style={{
            height: '40px', padding: '0 12px', background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: '10px', fontSize: '14px', color: '#334155', flex: 1, maxWidth: '300px',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      )}
    </div>
  )

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <RefreshCw style={{ animation: 'spin 1s linear infinite', color: '#64748b' }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <SettingsIcon size={22} style={{ color: '#64748b' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Settings</h2>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', borderRadius: '10px', border: 'none',
            background: saved ? '#10b981' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
            color: '#fff', fontSize: '14px', fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
          }}
        >
          <Save size={16} />
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <Section icon={Server} title={t('settings.general')}>
        <Field label={t('settings.appName')} value={settings.app_name} onChange={(v) => update('app_name', v)} />
        <Field label={t('settings.timezone')} value={settings.timezone} onChange={(v) => update('timezone', v)} />
      </Section>

      <Section icon={Globe} title={t('settings.language')}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <label style={{ fontSize: '14px', fontWeight: 500, color: '#334155', minWidth: '180px' }}>{t('settings.selectLanguage')}</label>
          <select
            value={i18n.language}
            onChange={(e) => {
              i18n.changeLanguage(e.target.value)
              localStorage.setItem('language', e.target.value)
            }}
            style={{
              height: '40px', padding: '0 12px', background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: '10px', fontSize: '14px', color: '#334155', flex: 1, maxWidth: '300px',
              outline: 'none',
            }}
          >
            {languageOptions.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeName} ({lang.name})
              </option>
            ))}
          </select>
        </div>
      </Section>

      <Section icon={Clock} title="Monitoring">
        <Field label="Screenshot Interval (seconds)" type="number" value={settings.screenshot_interval} onChange={(v) => update('screenshot_interval', v)} />
        <Field label="Data Sync Interval (seconds)" type="number" value={settings.data_sync_interval} onChange={(v) => update('data_sync_interval', v)} />
      </Section>

      <Section icon={Database} title="Data Retention">
        <Field label="Auto-delete after (days)" type="number" value={settings.retention_days} onChange={(v) => update('retention_days', v)} />
        <p style={{ fontSize: '12px', color: '#94a3b8' }}>Data older than this will be automatically deleted. Set to 0 to disable.</p>
      </Section>

      <Section icon={Bell} title="Notifications">
        <Field label="Email Alerts" type="toggle" value={settings.email_alerts_enabled} onChange={(v) => update('email_alerts_enabled', v)} />
        <Field label="SMTP Host" value={settings.smtp_host} onChange={(v) => update('smtp_host', v)} placeholder="smtp.example.com" />
        <Field label="SMTP Port" type="number" value={settings.smtp_port} onChange={(v) => update('smtp_port', v)} />
        <Field label="SMTP Username" value={settings.smtp_user} onChange={(v) => update('smtp_user', v)} />
        <Field label="SMTP Password" type="password" value={settings.smtp_pass} onChange={(v) => update('smtp_pass', v)} />
      </Section>

      <Section icon={Shield} title="Security">
        <Field label="Min Password Length" type="number" value={settings.password_min_length} onChange={(v) => update('password_min_length', v)} />
        <Field label="Session Timeout (minutes)" type="number" value={settings.session_timeout} onChange={(v) => update('session_timeout', v)} />
      </Section>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
