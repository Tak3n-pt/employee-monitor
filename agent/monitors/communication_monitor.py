"""
Communication Monitor - Detects email clients and instant messaging apps
Tracks communication app usage and activity
"""

import threading
import time
import os
import re
from datetime import datetime
from collections import deque, defaultdict

import psutil
import win32gui
import win32process
import win32api


# Communication application patterns
COMMUNICATION_APPS = {
    'email_clients': {
        'outlook.exe': {'name': 'Microsoft Outlook', 'type': 'email'},
        'thunderbird.exe': {'name': 'Mozilla Thunderbird', 'type': 'email'},
        'mailspring.exe': {'name': 'Mailspring', 'type': 'email'},
        'em client.exe': {'name': 'eM Client', 'type': 'email'},
        'mailbird.exe': {'name': 'Mailbird', 'type': 'email'},
    },
    'instant_messaging': {
        'slack.exe': {'name': 'Slack', 'type': 'im'},
        'teams.exe': {'name': 'Microsoft Teams', 'type': 'im'},
        'discord.exe': {'name': 'Discord', 'type': 'im'},
        'skype.exe': {'name': 'Skype', 'type': 'im'},
        'telegram.exe': {'name': 'Telegram', 'type': 'im'},
        'whatsapp.exe': {'name': 'WhatsApp', 'type': 'im'},
        'signal.exe': {'name': 'Signal', 'type': 'im'},
        'zoom.exe': {'name': 'Zoom', 'type': 'meeting'},
        'webex.exe': {'name': 'Cisco Webex', 'type': 'meeting'},
        'gotomeeting.exe': {'name': 'GoToMeeting', 'type': 'meeting'},
    },
    'web_clients': {
        'gmail': {'name': 'Gmail (Web)', 'type': 'email', 'url_pattern': r'mail\.google\.com'},
        'outlook_web': {'name': 'Outlook (Web)', 'type': 'email', 'url_pattern': r'outlook\.(live|office)\.com'},
        'yahoo_mail': {'name': 'Yahoo Mail', 'type': 'email', 'url_pattern': r'mail\.yahoo\.com'},
        'slack_web': {'name': 'Slack (Web)', 'type': 'im', 'url_pattern': r'app\.slack\.com'},
        'teams_web': {'name': 'Teams (Web)', 'type': 'im', 'url_pattern': r'teams\.microsoft\.com'},
        'discord_web': {'name': 'Discord (Web)', 'type': 'im', 'url_pattern': r'discord\.com/channels'},
        'telegram_web': {'name': 'Telegram (Web)', 'type': 'im', 'url_pattern': r'web\.telegram\.org'},
        'whatsapp_web': {'name': 'WhatsApp (Web)', 'type': 'im', 'url_pattern': r'web\.whatsapp\.com'},
    }
}

# Browser processes for web client detection
BROWSERS = ['chrome.exe', 'firefox.exe', 'msedge.exe', 'brave.exe', 'opera.exe']


MEETING_APPS = {'zoom.exe', 'teams.exe', 'webex.exe', 'gotomeeting.exe'}

MEETING_TITLE_PATTERNS = [
    re.compile(r'^(.+?)\s*[-–—]\s*Zoom', re.IGNORECASE),
    re.compile(r'^(.+?)\s*\|\s*Microsoft Teams', re.IGNORECASE),
    re.compile(r'^Meeting\s*[-:]\s*(.+)', re.IGNORECASE),
    re.compile(r'^(.+?)\s*[-–—]\s*Webex', re.IGNORECASE),
    re.compile(r'^(.+?)\s*[-–—]\s*GoTo', re.IGNORECASE),
]


