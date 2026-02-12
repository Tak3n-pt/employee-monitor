const express = require('express');
const router = express.Router();
const db = require('../database');

// Submit activity data from agent
router.post('/', (req, res) => {
    try {
        const { agent_id, activities } = req.body;

        if (!agent_id || !activities || !Array.isArray(activities)) {
            return res.status(400).json({ error: 'Invalid request data' });
        }

        const stmt = db.prepare(`
            INSERT INTO activities (agent_id, app_name, window_title, executable_path, started_at, ended_at, duration_seconds)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const insertMany = db.transaction((items) => {
            for (const item of items) {
                stmt.run(
                    agent_id,
                    item.app_name,
                    item.window_title,
                    item.executable_path || null,
                    item.started_at,
                    item.ended_at,
                    item.duration_seconds || 0
                );
            }
        });

        insertMany(activities);

        res.json({ success: true, count: activities.length });
    } catch (error) {
        console.error('Submit activities error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all activities (with optional agent_id filter)
router.get('/', (req, res) => {
    try {
        const { agent_id, limit = 100 } = req.query;

        let query = `
            SELECT a.*, ag.employee_name, ag.pc_name
            FROM activities a
            LEFT JOIN agents ag ON a.agent_id = ag.id
            WHERE 1=1
        `;
        const params = [];

        if (agent_id) {
            query += ' AND a.agent_id = ?';
            params.push(agent_id);
        }

        query += ' ORDER BY a.created_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const activities = db.prepare(query).all(...params);
        res.json(activities);
    } catch (error) {
        console.error('Get all activities error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get activities for an agent
router.get('/agent/:agentId', (req, res) => {
    try {
        const { agentId } = req.params;
        const { date, limit = 100 } = req.query;

        let query = `
            SELECT * FROM activities
            WHERE agent_id = ?
        `;
        const params = [agentId];

        if (date) {
            query += ` AND date(started_at) = date(?)`;
            params.push(date);
        }

        query += ` ORDER BY started_at DESC LIMIT ?`;
        params.push(parseInt(limit));

        const activities = db.prepare(query).all(...params);
        res.json(activities);
    } catch (error) {
        console.error('Get activities error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get activity summary for an agent (time per app)
router.get('/summary/:agentId', (req, res) => {
    try {
        const { agentId } = req.params;
        const { date, days = 1 } = req.query;

        let query;
        let params;

        if (date) {
            // Use parameterized query for date filter
            query = `
                SELECT
                    app_name,
                    SUM(duration_seconds) as total_seconds,
                    COUNT(*) as session_count,
                    MIN(started_at) as first_use,
                    MAX(ended_at) as last_use
                FROM activities
                WHERE agent_id = ? AND date(started_at) = date(?)
                GROUP BY app_name
                ORDER BY total_seconds DESC
            `;
            params = [agentId, date];
        } else {
            // Validate days is a positive integer
            const daysNum = Math.max(1, Math.min(365, parseInt(days) || 1));
            query = `
                SELECT
                    app_name,
                    SUM(duration_seconds) as total_seconds,
                    COUNT(*) as session_count,
                    MIN(started_at) as first_use,
                    MAX(ended_at) as last_use
                FROM activities
                WHERE agent_id = ? AND started_at >= datetime('now', '-' || ? || ' days')
                GROUP BY app_name
                ORDER BY total_seconds DESC
            `;
            params = [agentId, daysNum];
        }

        const summary = db.prepare(query).all(...params);

        // Calculate total time
        const totalSeconds = summary.reduce((acc, item) => acc + item.total_seconds, 0);

        // Add percentage to each app
        const summaryWithPercent = summary.map(item => ({
            ...item,
            percentage: totalSeconds > 0 ? Math.round((item.total_seconds / totalSeconds) * 100) : 0,
            total_formatted: formatDuration(item.total_seconds)
        }));

        res.json({
            summary: summaryWithPercent,
            total_seconds: totalSeconds,
            total_formatted: formatDuration(totalSeconds)
        });
    } catch (error) {
        console.error('Get summary error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get daily activity timeline
router.get('/timeline/:agentId', (req, res) => {
    try {
        const { agentId } = req.params;
        const { date } = req.query;

        const targetDate = date || new Date().toISOString().split('T')[0];

        const timeline = db.prepare(`
            SELECT
                strftime('%H', started_at) as hour,
                app_name,
                SUM(duration_seconds) as seconds
            FROM activities
            WHERE agent_id = ? AND date(started_at) = date(?)
            GROUP BY hour, app_name
            ORDER BY hour, seconds DESC
        `).all(agentId, targetDate);

        res.json(timeline);
    } catch (error) {
        console.error('Get timeline error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all agents activity overview
router.get('/overview', (req, res) => {
    try {
        const overview = db.prepare(`
            SELECT
                a.id as agent_id,
                a.employee_name,
                a.pc_name,
                a.status,
                COUNT(act.id) as activity_count,
                SUM(act.duration_seconds) as total_seconds,
                MAX(act.ended_at) as last_activity
            FROM agents a
            LEFT JOIN activities act ON a.id = act.agent_id
                AND act.started_at >= datetime('now', '-1 day')
            GROUP BY a.id
            ORDER BY total_seconds DESC
        `).all();

        res.json(overview.map(item => ({
            ...item,
            total_formatted: formatDuration(item.total_seconds || 0)
        })));
    } catch (error) {
        console.error('Get overview error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Helper function to format duration
function formatDuration(seconds) {
    if (!seconds || seconds === 0) return '0m';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

module.exports = router;
