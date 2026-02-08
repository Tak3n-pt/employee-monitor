/**
 * Monitoring Routes - Handle all monitoring data from agents
 */

const express = require('express');
const router = express.Router();

module.exports = (db) => {
    // Create monitoring tables if they don't exist
    db.exec(`
        CREATE TABLE IF NOT EXISTS monitoring_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            data_type TEXT,
            data TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            alert_id TEXT,
            rule_id TEXT,
            rule_name TEXT,
            description TEXT,
            category TEXT,
            severity TEXT,
            event_data TEXT,
            acknowledged INTEGER DEFAULT 0,
            acknowledged_by TEXT,
            acknowledged_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        CREATE TABLE IF NOT EXISTS web_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            url TEXT,
            title TEXT,
            browser TEXT,
            duration_seconds INTEGER,
            visit_time DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        CREATE TABLE IF NOT EXISTS file_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            action TEXT,
            filepath TEXT,
            filename TEXT,
            category TEXT,
            is_sensitive INTEGER,
            file_size INTEGER,
            event_time DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        CREATE TABLE IF NOT EXISTS print_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            job_id INTEGER,
            printer TEXT,
            document TEXT,
            pages INTEGER,
            size_bytes INTEGER,
            print_time DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        CREATE TABLE IF NOT EXISTS dlp_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            alert_type TEXT,
            description TEXT,
            severity TEXT,
            source TEXT,
            masked_value TEXT,
            detected_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        CREATE TABLE IF NOT EXISTS productivity_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            score REAL,
            grade TEXT,
            active_seconds INTEGER,
            productive_seconds INTEGER,
            idle_seconds INTEGER,
            score_date DATE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        CREATE TABLE IF NOT EXISTS time_tracking (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            entry_type TEXT,
            clock_in_time DATETIME,
            clock_out_time DATETIME,
            break_start DATETIME,
            break_end DATETIME,
            duration_seconds INTEGER,
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        CREATE TABLE IF NOT EXISTS device_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            device_type TEXT,
            device_name TEXT,
            device_id TEXT,
            serial_number TEXT,
            action TEXT,
            allowed INTEGER,
            reason TEXT,
            event_time DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        CREATE TABLE IF NOT EXISTS login_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            event_type TEXT,
            username TEXT,
            domain TEXT,
            logon_type TEXT,
            source_ip TEXT,
            event_time DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        CREATE TABLE IF NOT EXISTS comm_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            event_type TEXT,
            app_name TEXT,
            app_type TEXT,
            category TEXT,
            detected_from TEXT,
            window_title TEXT,
            event_time DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        CREATE TABLE IF NOT EXISTS blocked_apps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            app_name TEXT,
            category TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        CREATE TABLE IF NOT EXISTS blocked_websites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            url TEXT,
            reason TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        -- NEW: Keystrokes table
        CREATE TABLE IF NOT EXISTS keystrokes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            app_name TEXT,
            window_title TEXT,
            keystroke_count INTEGER,
            key_data TEXT,
            captured_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        -- NEW: Clipboard history table
        CREATE TABLE IF NOT EXISTS clipboard_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            content_type TEXT,
            content TEXT,
            content_preview TEXT,
            app_name TEXT,
            captured_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        CREATE INDEX IF NOT EXISTS idx_alerts_agent ON alerts(agent_id);
        CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
        CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
        CREATE INDEX IF NOT EXISTS idx_web_history_agent ON web_history(agent_id);
        CREATE INDEX IF NOT EXISTS idx_web_history_time ON web_history(visit_time);
        CREATE INDEX IF NOT EXISTS idx_file_events_agent ON file_events(agent_id);
        CREATE INDEX IF NOT EXISTS idx_file_events_time ON file_events(event_time);
        CREATE INDEX IF NOT EXISTS idx_file_events_sensitive ON file_events(is_sensitive);
        CREATE INDEX IF NOT EXISTS idx_productivity_agent_date ON productivity_scores(agent_id, score_date);
        CREATE INDEX IF NOT EXISTS idx_dlp_alerts_agent ON dlp_alerts(agent_id);
        CREATE INDEX IF NOT EXISTS idx_dlp_alerts_severity ON dlp_alerts(severity);
        CREATE INDEX IF NOT EXISTS idx_device_events_agent ON device_events(agent_id);
        CREATE INDEX IF NOT EXISTS idx_device_events_time ON device_events(event_time);
        CREATE INDEX IF NOT EXISTS idx_login_events_agent ON login_events(agent_id);
        CREATE INDEX IF NOT EXISTS idx_login_events_time ON login_events(event_time);
        CREATE INDEX IF NOT EXISTS idx_comm_events_agent ON comm_events(agent_id);
        CREATE INDEX IF NOT EXISTS idx_print_jobs_agent ON print_jobs(agent_id);
        CREATE INDEX IF NOT EXISTS idx_blocked_apps_agent ON blocked_apps(agent_id);
        CREATE INDEX IF NOT EXISTS idx_blocked_websites_agent ON blocked_websites(agent_id);
        CREATE INDEX IF NOT EXISTS idx_keystrokes_agent ON keystrokes(agent_id);
        CREATE INDEX IF NOT EXISTS idx_keystrokes_time ON keystrokes(captured_at);
        CREATE INDEX IF NOT EXISTS idx_clipboard_agent ON clipboard_history(agent_id);
        CREATE INDEX IF NOT EXISTS idx_clipboard_time ON clipboard_history(captured_at);

        -- Emails table
        CREATE TABLE IF NOT EXISTS emails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            subject TEXT,
            sender TEXT,
            sender_email TEXT,
            recipients TEXT,
            folder TEXT,
            snippet TEXT,
            has_attachments INTEGER DEFAULT 0,
            attachment_names TEXT,
            email_time DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        -- Network usage table
        CREATE TABLE IF NOT EXISTS network_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            process_name TEXT,
            bytes_sent INTEGER DEFAULT 0,
            bytes_received INTEGER DEFAULT 0,
            connections_count INTEGER DEFAULT 0,
            measured_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        -- Application installs table
        CREATE TABLE IF NOT EXISTS app_installs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            action TEXT,
            app_name TEXT,
            version TEXT,
            publisher TEXT,
            install_location TEXT,
            detected_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        -- Work schedules table
        CREATE TABLE IF NOT EXISTS work_schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            day_of_week INTEGER,
            start_time TEXT,
            end_time TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        -- Report schedules table
        CREATE TABLE IF NOT EXISTS report_schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            report_type TEXT DEFAULT 'daily',
            enabled INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        -- Generated reports table
        CREATE TABLE IF NOT EXISTS generated_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            report_type TEXT,
            report_data TEXT,
            generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        CREATE INDEX IF NOT EXISTS idx_emails_agent ON emails(agent_id);
        CREATE INDEX IF NOT EXISTS idx_emails_time ON emails(email_time);
        CREATE INDEX IF NOT EXISTS idx_network_agent ON network_usage(agent_id);
        CREATE INDEX IF NOT EXISTS idx_network_time ON network_usage(measured_at);
        CREATE INDEX IF NOT EXISTS idx_installs_agent ON app_installs(agent_id);
        CREATE INDEX IF NOT EXISTS idx_installs_time ON app_installs(detected_at);
        CREATE INDEX IF NOT EXISTS idx_schedules_agent ON work_schedules(agent_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_report_schedules_unique ON report_schedules(agent_id, report_type);
    `);

    // Receive aggregated monitoring data
    router.post('/data', (req, res) => {
        try {
            const {
                agent_id,
                timestamp,
                web_history,
                file_events,
                print_jobs,
                dlp_alerts,
                device_events,
                login_events,
                alerts,
                risk_score,
                productivity,
                time_tracking,
                keystrokes,
                clipboard,
            } = req.body;

            // Store web history
            if (web_history && web_history.length > 0) {
                const webStmt = db.prepare(`
                    INSERT INTO web_history (agent_id, url, title, browser, duration_seconds, visit_time)
                    VALUES (?, ?, ?, ?, ?, ?)
                `);
                for (const entry of web_history.slice(0, 50)) {
                    try {
                        webStmt.run(
                            agent_id,
                            entry.url,
                            entry.title,
                            entry.browser,
                            entry.duration_seconds || 0,
                            entry.visit_time || entry.timestamp || timestamp
                        );
                    } catch (e) { console.error('Insert error (web_history):', e.message); }
                }
            }

            // Store file events
            if (file_events && file_events.length > 0) {
                const fileStmt = db.prepare(`
                    INSERT INTO file_events (agent_id, action, filepath, filename, category, is_sensitive, file_size, event_time)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `);
                for (const event of file_events.slice(0, 50)) {
                    try {
                        fileStmt.run(
                            agent_id,
                            event.action,
                            event.filepath,
                            event.filename,
                            event.category,
                            event.is_sensitive ? 1 : 0,
                            event.file_size || 0,
                            event.timestamp || timestamp
                        );
                    } catch (e) { console.error('Insert error (file_events):', e.message); }
                }
            }

            // Store print jobs
            if (print_jobs && print_jobs.length > 0) {
                const printStmt = db.prepare(`
                    INSERT INTO print_jobs (agent_id, job_id, printer, document, pages, size_bytes, print_time)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `);
                for (const job of print_jobs.slice(0, 20)) {
                    try {
                        printStmt.run(
                            agent_id,
                            job.job_id,
                            job.printer || job.printer_name,
                            job.document,
                            job.pages || 0,
                            job.size_bytes || 0,
                            job.timestamp || timestamp
                        );
                    } catch (e) { console.error('Insert error (print_jobs):', e.message); }
                }
            }

            // Store DLP alerts
            if (dlp_alerts && dlp_alerts.length > 0) {
                const dlpStmt = db.prepare(`
                    INSERT INTO dlp_alerts (agent_id, alert_type, description, severity, source, masked_value, detected_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `);
                for (const alert of dlp_alerts.slice(0, 20)) {
                    try {
                        dlpStmt.run(
                            agent_id,
                            alert.type,
                            alert.description,
                            alert.severity,
                            alert.source,
                            alert.masked_value,
                            alert.timestamp || timestamp
                        );
                    } catch (e) { console.error('Insert error (dlp_alerts):', e.message); }
                }
            }

            // Store device events
            if (device_events && device_events.length > 0) {
                const deviceStmt = db.prepare(`
                    INSERT INTO device_events (agent_id, device_type, device_name, device_id, serial_number, action, allowed, reason, event_time)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                for (const event of device_events.slice(0, 20)) {
                    try {
                        const device = event.device || {};
                        deviceStmt.run(
                            agent_id,
                            device.type || event.device_type,
                            device.name || event.device_name,
                            device.device_id,
                            device.serial_number,
                            event.action,
                            event.allowed ? 1 : 0,
                            event.reason,
                            event.timestamp || timestamp
                        );
                    } catch (e) { console.error('Insert error (device_events):', e.message); }
                }
            }

            // Store login events
            if (login_events && login_events.length > 0) {
                const loginStmt = db.prepare(`
                    INSERT INTO login_events (agent_id, event_type, username, domain, logon_type, source_ip, event_time)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `);
                for (const event of login_events.slice(0, 20)) {
                    try {
                        loginStmt.run(
                            agent_id,
                            event.event_type,
                            event.user || event.username,
                            event.domain,
                            event.logon_type,
                            event.source_ip,
                            event.timestamp || timestamp
                        );
                    } catch (e) { console.error('Insert error (login_events):', e.message); }
                }
            }

            // Store communication events
            const { comm_events } = req.body;
            if (comm_events && comm_events.length > 0) {
                const commStmt = db.prepare(`
                    INSERT INTO comm_events (agent_id, event_type, app_name, app_type, category, detected_from, window_title, event_time)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `);
                for (const event of comm_events.slice(0, 20)) {
                    try {
                        const app = event.app || {};
                        commStmt.run(
                            agent_id,
                            event.event_type || 'comm_app_active',
                            app.name || event.app_name,
                            app.type || event.app_type,
                            app.category || event.category,
                            app.detected_from || event.detected_from,
                            app.window_title || event.window_title,
                            event.timestamp || timestamp
                        );
                    } catch (e) { console.error('Insert error (comm_events):', e.message); }
                }
            }

            // Store alerts
            if (alerts && alerts.length > 0) {
                const alertStmt = db.prepare(`
                    INSERT INTO alerts (agent_id, alert_id, rule_id, rule_name, description, category, severity, event_data)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `);
                for (const alert of alerts.slice(0, 20)) {
                    try {
                        alertStmt.run(
                            agent_id,
                            alert.alert_id,
                            alert.rule_id,
                            alert.rule_name,
                            alert.description,
                            alert.category,
                            alert.severity,
                            JSON.stringify(alert.event || {})
                        );
                    } catch (e) { console.error('Insert error (alerts):', e.message); }
                }
            }

            // Store productivity score
            if (productivity && productivity.score !== undefined) {
                const today = new Date().toISOString().split('T')[0];
                try {
                    // Update or insert today's score
                    db.prepare(`
                        INSERT OR REPLACE INTO productivity_scores
                        (agent_id, score, grade, active_seconds, productive_seconds, idle_seconds, score_date)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        agent_id,
                        productivity.score,
                        productivity.grade,
                        productivity.total_active_seconds || 0,
                        productivity.productive_seconds || 0,
                        productivity.idle_seconds || 0,
                        productivity.date || today
                    );
                } catch (e) { console.error('Insert error (productivity):', e.message); }
            }

            // Store time tracking
            if (time_tracking) {
                const today = new Date().toISOString().split('T')[0];
                try {
                    db.prepare(`
                        INSERT OR REPLACE INTO time_tracking
                        (agent_id, entry_type, duration_seconds, note)
                        VALUES (?, 'daily_summary', ?, ?)
                    `).run(
                        agent_id,
                        time_tracking.total_work_seconds || 0,
                        `Work: ${time_tracking.total_work_formatted}, Break: ${time_tracking.total_break_formatted}`
                    );
                } catch (e) { console.error('Insert error (time_tracking):', e.message); }
            }

            // Store keystrokes
            if (keystrokes && keystrokes.length > 0) {
                const keystrokeStmt = db.prepare(`
                    INSERT INTO keystrokes (agent_id, app_name, window_title, keystroke_count, key_data, captured_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `);
                for (const ks of keystrokes.slice(0, 50)) {
                    try {
                        keystrokeStmt.run(
                            agent_id,
                            ks.app_name || ks.application || '',
                            ks.window_title,
                            ks.count || ks.keystroke_count || (ks.keystrokes ? ks.keystrokes.length : 0),
                            ks.key_data || ks.keys || ks.keystrokes || '',
                            ks.timestamp || ks.captured_at || timestamp
                        );
                    } catch (e) { console.error('Insert error (keystrokes):', e.message); }
                }
            }

            // Store clipboard
            if (clipboard && clipboard.length > 0) {
                const clipStmt = db.prepare(`
                    INSERT INTO clipboard_history (agent_id, content_type, content, content_preview, app_name, captured_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `);
                for (const clip of clipboard.slice(0, 20)) {
                    try {
                        const content = clip.content || '';
                        clipStmt.run(
                            agent_id,
                            clip.content_type || clip.type || 'text',
                            content,
                            content.substring(0, 200),
                            clip.app_name || clip.application,
                            clip.timestamp || clip.captured_at || timestamp
                        );
                    } catch (e) { console.error('Insert error (clipboard):', e.message); }
                }
            }

            // Store emails
            const { emails } = req.body;
            if (emails && emails.length > 0) {
                const emailStmt = db.prepare(`
                    INSERT INTO emails (agent_id, subject, sender, sender_email, recipients, folder, snippet, has_attachments, attachment_names, email_time)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                for (const email of emails.slice(0, 20)) {
                    try {
                        emailStmt.run(
                            agent_id,
                            email.subject || '',
                            email.sender || '',
                            email.sender_email || '',
                            JSON.stringify(email.recipients || []),
                            email.folder || '',
                            email.snippet || '',
                            email.has_attachments ? 1 : 0,
                            JSON.stringify(email.attachment_names || []),
                            email.timestamp || timestamp
                        );
                    } catch (e) { console.error('Insert error (emails):', e.message); }
                }
            }

            // Store network usage
            const { network_usage } = req.body;
            if (network_usage && network_usage.length > 0) {
                const netStmt = db.prepare(`
                    INSERT INTO network_usage (agent_id, process_name, bytes_sent, bytes_received, connections_count, measured_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `);
                for (const entry of network_usage.slice(0, 50)) {
                    try {
                        netStmt.run(
                            agent_id,
                            entry.process_name || '',
                            entry.bytes_sent || 0,
                            entry.bytes_received || 0,
                            entry.connections_count || 0,
                            entry.timestamp || timestamp
                        );
                    } catch (e) { console.error('Insert error (network_usage):', e.message); }
                }
            }

            // Store app installs
            const { app_installs } = req.body;
            if (app_installs && app_installs.length > 0) {
                const installStmt = db.prepare(`
                    INSERT INTO app_installs (agent_id, action, app_name, version, publisher, install_location, detected_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `);
                for (const entry of app_installs.slice(0, 20)) {
                    try {
                        installStmt.run(
                            agent_id,
                            entry.action || '',
                            entry.app_name || '',
                            entry.version || '',
                            entry.publisher || '',
                            entry.install_location || '',
                            entry.timestamp || timestamp
                        );
                    } catch (e) { console.error('Insert error (app_installs):', e.message); }
                }
            }

            res.json({ success: true });
        } catch (error) {
            console.error('Error storing monitoring data:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ==================== ACTIVITIES ====================
    // Get activities (from activities table in database.js)
    router.get('/activities', (req, res) => {
        try {
            const { agent_id, limit = 100 } = req.query;

            let query = 'SELECT t.*, a.employee_name, a.pc_name FROM activities t LEFT JOIN agents a ON t.agent_id = a.id WHERE 1=1';
            const params = [];

            if (agent_id) {
                query += ' AND t.agent_id = ?';
                params.push(agent_id);
            }

            query += ' ORDER BY t.created_at DESC LIMIT ?';
            params.push(parseInt(limit));

            const activities = db.prepare(query).all(...params);
            res.json(activities);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ==================== KEYSTROKES ====================
    // Get keystrokes
    router.get('/keystrokes', (req, res) => {
        try {
            const { agent_id, limit = 100 } = req.query;

            let query = 'SELECT t.*, t.key_data as content, t.captured_at as timestamp, a.employee_name, a.pc_name FROM keystrokes t LEFT JOIN agents a ON t.agent_id = a.id WHERE 1=1';
            const params = [];

            if (agent_id) {
                query += ' AND t.agent_id = ?';
                params.push(agent_id);
            }

            query += ' ORDER BY t.created_at DESC LIMIT ?';
            params.push(parseInt(limit));

            const keystrokes = db.prepare(query).all(...params);
            res.json(keystrokes);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ==================== CLIPBOARD ====================
    // Get clipboard history
    router.get('/clipboard', (req, res) => {
        try {
            const { agent_id, limit = 100 } = req.query;

            let query = 'SELECT t.*, t.captured_at as timestamp, a.employee_name, a.pc_name FROM clipboard_history t LEFT JOIN agents a ON t.agent_id = a.id WHERE 1=1';
            const params = [];

            if (agent_id) {
                query += ' AND t.agent_id = ?';
                params.push(agent_id);
            }

            query += ' ORDER BY t.created_at DESC LIMIT ?';
            params.push(parseInt(limit));

            const clipboard = db.prepare(query).all(...params);
            res.json(clipboard);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ==================== PRINT JOBS ====================
    // Get print jobs - supports optional agent_id
    router.get('/print-jobs', (req, res) => {
        try {
            const { agent_id, limit = 100 } = req.query;

            let query = 'SELECT t.*, t.print_time as timestamp, a.employee_name, a.pc_name FROM print_jobs t LEFT JOIN agents a ON t.agent_id = a.id WHERE 1=1';
            const params = [];

            if (agent_id) {
                query += ' AND t.agent_id = ?';
                params.push(agent_id);
            }

            query += ' ORDER BY t.created_at DESC LIMIT ?';
            params.push(parseInt(limit));

            const jobs = db.prepare(query).all(...params);
            // Map printer to printer_name for frontend compatibility
            const result = jobs.map(j => ({ ...j, printer_name: j.printer }));
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ==================== LOGIN EVENTS ====================
    // Get login events - supports optional agent_id
    router.get('/login-events', (req, res) => {
        try {
            const { agent_id, limit = 100 } = req.query;

            let query = 'SELECT t.*, t.event_time as timestamp, a.employee_name, a.pc_name FROM login_events t LEFT JOIN agents a ON t.agent_id = a.id WHERE 1=1';
            const params = [];

            if (agent_id) {
                query += ' AND t.agent_id = ?';
                params.push(agent_id);
            }

            query += ' ORDER BY t.created_at DESC LIMIT ?';
            params.push(parseInt(limit));

            const events = db.prepare(query).all(...params);
            res.json(events);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ==================== TIME ENTRIES ====================
    // Get time tracking entries - supports optional agent_id
    router.get('/time-entries', (req, res) => {
        try {
            const { agent_id, limit = 100 } = req.query;

            let query = 'SELECT t.*, a.employee_name, a.pc_name FROM time_tracking t LEFT JOIN agents a ON t.agent_id = a.id WHERE 1=1';
            const params = [];

            if (agent_id) {
                query += ' AND t.agent_id = ?';
                params.push(agent_id);
            }

            query += ' ORDER BY t.created_at DESC LIMIT ?';
            params.push(parseInt(limit));

            const entries = db.prepare(query).all(...params);
            res.json(entries);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ==================== COMMUNICATION EVENTS ====================
    // Get communication events - supports optional agent_id
    router.get('/comm-events', (req, res) => {
        try {
            const { agent_id, limit = 100 } = req.query;

            let query = 'SELECT t.*, t.event_time as timestamp, a.employee_name, a.pc_name FROM comm_events t LEFT JOIN agents a ON t.agent_id = a.id WHERE 1=1';
            const params = [];

            if (agent_id) {
                query += ' AND t.agent_id = ?';
                params.push(agent_id);
            }

            query += ' ORDER BY t.created_at DESC LIMIT ?';
            params.push(parseInt(limit));

            const events = db.prepare(query).all(...params);
            res.json(events);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ==================== ALERTS ====================
    // Get alerts
    router.get('/alerts', (req, res) => {
        try {
            const { agent_id, severity, acknowledged, limit = 100 } = req.query;

            let query = 'SELECT t.*, t.created_at as timestamp, a.employee_name, a.pc_name FROM alerts t LEFT JOIN agents a ON t.agent_id = a.id WHERE 1=1';
            const params = [];

            if (agent_id) {
                query += ' AND t.agent_id = ?';
                params.push(agent_id);
            }

            if (severity) {
                query += ' AND t.severity = ?';
                params.push(severity);
            }

            if (acknowledged !== undefined) {
                query += ' AND t.acknowledged = ?';
                params.push(acknowledged === 'true' ? 1 : 0);
            }

            query += ' ORDER BY t.created_at DESC LIMIT ?';
            params.push(parseInt(limit));

            const alerts = db.prepare(query).all(...params);
            res.json(alerts);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Acknowledge alert
    router.post('/alerts/:id/acknowledge', (req, res) => {
        try {
            const { id } = req.params;
            const { acknowledged_by } = req.body;

            db.prepare(`
                UPDATE alerts SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(acknowledged_by || 'admin', id);

            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ==================== PRODUCTIVITY ====================
    // Get productivity scores - supports both URL param and query param
    router.get('/productivity/:agent_id?', (req, res) => {
        try {
            const agent_id = req.params.agent_id || req.query.agent_id;
            const limit = req.query.limit || req.query.days || 30;

            let query = 'SELECT t.*, a.employee_name, a.pc_name FROM productivity_scores t LEFT JOIN agents a ON t.agent_id = a.id WHERE 1=1';
            const params = [];

            if (agent_id) {
                query += ' AND t.agent_id = ?';
                params.push(agent_id);
            }

            query += ' ORDER BY t.score_date DESC LIMIT ?';
            params.push(parseInt(limit));

            const scores = db.prepare(query).all(...params);
            res.json(scores);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ==================== WEB HISTORY ====================
    // Get web history - supports both URL param and query param
    router.get('/web-history/:agent_id?', (req, res) => {
        try {
            const agent_id = req.params.agent_id || req.query.agent_id;
            const { limit = 100 } = req.query;

            let query = 'SELECT t.*, t.visit_time as timestamp, a.employee_name, a.pc_name FROM web_history t LEFT JOIN agents a ON t.agent_id = a.id WHERE 1=1';
            const params = [];

            if (agent_id) {
                query += ' AND t.agent_id = ?';
                params.push(agent_id);
            }

            query += ' ORDER BY t.created_at DESC LIMIT ?';
            params.push(parseInt(limit));

            const history = db.prepare(query).all(...params);
            res.json(history);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ==================== FILE EVENTS ====================
    // Get file events - supports both URL param and query param
    router.get('/file-events/:agent_id?', (req, res) => {
        try {
            const agent_id = req.params.agent_id || req.query.agent_id;
            const { sensitive_only, limit = 100 } = req.query;

            let query = 'SELECT t.*, t.filepath as file_path, t.event_time as timestamp, a.employee_name, a.pc_name FROM file_events t LEFT JOIN agents a ON t.agent_id = a.id WHERE 1=1';
            const params = [];

            if (agent_id) {
                query += ' AND t.agent_id = ?';
                params.push(agent_id);
            }

            if (sensitive_only === 'true') {
                query += ' AND t.is_sensitive = 1';
            }

            query += ' ORDER BY t.created_at DESC LIMIT ?';
            params.push(parseInt(limit));

            const events = db.prepare(query).all(...params);
            res.json(events);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ==================== DLP ALERTS ====================
    // Get DLP alerts - supports both URL param and query param
    router.get('/dlp-alerts/:agent_id?', (req, res) => {
        try {
            const agent_id = req.params.agent_id || req.query.agent_id;
            const { severity, limit = 50 } = req.query;

            let query = 'SELECT t.*, t.detected_at as timestamp, a.employee_name, a.pc_name FROM dlp_alerts t LEFT JOIN agents a ON t.agent_id = a.id WHERE 1=1';
            const params = [];

            if (agent_id) {
                query += ' AND t.agent_id = ?';
                params.push(agent_id);
            }

            if (severity) {
                query += ' AND t.severity = ?';
                params.push(severity);
            }

            query += ' ORDER BY t.created_at DESC LIMIT ?';
            params.push(parseInt(limit));

            const alerts = db.prepare(query).all(...params);
            res.json(alerts);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ==================== DEVICE EVENTS ====================
    // Get device events - supports both URL param and query param
    router.get('/device-events/:agent_id?', (req, res) => {
        try {
            const agent_id = req.params.agent_id || req.query.agent_id;
            const { limit = 50 } = req.query;

            let query = 'SELECT t.*, t.event_time as timestamp, a.employee_name, a.pc_name FROM device_events t LEFT JOIN agents a ON t.agent_id = a.id WHERE 1=1';
            const params = [];

            if (agent_id) {
                query += ' AND t.agent_id = ?';
                params.push(agent_id);
            }

            query += ' ORDER BY t.created_at DESC LIMIT ?';
            params.push(parseInt(limit));

            const events = db.prepare(query).all(...params);
            res.json(events);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ==================== BLOCKED APPS ====================
    // Add blocked app
    router.post('/blocked-apps', (req, res) => {
        try {
            const { agent_id, app_name, category } = req.body;

            db.prepare(`
                INSERT INTO blocked_apps (agent_id, app_name, category)
                VALUES (?, ?, ?)
            `).run(agent_id || null, app_name, category || 'custom');

            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Get blocked apps - supports both URL param and query param, also returns all if no agent
    router.get('/blocked-apps/:agent_id?', (req, res) => {
        try {
            const agent_id = req.params.agent_id || req.query.agent_id;

            let apps;
            if (agent_id) {
                // Get both agent-specific and global (null agent_id) blocked apps
                apps = db.prepare(`
                    SELECT t.*, a.employee_name, a.pc_name FROM blocked_apps t
                    LEFT JOIN agents a ON t.agent_id = a.id
                    WHERE t.agent_id = ? OR t.agent_id IS NULL
                    ORDER BY t.created_at DESC
                `).all(agent_id);
            } else {
                // Get all blocked apps
                apps = db.prepare(`
                    SELECT t.*, a.employee_name, a.pc_name FROM blocked_apps t
                    LEFT JOIN agents a ON t.agent_id = a.id
                    ORDER BY t.created_at DESC
                `).all();
            }

            res.json(apps);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Remove blocked app
    router.delete('/blocked-apps/:id', (req, res) => {
        try {
            const { id } = req.params;
            db.prepare('DELETE FROM blocked_apps WHERE id = ?').run(id);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ==================== BLOCKED WEBSITES ====================
    // Add blocked website
    router.post('/blocked-websites', (req, res) => {
        try {
            const { agent_id, url, domain, reason } = req.body;
            // Support both url and domain field names
            const siteUrl = url || domain;

            db.prepare(`
                INSERT INTO blocked_websites (agent_id, url, reason)
                VALUES (?, ?, ?)
            `).run(agent_id || null, siteUrl, reason || '');

            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Get blocked websites - supports both URL param and query param, also returns all if no agent
    router.get('/blocked-websites/:agent_id?', (req, res) => {
        try {
            const agent_id = req.params.agent_id || req.query.agent_id;

            let sites;
            if (agent_id) {
                sites = db.prepare(`
                    SELECT t.*, a.employee_name, a.pc_name FROM blocked_websites t
                    LEFT JOIN agents a ON t.agent_id = a.id
                    WHERE t.agent_id = ? OR t.agent_id IS NULL
                    ORDER BY t.created_at DESC
                `).all(agent_id);
            } else {
                // Get all blocked websites
                sites = db.prepare(`
                    SELECT t.*, a.employee_name, a.pc_name FROM blocked_websites t
                    LEFT JOIN agents a ON t.agent_id = a.id
                    ORDER BY t.created_at DESC
                `).all();
            }

            // Add domain field for frontend compatibility
            const result = sites.map(s => ({ ...s, domain: s.url }));
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Remove blocked website
    router.delete('/blocked-websites/:id', (req, res) => {
        try {
            const { id } = req.params;
            db.prepare('DELETE FROM blocked_websites WHERE id = ?').run(id);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ==================== EMAILS ====================
    router.get('/emails', (req, res) => {
        try {
            const { agent_id, limit = 100 } = req.query;

            let query = 'SELECT t.*, t.email_time as timestamp, a.employee_name, a.pc_name FROM emails t LEFT JOIN agents a ON t.agent_id = a.id WHERE 1=1';
            const params = [];

            if (agent_id) {
                query += ' AND t.agent_id = ?';
                params.push(agent_id);
            }

            query += ' ORDER BY t.created_at DESC LIMIT ?';
            params.push(parseInt(limit));

            const emails = db.prepare(query).all(...params);
            // Parse JSON fields
            const result = emails.map(e => ({
                ...e,
                recipients: JSON.parse(e.recipients || '[]'),
                attachment_names: JSON.parse(e.attachment_names || '[]'),
            }));
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ==================== NETWORK USAGE ====================
    router.get('/network', (req, res) => {
        try {
            const { agent_id, limit = 200 } = req.query;

            let query = 'SELECT t.*, t.measured_at as timestamp, a.employee_name, a.pc_name FROM network_usage t LEFT JOIN agents a ON t.agent_id = a.id WHERE 1=1';
            const params = [];

            if (agent_id) {
                query += ' AND t.agent_id = ?';
                params.push(agent_id);
            }

            query += ' ORDER BY t.created_at DESC LIMIT ?';
            params.push(parseInt(limit));

            const usage = db.prepare(query).all(...params);
            res.json(usage);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Network usage summary (aggregated per process)
    router.get('/network/summary', (req, res) => {
        try {
            const { agent_id } = req.query;
            const today = new Date().toISOString().split('T')[0];

            let query = `
                SELECT process_name,
                       SUM(bytes_sent) as total_sent,
                       SUM(bytes_received) as total_received,
                       MAX(connections_count) as max_connections,
                       COUNT(*) as sample_count
                FROM network_usage
                WHERE date(measured_at) = ?
            `;
            const params = [today];

            if (agent_id) {
                query += ' AND agent_id = ?';
                params.push(agent_id);
            }

            query += ' GROUP BY process_name ORDER BY (SUM(bytes_sent) + SUM(bytes_received)) DESC LIMIT 50';

            const summary = db.prepare(query).all(...params);
            res.json(summary);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ==================== APP INSTALLS ====================
    router.get('/installs', (req, res) => {
        try {
            const { agent_id, limit = 100 } = req.query;

            let query = 'SELECT t.*, t.detected_at as timestamp, a.employee_name, a.pc_name FROM app_installs t LEFT JOIN agents a ON t.agent_id = a.id WHERE 1=1';
            const params = [];

            if (agent_id) {
                query += ' AND t.agent_id = ?';
                params.push(agent_id);
            }

            query += ' ORDER BY t.created_at DESC LIMIT ?';
            params.push(parseInt(limit));

            const installs = db.prepare(query).all(...params);
            res.json(installs);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ==================== WORK SCHEDULES & ATTENDANCE ====================
    // Set work schedule for an agent
    router.put('/schedule/:agentId', (req, res) => {
        try {
            const { agentId } = req.params;
            const { schedules } = req.body;
            // schedules = [{day_of_week: 0-6, start_time: "09:00", end_time: "17:00"}, ...]

            // Delete existing schedule
            db.prepare('DELETE FROM work_schedules WHERE agent_id = ?').run(agentId);

            // Insert new schedule
            const stmt = db.prepare(`
                INSERT INTO work_schedules (agent_id, day_of_week, start_time, end_time)
                VALUES (?, ?, ?, ?)
            `);

            for (const s of (schedules || [])) {
                stmt.run(agentId, s.day_of_week, s.start_time, s.end_time);
            }

            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Get work schedule for an agent
    router.get('/schedule/:agentId', (req, res) => {
        try {
            const { agentId } = req.params;
            const schedules = db.prepare(
                'SELECT * FROM work_schedules WHERE agent_id = ? ORDER BY day_of_week'
            ).all(agentId);
            res.json(schedules);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Get attendance status for an agent
    router.get('/attendance/:agentId', (req, res) => {
        try {
            const { agentId } = req.params;
            const today = new Date();
            const dayOfWeek = today.getDay(); // 0=Sunday
            const todayStr = today.toISOString().split('T')[0];

            // Get schedule for today
            const schedule = db.prepare(
                'SELECT * FROM work_schedules WHERE agent_id = ? AND day_of_week = ?'
            ).get(agentId, dayOfWeek);

            // Get first activity today (clock-in proxy)
            const firstActivity = db.prepare(`
                SELECT MIN(created_at) as first_seen
                FROM activities
                WHERE agent_id = ? AND date(created_at) = ?
            `).get(agentId, todayStr);

            // Get last activity today
            const lastActivity = db.prepare(`
                SELECT MAX(created_at) as last_seen
                FROM activities
                WHERE agent_id = ? AND date(created_at) = ?
            `).get(agentId, todayStr);

            // Get time tracking
            const timeEntry = db.prepare(`
                SELECT * FROM time_tracking
                WHERE agent_id = ? AND date(created_at) = ?
                ORDER BY created_at DESC LIMIT 1
            `).get(agentId, todayStr);

            let attendance_status = 'no_schedule';
            let late_minutes = 0;
            let overtime_minutes = 0;

            if (schedule && firstActivity && firstActivity.first_seen) {
                const scheduledStart = new Date(`${todayStr}T${schedule.start_time}:00`);
                const scheduledEnd = new Date(`${todayStr}T${schedule.end_time}:00`);
                const actualStart = new Date(firstActivity.first_seen);

                // Check late arrival (over 5 min grace period)
                const diffMinutes = (actualStart - scheduledStart) / 60000;
                if (diffMinutes > 5) {
                    attendance_status = 'late';
                    late_minutes = Math.round(diffMinutes);
                } else {
                    attendance_status = 'on_time';
                }

                // Check overtime / early departure
                if (lastActivity && lastActivity.last_seen) {
                    const actualEnd = new Date(lastActivity.last_seen);
                    const endDiff = (actualEnd - scheduledEnd) / 60000;
                    if (endDiff > 0) {
                        overtime_minutes = Math.round(endDiff);
                        attendance_status = attendance_status === 'late' ? 'late' : 'overtime';
                    } else if (endDiff < -30) {
                        // Left more than 30 min early
                        attendance_status = 'early_departure';
                    }
                }
            } else if (schedule && !firstActivity?.first_seen) {
                const now = new Date();
                const scheduledStart = new Date(`${todayStr}T${schedule.start_time}:00`);
                if (now > scheduledStart) {
                    attendance_status = 'absent';
                }
            }

            res.json({
                agent_id: agentId,
                date: todayStr,
                schedule: schedule || null,
                first_seen: firstActivity?.first_seen || null,
                last_seen: lastActivity?.last_seen || null,
                attendance_status,
                late_minutes,
                overtime_minutes,
                time_tracking: timeEntry || null,
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ==================== DASHBOARD SUMMARY ====================
    // Get dashboard summary
    router.get('/dashboard-summary', (req, res) => {
        try {
            const today = new Date().toISOString().split('T')[0];

            // Get counts
            const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents').get().count;
            const onlineCount = db.prepare(`
                SELECT COUNT(*) as count FROM agents
                WHERE status = 'online' AND datetime(last_seen) > datetime('now', '-5 minutes')
            `).get().count;

            const criticalAlerts = db.prepare(`
                SELECT COUNT(*) as count FROM alerts
                WHERE severity = 'critical' AND acknowledged = 0
                AND date(created_at) = ?
            `).get(today).count;

            const highAlerts = db.prepare(`
                SELECT COUNT(*) as count FROM alerts
                WHERE severity = 'high' AND acknowledged = 0
                AND date(created_at) = ?
            `).get(today).count;

            const dlpAlerts = db.prepare(`
                SELECT COUNT(*) as count FROM dlp_alerts
                WHERE date(created_at) = ?
            `).get(today).count;

            const avgProductivity = db.prepare(`
                SELECT AVG(score) as avg FROM productivity_scores
                WHERE score_date = ?
            `).get(today).avg || 0;

            res.json({
                agents: {
                    total: agentCount,
                    online: onlineCount,
                },
                alerts: {
                    critical: criticalAlerts,
                    high: highAlerts,
                    dlp: dlpAlerts,
                },
                productivity: {
                    average: Math.round(avgProductivity * 10) / 10,
                },
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};
