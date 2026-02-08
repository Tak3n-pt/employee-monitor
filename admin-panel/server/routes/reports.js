/**
 * Reports Routes - Automated report generation with daily/weekly summaries
 */

const express = require('express');
const router = express.Router();

// Try to load PDF utility (optional dependency)
let pdfUtils = null;
try {
    pdfUtils = require('../utils/pdf');
} catch (e) {
    console.log('PDF utilities not available (pdfkit not installed)');
}

module.exports = (db) => {

    // Generate a report for an agent
    router.get('/generate', (req, res) => {
        try {
            const { type = 'daily', agent_id } = req.query;

            if (!agent_id) {
                return res.status(400).json({ error: 'agent_id is required' });
            }

            const report = generateReport(db, agent_id, type);

            // Store the generated report
            db.prepare(`
                INSERT INTO generated_reports (agent_id, report_type, report_data)
                VALUES (?, ?, ?)
            `).run(agent_id, type, JSON.stringify(report));

            res.json(report);
        } catch (error) {
            console.error('Report generation error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Get previously generated reports
    router.get('/history', (req, res) => {
        try {
            const { agent_id, type, limit = 30 } = req.query;

            let query = 'SELECT * FROM generated_reports WHERE 1=1';
            const params = [];

            if (agent_id) {
                query += ' AND agent_id = ?';
                params.push(agent_id);
            }

            if (type) {
                query += ' AND report_type = ?';
                params.push(type);
            }

            query += ' ORDER BY generated_at DESC LIMIT ?';
            params.push(parseInt(limit));

            const reports = db.prepare(query).all(...params);
            const result = reports.map(r => ({
                ...r,
                report_data: JSON.parse(r.report_data || '{}'),
            }));
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Configure report schedule
    router.put('/schedule/:agentId', (req, res) => {
        try {
            const { agentId } = req.params;
            const { report_type = 'daily', enabled = true } = req.body;

            // Upsert schedule
            db.prepare(`
                INSERT INTO report_schedules (agent_id, report_type, enabled)
                VALUES (?, ?, ?)
                ON CONFLICT(agent_id, report_type) DO UPDATE SET enabled = ?
            `).run(agentId, report_type, enabled ? 1 : 0, enabled ? 1 : 0);

            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Get report schedules
    router.get('/schedule', (req, res) => {
        try {
            const { agent_id } = req.query;

            let query = 'SELECT * FROM report_schedules WHERE 1=1';
            const params = [];

            if (agent_id) {
                query += ' AND agent_id = ?';
                params.push(agent_id);
            }

            const schedules = db.prepare(query).all(...params);
            res.json(schedules);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Generate reports for all agents with active schedules (called by cron)
    router.post('/generate-scheduled', (req, res) => {
        try {
            const { type = 'daily' } = req.body;

            const schedules = db.prepare(
                'SELECT * FROM report_schedules WHERE report_type = ? AND enabled = 1'
            ).all(type);

            const results = [];
            for (const schedule of schedules) {
                try {
                    const report = generateReport(db, schedule.agent_id, type);
                    db.prepare(`
                        INSERT INTO generated_reports (agent_id, report_type, report_data)
                        VALUES (?, ?, ?)
                    `).run(schedule.agent_id, type, JSON.stringify(report));
                    results.push({ agent_id: schedule.agent_id, success: true });
                } catch (e) {
                    results.push({ agent_id: schedule.agent_id, success: false, error: e.message });
                }
            }

            res.json({ generated: results.length, results });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Download report as PDF
    router.get('/download/:id', async (req, res) => {
        try {
            if (!pdfUtils) {
                return res.status(501).json({ error: 'PDF generation not available. Install pdfkit: npm install pdfkit' });
            }

            const report = db.prepare('SELECT * FROM generated_reports WHERE id = ?').get(req.params.id);

            if (!report) {
                return res.status(404).json({ error: 'Report not found' });
            }

            const reportData = JSON.parse(report.report_data || '{}');
            const pdf = await pdfUtils.generateReportPDF(reportData);

            const filename = `report_${reportData.agent?.employee_name || 'unknown'}_${reportData.period?.start || 'unknown'}.pdf`
                .replace(/[^a-z0-9_.-]/gi, '_');

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', pdf.length);
            res.send(pdf);
        } catch (error) {
            console.error('PDF generation error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Generate and download PDF directly (without saving to DB)
    router.get('/pdf', async (req, res) => {
        try {
            if (!pdfUtils) {
                return res.status(501).json({ error: 'PDF generation not available. Install pdfkit: npm install pdfkit' });
            }

            const { type = 'daily', agent_id } = req.query;

            if (!agent_id) {
                return res.status(400).json({ error: 'agent_id is required' });
            }

            const reportData = generateReport(db, agent_id, type);
            const pdf = await pdfUtils.generateReportPDF(reportData);

            const filename = `report_${reportData.agent?.employee_name || 'unknown'}_${type}_${reportData.period?.start || 'unknown'}.pdf`
                .replace(/[^a-z0-9_.-]/gi, '_');

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', pdf.length);
            res.send(pdf);
        } catch (error) {
            console.error('PDF generation error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};


function generateReport(db, agentId, type) {
    const now = new Date();
    let startDate;

    if (type === 'weekly') {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
    } else {
        // daily
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
    }

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = now.toISOString().split('T')[0];

    // Get agent info
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);

    // Total active time (from activities)
    const activeTime = db.prepare(`
        SELECT COALESCE(SUM(duration_seconds), 0) as total
        FROM activities
        WHERE agent_id = ? AND date(created_at) BETWEEN ? AND ?
    `).get(agentId, startStr, endStr);

    // Top apps by duration
    const topApps = db.prepare(`
        SELECT app_name, SUM(duration_seconds) as total_seconds, COUNT(*) as session_count
        FROM activities
        WHERE agent_id = ? AND date(created_at) BETWEEN ? AND ?
        GROUP BY app_name
        ORDER BY total_seconds DESC
        LIMIT 10
    `).all(agentId, startStr, endStr);

    // Top websites
    const topSites = db.prepare(`
        SELECT url, title, COUNT(*) as visit_count, SUM(duration_seconds) as total_seconds
        FROM web_history
        WHERE agent_id = ? AND date(created_at) BETWEEN ? AND ?
        GROUP BY url
        ORDER BY visit_count DESC
        LIMIT 10
    `).all(agentId, startStr, endStr);

    // Productivity score (latest)
    const productivity = db.prepare(`
        SELECT AVG(score) as avg_score, MIN(score) as min_score, MAX(score) as max_score
        FROM productivity_scores
        WHERE agent_id = ? AND score_date BETWEEN ? AND ?
    `).get(agentId, startStr, endStr);

    // Alert count by severity
    const alertCounts = db.prepare(`
        SELECT severity, COUNT(*) as count
        FROM alerts
        WHERE agent_id = ? AND date(created_at) BETWEEN ? AND ?
        GROUP BY severity
    `).all(agentId, startStr, endStr);

    // Keystroke count
    const keystrokeCount = db.prepare(`
        SELECT COALESCE(SUM(keystroke_count), 0) as total
        FROM keystrokes
        WHERE agent_id = ? AND date(created_at) BETWEEN ? AND ?
    `).get(agentId, startStr, endStr);

    // Screenshot count
    const screenshotCount = db.prepare(`
        SELECT COUNT(*) as total
        FROM screenshots
        WHERE agent_id = ? AND date(captured_at) BETWEEN ? AND ?
    `).get(agentId, startStr, endStr);

    // DLP incident count
    const dlpCount = db.prepare(`
        SELECT COUNT(*) as total
        FROM dlp_alerts
        WHERE agent_id = ? AND date(created_at) BETWEEN ? AND ?
    `).get(agentId, startStr, endStr);

    // Print jobs
    const printCount = db.prepare(`
        SELECT COUNT(*) as total, COALESCE(SUM(pages), 0) as total_pages
        FROM print_jobs
        WHERE agent_id = ? AND date(created_at) BETWEEN ? AND ?
    `).get(agentId, startStr, endStr);

    // Email count
    const emailCount = db.prepare(`
        SELECT COUNT(*) as total
        FROM emails
        WHERE agent_id = ? AND date(created_at) BETWEEN ? AND ?
    `).get(agentId, startStr, endStr);

    // Network usage total
    const networkTotal = db.prepare(`
        SELECT COALESCE(SUM(bytes_sent), 0) as total_sent,
               COALESCE(SUM(bytes_received), 0) as total_received
        FROM network_usage
        WHERE agent_id = ? AND date(created_at) BETWEEN ? AND ?
    `).get(agentId, startStr, endStr);

    // App installs
    const installCount = db.prepare(`
        SELECT COUNT(*) as total
        FROM app_installs
        WHERE agent_id = ? AND date(created_at) BETWEEN ? AND ?
    `).get(agentId, startStr, endStr);

    // Format the report
    const alertMap = {};
    for (const a of alertCounts) {
        alertMap[a.severity] = a.count;
    }

    return {
        report_type: type,
        period: { start: startStr, end: endStr },
        agent: {
            id: agentId,
            employee_name: agent?.employee_name || 'Unknown',
            pc_name: agent?.pc_name || 'Unknown',
        },
        summary: {
            total_active_seconds: activeTime.total,
            total_active_formatted: formatDuration(activeTime.total),
            productivity: {
                average: Math.round((productivity?.avg_score || 0) * 10) / 10,
                min: Math.round((productivity?.min_score || 0) * 10) / 10,
                max: Math.round((productivity?.max_score || 0) * 10) / 10,
            },
            keystrokes: keystrokeCount.total,
            screenshots: screenshotCount.total,
            emails: emailCount.total,
            print_jobs: printCount.total,
            print_pages: printCount.total_pages,
            dlp_incidents: dlpCount.total,
            app_installs: installCount.total,
            network: {
                bytes_sent: networkTotal.total_sent,
                bytes_received: networkTotal.total_received,
                sent_formatted: formatBytes(networkTotal.total_sent),
                received_formatted: formatBytes(networkTotal.total_received),
            },
            alerts: {
                critical: alertMap.critical || 0,
                high: alertMap.high || 0,
                medium: alertMap.medium || 0,
                low: alertMap.low || 0,
            },
        },
        top_apps: topApps,
        top_websites: topSites,
        generated_at: now.toISOString(),
    };
}

function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}
