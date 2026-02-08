const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const db = require('./database');
const { JWT_SECRET } = require('./middleware/auth');

// Try to load email utility (optional dependency)
let emailUtils = null;
try {
    emailUtils = require('./utils/email');
} catch (e) {
    console.log('Email utilities not available (nodemailer not installed)');
}

// Store connected agents and admin clients
const connectedAgents = new Map(); // agent_id -> ws
const adminClients = new Set(); // admin websocket connections

// Track agent last seen times for disconnect detection
const agentLastSeen = new Map(); // agent_id -> timestamp

function setupWebSocket(server) {
    const wss = new WebSocket.Server({ server, path: '/ws' });

    // Check for disconnected agents every minute
    setInterval(async () => {
        if (!emailUtils) return;

        const now = Date.now();
        const threshold = 5 * 60 * 1000; // 5 minutes

        for (const [agentId, lastSeen] of agentLastSeen) {
            if (now - lastSeen > threshold && !connectedAgents.has(agentId)) {
                try {
                    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
                    if (agent && agent.status !== 'notified_offline') {
                        await emailUtils.sendAgentDisconnectAlert(db, agent);
                        // Mark as notified to avoid spam
                        db.prepare('UPDATE agents SET status = ? WHERE id = ?').run('notified_offline', agentId);
                    }
                    agentLastSeen.delete(agentId);
                } catch (e) {
                    console.error('Error sending disconnect alert:', e);
                }
            }
        }
    }, 60000);

    wss.on('connection', (ws, req) => {
        console.log('New WebSocket connection');

        let clientType = null;
        let agentId = null;

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                handleMessage(ws, data, { clientType, agentId, setClientType, setAgentId });
            } catch (error) {
                console.error('WebSocket message error:', error);
                ws.send(JSON.stringify({ type: 'error', message: error.message }));
            }
        });

        ws.on('close', () => {
            if (clientType === 'agent' && agentId) {
                connectedAgents.delete(agentId);
                // Update agent status to offline
                db.prepare('UPDATE agents SET status = ? WHERE id = ?').run('offline', agentId);
                // Notify admins
                broadcastToAdmins({ type: 'agent_disconnected', agent_id: agentId });
                console.log(`Agent ${agentId} disconnected`);
            } else if (clientType === 'admin') {
                adminClients.delete(ws);
                console.log('Admin client disconnected');
            }
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });

        // Helper functions to update closure variables
        function setClientType(type) { clientType = type; }
        function setAgentId(id) { agentId = id; }
    });

    return wss;
}

