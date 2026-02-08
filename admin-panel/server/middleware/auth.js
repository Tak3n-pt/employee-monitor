const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'emp-monitor-secret-key-change-in-production';

// Agent-facing endpoints that don't require auth
const SKIP_AUTH_PATHS = [
    '/api/agents/register',
    '/api/agents/heartbeat',
    '/api/activities',
    '/api/screenshots/upload',
    '/api/screenshots/image/',
    '/api/monitoring/data',
    '/api/alerts',
    '/api/health',
];

function requireAuth(req, res, next) {
    // Skip auth for non-API routes
    if (!req.path.startsWith('/api/')) {
        return next();
    }

    // Skip auth for agent-facing endpoints
    const shouldSkip = SKIP_AUTH_PATHS.some(p => req.path.startsWith(p));
    if (shouldSkip) {
        return next();
    }

    // Also skip POST to /api/auth/login
    if (req.path === '/api/auth/login' && req.method === 'POST') {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}

module.exports = { requireAuth, requireRole, JWT_SECRET };
