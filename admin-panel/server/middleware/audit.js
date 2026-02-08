const db = require('../database');

function logAction(userId, action, targetType, targetId, details, ip) {
    try {
        db.prepare(`
            INSERT INTO audit_log (user_id, action, target_type, target_id, details, ip_address, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(userId, action, targetType || null, targetId || null, details || null, ip || null);
    } catch (error) {
        console.error('Audit log error:', error);
    }
}

module.exports = { logAction };
