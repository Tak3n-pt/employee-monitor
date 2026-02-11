const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Database file location - use AppData in production, local data/ in dev
const isPackaged = __dirname.includes('app.asar');
const appDataDir = isPackaged
    ? path.join(process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming'), 'employee-monitor-admin')
    : path.join(__dirname, '..', 'data');

const dbPath = path.join(appDataDir, 'monitor.db');

// Ensure data directory exists
if (!fs.existsSync(appDataDir)) {
    fs.mkdirSync(appDataDir, { recursive: true });
}

// Initialize database
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

// Create tables
function initializeDatabase() {
    // Agents table - registered employee machines
    db.exec(`
        CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            employee_name TEXT,
            pc_name TEXT,
            os_version TEXT,
            ip_address TEXT,
            status TEXT DEFAULT 'offline',
            last_seen DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Activities table - application usage tracking
    db.exec(`
        CREATE TABLE IF NOT EXISTS activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT NOT NULL,
            app_name TEXT,
            window_title TEXT,
            executable_path TEXT,
            started_at DATETIME,
            ended_at DATETIME,
            duration_seconds INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        )
    `);

    // Screenshots table
    db.exec(`
        CREATE TABLE IF NOT EXISTS screenshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT NOT NULL,
            filename TEXT,
            filepath TEXT,
            file_size INTEGER,
            captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        )
    `);

    // USB policies table
    db.exec(`
        CREATE TABLE IF NOT EXISTS usb_policies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            device_class TEXT NOT NULL,
            allowed INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // USB logs table
    db.exec(`
        CREATE TABLE IF NOT EXISTS usb_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT NOT NULL,
            device_name TEXT,
            device_id TEXT,
            device_class TEXT,
            action TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        )
    `);

    // Create indexes for better performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_activities_agent_id ON activities(agent_id);
        CREATE INDEX IF NOT EXISTS idx_activities_started_at ON activities(started_at);
        CREATE INDEX IF NOT EXISTS idx_screenshots_agent_id ON screenshots(agent_id);
        CREATE INDEX IF NOT EXISTS idx_usb_logs_agent_id ON usb_logs(agent_id);
    `);

    // Add ocr_text column to screenshots if not exists
    try {
        db.exec(`ALTER TABLE screenshots ADD COLUMN ocr_text TEXT`);
    } catch (e) {
        // Column already exists
    }

    // Users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'viewer',
            name TEXT,
            email TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Audit log table
    db.exec(`
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            target_type TEXT,
            target_id TEXT,
            details TEXT,
            ip_address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Settings table (key-value store)
    db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Agent groups table
    db.exec(`
        CREATE TABLE IF NOT EXISTS agent_groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            color TEXT DEFAULT '#3b82f6',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Agent group members
    db.exec(`
        CREATE TABLE IF NOT EXISTS agent_group_members (
            agent_id TEXT NOT NULL,
            group_id INTEGER NOT NULL,
            PRIMARY KEY (agent_id, group_id),
            FOREIGN KEY (agent_id) REFERENCES agents(id),
            FOREIGN KEY (group_id) REFERENCES agent_groups(id)
        )
    `);

    // Create indexes
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
    `);

    // Seed default admin user if no users exist
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (userCount.count === 0) {
        const hash = bcrypt.hashSync('admin123', 10);
        db.prepare(`
            INSERT INTO users (username, password_hash, role, name, email)
            VALUES ('admin', ?, 'admin', 'Administrator', 'admin@company.com')
        `).run(hash);
        console.log('Default admin user created (admin/admin123)');
    }

    // Seed default settings
    const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get();
    if (settingsCount.count === 0) {
        const defaults = {
            app_name: 'Employee Monitor',
            timezone: 'UTC',
            screenshot_interval: 300,
            data_sync_interval: 60,
            retention_days: 90,
            email_alerts_enabled: false,
            smtp_host: '',
            smtp_port: 587,
            smtp_user: '',
            smtp_pass: '',
            session_timeout: 1440,
            password_min_length: 6,
        };
        const insert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
        for (const [key, value] of Object.entries(defaults)) {
            insert.run(key, typeof value === 'string' ? value : JSON.stringify(value));
        }
        console.log('Default settings seeded');
    }

    console.log('Database initialized successfully');
}

// Initialize on module load
initializeDatabase();

module.exports = db;
