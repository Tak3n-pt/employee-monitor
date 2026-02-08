const express = require('express');
const db = require('../database');
const { requireRole } = require('../middleware/auth');
const { logAction } = require('../middleware/audit');

const router = express.Router();

// GET /api/settings
router.get('/', (req, res) => {
    try {
        const rows = db.prepare('SELECT key, value FROM settings').all();
        const settings = {};
        rows.forEach(row => {
            try {
                settings[row.key] = JSON.parse(row.value);
            } catch {
                settings[row.key] = row.value;
            }
        });
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/settings
router.put('/', requireRole('admin'), (req, res) => {
    try {
        const updates = req.body;
        const upsert = db.prepare(`
            INSERT INTO settings (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
        `);

        const transaction = db.transaction((entries) => {
            for (const [key, value] of entries) {
                upsert.run(key, typeof value === 'string' ? value : JSON.stringify(value));
            }
        });

        transaction(Object.entries(updates));

        logAction(req.user.id, 'update_settings', 'settings', null, JSON.stringify(Object.keys(updates)), req.ip);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
