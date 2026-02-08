/**
 * PDF Report Generator
 * Generates PDF versions of reports
 */

const PDFDocument = require('pdfkit');

/**
 * Generate a PDF report from report data
 * @param {Object} reportData - The report data object
 * @returns {Promise<Buffer>} PDF file as buffer
 */
function generateReportPDF(reportData) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                info: {
                    Title: `Employee Activity Report - ${reportData.agent?.employee_name || 'Unknown'}`,
                    Author: 'Employee Monitor',
                    Subject: `${reportData.report_type} Report`,
                    CreationDate: new Date()
                }
            });

            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Colors
            const primaryColor = '#3b82f6';
            const textColor = '#1f2937';
            const secondaryText = '#6b7280';
            const borderColor = '#e5e7eb';

            // Header
            doc.rect(0, 0, doc.page.width, 120).fill(primaryColor);
            doc.fillColor('#ffffff')
               .fontSize(28)
               .font('Helvetica-Bold')
               .text('Employee Activity Report', 50, 40);

            doc.fontSize(14)
               .font('Helvetica')
               .text(`${reportData.report_type?.charAt(0).toUpperCase()}${reportData.report_type?.slice(1)} Report`, 50, 75);

            doc.fontSize(11)
               .text(`Generated: ${new Date(reportData.generated_at).toLocaleString()}`, 50, 95);

            // Reset position
            doc.y = 140;
            doc.fillColor(textColor);

            // Agent Info Box
            doc.roundedRect(50, doc.y, doc.page.width - 100, 80, 8)
               .stroke(borderColor);

            const agentBoxY = doc.y + 15;
            doc.fontSize(12)
               .font('Helvetica-Bold')
               .fillColor(secondaryText)
               .text('EMPLOYEE INFORMATION', 65, agentBoxY);

            doc.fontSize(11)
               .font('Helvetica')
               .fillColor(textColor)
               .text(`Name: ${reportData.agent?.employee_name || 'Unknown'}`, 65, agentBoxY + 20)
               .text(`PC: ${reportData.agent?.pc_name || 'Unknown'}`, 65, agentBoxY + 38)
               .text(`Period: ${reportData.period?.start} to ${reportData.period?.end}`, 300, agentBoxY + 20);

            doc.y += 100;

            // Summary Section
            addSectionHeader(doc, 'Summary Statistics');

            const summary = reportData.summary || {};
            const summaryData = [
                ['Total Active Time', summary.total_active_formatted || '0h 0m'],
                ['Productivity Score', `${summary.productivity?.average || 0}%`],
                ['Screenshots Taken', String(summary.screenshots || 0)],
                ['Keystrokes Recorded', String(summary.keystrokes || 0)],
                ['Emails Captured', String(summary.emails || 0)],
                ['Print Jobs', `${summary.print_jobs || 0} (${summary.print_pages || 0} pages)`],
                ['DLP Incidents', String(summary.dlp_incidents || 0)],
                ['Network Sent', summary.network?.sent_formatted || '0 B'],
                ['Network Received', summary.network?.received_formatted || '0 B'],
            ];

            addTable(doc, summaryData, ['Metric', 'Value'], [250, 200]);

            // Alerts Section
            if (summary.alerts) {
                addSectionHeader(doc, 'Alerts Summary');
                const alertData = [
                    ['Critical', String(summary.alerts.critical || 0), '#dc2626'],
                    ['High', String(summary.alerts.high || 0), '#ea580c'],
                    ['Medium', String(summary.alerts.medium || 0), '#ca8a04'],
                    ['Low', String(summary.alerts.low || 0), '#16a34a'],
                ];
                addAlertTable(doc, alertData);
            }

            // Check for page break
            if (doc.y > 650) {
                doc.addPage();
                doc.y = 50;
            }

            // Top Applications
            if (reportData.top_apps && reportData.top_apps.length > 0) {
                addSectionHeader(doc, 'Top Applications');
                const appData = reportData.top_apps.slice(0, 10).map((app, i) => [
                    String(i + 1),
                    app.app_name || 'Unknown',
                    formatDuration(app.total_seconds || 0),
                    String(app.session_count || 0)
                ]);
                addTable(doc, appData, ['#', 'Application', 'Duration', 'Sessions'], [30, 200, 100, 80]);
            }

            // Check for page break
            if (doc.y > 600) {
                doc.addPage();
                doc.y = 50;
            }

            // Top Websites
            if (reportData.top_websites && reportData.top_websites.length > 0) {
                addSectionHeader(doc, 'Top Websites');
                const siteData = reportData.top_websites.slice(0, 10).map((site, i) => [
                    String(i + 1),
                    truncateText(site.url || 'Unknown', 40),
                    String(site.visit_count || 0),
                    formatDuration(site.total_seconds || 0)
                ]);
                addTable(doc, siteData, ['#', 'URL', 'Visits', 'Duration'], [30, 250, 60, 80]);
            }

            // Footer on each page
            const pages = doc.bufferedPageRange();
            for (let i = 0; i < pages.count; i++) {
                doc.switchToPage(i);
                doc.fontSize(9)
                   .fillColor(secondaryText)
                   .text(
                       `Page ${i + 1} of ${pages.count} | Generated by Employee Monitor`,
                       50,
                       doc.page.height - 30,
                       { align: 'center', width: doc.page.width - 100 }
                   );
            }

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Add a section header
 */
function addSectionHeader(doc, title) {
    if (doc.y > 700) {
        doc.addPage();
        doc.y = 50;
    }

    doc.y += 15;
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#1f2937')
       .text(title, 50, doc.y);
    doc.y += 25;
}

/**
 * Add a simple table
 */
function addTable(doc, data, headers, colWidths) {
    const startX = 50;
    const rowHeight = 25;
    let y = doc.y;

    // Header row
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#374151');

    let x = startX;
    headers.forEach((header, i) => {
        doc.text(header, x, y, { width: colWidths[i] });
        x += colWidths[i];
    });

    y += rowHeight;
    doc.moveTo(startX, y - 5)
       .lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y - 5)
       .stroke('#e5e7eb');

    // Data rows
    doc.font('Helvetica')
       .fillColor('#4b5563');

    data.forEach(row => {
        if (y > 750) {
            doc.addPage();
            y = 50;
        }

        x = startX;
        row.forEach((cell, i) => {
            doc.text(String(cell), x, y, { width: colWidths[i] });
            x += colWidths[i];
        });
        y += rowHeight;
    });

    doc.y = y + 10;
}

/**
 * Add alert summary table with colors
 */
function addAlertTable(doc, alertData) {
    const startX = 50;
    const rowHeight = 25;
    let y = doc.y;

    alertData.forEach(([severity, count, color]) => {
        // Color indicator
        doc.rect(startX, y, 12, 12)
           .fill(color);

        doc.fontSize(11)
           .font('Helvetica')
           .fillColor('#374151')
           .text(severity, startX + 20, y)
           .text(count, startX + 150, y);

        y += rowHeight;
    });

    doc.y = y + 10;
}

/**
 * Format seconds to duration string
 */
function formatDuration(seconds) {
    if (!seconds || seconds < 0) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

/**
 * Truncate text with ellipsis
 */
function truncateText(text, maxLen) {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen - 3) + '...';
}

/**
 * Generate a simple summary PDF
 */
function generateSimplePDF(title, content) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            doc.fontSize(24)
               .font('Helvetica-Bold')
               .text(title, { align: 'center' });

            doc.moveDown();
            doc.fontSize(12)
               .font('Helvetica')
               .text(content);

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = {
    generateReportPDF,
    generateSimplePDF
};
