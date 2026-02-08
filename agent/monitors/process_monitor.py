"""
Process Monitor - Tracks active applications and window titles
"""

import time
import threading
from datetime import datetime
from collections import deque

import psutil
import win32gui
import win32process


class ProcessMonitor:
    def __init__(self):
        self.running = False
        self.thread = None
        self.activities = deque(maxlen=1000)  # Buffer for activities
        self.current_app = None
        self.current_title = None
        self.current_exe = None
        self.session_start = None
        self.lock = threading.Lock()

    def get_active_window_info(self):
        """Get information about the currently active window"""
        try:
            hwnd = win32gui.GetForegroundWindow()
            if not hwnd:
                return None, None, None

            # Get window title
            title = win32gui.GetWindowText(hwnd)

            # Get process ID
            _, pid = win32process.GetWindowThreadProcessId(hwnd)

            # Get process info
            try:
                process = psutil.Process(pid)
                app_name = process.name()
                exe_path = process.exe()
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                app_name = "Unknown"
                exe_path = None

            return app_name, title, exe_path
        except Exception as e:
            print(f"Error getting active window: {e}")
            return None, None, None

    def record_session(self):
        """Record the current session to activities buffer"""
        if self.current_app and self.session_start:
            end_time = datetime.now()
            duration = int((end_time - self.session_start).total_seconds())

            if duration > 0:  # Only record if at least 1 second
                activity = {
                    'app_name': self.current_app,
                    'window_title': self.current_title or '',
                    'executable_path': self.current_exe,
                    'started_at': self.session_start.isoformat(),
                    'ended_at': end_time.isoformat(),
                    'duration_seconds': duration
                }

                with self.lock:
                    self.activities.append(activity)

    def monitor_loop(self):
        """Main monitoring loop"""
        while self.running:
            try:
                app_name, title, exe_path = self.get_active_window_info()

                if app_name and app_name != self.current_app:
                    # Application changed - record previous session
                    self.record_session()

                    # Start new session
                    self.current_app = app_name
                    self.current_title = title
                    self.current_exe = exe_path
                    self.session_start = datetime.now()
                elif title != self.current_title:
                    # Same app but title changed (e.g., switched tabs)
                    self.current_title = title

                time.sleep(1)  # Check every second
            except Exception as e:
                print(f"Monitor error: {e}")
                time.sleep(1)

    def start(self):
        """Start the process monitor"""
        if self.running:
            return

        self.running = True
        self.session_start = datetime.now()

        # Get initial active window
        app_name, title, exe_path = self.get_active_window_info()
        self.current_app = app_name
        self.current_title = title
        self.current_exe = exe_path

        self.thread = threading.Thread(target=self.monitor_loop, daemon=True)
        self.thread.start()
        print("Process monitor started")

    def stop(self):
        """Stop the process monitor"""
        self.running = False
        self.record_session()  # Record final session

        if self.thread:
            self.thread.join(timeout=2)

        print("Process monitor stopped")

    def get_activities(self, clear=True):
        """Get buffered activities and optionally clear the buffer"""
        with self.lock:
            activities = list(self.activities)
            if clear:
                self.activities.clear()
        return activities

    def get_current_activity(self):
        """Get information about the current activity"""
        return {
            'app_name': self.current_app,
            'window_title': self.current_title,
            'executable_path': self.current_exe,
            'started_at': self.session_start.isoformat() if self.session_start else None,
            'duration_seconds': int((datetime.now() - self.session_start).total_seconds()) if self.session_start else 0
        }


if __name__ == "__main__":
    # Test the monitor
    monitor = ProcessMonitor()
    monitor.start()

    try:
        while True:
            time.sleep(5)
            current = monitor.get_current_activity()
            print(f"Current: {current['app_name']} - {current['window_title'][:50]}... ({current['duration_seconds']}s)")

            activities = monitor.get_activities(clear=False)
            print(f"Buffered activities: {len(activities)}")
    except KeyboardInterrupt:
        monitor.stop()
