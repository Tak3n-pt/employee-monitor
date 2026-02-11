const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');

// Import database
const db = require('./database');

// Import middleware
const { requireAuth } = require('./middleware/auth');
const { logAction } = require('./middleware/audit');

// Import routes
const agentsRouter = require('./routes/agents');
const activitiesRouter = require('./routes/activities');
const screenshotsRouter = require('./routes/screenshots');
const usbRouter = require('./routes/usb');
const monitoringRouter = require('./routes/monitoring');
const reportsRouter = require('./routes/reports');
const authRouter = require('./routes/auth');
const settingsRouter = require('./routes/settings');

// Import WebSocket setup
const { setupWebSocket } = require('./websocket');

const app = express();
const PORT = process.env.PORT || 3847;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Apply auth middleware to all routes
app.use(requireAuth);

// Screenshots directory - writable location
const isPackaged = __dirname.includes('app.asar');
const screenshotsPath = isPackaged
    ? path.join(process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming'), 'employee-monitor-admin', 'screenshots')
    : path.join(__dirname, '..', 'screenshots');
const fs = require('fs');
if (!fs.existsSync(screenshotsPath)) fs.mkdirSync(screenshotsPath, { recursive: true });

// Serve static files (for screenshots)
app.use('/screenshots', express.static(screenshotsPath));

// Serve the dashboard UI (new React build)
// When packaged, asarUnpack puts files in app.asar.unpacked
const publicPath = isPackaged
    ? path.join(__dirname.replace('app.asar', 'app.asar.unpacked'), '..', 'public-new')
    : path.join(__dirname, '..', 'public-new');
app.use(express.static(publicPath));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/screenshots', screenshotsRouter);
app.use('/api/usb', usbRouter);
app.use('/api/monitoring', monitoringRouter(db));
app.use('/api/reports', reportsRouter(db));
app.use('/api/settings', settingsRouter);

// Audit log endpoints
app.get('/api/audit-log', (req, res) => {
    try {
        const { user_id, action, limit = 200, offset = 0 } = req.query;
        let query = `
            SELECT a.*, u.username, u.name as user_name
            FROM audit_log a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE 1=1
        `;
        const params = [];
        if (user_id) {
            query += ' AND a.user_id = ?';
            params.push(user_id);
        }
        if (action) {
            query += ' AND a.action = ?';
            params.push(action);
        }
        query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const logs = db.prepare(query).all(...params);
        const total = db.prepare('SELECT COUNT(*) as count FROM audit_log').get();
        res.json({ logs, total: total.count });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Global search endpoint
app.get('/api/search', (req, res) => {
    try {
        const { q, limit = 20 } = req.query;
        if (!q || q.length < 2) {
            return res.json({ results: [] });
        }

        const term = `%${q}%`;
        const lim = parseInt(limit);
        const results = {};

        // Search agents
        const agents = db.prepare('SELECT id, employee_name, pc_name FROM agents WHERE employee_name LIKE ? OR pc_name LIKE ? LIMIT ?').all(term, term, lim);
        if (agents.length) results.agents = agents;

        // Search activities
        const activities = db.prepare('SELECT id, app_name, window_title, agent_id FROM activities WHERE app_name LIKE ? OR window_title LIKE ? ORDER BY created_at DESC LIMIT ?').all(term, term, lim);
        if (activities.length) results.activities = activities;

        // Search web history
        try {
            const web = db.prepare('SELECT id, url, title, agent_id FROM web_history WHERE url LIKE ? OR title LIKE ? ORDER BY created_at DESC LIMIT ?').all(term, term, lim);
            if (web.length) results.web_history = web;
        } catch (e) { /* table may not exist */ }

        // Search file events
        try {
            const files = db.prepare('SELECT id, filename, filepath, agent_id FROM file_events WHERE filename LIKE ? OR filepath LIKE ? ORDER BY created_at DESC LIMIT ?').all(term, term, lim);
            if (files.length) results.files = files;
        } catch (e) { /* table may not exist */ }

        // Search alerts
        try {
            const alerts = db.prepare('SELECT id, rule_name, description, agent_id FROM alerts WHERE rule_name LIKE ? OR description LIKE ? ORDER BY created_at DESC LIMIT ?').all(term, term, lim);
            if (alerts.length) results.alerts = alerts;
        } catch (e) { /* table may not exist */ }

        // Search emails
        try {
            const emails = db.prepare('SELECT id, subject, sender, agent_id FROM emails WHERE subject LIKE ? OR sender LIKE ? ORDER BY created_at DESC LIMIT ?').all(term, term, lim);
            if (emails.length) results.emails = emails;
        } catch (e) { /* table may not exist */ }

        res.json({ results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Agent groups endpoints
app.get('/api/groups', (req, res) => {
    try {
        const groups = db.prepare(`
            SELECT g.*, COUNT(m.agent_id) as member_count
            FROM agent_groups g
            LEFT JOIN agent_group_members m ON g.id = m.group_id
            GROUP BY g.id
            ORDER BY g.name
        `).all();
        res.json(groups);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/groups', (req, res) => {
    try {
        const { name, color } = req.body;
        const result = db.prepare('INSERT INTO agent_groups (name, color) VALUES (?, ?)').run(name, color || '#3b82f6');
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/groups/:id', (req, res) => {
    try {
        const { name, color } = req.body;
        db.prepare('UPDATE agent_groups SET name = ?, color = ? WHERE id = ?').run(name, color, req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/groups/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM agent_group_members WHERE group_id = ?').run(req.params.id);
        db.prepare('DELETE FROM agent_groups WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/groups/:id/members', (req, res) => {
    try {
        const { agent_id } = req.body;
        db.prepare('INSERT OR IGNORE INTO agent_group_members (agent_id, group_id) VALUES (?, ?)').run(agent_id, req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/groups/:id/members/:agentId', (req, res) => {
    try {
        db.prepare('DELETE FROM agent_group_members WHERE agent_id = ? AND group_id = ?').run(req.params.agentId, req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Alerts endpoint (convenience alias)
app.post('/api/alerts', (req, res) => {
    try {
        const { agent_id, alert_id, rule_id, rule_name, description, category, severity, event } = req.body;
        db.prepare(`
            INSERT INTO alerts (agent_id, alert_id, rule_id, rule_name, description, category, severity, event_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(agent_id, alert_id, rule_id, rule_name, description, category, severity, JSON.stringify(event || {}));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Policies endpoint
app.get('/api/policies/agent/:agentId', (req, res) => {
    try {
        const { agentId } = req.params;
        const blockedApps = db.prepare('SELECT app_name FROM blocked_apps WHERE agent_id = ? OR agent_id IS NULL').all(agentId);
        const blockedSites = db.prepare('SELECT url FROM blocked_websites WHERE agent_id = ? OR agent_id IS NULL').all(agentId);
        const usbPolicies = db.prepare('SELECT * FROM usb_policies WHERE agent_id = ? OR agent_id IS NULL').all(agentId);

        res.json({
            blocked_apps: blockedApps.map(a => a.app_name),
            blocked_websites: blockedSites.map(s => s.url),
            usb_policies: usbPolicies,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React app for all non-API routes (client-side routing support)
app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
        return next();
    }
    res.sendFile(path.join(publicPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Create HTTP server
const server = http.createServer(app);

// Setup WebSocket
const wss = setupWebSocket(server);

// Data retention cleanup - runs daily
function runDataRetention() {
    try {
        const row = db.prepare("SELECT value FROM settings WHERE key = 'retention_days'").get();
        const retentionDays = row ? parseInt(row.value) : 90;
        if (retentionDays <= 0) return;

        const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
        const tables = [
            { name: 'activities', col: 'created_at' },
            { name: 'screenshots', col: 'captured_at' },
            { name: 'usb_logs', col: 'timestamp' },
            { name: 'monitoring_data', col: 'timestamp' },
            { name: 'web_history', col: 'created_at' },
            { name: 'file_events', col: 'created_at' },
            { name: 'print_jobs', col: 'created_at' },
            { name: 'dlp_alerts', col: 'created_at' },
            { name: 'alerts', col: 'created_at' },
        ];

        let totalDeleted = 0;
        tables.forEach(({ name, col }) => {
            try {
                const result = db.prepare(`DELETE FROM ${name} WHERE ${col} < ?`).run(cutoff);
                totalDeleted += result.changes;
            } catch (e) {
                // Table may not exist
            }
        });

        if (totalDeleted > 0) {
            console.log(`Data retention: Deleted ${totalDeleted} rows older than ${retentionDays} days`);
            logAction(null, 'data_retention', 'system', null, `Deleted ${totalDeleted} rows older than ${retentionDays} days`, null);
        }
    } catch (error) {
        console.error('Data retention error:', error);
    }
}

// Run retention on startup and every 24 hours
runDataRetention();
setInterval(runDataRetention, 24 * 60 * 60 * 1000);

// Start server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = { app, server };
