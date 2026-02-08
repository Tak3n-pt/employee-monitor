import { useState, useEffect, useRef, useCallback } from 'react'
import { Monitor, Play, Square, Maximize2, Minimize2, Wifi, WifiOff, Zap, Image, ChevronRight, Radio, Settings2, ChevronLeft, RefreshCw, AlertCircle, Loader2 } from 'lucide-react'

export default function LiveView() {
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [frame, setFrame] = useState(null)
  const [frameCount, setFrameCount] = useState(0)
  const [fps, setFps] = useState(2)
  const [quality, setQuality] = useState(50)
  const [connected, setConnected] = useState(false)
  const [streamStopped, setStreamStopped] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [lastFrameTime, setLastFrameTime] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [staleSeconds, setStaleSeconds] = useState(0)

  const containerRef = useRef(null)
  const frameListenerRef = useRef(null)
  const controlsTimeoutRef = useRef(null)
  const lastMouseMoveRef = useRef(0)
  const staleIntervalRef = useRef(null)

  // Fetch agents on mount
  useEffect(() => {
    fetchAgents()
    checkConnection()
    const interval = setInterval(checkConnection, 3000)
    return () => clearInterval(interval)
  }, [])

  // Stale frame detection
  useEffect(() => {
    if (streaming && lastFrameTime) {
      staleIntervalRef.current = setInterval(() => {
        const seconds = Math.floor((Date.now() - lastFrameTime.getTime()) / 1000)
        setStaleSeconds(seconds)
      }, 1000)
    } else {
      setStaleSeconds(0)
    }
    return () => {
      if (staleIntervalRef.current) clearInterval(staleIntervalRef.current)
    }
  }, [streaming, lastFrameTime])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          if (selectedAgent && connected) {
            streaming ? stopStream() : startStream()
          }
          break
        case 'KeyF':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'Escape':
          if (isFullscreen) document.exitFullscreen()
          break
        case 'BracketLeft':
          setSidebarCollapsed(prev => !prev)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedAgent, connected, streaming, isFullscreen])

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents')
      if (response.ok) {
        const data = await response.json()
        setAgents(data)
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    }
  }

  const checkConnection = () => {
    const isConnected = window.ws && window.ws.readyState === WebSocket.OPEN
    setConnected(isConnected)
    if (!isConnected) setError(null)
  }

  const reconnect = () => {
    if (window.initWebSocket) {
      window.initWebSocket()
      setTimeout(checkConnection, 1000)
    }
  }

  useEffect(() => {
    const handleFrameEvent = (e) => {
      if (e.detail?.agent_id === selectedAgent && streaming) {
        const frameData = e.detail.frame || e.detail.image
        if (frameData) {
          setFrame(frameData)
          setFrameCount(c => c + 1)
          setLastFrameTime(new Date())
          setStreamStopped(false)
          setIsLoading(false)
          setError(null)
        }
      }
    }

    frameListenerRef.current = handleFrameEvent
    window.addEventListener('screen_frame', handleFrameEvent)

    return () => {
      if (frameListenerRef.current) {
        window.removeEventListener('screen_frame', frameListenerRef.current)
      }
    }
  }, [selectedAgent, streaming])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const startStream = useCallback(() => {
    if (!selectedAgent || !window.ws || window.ws.readyState !== WebSocket.OPEN) {
      setError('Cannot start stream: No connection')
      return
    }
    setStreaming(true)
    setFrameCount(0)
    setStreamStopped(false)
    setIsLoading(true)
    setError(null)

    // Timeout for loading state
    setTimeout(() => {
      if (frameCount === 0 && streaming) {
        setError('No frames received. Agent may be offline.')
        setIsLoading(false)
      }
    }, 10000)

    window.ws.send(JSON.stringify({
      type: 'start_screen_stream',
      agent_id: selectedAgent,
      fps: fps,
      quality: quality
    }))
  }, [selectedAgent, fps, quality, frameCount, streaming])

  const stopStream = useCallback(() => {
    if (!selectedAgent || !window.ws) return
    setStreaming(false)
    setStreamStopped(true)
    setIsLoading(false)
    window.ws.send(JSON.stringify({
      type: 'stop_screen_stream',
      agent_id: selectedAgent
    }))
  }, [selectedAgent])

  const handleAgentSelect = (agentId) => {
    if (streaming) stopStream()
    setSelectedAgent(agentId)
    setFrame(null)
    setFrameCount(0)
    setStreamStopped(false)
    setError(null)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  // Throttled mouse move handler
  const handleMouseMove = useCallback(() => {
    const now = Date.now()
    if (now - lastMouseMoveRef.current < 100) return
    lastMouseMoveRef.current = now

    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    if (streaming && frame) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000)
    }
  }, [streaming, frame])

  const selectedAgentData = agents.find(a => a.id === selectedAgent)
  const onlineAgents = agents.filter(a => a.status === 'online')
  const sidebarWidth = sidebarCollapsed ? 60 : 280

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      role="application"
      aria-label="Live View Screen Monitoring"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated Background */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div className="floating-orb orb-1" />
        <div className="floating-orb orb-2" />
      </div>

      {/* Left Sidebar */}
      <aside
        role="complementary"
        aria-label="Agent selection sidebar"
        style={{
          width: `${sidebarWidth}px`,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(148, 163, 184, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isFullscreen && !showControls ? 'translateX(-100%)' : 'translateX(0)',
        }}
      >
        {/* Sidebar Header */}
        <div style={{
          padding: sidebarCollapsed ? '20px 10px' : '20px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'space-between',
        }}>
          {!sidebarCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="icon-box gradient-primary">
                <Monitor size={18} color="white" />
              </div>
              <div>
                <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'white', margin: 0 }}>Live View</h1>
                <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Real-time monitoring</p>
              </div>
            </div>
          )}

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="icon-button"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title="Toggle sidebar [ ]"
          >
            <ChevronLeft size={16} style={{
              transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.3s ease'
            }} />
          </button>
        </div>

        {/* Connection Status */}
        <div style={{
          padding: sidebarCollapsed ? '12px 8px' : '16px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
        }}>
          <div
            className={`status-card ${connected ? 'status-connected' : 'status-disconnected'}`}
            style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
          >
            {connected ? (
              <Wifi size={18} className="status-icon-connected" />
            ) : (
              <WifiOff size={18} className="status-icon-disconnected" />
            )}
            {!sidebarCollapsed && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: connected ? '#22c55e' : '#ef4444' }}>
                  {connected ? 'Connected' : 'Disconnected'}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {connected ? 'WebSocket active' : 'Connection lost'}
                </div>
              </div>
            )}
            {!connected && !sidebarCollapsed && (
              <button
                onClick={reconnect}
                className="icon-button-small"
                aria-label="Reconnect"
                title="Reconnect"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Agent List */}
        {!sidebarCollapsed && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }} role="listbox" aria-label="Available agents">
            <div className="section-label">
              Agents ({onlineAgents.length} online)
            </div>

            {agents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Monitor size={32} style={{ color: '#475569', marginBottom: '12px' }} />
                <p style={{ fontSize: '13px', color: '#64748b' }}>No agents available</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {agents.map(agent => {
                  const isSelected = selectedAgent === agent.id
                  const isOnline = agent.status === 'online'
                  return (
                    <button
                      key={agent.id}
                      onClick={() => handleAgentSelect(agent.id)}
                      disabled={streaming}
                      role="option"
                      aria-selected={isSelected}
                      className={`agent-card ${isSelected ? 'agent-selected' : ''} ${streaming && !isSelected ? 'agent-disabled' : ''}`}
                    >
                      <div className={`status-dot ${isOnline ? 'status-dot-online' : 'status-dot-offline'}`} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="agent-name">
                          {agent.employee_name || agent.pc_name || 'Unknown'}
                        </div>
                        <div className="agent-pc">
                          {agent.pc_name}
                        </div>
                      </div>
                      {isSelected && <ChevronRight size={16} style={{ color: '#818cf8' }} />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Collapsed Agent Icons */}
        {sidebarCollapsed && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
            {agents.map(agent => {
              const isSelected = selectedAgent === agent.id
              const isOnline = agent.status === 'online'
              return (
                <button
                  key={agent.id}
                  onClick={() => handleAgentSelect(agent.id)}
                  disabled={streaming}
                  className={`agent-icon ${isSelected ? 'agent-icon-selected' : ''}`}
                  title={agent.employee_name || agent.pc_name}
                  aria-label={`Select ${agent.employee_name || agent.pc_name}`}
                >
                  <div className={`status-dot-small ${isOnline ? 'status-dot-online' : 'status-dot-offline'}`} />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: isSelected ? '#a5b4fc' : '#94a3b8' }}>
                    {(agent.employee_name || agent.pc_name || 'U').charAt(0).toUpperCase()}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Stream Settings */}
        {!sidebarCollapsed && (
          <div style={{
            padding: '16px',
            borderTop: '1px solid rgba(148, 163, 184, 0.1)',
            background: 'rgba(15, 23, 42, 0.5)',
          }}>
            <div className="section-label" style={{ marginBottom: '14px' }}>
              <Settings2 size={12} style={{ marginRight: '6px' }} />
              Stream Settings
            </div>

            {/* FPS Control */}
            <div style={{ marginBottom: '14px' }}>
              <div className="slider-header">
                <span>Frame Rate</span>
                <span className="slider-value">{fps} FPS</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                disabled={streaming}
                className="custom-slider"
                aria-label="Frame rate"
              />
            </div>

            {/* Quality Control */}
            <div>
              <div className="slider-header">
                <span>Quality</span>
                <span className="slider-value">{quality}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="10"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                disabled={streaming}
                className="custom-slider"
                aria-label="Stream quality"
              />
            </div>

            {/* Keyboard Shortcuts */}
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
              <div className="shortcut-row">
                <kbd>Space</kbd>
                <span>Toggle stream</span>
              </div>
              <div className="shortcut-row">
                <kbd>F</kbd>
                <span>Fullscreen</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>

        {/* Top Control Bar */}
        <header
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, transparent 100%)',
            zIndex: 20,
            transition: 'opacity 0.3s ease',
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? 'auto' : 'none',
          }}
        >
          {/* Left - Agent Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {selectedAgentData && (
              <div className="info-chip">
                <div className={`status-dot-small ${selectedAgentData.status === 'online' ? 'status-dot-online' : 'status-dot-offline'}`} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>
                  {selectedAgentData.employee_name || selectedAgentData.pc_name}
                </span>
              </div>
            )}

            {streaming && (
              <div className="live-badge">
                <Radio size={12} className="live-icon" />
                <span>LIVE</span>
              </div>
            )}

            {streaming && staleSeconds > 5 && (
              <div className="warning-chip">
                <AlertCircle size={12} />
                <span>No frames for {staleSeconds}s</span>
              </div>
            )}
          </div>

          {/* Right - Stats & Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {streaming && !isLoading && (
              <>
                <div className="stat-chip">
                  <Image size={12} style={{ color: '#a5b4fc' }} />
                  <span>{frameCount}</span>
                </div>
                <div className="stat-chip">
                  <Zap size={12} style={{ color: '#fbbf24' }} />
                  <span>{fps} FPS</span>
                </div>
              </>
            )}

            <button
              onClick={toggleFullscreen}
              className="icon-button"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title="Fullscreen (F)"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </header>

        {/* Stream Display Area */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '70px 32px 100px',
        }}>
          {/* Loading State */}
          {isLoading && !frame && (
            <div className="empty-state">
              <div className="loading-spinner">
                <Loader2 size={40} className="spin" />
              </div>
              <h2 className="empty-title">Connecting to Stream...</h2>
              <p className="empty-description">
                Waiting for frames from {selectedAgentData?.employee_name || selectedAgentData?.pc_name}
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !frame && !isLoading && (
            <div className="empty-state">
              <div className="error-icon-box">
                <AlertCircle size={40} style={{ color: '#f87171' }} />
              </div>
              <h2 className="empty-title">Stream Error</h2>
              <p className="empty-description">{error}</p>
              <button onClick={startStream} className="primary-button">
                <RefreshCw size={18} />
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!frame && !isLoading && !error && (
            <div className="empty-state">
              <div className="empty-icon-box">
                <Monitor size={44} style={{ color: '#818cf8' }} />
              </div>
              <h2 className="empty-title">
                {!selectedAgent ? 'Select an Agent' : 'Ready to Stream'}
              </h2>
              <p className="empty-description">
                {!selectedAgent
                  ? 'Choose an agent from the sidebar to start viewing their screen'
                  : !connected
                  ? 'Waiting for WebSocket connection...'
                  : 'Press Space or click below to start streaming'
                }
              </p>
              {selectedAgent && connected && (
                <button onClick={startStream} className="primary-button">
                  <Play size={18} />
                  Start Stream
                </button>
              )}
            </div>
          )}

          {/* Frame Display */}
          {frame && (
            <div className="frame-container">
              <img
                src={`data:image/jpeg;base64,${frame}`}
                alt={`Live screen from ${selectedAgentData?.employee_name || 'agent'}`}
                className="frame-image"
              />

              {/* Stream Stopped Overlay */}
              {streamStopped && (
                <div className="paused-overlay">
                  <div className="paused-icon-box">
                    <Square size={28} style={{ color: '#a5b4fc' }} />
                  </div>
                  <p style={{ fontSize: '16px', fontWeight: 600, color: 'white', margin: 0 }}>
                    Stream Paused
                  </p>
                  <button onClick={startStream} className="secondary-button">
                    <Play size={16} />
                    Resume
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <footer
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '16px 20px',
            background: 'linear-gradient(0deg, rgba(15, 23, 42, 0.98) 0%, transparent 100%)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            zIndex: 20,
            transition: 'opacity 0.3s ease',
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? 'auto' : 'none',
          }}
        >
          {selectedAgent && connected && (
            <button
              onClick={streaming ? stopStream : startStream}
              className={`control-button ${streaming ? 'control-stop' : 'control-start'}`}
              aria-label={streaming ? 'Stop stream' : 'Start stream'}
            >
              {streaming ? (
                <>
                  <Square size={18} />
                  Stop Stream
                </>
              ) : (
                <>
                  <Play size={18} />
                  Start Stream
                </>
              )}
            </button>
          )}
        </footer>
      </main>

      {/* Scoped Styles */}
      <style>{`
        /* Animations */
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-25px) scale(1.02); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spin { animation: spin 1s linear infinite; }

        /* Background Orbs */
        .floating-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.6;
        }

        .orb-1 {
          top: 5%;
          left: 15%;
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%);
          animation: float 12s ease-in-out infinite;
        }

        .orb-2 {
          bottom: 10%;
          right: 10%;
          width: 280px;
          height: 280px;
          background: radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%);
          animation: float 15s ease-in-out infinite reverse;
        }

        /* Icon Box */
        .icon-box {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .gradient-primary {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
        }

        /* Buttons */
        .icon-button {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid rgba(148, 163, 184, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #94a3b8;
          transition: all 0.2s ease;
        }

        .icon-button:hover {
          background: rgba(51, 65, 85, 0.9);
          color: #e2e8f0;
          transform: translateY(-1px);
        }

        .icon-button-small {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: rgba(51, 65, 85, 0.6);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #94a3b8;
          transition: all 0.2s ease;
        }

        .icon-button-small:hover {
          background: rgba(71, 85, 105, 0.8);
          color: #e2e8f0;
        }

        /* Status Card */
        .status-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .status-connected {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.25);
        }

        .status-disconnected {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
        }

        .status-icon-connected { color: #22c55e; }
        .status-icon-disconnected { color: #ef4444; }

        /* Status Dots */
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .status-dot-small {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .status-dot-online {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
        }

        .status-dot-offline {
          background: linear-gradient(135deg, #64748b 0%, #475569 100%);
        }

        /* Section Label */
        .section-label {
          display: flex;
          align-items: center;
          font-size: 10px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 0 4px;
          margin-bottom: 10px;
        }

        /* Agent Cards */
        .agent-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid transparent;
          background: rgba(30, 41, 59, 0.5);
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          width: 100%;
        }

        .agent-card:hover:not(:disabled) {
          background: rgba(51, 65, 85, 0.6);
          border-color: rgba(148, 163, 184, 0.1);
        }

        .agent-selected {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%);
          border-color: rgba(99, 102, 241, 0.4);
        }

        .agent-disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .agent-name {
          font-size: 13px;
          font-weight: 600;
          color: #e2e8f0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .agent-selected .agent-name { color: #a5b4fc; }

        .agent-pc {
          font-size: 11px;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Agent Icon (Collapsed) */
        .agent-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid transparent;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          cursor: pointer;
          margin-bottom: 8px;
          transition: all 0.2s ease;
        }

        .agent-icon:hover:not(:disabled) {
          background: rgba(51, 65, 85, 0.8);
        }

        .agent-icon-selected {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%);
          border-color: rgba(99, 102, 241, 0.4);
        }

        /* Sliders */
        .slider-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
          font-size: 12px;
          color: #94a3b8;
        }

        .slider-value {
          font-weight: 600;
          color: #a5b4fc;
        }

        .custom-slider {
          width: 100%;
          height: 5px;
          border-radius: 3px;
          background: rgba(51, 65, 85, 0.8);
          appearance: none;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }

        .custom-slider:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .custom-slider::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(99, 102, 241, 0.4);
          transition: transform 0.15s ease;
        }

        .custom-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }

        .custom-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(99, 102, 241, 0.4);
        }

        /* Keyboard Shortcuts */
        .shortcut-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          color: #64748b;
          margin-bottom: 6px;
        }

        kbd {
          background: rgba(51, 65, 85, 0.6);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 10px;
          color: #94a3b8;
          border: 1px solid rgba(71, 85, 105, 0.5);
        }

        /* Info Chips */
        .info-chip {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          border-radius: 10px;
          background: rgba(30, 41, 59, 0.85);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(148, 163, 184, 0.1);
        }

        .stat-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 10px;
          background: rgba(30, 41, 59, 0.85);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(148, 163, 184, 0.1);
          font-size: 12px;
          color: #e2e8f0;
          font-weight: 500;
        }

        .warning-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 10px;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          font-size: 12px;
          color: #fbbf24;
          font-weight: 500;
        }

        /* Live Badge */
        .live-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          font-size: 12px;
          font-weight: 700;
          color: #ef4444;
        }

        .live-icon {
          animation: pulse 1.5s ease-in-out infinite;
        }

        /* Empty States */
        .empty-state {
          text-align: center;
          max-width: 380px;
        }

        .empty-icon-box {
          width: 100px;
          height: 100px;
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%);
          border: 1px solid rgba(99, 102, 241, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 28px;
        }

        .error-icon-box {
          width: 100px;
          height: 100px;
          border-radius: 24px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 28px;
        }

        .loading-spinner {
          width: 100px;
          height: 100px;
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%);
          border: 1px solid rgba(99, 102, 241, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 28px;
          color: #818cf8;
        }

        .empty-title {
          font-size: 22px;
          font-weight: 700;
          color: white;
          margin: 0 0 10px 0;
        }

        .empty-description {
          font-size: 14px;
          color: #94a3b8;
          margin: 0 0 28px 0;
          line-height: 1.5;
        }

        /* Primary Button */
        .primary-button {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 28px;
          border-radius: 14px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border: none;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 6px 24px rgba(99, 102, 241, 0.35);
          transition: all 0.25s ease;
        }

        .primary-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(99, 102, 241, 0.45);
        }

        .primary-button:active {
          transform: translateY(0);
        }

        /* Secondary Button */
        .secondary-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 12px;
          background: rgba(99, 102, 241, 0.2);
          border: 1px solid rgba(99, 102, 241, 0.3);
          color: #a5b4fc;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .secondary-button:hover {
          background: rgba(99, 102, 241, 0.3);
        }

        /* Control Buttons */
        .control-button {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 36px;
          border-radius: 14px;
          color: white;
          border: none;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .control-start {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          box-shadow: 0 6px 24px rgba(34, 197, 94, 0.35);
        }

        .control-start:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(34, 197, 94, 0.45);
        }

        .control-stop {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          box-shadow: 0 6px 24px rgba(239, 68, 68, 0.35);
        }

        .control-stop:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(239, 68, 68, 0.45);
        }

        .control-button:active {
          transform: translateY(0);
        }

        /* Frame Container */
        .frame-container {
          position: relative;
          max-width: 100%;
          max-height: 100%;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .frame-image {
          max-width: 100%;
          max-height: calc(100vh - 180px);
          object-fit: contain;
          display: block;
        }

        .paused-overlay {
          position: absolute;
          inset: 0;
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(12px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .paused-icon-box {
          width: 70px;
          height: 70px;
          border-radius: 18px;
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Scrollbar */
        ::-webkit-scrollbar {
          width: 5px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.5);
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.4);
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.6);
        }

        /* Focus States for Accessibility */
        button:focus-visible,
        input:focus-visible {
          outline: 2px solid #818cf8;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  )
}