class CommunicationMonitor:
    def __init__(self, on_comm_event_callback=None):
        self.running = False
        self.thread = None
        self.on_comm_event = on_comm_event_callback

        # Tracking
        self.active_comm_apps = {}
        self.comm_events = deque(maxlen=2000)
        self.app_usage = defaultdict(lambda: {'total_seconds': 0, 'sessions': 0})
        self.lock = threading.Lock()

        # Current tracking
        self.current_app = None
        self.current_app_start = None

        # Meeting tracking
        self.active_meetings = {}  # app_id -> {start, title, app_name}
        self.meeting_history = deque(maxlen=500)

        # Build lookup dictionaries
        self._build_app_lookup()

    def _build_app_lookup(self):
        """Build efficient lookup for app detection"""
        self.app_lookup = {}
        for category, apps in COMMUNICATION_APPS.items():
            if category != 'web_clients':
                for exe, info in apps.items():
                    self.app_lookup[exe.lower()] = {**info, 'category': category}

        self.web_patterns = []
        for key, info in COMMUNICATION_APPS['web_clients'].items():
            self.web_patterns.append({
                'key': key,
                'pattern': re.compile(info['url_pattern'], re.IGNORECASE),
                **info
            })

    def get_active_window_info(self):
        """Get information about the currently active window"""
        try:
            hwnd = win32gui.GetForegroundWindow()
            if not hwnd:
                return None

            # Get window title
            window_title = win32gui.GetWindowText(hwnd)

            # Get process info
            _, pid = win32process.GetWindowThreadProcessId(hwnd)

            try:
                proc = psutil.Process(pid)
                exe_name = proc.name().lower()
                exe_path = proc.exe()

                return {
                    'hwnd': hwnd,
                    'title': window_title,
                    'pid': pid,
                    'exe_name': exe_name,
                    'exe_path': exe_path,
                }
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                return None

        except Exception as e:
            return None

    def detect_communication_app(self, window_info):
        """Detect if window is a communication app"""
        if not window_info:
            return None

        exe_name = window_info.get('exe_name', '').lower()
        title = window_info.get('title', '')

        # Check desktop apps
        if exe_name in self.app_lookup:
            return {
                **self.app_lookup[exe_name],
                'detected_from': 'desktop_app',
                'exe_name': exe_name,
                'window_title': title,
            }

        # Check if browser with web client
        if exe_name in [b.lower() for b in BROWSERS]:
            for pattern_info in self.web_patterns:
                if pattern_info['pattern'].search(title):
                    return {
                        'name': pattern_info['name'],
                        'type': pattern_info['type'],
                        'category': 'web_clients',
                        'detected_from': 'browser',
                        'browser': exe_name,
                        'window_title': title,
                    }

        return None

    def get_running_comm_apps(self):
        """Get all currently running communication apps"""
        running = []

        for proc in psutil.process_iter(['pid', 'name', 'exe']):
            try:
                exe_name = proc.info['name'].lower()
                if exe_name in self.app_lookup:
                    running.append({
                        'pid': proc.info['pid'],
                        'exe_name': exe_name,
                        **self.app_lookup[exe_name]
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        return running

    def _parse_meeting_title(self, window_title):
        """Extract meeting title from window title"""
        if not window_title:
            return None

        for pattern in MEETING_TITLE_PATTERNS:
            match = pattern.search(window_title)
            if match:
                return match.group(1).strip()

        return window_title

    def _check_meeting_state(self, comm_app, now):
        """Track meeting start/end and duration"""
        if not comm_app:
            # End any active meetings for apps no longer focused
            ended = []
            for app_id, meeting in self.active_meetings.items():
                duration = (now - meeting['start']).total_seconds()
                # Only end meeting if unfocused for over 30 seconds
                if not hasattr(meeting, '_last_seen') or (now - meeting.get('_last_seen', now)).total_seconds() > 30:
                    meeting_event = {
                        'timestamp': now.isoformat(),
                        'event_type': 'meeting_ended',
                        'app_name': meeting['app_name'],
                        'meeting_title': meeting['title'],
                        'started_at': meeting['start'].isoformat(),
                        'ended_at': now.isoformat(),
                        'duration_seconds': int(duration),
                    }
                    with self.lock:
                        self.meeting_history.append(meeting_event)
                        self.comm_events.append(meeting_event)
                    if self.on_comm_event:
                        self.on_comm_event(meeting_event)
                    print(f"[MEETING END] {meeting['app_name']}: {meeting['title']} ({int(duration)}s)")
                    ended.append(app_id)

            for app_id in ended:
                del self.active_meetings[app_id]
            return

        exe_name = comm_app.get('exe_name', '')
        app_type = comm_app.get('type', '')

        if app_type == 'meeting' or exe_name in MEETING_APPS:
            app_id = f"{comm_app['name']}_{exe_name}"
            title = self._parse_meeting_title(comm_app.get('window_title', ''))

            if app_id not in self.active_meetings:
                # New meeting detected
                self.active_meetings[app_id] = {
                    'start': now,
                    'title': title or 'Unknown Meeting',
                    'app_name': comm_app['name'],
                    '_last_seen': now,
                }
                meeting_event = {
                    'timestamp': now.isoformat(),
                    'event_type': 'meeting_started',
                    'app_name': comm_app['name'],
                    'meeting_title': title or 'Unknown Meeting',
                    'started_at': now.isoformat(),
                    'app': comm_app,
                }
                with self.lock:
                    self.comm_events.append(meeting_event)
                if self.on_comm_event:
                    self.on_comm_event(meeting_event)
                print(f"[MEETING START] {comm_app['name']}: {title}")
            else:
                self.active_meetings[app_id]['_last_seen'] = now
                # Update title if it changed
                if title and title != self.active_meetings[app_id]['title']:
                    self.active_meetings[app_id]['title'] = title

    def monitor_loop(self):
        """Main monitoring loop"""
        while self.running:
            try:
                window_info = self.get_active_window_info()
                comm_app = self.detect_communication_app(window_info)

                now = datetime.now()

                # Track meeting state
                self._check_meeting_state(comm_app, now)

                # Track app changes
                if comm_app:
                    app_id = f"{comm_app['name']}_{comm_app.get('exe_name', 'web')}"

                    if app_id != self.current_app:
                        # End previous app session
                        if self.current_app and self.current_app_start:
                            duration = (now - self.current_app_start).total_seconds()
                            with self.lock:
                                self.app_usage[self.current_app]['total_seconds'] += duration

                        # Start new app session
                        self.current_app = app_id
                        self.current_app_start = now

                        event = {
                            'timestamp': now.isoformat(),
                            'event_type': 'comm_app_active',
                            'app': comm_app,
                        }

                        with self.lock:
                            self.comm_events.append(event)
                            self.app_usage[app_id]['sessions'] += 1
                            self.active_comm_apps[app_id] = comm_app

                        if self.on_comm_event:
                            self.on_comm_event(event)

                        print(f"[COMM] {comm_app['name']} ({comm_app['type']})")

                else:
                    # Not in a comm app
                    if self.current_app and self.current_app_start:
                        duration = (now - self.current_app_start).total_seconds()
                        with self.lock:
                            self.app_usage[self.current_app]['total_seconds'] += duration

                        self.current_app = None
                        self.current_app_start = None

                time.sleep(2)

            except Exception as e:
                print(f"Communication monitor error: {e}")
                time.sleep(2)

    def get_events(self, clear=False, type_filter=None):
        """Get communication events"""
        with self.lock:
            events = list(self.comm_events)

            if type_filter:
                events = [e for e in events
                          if e.get('app', {}).get('type') == type_filter]

            if clear:
                self.comm_events.clear()

        return events

    def get_email_events(self, clear=False):
        """Get email-related events"""
        return self.get_events(clear=clear, type_filter='email')

    def get_im_events(self, clear=False):
        """Get instant messaging events"""
        return self.get_events(clear=clear, type_filter='im')

    def get_meetings(self, clear=False):
        """Get meeting history"""
        with self.lock:
            result = list(self.meeting_history)
            if clear:
                self.meeting_history.clear()
        return result

    def get_active_meetings(self):
        """Get currently active meetings"""
        now = datetime.now()
        result = []
        for app_id, meeting in self.active_meetings.items():
            duration = (now - meeting['start']).total_seconds()
            result.append({
                'app_name': meeting['app_name'],
                'meeting_title': meeting['title'],
                'started_at': meeting['start'].isoformat(),
                'duration_seconds': int(duration),
            })
        return result

    def get_usage_stats(self):
        """Get communication app usage statistics"""
        with self.lock:
            # Add current session if active
            stats = {}
            for app_id, usage in self.app_usage.items():
                stats[app_id] = dict(usage)

            if self.current_app and self.current_app_start:
                current_duration = (datetime.now() - self.current_app_start).total_seconds()
                if self.current_app in stats:
                    stats[self.current_app]['current_session_seconds'] = current_duration
                    stats[self.current_app]['total_seconds'] += current_duration

        return stats

    def get_summary(self):
        """Get communication summary by type"""
        stats = self.get_usage_stats()

        summary = {
            'email': {'total_seconds': 0, 'sessions': 0, 'apps': []},
            'im': {'total_seconds': 0, 'sessions': 0, 'apps': []},
            'meeting': {'total_seconds': 0, 'sessions': 0, 'apps': []},
        }

        with self.lock:
            for app_id, app_info in self.active_comm_apps.items():
                app_type = app_info.get('type', 'other')
                if app_type in summary:
                    if app_id in stats:
                        summary[app_type]['total_seconds'] += stats[app_id].get('total_seconds', 0)
                        summary[app_type]['sessions'] += stats[app_id].get('sessions', 0)
                    summary[app_type]['apps'].append(app_info.get('name', app_id))

        # Format durations
        for type_key in summary:
            seconds = summary[type_key]['total_seconds']
            hours = int(seconds // 3600)
            minutes = int((seconds % 3600) // 60)
            summary[type_key]['formatted'] = f"{hours}h {minutes}m"

        return summary

    def get_status(self):
        """Get monitor status"""
        return {
            'running': self.running,
            'current_app': self.current_app,
            'running_comm_apps': len(self.get_running_comm_apps()),
            'tracked_apps': len(self.active_comm_apps),
            'total_events': len(self.comm_events),
        }

    def start(self):
        """Start communication monitoring"""
        if self.running:
            return

        self.running = True
        self.thread = threading.Thread(target=self.monitor_loop, daemon=True)
        self.thread.start()
        print("Communication monitor started")

    def stop(self):
        """Stop communication monitoring"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=3)
        print("Communication monitor stopped")


if __name__ == "__main__":
    def on_event(event):
        app = event.get('app', {})
        print(f"[{app.get('type', '?').upper()}] {app.get('name', 'Unknown')}")

    monitor = CommunicationMonitor(on_comm_event_callback=on_event)

    print("Currently running communication apps:")
    for app in monitor.get_running_comm_apps():
        print(f"  - {app['name']} ({app['type']})")

    print("\nStarting communication monitor...")
    monitor.start()

    try:
        print("Switch between communication apps to test.")
        print("Press Ctrl+C to stop\n")
        while True:
            time.sleep(10)
            summary = monitor.get_summary()
            print(f"\nUsage Summary:")
            print(f"  Email: {summary['email']['formatted']} ({summary['email']['sessions']} sessions)")
            print(f"  IM: {summary['im']['formatted']} ({summary['im']['sessions']} sessions)")
            print(f"  Meetings: {summary['meeting']['formatted']} ({summary['meeting']['sessions']} sessions)")
    except KeyboardInterrupt:
        monitor.stop()