function handleMessage(ws, data, context) {
    const { clientType, agentId, setClientType, setAgentId } = context;

    switch (data.type) {
        // Agent identification
        case 'agent_connect':
            setClientType('agent');
            setAgentId(data.agent_id);
            connectedAgents.set(data.agent_id, ws);

            // Track last seen time
            agentLastSeen.set(data.agent_id, Date.now());

            // Update agent status
            db.prepare('UPDATE agents SET status = ?, last_seen = datetime(?) WHERE id = ?')
                .run('online', 'now', data.agent_id);

            // Notify admins
            broadcastToAdmins({ type: 'agent_connected', agent_id: data.agent_id });

            // Send acknowledgment
            ws.send(JSON.stringify({ type: 'connected', agent_id: data.agent_id }));
            console.log(`Agent ${data.agent_id} connected via WebSocket`);
            break;

        // Admin identification (with optional token auth)
        case 'admin_connect':
            if (data.token) {
                try {
                    const decoded = jwt.verify(data.token, JWT_SECRET);
                    ws.user = decoded;
                } catch (e) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
                    return;
                }
            }
            setClientType('admin');
            adminClients.add(ws);

            // Send current agent list
            const agents = db.prepare('SELECT * FROM agents').all();
            ws.send(JSON.stringify({ type: 'agents_list', agents }));

            // Send online agents
            const onlineAgents = Array.from(connectedAgents.keys());
            ws.send(JSON.stringify({ type: 'online_agents', agent_ids: onlineAgents }));
            console.log('Admin client connected');
            break;

        // Screenshot request from admin
        case 'request_screenshot':
            if (clientType === 'admin') {
                const targetAgent = connectedAgents.get(data.agent_id);
                if (targetAgent && targetAgent.readyState === WebSocket.OPEN) {
                    targetAgent.send(JSON.stringify({ type: 'take_screenshot' }));
                    ws.send(JSON.stringify({
                        type: 'screenshot_requested',
                        agent_id: data.agent_id
                    }));
                } else {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Agent not connected'
                    }));
                }
            }
            break;

        // Screenshot ready notification from agent
        case 'screenshot_ready':
            if (clientType === 'agent') {
                broadcastToAdmins({
                    type: 'screenshot_ready',
                    agent_id: agentId,
                    screenshot_id: data.screenshot_id
                });
            }
            break;

        // USB event from agent
        case 'usb_event':
            if (clientType === 'agent') {
                broadcastToAdmins({
                    type: 'usb_event',
                    agent_id: agentId,
                    event: data.event
                });
            }
            break;

        // Update USB policy from admin
        case 'update_usb_policy':
            if (clientType === 'admin') {
                const targetAgentId = data.agent_id;
                const policy = data.policy;

                // If targeting specific agent, send to that agent
                if (targetAgentId) {
                    const targetAgent = connectedAgents.get(targetAgentId);
                    if (targetAgent && targetAgent.readyState === WebSocket.OPEN) {
                        targetAgent.send(JSON.stringify({
                            type: 'usb_policy_update',
                            policy
                        }));
                    }
                } else {
                    // Broadcast to all agents (global policy)
                    connectedAgents.forEach((agentWs) => {
                        if (agentWs.readyState === WebSocket.OPEN) {
                            agentWs.send(JSON.stringify({
                                type: 'usb_policy_update',
                                policy
                            }));
                        }
                    });
                }
            }
            break;

        // Status request from admin
        case 'get_agent_status':
            if (clientType === 'admin') {
                const targetAgent = connectedAgents.get(data.agent_id);
                if (targetAgent && targetAgent.readyState === WebSocket.OPEN) {
                    targetAgent.send(JSON.stringify({ type: 'status_request' }));
                }
            }
            break;

        // Status response from agent
        case 'status_response':
            if (clientType === 'agent') {
                broadcastToAdmins({
                    type: 'agent_status',
                    agent_id: agentId,
                    status: data.status
                });
            }
            break;

        // Heartbeat from agent
        case 'heartbeat':
            if (clientType === 'agent') {
                // Track last seen time
                agentLastSeen.set(agentId, Date.now());
                db.prepare('UPDATE agents SET last_seen = datetime(?) WHERE id = ?')
                    .run('now', agentId);
                ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
            }
            break;

        // Alert from agent
        case 'alert':
            if (clientType === 'agent') {
                broadcastToAdmins({
                    type: 'alert',
                    agent_id: agentId,
                    alert: data.alert
                });
                console.log(`Alert from ${agentId}: ${data.alert?.rule_name || 'Unknown'} (${data.alert?.severity || 'unknown'})`);

                // Send email for critical/high severity alerts
                if (emailUtils && data.alert?.severity && ['critical', 'high'].includes(data.alert.severity)) {
                    try {
                        const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
                        emailUtils.sendCriticalAlert(db, data.alert, agent).catch(e => {
                            console.error('Error sending alert email:', e);
                        });
                    } catch (e) {
                        console.error('Error looking up agent for alert:', e);
                    }
                }
            }
            break;

        // Screen stream frame from agent
        case 'screen_frame':
            if (clientType === 'agent') {
                // Support both 'frame' and 'image' field names for compatibility
                const frameData = data.frame || data.image;
                broadcastToAdmins({
                    type: 'screen_frame',
                    agent_id: agentId,
                    frame: frameData,
                    image: frameData,  // Include both for frontend compatibility
                    timestamp: data.timestamp
                });
            }
            break;

        // Start screen stream request from admin
        case 'start_screen_stream':
            if (clientType === 'admin') {
                const targetAgent = connectedAgents.get(data.agent_id);
                if (targetAgent && targetAgent.readyState === WebSocket.OPEN) {
                    targetAgent.send(JSON.stringify({ type: 'start_stream' }));
                }
            }
            break;

        // Stop screen stream request from admin
        case 'stop_screen_stream':
            if (clientType === 'admin') {
                const targetAgent = connectedAgents.get(data.agent_id);
                if (targetAgent && targetAgent.readyState === WebSocket.OPEN) {
                    targetAgent.send(JSON.stringify({ type: 'stop_stream' }));
                }
            }
            break;

        // Block app command from admin
        case 'block_app':
            if (clientType === 'admin') {
                const targetAgent = connectedAgents.get(data.agent_id);
                if (targetAgent && targetAgent.readyState === WebSocket.OPEN) {
                    targetAgent.send(JSON.stringify({
                        type: 'block_app',
                        app_name: data.app_name
                    }));
                }
            }
            break;

        // Block website command from admin
        case 'block_website':
            if (clientType === 'admin') {
                const targetAgent = connectedAgents.get(data.agent_id);
                if (targetAgent && targetAgent.readyState === WebSocket.OPEN) {
                    // Support both url and domain field names
                    const siteUrl = data.url || data.domain;
                    targetAgent.send(JSON.stringify({
                        type: 'block_website',
                        url: siteUrl,
                        domain: siteUrl  // Include both for compatibility
                    }));
                }
            }
            break;

        // Request data sync from admin (triggers agent to send latest data)
        case 'request_data_sync':
            if (clientType === 'admin') {
                const syncTarget = connectedAgents.get(data.agent_id);
                if (syncTarget && syncTarget.readyState === WebSocket.OPEN) {
                    syncTarget.send(JSON.stringify({
                        type: 'request_data_sync',
                        data_type: data.data_type
                    }));
                    ws.send(JSON.stringify({
                        type: 'data_sync_requested',
                        agent_id: data.agent_id,
                        data_type: data.data_type
                    }));
                } else {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Agent not connected'
                    }));
                }
            }
            break;

        // Data sync complete notification from agent
        case 'data_sync_complete':
            if (clientType === 'agent') {
                broadcastToAdmins({
                    type: 'data_sync_complete',
                    agent_id: agentId,
                    data_type: data.data_type
                });
            }
            break;

        // New remote command handlers
        case 'restart_agent':
            if (clientType === 'admin') {
                const targetAgent = connectedAgents.get(data.agent_id);
                if (targetAgent && targetAgent.readyState === WebSocket.OPEN) {
                    targetAgent.send(JSON.stringify({ type: 'restart_agent' }));
                    ws.send(JSON.stringify({ type: 'command_sent', command: 'restart_agent', agent_id: data.agent_id }));
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Agent not connected' }));
                }
            }
            break;

        case 'lock_screen':
            if (clientType === 'admin') {
                const targetAgent = connectedAgents.get(data.agent_id);
                if (targetAgent && targetAgent.readyState === WebSocket.OPEN) {
                    targetAgent.send(JSON.stringify({ type: 'lock_screen' }));
                    ws.send(JSON.stringify({ type: 'command_sent', command: 'lock_screen', agent_id: data.agent_id }));
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Agent not connected' }));
                }
            }
            break;

        case 'show_message':
            if (clientType === 'admin') {
                const targetAgent = connectedAgents.get(data.agent_id);
                if (targetAgent && targetAgent.readyState === WebSocket.OPEN) {
                    targetAgent.send(JSON.stringify({
                        type: 'show_message',
                        title: data.title || 'Message from IT',
                        message: data.message || '',
                        msg_type: data.msg_type || 'info'
                    }));
                    ws.send(JSON.stringify({ type: 'command_sent', command: 'show_message', agent_id: data.agent_id }));
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Agent not connected' }));
                }
            }
            break;

        case 'get_system_info':
            if (clientType === 'admin') {
                const targetAgent = connectedAgents.get(data.agent_id);
                if (targetAgent && targetAgent.readyState === WebSocket.OPEN) {
                    targetAgent.send(JSON.stringify({ type: 'get_system_info' }));
                    ws.send(JSON.stringify({ type: 'command_sent', command: 'get_system_info', agent_id: data.agent_id }));
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Agent not connected' }));
                }
            }
            break;

        case 'toggle_stealth':
            if (clientType === 'admin') {
                const targetAgent = connectedAgents.get(data.agent_id);
                if (targetAgent && targetAgent.readyState === WebSocket.OPEN) {
                    targetAgent.send(JSON.stringify({
                        type: 'toggle_stealth',
                        visible: data.visible || false
                    }));
                    ws.send(JSON.stringify({ type: 'command_sent', command: 'toggle_stealth', agent_id: data.agent_id }));
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Agent not connected' }));
                }
            }
            break;

        case 'screenshot_now':
            if (clientType === 'admin') {
                const targetAgent = connectedAgents.get(data.agent_id);
                if (targetAgent && targetAgent.readyState === WebSocket.OPEN) {
                    targetAgent.send(JSON.stringify({ type: 'take_screenshot' }));
                    ws.send(JSON.stringify({ type: 'command_sent', command: 'screenshot_now', agent_id: data.agent_id }));
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Agent not connected' }));
                }
            }
            break;

        // Forward command responses and system info to admins
        case 'command_response':
            if (clientType === 'agent') {
                broadcastToAdmins({
                    type: 'command_response',
                    agent_id: agentId,
                    command: data.command,
                    status: data.status,
                    error: data.error
                });
            }
            break;

        case 'system_info_response':
            if (clientType === 'agent') {
                broadcastToAdmins({
                    type: 'system_info_response',
                    agent_id: agentId,
                    data: data.data,
                    error: data.error
                });
            }
            break;

        default:
            console.log('Unknown message type:', data.type);
    }
}

function broadcastToAdmins(message) {
    const messageStr = JSON.stringify(message);
    adminClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
        }
    });
}

// Export for use in other modules
module.exports = {
    setupWebSocket,
    connectedAgents,
    adminClients,
    broadcastToAdmins
};
