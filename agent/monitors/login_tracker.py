"""
Login Tracker - Monitors Windows login/logout events
"""

import threading
import time
from datetime import datetime
from collections import deque

import win32evtlog
import win32con
import win32api
import win32security


# Windows Security Event IDs
LOGIN_EVENTS = {
    4624: 'login_success',      # Successful login
    4625: 'login_failed',       # Failed login
    4634: 'logoff',             # Logoff
    4647: 'user_initiated_logoff',  # User initiated logoff
    4648: 'explicit_credentials',    # Login with explicit credentials
    4672: 'special_privileges',      # Special privileges assigned
    4800: 'workstation_locked',      # Workstation locked
    4801: 'workstation_unlocked',    # Workstation unlocked
    4802: 'screensaver_invoked',     # Screensaver invoked
    4803: 'screensaver_dismissed',   # Screensaver dismissed
}

# Logon types
LOGON_TYPES = {
    2: 'interactive',           # Local console
    3: 'network',               # Network
    4: 'batch',                 # Scheduled task
    5: 'service',               # Service
    7: 'unlock',                # Unlock workstation
    8: 'network_cleartext',     # Network cleartext
    9: 'new_credentials',       # New credentials
    10: 'remote_interactive',   # Remote Desktop
    11: 'cached_interactive',   # Cached credentials
}


