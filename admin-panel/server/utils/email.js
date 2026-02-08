/**
 * Email Alert Utility
 * Sends email notifications for critical events
 */

const nodemailer = require('nodemailer');

let transporter = null;
let cachedSettings = null;

/**
 * Get or create email transporter with current settings
 * @param {Object} db - Database instance
 * @returns {Object|null} Nodemailer transporter or null if not configured
 */
function getSettings(db) {
    try {
        const rows = db.prepare('SELECT key, value FROM settings').all();
        const settings = {};
        for (const row of rows) {
            settings[row.key] = row.value;
        }
        return settings;
    } catch (error) {
        console.error('Error reading settings:', error);
        return {};
    }
}

function getTransporter(db) {
    try {
        const settings = getSettings(db);

        if (!settings.smtp_host) {
            return null;
        }

        const settingsKey = `${settings.smtp_host}:${settings.smtp_port}:${settings.smtp_user}`;
        if (cachedSettings !== settingsKey || !transporter) {
            cachedSettings = settingsKey;

            transporter = nodemailer.createTransport({
                host: settings.smtp_host,
                port: settings.smtp_port || 587,
                secure: settings.smtp_port === 465,
                auth: {
                    user: settings.smtp_user,
                    pass: settings.smtp_pass
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            console.log(`Email transporter configured: ${settings.smtp_host}:${settings.smtp_port}`);
        }

        return transporter;
    } catch (error) {
        console.error('Error creating email transporter:', error);
        return null;
    }
}

/**
 * Send an alert email
 * @param {Object} db - Database instance
 * @param {string} subject - Email subject
 * @param {string} message - HTML email body
 * @param {string|null} recipients - Comma-separated recipient emails (null = use default)
 * @returns {Promise<boolean>} Success status
 */
async function sendAlert(db, subject, message, recipients = null) {
    try {
        const transport = getTransporter(db);
        if (!transport) {
            console.log('Email not configured, skipping alert');
            return false;
        }

        const settings = getSettings(db);

        if (!settings.email_alerts_enabled || settings.email_alerts_enabled === 'false') {
            console.log('Email alerts disabled');
            return false;
        }

        // Determine recipients
        const toAddresses = recipients || settings.alert_recipients || settings.smtp_user;
        if (!toAddresses) {
            console.log('No email recipients configured');
            return false;
        }

        // Build email
        const mailOptions = {
            from: `"Employee Monitor" <${settings.smtp_user}>`,
            to: toAddresses,
            subject: `[Employee Monitor] ${subject}`,
            html: buildEmailTemplate(subject, message, settings.app_name || 'Employee Monitor')
        };

        // Send email
        const result = await transport.sendMail(mailOptions);
        console.log(`Email sent: ${subject} -> ${toAddresses}`);

        // Log to database
        try {
            db.prepare(`
                INSERT INTO email_logs (recipient, subject, status, sent_at)
                VALUES (?, ?, ?, datetime('now'))
            `).run(toAddresses, subject, 'sent');
        } catch (e) {
            // Table might not exist, that's ok
        }

        return true;
    } catch (error) {
        console.error('Error sending email:', error);

        // Log failure
        try {
            db.prepare(`
                INSERT INTO email_logs (recipient, subject, status, error, sent_at)
                VALUES (?, ?, ?, ?, datetime('now'))
            `).run(recipients || 'unknown', subject, 'failed', error.message);
        } catch (e) {
            // Table might not exist
        }

        return false;
    }
}

/**
 * Send agent disconnect alert
 * @param {Object} db - Database instance
 * @param {Object} agent - Agent details
 * @returns {Promise<boolean>}
 */
async function sendAgentDisconnectAlert(db, agent) {
    const subject = `Agent Disconnected: ${agent.employee_name || agent.pc_name}`;
    const message = `
        <p><strong>Agent Offline Alert</strong></p>
        <table style="border-collapse: collapse; margin: 15px 0;">
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Employee</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${agent.employee_name || 'Unknown'}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>PC Name</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${agent.pc_name || 'Unknown'}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Last Seen</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${agent.last_seen || 'Unknown'}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Agent ID</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${agent.id}</td>
            </tr>
        </table>
        <p>The agent has been offline for more than 5 minutes.</p>
    `;
    return sendAlert(db, subject, message);
}

/**
 * Send critical alert email
 * @param {Object} db - Database instance
 * @param {Object} alert - Alert details
 * @param {Object} agent - Agent details
 * @returns {Promise<boolean>}
 */
async function sendCriticalAlert(db, alert, agent) {
    const severityColors = {
        critical: '#dc2626',
        high: '#ea580c',
        medium: '#ca8a04',
        low: '#16a34a'
    };
    const color = severityColors[alert.severity] || '#6b7280';

    const subject = `${alert.severity.toUpperCase()} Alert: ${alert.rule_name || alert.type}`;
    const message = `
        <p style="color: ${color}; font-weight: bold; font-size: 18px;">
            ${alert.severity.toUpperCase()} SEVERITY ALERT
        </p>
        <table style="border-collapse: collapse; margin: 15px 0;">
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Alert Type</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${alert.rule_name || alert.type}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Employee</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${agent?.employee_name || 'Unknown'}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>PC Name</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${agent?.pc_name || 'Unknown'}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Description</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${alert.description || 'No description'}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Time</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${new Date().toLocaleString()}</td>
            </tr>
        </table>
        <p>Please review this alert in the admin panel.</p>
    `;
    return sendAlert(db, subject, message);
}

/**
 * Build HTML email template
 */
function buildEmailTemplate(title, content, appName) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 30px; border-radius: 12px 12px 0 0;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                                    ${appName}
                                </h1>
                            </td>
                        </tr>
                        <!-- Content -->
                        <tr>
                            <td style="padding: 30px;">
                                <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px;">${title}</h2>
                                <div style="color: #4b5563; font-size: 14px; line-height: 1.6;">
                                    ${content}
                                </div>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 20px 30px; background-color: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                                    This is an automated message from ${appName}.<br>
                                    Please do not reply to this email.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
}

/**
 * Test email configuration
 * @param {Object} db - Database instance
 * @returns {Promise<Object>} Test result
 */
async function testEmailConfig(db) {
    try {
        const transport = getTransporter(db);
        if (!transport) {
            return { success: false, error: 'SMTP not configured' };
        }

        await transport.verify();
        return { success: true, message: 'SMTP connection successful' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendAlert,
    sendAgentDisconnectAlert,
    sendCriticalAlert,
    testEmailConfig,
    getTransporter
};
