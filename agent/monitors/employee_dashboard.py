"""
Employee Dashboard - Self-monitoring features for transparency
Shows employees what data is being collected about them
"""

import threading
import http.server
import socketserver
import json
import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional


class EmployeeDashboard:
    """
    Local dashboard for employee self-monitoring and transparency.
    Provides employees visibility into what's being monitored.
    """

    def __init__(self, port: int = 8080, data_providers: Dict[str, Any] = None):
        self.port = port
        self.running = False
        self.server = None
        self.thread = None

        # Data providers (monitors that provide data to display)
        self.data_providers = data_providers or {}

        # Privacy mode settings
        self.privacy_mode = False
        self.privacy_excludes = set()  # Features disabled in privacy mode

        # Transparency settings
        self.transparency_level = 'full'  # full, summary, minimal
        self.show_screenshots = True
        self.show_keystrokes = False  # Usually disabled for privacy
        self.show_websites = True
        self.show_apps = True
        self.show_files = True

    def set_data_provider(self, name: str, provider):
        """Set a data provider for the dashboard"""
        self.data_providers[name] = provider

    def set_transparency_level(self, level: str):
        """Set transparency level: full, summary, minimal"""
        self.transparency_level = level

    def enable_privacy_mode(self, excludes: list = None):
        """Enable privacy mode with optional exclusions"""
        self.privacy_mode = True
        self.privacy_excludes = set(excludes or [])

    def disable_privacy_mode(self):
        """Disable privacy mode"""
        self.privacy_mode = False
        self.privacy_excludes.clear()

    def get_monitoring_status(self) -> dict:
        """Get current monitoring status for transparency"""
        status = {
            'timestamp': datetime.now().isoformat(),
            'privacy_mode': self.privacy_mode,
            'transparency_level': self.transparency_level,
            'active_monitoring': [],
            'paused_monitoring': [],
        }

        # Check what's being monitored
        monitoring_features = {
            'screenshots': 'Screenshot Capture',
            'keylogger': 'Keystroke Logging',
            'clipboard': 'Clipboard Monitoring',
            'apps': 'Application Tracking',
            'websites': 'Website Tracking',
            'files': 'File Activity',
            'usb': 'USB Device Monitoring',
            'printer': 'Print Monitoring',
            'screen': 'Screen Recording',
            'idle': 'Idle Detection',
        }

        for feature_id, feature_name in monitoring_features.items():
            if feature_id in self.data_providers:
                provider = self.data_providers[feature_id]
                if hasattr(provider, 'running') and provider.running:
                    if self.privacy_mode and feature_id in self.privacy_excludes:
                        status['paused_monitoring'].append({
                            'id': feature_id,
                            'name': feature_name,
                            'status': 'paused_privacy'
                        })
                    else:
                        status['active_monitoring'].append({
                            'id': feature_id,
                            'name': feature_name,
                            'status': 'active'
                        })
                else:
                    status['paused_monitoring'].append({
                        'id': feature_id,
                        'name': feature_name,
                        'status': 'disabled'
                    })

        return status

    def get_my_activity_summary(self) -> dict:
        """Get summary of employee's own activity"""
        summary = {
            'timestamp': datetime.now().isoformat(),
            'today': {},
            'this_week': {},
        }

        # Productivity data
        if 'productivity' in self.data_providers:
            prod = self.data_providers['productivity']
            summary['today']['productivity'] = prod.calculate_score()
            summary['this_week']['productivity'] = prod.get_weekly_report()

        # Time tracking
        if 'time' in self.data_providers:
            time_tracker = self.data_providers['time']
            summary['today']['time'] = time_tracker.get_today_summary()
            summary['this_week']['time'] = time_tracker.get_week_summary()

        # App usage (if transparency allows)
        if self.show_apps and 'apps' in self.data_providers:
            apps = self.data_providers['apps']
            if hasattr(apps, 'get_running_apps_summary'):
                summary['today']['apps'] = apps.get_running_apps_summary()

        return summary

    def get_my_data(self, data_type: str, limit: int = 50) -> dict:
        """Get specific type of data collected about the employee"""
        result = {
            'data_type': data_type,
            'timestamp': datetime.now().isoformat(),
            'privacy_mode': self.privacy_mode,
            'data': None,
            'message': None,
        }

        # Check if data type is allowed by transparency settings
        if data_type == 'screenshots' and not self.show_screenshots:
            result['message'] = 'Screenshot viewing disabled by policy'
            return result

        if data_type == 'keystrokes' and not self.show_keystrokes:
            result['message'] = 'Keystroke data not viewable for privacy'
            return result

        if data_type == 'websites' and not self.show_websites:
            result['message'] = 'Website data viewing disabled'
            return result

        # Get data from providers
        try:
            if data_type == 'apps' and 'process' in self.data_providers:
                result['data'] = self.data_providers['process'].get_activities()[-limit:]

            elif data_type == 'websites' and 'web' in self.data_providers:
                result['data'] = self.data_providers['web'].get_history()[-limit:]

            elif data_type == 'files' and 'file' in self.data_providers:
                if self.transparency_level == 'full':
                    result['data'] = self.data_providers['file'].get_events()[-limit:]
                else:
                    # Summary only
                    result['data'] = self.data_providers['file'].get_stats()

            elif data_type == 'time' and 'time' in self.data_providers:
                result['data'] = self.data_providers['time'].get_time_entries(limit=limit)

            elif data_type == 'alerts' and 'alerts' in self.data_providers:
                result['data'] = self.data_providers['alerts'].get_alerts(limit=limit)

            elif data_type == 'productivity' and 'productivity' in self.data_providers:
                result['data'] = self.data_providers['productivity'].get_daily_report()

            else:
                result['message'] = f'Unknown data type: {data_type}'

        except Exception as e:
            result['message'] = f'Error retrieving data: {str(e)}'

        return result

    def request_privacy_break(self, duration_minutes: int = 15, reason: str = None) -> dict:
        """Request a privacy break (requires admin approval in real implementation)"""
        request = {
            'request_type': 'privacy_break',
            'timestamp': datetime.now().isoformat(),
            'duration_minutes': duration_minutes,
            'reason': reason,
            'status': 'pending',  # Would be submitted to admin
        }

        # In a real implementation, this would:
        # 1. Send request to admin panel
        # 2. Wait for approval
        # 3. Enable privacy mode temporarily

        return request

    def get_data_retention_info(self) -> dict:
        """Get information about how long data is retained"""
        return {
            'screenshots': '30 days',
            'activity_logs': '90 days',
            'productivity_scores': '365 days',
            'alerts': '180 days',
            'login_events': '365 days',
            'note': 'Data retention periods may vary by company policy',
        }

    def get_dashboard_html(self) -> str:
        """Generate HTML for employee dashboard"""
        status = self.get_monitoring_status()
        summary = self.get_my_activity_summary()

        html = """
<!DOCTYPE html>
<html>
<head>
    <title>My Activity Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #2196F3; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .card { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .card h3 { margin-top: 0; color: #333; border-bottom: 2px solid #2196F3; padding-bottom: 10px; }
        .status-active { color: #4CAF50; }
        .status-paused { color: #FF9800; }
        .status-disabled { color: #9E9E9E; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
        .metric-value { font-size: 24px; font-weight: bold; color: #2196F3; }
        .metric-label { color: #666; font-size: 12px; }
        .privacy-badge { background: #4CAF50; color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px; }
        .privacy-badge.active { background: #FF9800; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f9f9f9; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>My Activity Dashboard</h1>
            <p>See what's being monitored about your work activity</p>
            <span class="privacy-badge """ + ('active' if status['privacy_mode'] else '') + """">
                Privacy Mode: """ + ('ON' if status['privacy_mode'] else 'OFF') + """
            </span>
        </div>

        <div class="card">
            <h3>Today's Summary</h3>
            <div class="metric">
                <div class="metric-value" id="productivity-score">--</div>
                <div class="metric-label">Productivity Score</div>
            </div>
            <div class="metric">
                <div class="metric-value" id="active-time">--</div>
                <div class="metric-label">Active Time</div>
            </div>
            <div class="metric">
                <div class="metric-value" id="idle-time">--</div>
                <div class="metric-label">Idle Time</div>
            </div>
        </div>

        <div class="card">
            <h3>What's Being Monitored</h3>
            <table>
                <tr><th>Feature</th><th>Status</th></tr>
"""

        for mon in status['active_monitoring']:
            html += f'<tr><td>{mon["name"]}</td><td class="status-active">Active</td></tr>'

        for mon in status['paused_monitoring']:
            status_class = 'status-paused' if mon['status'] == 'paused_privacy' else 'status-disabled'
            status_text = 'Paused (Privacy)' if mon['status'] == 'paused_privacy' else 'Disabled'
            html += f'<tr><td>{mon["name"]}</td><td class="{status_class}">{status_text}</td></tr>'

        html += """
            </table>
        </div>

        <div class="card">
            <h3>Data Retention</h3>
            <p>Your activity data is retained according to company policy:</p>
            <ul>
                <li>Screenshots: 30 days</li>
                <li>Activity logs: 90 days</li>
                <li>Productivity scores: 365 days</li>
            </ul>
        </div>

        <div class="card">
            <h3>Your Rights</h3>
            <ul>
                <li>You can view all data collected about you</li>
                <li>You can request privacy breaks for personal matters</li>
                <li>You can request data export or deletion (subject to policy)</li>
            </ul>
        </div>
    </div>

    <script>
        // Fetch and display live data
        async function updateDashboard() {
            try {
                const response = await fetch('/api/summary');
                const data = await response.json();

                if (data.today && data.today.productivity) {
                    document.getElementById('productivity-score').textContent =
                        data.today.productivity.score + '/100';
                }
                if (data.today && data.today.time) {
                    document.getElementById('active-time').textContent =
                        data.today.time.total_work_formatted || '--';
                    document.getElementById('idle-time').textContent =
                        data.today.time.total_break_formatted || '--';
                }
            } catch (e) {
                console.error('Error updating dashboard:', e);
            }
        }

        updateDashboard();
        setInterval(updateDashboard, 30000); // Update every 30 seconds
    </script>
</body>
</html>
"""
        return html

    def _create_handler(self):
        """Create HTTP request handler"""
        dashboard = self

        class DashboardHandler(http.server.SimpleHTTPRequestHandler):
            def do_GET(self):
                if self.path == '/' or self.path == '/index.html':
                    self.send_response(200)
                    self.send_header('Content-type', 'text/html')
                    self.end_headers()
                    self.wfile.write(dashboard.get_dashboard_html().encode())

                elif self.path == '/api/status':
                    self.send_json(dashboard.get_monitoring_status())

                elif self.path == '/api/summary':
                    self.send_json(dashboard.get_my_activity_summary())

                elif self.path.startswith('/api/data/'):
                    data_type = self.path.split('/')[-1]
                    self.send_json(dashboard.get_my_data(data_type))

                elif self.path == '/api/retention':
                    self.send_json(dashboard.get_data_retention_info())

                else:
                    self.send_error(404)

            def send_json(self, data):
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(data, default=str).encode())

            def log_message(self, format, *args):
                pass  # Suppress logging

        return DashboardHandler

    def start(self):
        """Start employee dashboard server"""
        if self.running:
            return

        Handler = self._create_handler()
        self.server = socketserver.TCPServer(("127.0.0.1", self.port), Handler)
        self.running = True

        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

        print(f"Employee dashboard started at http://127.0.0.1:{self.port}")

    def stop(self):
        """Stop employee dashboard server"""
        self.running = False
        if self.server:
            self.server.shutdown()
        print("Employee dashboard stopped")


if __name__ == "__main__":
    dashboard = EmployeeDashboard(port=8080)

    print("Starting employee self-monitoring dashboard...")
    dashboard.start()

    print(f"\nOpen http://127.0.0.1:8080 in your browser to view the dashboard")
    print("\nMonitoring status:")
    status = dashboard.get_monitoring_status()
    print(f"  Privacy mode: {status['privacy_mode']}")
    print(f"  Active monitors: {len(status['active_monitoring'])}")

    try:
        print("\nPress Ctrl+C to stop")
        while True:
            import time
            time.sleep(1)
    except KeyboardInterrupt:
        dashboard.stop()