class LoginTracker:
    def __init__(self, on_login_event_callback=None):
        self.running = False
        self.thread = None
        self.on_login_event = on_login_event_callback

        self.login_events = deque(maxlen=1000)
        self._security_error_warned = False  # Only warn once about privilege issues
        self.lock = threading.Lock()

        # Session tracking
        self.current_session = None
        self.session_start = None
        self.sessions = deque(maxlen=500)

        # Statistics
        self.stats = {
            'total_logins': 0,
            'failed_logins': 0,
            'locks': 0,
            'unlocks': 0,
        }

    def get_current_user(self):
        """Get current logged in user"""
        try:
            return win32api.GetUserName()
        except Exception:
            return None

    def get_session_info(self):
        """Get current session information"""
        try:
            user = self.get_current_user()
            domain = win32api.GetDomainName()

            return {
                'user': user,
                'domain': domain,
                'session_start': self.session_start.isoformat() if self.session_start else None,
                'duration_seconds': (datetime.now() - self.session_start).total_seconds() if self.session_start else 0,
            }
        except Exception as e:
            return {'error': str(e)}

    def read_security_events(self, max_events=100):
        """Read recent security events from Windows Event Log"""
        events = []

        try:
            hand = win32evtlog.OpenEventLog(None, "Security")

            flags = win32evtlog.EVENTLOG_BACKWARDS_READ | win32evtlog.EVENTLOG_SEQUENTIAL_READ

            total = win32evtlog.GetNumberOfEventLogRecords(hand)

            event_list = []
            while True:
                records = win32evtlog.ReadEventLog(hand, flags, 0)
                if not records:
                    break

                for record in records:
                    event_id = record.EventID & 0xFFFF  # Mask to get actual event ID

                    if event_id in LOGIN_EVENTS:
                        event_list.append({
                            'event_id': event_id,
                            'event_type': LOGIN_EVENTS.get(event_id, 'unknown'),
                            'timestamp': record.TimeGenerated.isoformat(),
                            'source': record.SourceName,
                            'computer': record.ComputerName,
                            'data': record.StringInserts,
                        })

                    if len(event_list) >= max_events:
                        break

                if len(event_list) >= max_events:
                    break

            win32evtlog.CloseEventLog(hand)
            events = event_list

        except Exception as e:
            if not self._security_error_warned:
                print(f"Security events unavailable (requires admin): {e}")
                self._security_error_warned = True

        return events

    def parse_login_event(self, event):
        """Parse login event details"""
        event_id = event.get('event_id')
        data = event.get('data', [])

        parsed = {
            'timestamp': event.get('timestamp'),
            'event_type': event.get('event_type'),
            'computer': event.get('computer'),
        }

        # Parse based on event type
        if event_id == 4624:  # Successful login
            if data and len(data) >= 9:
                parsed['user'] = data[5] if len(data) > 5 else None
                parsed['domain'] = data[6] if len(data) > 6 else None
                logon_type = int(data[8]) if len(data) > 8 and data[8].isdigit() else 0
                parsed['logon_type'] = LOGON_TYPES.get(logon_type, f'type_{logon_type}')
                parsed['source_ip'] = data[18] if len(data) > 18 else None

        elif event_id == 4625:  # Failed login
            if data and len(data) >= 6:
                parsed['user'] = data[5] if len(data) > 5 else None
                parsed['domain'] = data[6] if len(data) > 6 else None
                parsed['failure_reason'] = data[8] if len(data) > 8 else None

        elif event_id in [4800, 4801]:  # Lock/Unlock
            if data and len(data) >= 2:
                parsed['user'] = data[1] if len(data) > 1 else None

        return parsed

    def monitor_loop(self):
        """Main monitoring loop"""
        last_check = datetime.now()

        # Initial session
        self.session_start = datetime.now()
        self.current_session = {
            'user': self.get_current_user(),
            'start': self.session_start.isoformat(),
            'type': 'session_start',
        }

        while self.running:
            try:
                # Read new events since last check
                events = self.read_security_events(max_events=50)

                for event in events:
                    # Only process events newer than last check
                    try:
                        event_time = datetime.fromisoformat(event['timestamp'])
                        if event_time <= last_check:
                            continue
                    except Exception:
                        continue

                    parsed = self.parse_login_event(event)
                    event_type = event.get('event_type')

                    with self.lock:
                        self.login_events.append(parsed)

                        # Update statistics
                        if event_type == 'login_success':
                            self.stats['total_logins'] += 1
                        elif event_type == 'login_failed':
                            self.stats['failed_logins'] += 1
                        elif event_type == 'workstation_locked':
                            self.stats['locks'] += 1
                        elif event_type == 'workstation_unlocked':
                            self.stats['unlocks'] += 1

                    if self.on_login_event:
                        self.on_login_event(parsed)

                    print(f"[{event_type.upper()}] {parsed.get('user', 'Unknown')}")

                last_check = datetime.now()
                time.sleep(10)  # Check every 10 seconds

            except Exception as e:
                print(f"Login tracker error: {e}")
                time.sleep(10)

    def get_events(self, clear=False, event_type_filter=None):
        """Get login events"""
        with self.lock:
            events = list(self.login_events)

            if event_type_filter:
                events = [e for e in events if e.get('event_type') == event_type_filter]

            if clear:
                self.login_events.clear()

        return events

    def get_failed_logins(self, clear=False):
        """Get failed login attempts"""
        return self.get_events(clear=clear, event_type_filter='login_failed')

    def get_stats(self):
        """Get login statistics"""
        with self.lock:
            stats = dict(self.stats)
            stats['session_duration'] = (datetime.now() - self.session_start).total_seconds() if self.session_start else 0
        return stats

    def get_status(self):
        """Get tracker status"""
        return {
            'running': self.running,
            'current_user': self.get_current_user(),
            'session_info': self.get_session_info(),
            'stats': self.get_stats()
        }

    def start(self):
        """Start login tracking"""
        if self.running:
            return

        self.running = True
        self.thread = threading.Thread(target=self.monitor_loop, daemon=True)
        self.thread.start()
        print("Login tracker started")

    def stop(self):
        """Stop login tracking"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        print("Login tracker stopped")


if __name__ == "__main__":
    def on_event(event):
        print(f"Login event: {event}")

    tracker = LoginTracker(on_login_event_callback=on_event)

    print(f"Current user: {tracker.get_current_user()}")
    print(f"Session info: {tracker.get_session_info()}")

    print("\nRecent security events:")
    events = tracker.read_security_events(max_events=20)
    for event in events[:10]:
        print(f"  [{event['event_type']}] {event['timestamp']}")

    print("\nStarting login tracker...")
    tracker.start()

    try:
        print("Monitoring login events. Lock/unlock your workstation to test.")
        print("Press Ctrl+C to stop\n")
        while True:
            time.sleep(30)
            print(f"Stats: {tracker.get_stats()}")
    except KeyboardInterrupt:
        tracker.stop()
