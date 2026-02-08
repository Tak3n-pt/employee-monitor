const express = require('express');
const router = express.Router();
const db = require('../database');
const { v4: uuidv4 } = require('uuid');

// Register a new agent
router.post('/register', (req, res) => {
    try {
        const { employee_name, pc_name, os_version } = req.body;
        const ip_address = req.ip || req.connection.remoteAddress;

        // Check if agent already exists by pc_name
        const existing = db.prepare('SELECT id FROM agents WHERE pc_name = ?').get(pc_name);

        let agentId;
        if (existing) {
            // Update existing agent
            agentId = existing.id;
            db.prepare(`
                UPDATE agents
                SET employee_name = ?, os_version = ?, ip_address = ?,
                    status = 'online', last_seen = datetime('now')
                WHERE id = ?
            `).run(employee_name, os_version, ip_address, agentId);
        } else {
            // Create new agent
            agentId = uuidv4();
            db.prepare(`
                INSERT INTO agents (id, employee_name, pc_name, os_version, ip_address, status, last_seen)
                VALUES (?, ?, ?, ?, ?, 'online', datetime('now'))
            `).run(agentId, employee_name, pc_name, os_version, ip_address);
        }

        // Get USB policies for this agent
        const policies = db.prepare(`
            SELECT * FROM usb_policies
            WHERE agent_id IS NULL OR agent_id = ?
        `).all(agentId);

        // Get blocked apps (table may not exist yet)
        let blockedApps = [];
        try {
            blockedApps = db.prepare(`
                SELECT app_name FROM blocked_apps
                WHERE agent_id IS NULL OR agent_id = ?
            `).all(agentId).map(a => a.app_name);
        } catch (e) { /* Table doesn't exist yet */ }

        // Get blocked websites (table may not exist yet)
        let blockedWebsites = [];
        try {
            blockedWebsites = db.prepare(`
                SELECT url FROM blocked_websites
                WHERE agent_id IS NULL OR agent_id = ?
            `).all(agentId).map(s => s.url);
        } catch (e) { /* Table doesn't exist yet */ }

        res.json({
            success: true,
            agent_id: agentId,
            usb_policies: policies,
            blocked_apps: blockedApps,
            blocked_websites: blockedWebsites,
            device_policy: {}
        });
    } catch (error) {
        console.error('Agent registration error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Agent heartbeat
router.post('/heartbeat', (req, res) => {
    try {
        const { agent_id } = req.body;
        const ip_address = req.ip || req.connection.remoteAddress;

        db.prepare(`
            UPDATE agents
            SET status = 'online', last_seen = datetime('now'), ip_address = ?
            WHERE id = ?
        `).run(ip_address, agent_id);

        // Return any pending commands or updated policies
        const policies = db.prepare(`
            SELECT * FROM usb_policies
            WHERE agent_id IS NULL OR agent_id = ?
        `).all(agent_id);

        res.json({
            success: true,
            usb_policies: policies
        });
    } catch (error) {
        console.error('Heartbeat error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all agents
router.get('/', (req, res) => {
    try {
        // Mark agents as offline if not seen in 2 minutes (BEFORE fetching)
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
        db.prepare(`
            UPDATE agents SET status = 'offline'
            WHERE last_seen < ? AND status = 'online'
        `).run(twoMinutesAgo);

        const agents = db.prepare(`
            SELECT a.*,
                   (SELECT COUNT(*) FROM activities WHERE agent_id = a.id) as activity_count,
                   (SELECT COUNT(*) FROM screenshots WHERE agent_id = a.id) as screenshot_count
            FROM agents a
            ORDER BY last_seen DESC
        `).all();

        res.json(agents);
    } catch (error) {
        console.error('Get agents error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single agent
router.get('/:id', (req, res) => {
    try {
        const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);

        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        res.json(agent);
    } catch (error) {
        console.error('Get agent error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete agent
router.delete('/:id', (req, res) => {
    try {
        // Delete related data first
        db.prepare('DELETE FROM activities WHERE agent_id = ?').run(req.params.id);
        db.prepare('DELETE FROM screenshots WHERE agent_id = ?').run(req.params.id);
        db.prepare('DELETE FROM usb_logs WHERE agent_id = ?').run(req.params.id);
        db.prepare('DELETE FROM agents WHERE id = ?').run(req.params.id);

        res.json({ success: true });
    } catch (error) {
        console.error('Delete agent error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
