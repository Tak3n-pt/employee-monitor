const express = require('express');
const router = express.Router();
const db = require('../database');

// Log USB event from agent
router.post('/log', (req, res) => {
    try {
        const { agent_id, device_name, device_id, device_class, action } = req.body;

        if (!agent_id) {
            return res.status(400).json({ error: 'Agent ID required' });
        }

        db.prepare(`
            INSERT INTO usb_logs (agent_id, device_name, device_id, device_class, action)
            VALUES (?, ?, ?, ?, ?)
        `).run(agent_id, device_name, device_id, device_class, action);

        res.json({ success: true });
    } catch (error) {
        console.error('USB log error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get USB logs for an agent
router.get('/logs/:agentId', (req, res) => {
    try {
        const { agentId } = req.params;
        const { limit = 100 } = req.query;

        const logs = db.prepare(`
            SELECT * FROM usb_logs
            WHERE agent_id = ?
            ORDER BY timestamp DESC
            LIMIT ?
        `).all(agentId, parseInt(limit));

        res.json(logs);
    } catch (error) {
        console.error('Get USB logs error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all recent USB logs
router.get('/logs', (req, res) => {
    try {
        const { limit = 50 } = req.query;

        const logs = db.prepare(`
            SELECT l.*, a.employee_name, a.pc_name
            FROM usb_logs l
            JOIN agents a ON l.agent_id = a.id
            ORDER BY l.timestamp DESC
            LIMIT ?
        `).all(parseInt(limit));

        res.json(logs);
    } catch (error) {
        console.error('Get all USB logs error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get USB policies
router.get('/policies', (req, res) => {
    try {
        const policies = db.prepare(`
            SELECT p.*, a.employee_name, a.pc_name
            FROM usb_policies p
            LEFT JOIN agents a ON p.agent_id = a.id
            ORDER BY p.created_at DESC
        `).all();

        res.json(policies);
    } catch (error) {
        console.error('Get USB policies error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create USB policy
router.post('/policies', (req, res) => {
    try {
        const { agent_id, device_class, allowed } = req.body;

        if (!device_class) {
            return res.status(400).json({ error: 'Device class required' });
        }

        // Check for existing policy
        const existing = db.prepare(`
            SELECT id FROM usb_policies
            WHERE (agent_id = ? OR (agent_id IS NULL AND ? IS NULL))
            AND device_class = ?
        `).get(agent_id || null, agent_id || null, device_class);

        if (existing) {
            // Update existing policy
            db.prepare(`
                UPDATE usb_policies
                SET allowed = ?
                WHERE id = ?
            `).run(allowed ? 1 : 0, existing.id);

            res.json({ success: true, id: existing.id, updated: true });
        } else {
            // Create new policy
            const result = db.prepare(`
                INSERT INTO usb_policies (agent_id, device_class, allowed)
                VALUES (?, ?, ?)
            `).run(agent_id || null, device_class, allowed ? 1 : 0);

            res.json({ success: true, id: result.lastInsertRowid, created: true });
        }
    } catch (error) {
        console.error('Create USB policy error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update USB policy
router.put('/policies/:id', (req, res) => {
    try {
        const { allowed } = req.body;

        db.prepare(`
            UPDATE usb_policies
            SET allowed = ?
            WHERE id = ?
        `).run(allowed ? 1 : 0, req.params.id);

        res.json({ success: true });
    } catch (error) {
        console.error('Update USB policy error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete USB policy
router.delete('/policies/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM usb_policies WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete USB policy error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get policies for specific agent (used by agent on connect)
router.get('/policies/agent/:agentId', (req, res) => {
    try {
        const { agentId } = req.params;

        // Get policies that apply to this agent (specific + global)
        const policies = db.prepare(`
            SELECT * FROM usb_policies
            WHERE agent_id = ? OR agent_id IS NULL
            ORDER BY agent_id DESC
        `).all(agentId);

        res.json(policies);
    } catch (error) {
        console.error('Get agent policies error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
