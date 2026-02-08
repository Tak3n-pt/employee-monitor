const express = require('express');
const router = express.Router();
const db = require('../database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for screenshot uploads
const screenshotsDir = path.join(__dirname, '..', '..', 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Validate agent_id to prevent path traversal
function sanitizeAgentId(agentId) {
    if (!agentId || typeof agentId !== 'string') return 'unknown';
    // Only allow alphanumeric characters and hyphens (UUID format)
    const sanitized = agentId.replace(/[^a-zA-Z0-9-]/g, '');
    return sanitized || 'unknown';
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const safeAgentId = sanitizeAgentId(req.body.agent_id);
        const agentDir = path.join(screenshotsDir, safeAgentId);

        // Double-check the resolved path is within screenshots directory
        const resolvedPath = path.resolve(agentDir);
        if (!resolvedPath.startsWith(path.resolve(screenshotsDir))) {
            return cb(new Error('Invalid agent ID'));
        }

        if (!fs.existsSync(agentDir)) {
            fs.mkdirSync(agentDir, { recursive: true });
        }
        cb(null, agentDir);
    },
    filename: (req, file, cb) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        cb(null, `screenshot_${timestamp}.png`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// Upload screenshot from agent
router.post('/upload', upload.single('screenshot'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No screenshot file provided' });
        }

        const { agent_id } = req.body;
        if (!agent_id) {
            // Delete uploaded file if no agent_id
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Agent ID required' });
        }

        // Save to database
        const result = db.prepare(`
            INSERT INTO screenshots (agent_id, filename, filepath, file_size)
            VALUES (?, ?, ?, ?)
        `).run(agent_id, req.file.filename, req.file.path, req.file.size);

        res.json({
            success: true,
            id: result.lastInsertRowid,
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Screenshot upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get screenshots for an agent
router.get('/agent/:agentId', (req, res) => {
    try {
        const { agentId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        const screenshots = db.prepare(`
            SELECT * FROM screenshots
            WHERE agent_id = ?
            ORDER BY captured_at DESC
            LIMIT ? OFFSET ?
        `).all(agentId, parseInt(limit), parseInt(offset));

        const total = db.prepare(
            'SELECT COUNT(*) as count FROM screenshots WHERE agent_id = ?'
        ).get(agentId);

        res.json({
            screenshots,
            total: total.count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Get screenshots error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Search screenshots by OCR text
router.get('/search', (req, res) => {
    try {
        const { q, agent_id, limit = 50 } = req.query;

        if (!q) {
            return res.status(400).json({ error: 'Search query (q) is required' });
        }

        let query = `
            SELECT s.*, a.employee_name, a.pc_name
            FROM screenshots s
            LEFT JOIN agents a ON s.agent_id = a.id
            WHERE s.ocr_text LIKE ?
        `;
        const params = [`%${q}%`];

        if (agent_id) {
            query += ' AND s.agent_id = ?';
            params.push(agent_id);
        }

        query += ' ORDER BY s.captured_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const screenshots = db.prepare(query).all(...params);
        res.json(screenshots);
    } catch (error) {
        console.error('Screenshot search error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Run OCR on a screenshot (requires tesseract.js)
router.post('/ocr/:id', async (req, res) => {
    try {
        const screenshot = db.prepare('SELECT * FROM screenshots WHERE id = ?').get(req.params.id);

        if (!screenshot) {
            return res.status(404).json({ error: 'Screenshot not found' });
        }

        if (!fs.existsSync(screenshot.filepath)) {
            return res.status(404).json({ error: 'Screenshot file not found' });
        }

        let Tesseract;
        try {
            Tesseract = require('tesseract.js');
        } catch (e) {
            return res.status(501).json({
                error: 'tesseract.js not installed. Run: npm install tesseract.js'
            });
        }

        const { data: { text } } = await Tesseract.recognize(screenshot.filepath, 'eng');
        db.prepare('UPDATE screenshots SET ocr_text = ? WHERE id = ?').run(text, req.params.id);

        res.json({ success: true, text, screenshot_id: req.params.id });
    } catch (error) {
        console.error('OCR error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Bulk OCR - process unprocessed screenshots
router.post('/ocr-bulk', async (req, res) => {
    try {
        const { limit = 10 } = req.body;

        let Tesseract;
        try {
            Tesseract = require('tesseract.js');
        } catch (e) {
            return res.status(501).json({
                error: 'tesseract.js not installed. Run: npm install tesseract.js'
            });
        }

        const unprocessed = db.prepare(`
            SELECT * FROM screenshots
            WHERE ocr_text IS NULL
            ORDER BY captured_at DESC
            LIMIT ?
        `).all(parseInt(limit));

        const results = [];
        for (const screenshot of unprocessed) {
            try {
                if (!fs.existsSync(screenshot.filepath)) continue;

                const { data: { text } } = await Tesseract.recognize(screenshot.filepath, 'eng');
                db.prepare('UPDATE screenshots SET ocr_text = ? WHERE id = ?').run(text, screenshot.id);
                results.push({ id: screenshot.id, success: true });
            } catch (e) {
                results.push({ id: screenshot.id, success: false, error: e.message });
            }
        }

        res.json({ processed: results.length, results });
    } catch (error) {
        console.error('Bulk OCR error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single screenshot
router.get('/:id', (req, res) => {
    try {
        const screenshot = db.prepare('SELECT * FROM screenshots WHERE id = ?').get(req.params.id);

        if (!screenshot) {
            return res.status(404).json({ error: 'Screenshot not found' });
        }

        res.json(screenshot);
    } catch (error) {
        console.error('Get screenshot error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve screenshot image
router.get('/image/:id', (req, res) => {
    try {
        const screenshot = db.prepare('SELECT * FROM screenshots WHERE id = ?').get(req.params.id);

        if (!screenshot) {
            return res.status(404).json({ error: 'Screenshot not found' });
        }

        if (!fs.existsSync(screenshot.filepath)) {
            return res.status(404).json({ error: 'Screenshot file not found' });
        }

        res.sendFile(screenshot.filepath);
    } catch (error) {
        console.error('Serve screenshot error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete screenshot
router.delete('/:id', (req, res) => {
    try {
        const screenshot = db.prepare('SELECT * FROM screenshots WHERE id = ?').get(req.params.id);

        if (!screenshot) {
            return res.status(404).json({ error: 'Screenshot not found' });
        }

        // Delete file
        if (fs.existsSync(screenshot.filepath)) {
            fs.unlinkSync(screenshot.filepath);
        }

        // Delete from database
        db.prepare('DELETE FROM screenshots WHERE id = ?').run(req.params.id);

        res.json({ success: true });
    } catch (error) {
        console.error('Delete screenshot error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get recent screenshots across all agents
router.get('/', (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const screenshots = db.prepare(`
            SELECT s.*, a.employee_name, a.pc_name
            FROM screenshots s
            JOIN agents a ON s.agent_id = a.id
            ORDER BY s.captured_at DESC
            LIMIT ?
        `).all(parseInt(limit));

        res.json(screenshots);
    } catch (error) {
        console.error('Get recent screenshots error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
