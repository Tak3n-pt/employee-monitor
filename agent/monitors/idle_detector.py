"""
Idle Detector - Detects when user is inactive (no mouse/keyboard activity)
"""

import threading
import time
from datetime import datetime, timedelta
from collections import deque
import ctypes
from ctypes import Structure, POINTER, windll, c_uint, sizeof


class LASTINPUTINFO(Structure):
    _fields_ = [
        ('cbSize', c_uint),
        ('dwTime', c_uint),
    ]


class IdleDetector:
    def __init__(self, idle_threshold_seconds=300, on_state_change_callback=None):
        """
        Initialize idle detector

        Args:
            idle_threshold_seconds: Seconds of inactivity before considered idle (default 5 min)
            on_state_change_callback: Called when state changes between active/idle
        """
        self.idle_threshold = idle_threshold_seconds
        self.running = False
        self.thread = None
        self.on_state_change = on_state_change_callback

        # State tracking
        self.is_idle = False
        self.idle_start = None
        self.active_start = datetime.now()

        # Statistics
        self.total_idle_seconds = 0
        self.total_active_seconds = 0
        self.idle_periods = deque(maxlen=100)
        self.lock = threading.Lock()

    def get_idle_duration(self):
        """Get the duration of user inactivity in seconds"""
        try:
            lii = LASTINPUTINFO()
            lii.cbSize = sizeof(LASTINPUTINFO)
            windll.user32.GetLastInputInfo(ctypes.byref(lii))

            # Get tick count (milliseconds since system start)
            tick_count = windll.kernel32.GetTickCount()

            # Calculate idle time in seconds
            idle_ms = tick_count - lii.dwTime
            return idle_ms / 1000.0
        except Exception as e:
            print(f"Error getting idle time: {e}")
            return 0

    def monitor_loop(self):
        """Main monitoring loop"""
        while self.running:
            try:
                idle_seconds = self.get_idle_duration()

                # Check for state change
                if not self.is_idle and idle_seconds >= self.idle_threshold:
                    # User became idle
                    self._set_idle(True)

                elif self.is_idle and idle_seconds < self.idle_threshold:
                    # User became active
                    self._set_idle(False)

                time.sleep(1)  # Check every second

            except Exception as e:
                print(f"Idle detector error: {e}")
                time.sleep(1)

    def _set_idle(self, is_idle):
        """Update idle state"""
        now = datetime.now()

        with self.lock:
            if is_idle and not self.is_idle:
                # Transitioning to idle
                self.is_idle = True
                self.idle_start = now

                # Record active period
                if self.active_start:
                    active_duration = (now - self.active_start).total_seconds()
                    self.total_active_seconds += active_duration

                print(f"User is now IDLE")

                if self.on_state_change:
                    self.on_state_change({
                        'state': 'idle',
                        'timestamp': now.isoformat(),
                        'previous_active_duration': active_duration if self.active_start else 0
                    })

            elif not is_idle and self.is_idle:
                # Transitioning to active
                self.is_idle = False
                self.active_start = now

                # Record idle period
                if self.idle_start:
                    idle_duration = (now - self.idle_start).total_seconds()
                    self.total_idle_seconds += idle_duration
                    self.idle_periods.append({
                        'start': self.idle_start.isoformat(),
                        'end': now.isoformat(),
                        'duration_seconds': int(idle_duration)
                    })

                print(f"User is now ACTIVE")

                if self.on_state_change:
                    self.on_state_change({
                        'state': 'active',
                        'timestamp': now.isoformat(),
                        'previous_idle_duration': idle_duration if self.idle_start else 0
                    })

                self.idle_start = None

    def get_status(self):
        """Get current idle status"""
        idle_seconds = self.get_idle_duration()

        with self.lock:
            return {
                'is_idle': self.is_idle,
                'current_idle_seconds': int(idle_seconds),
                'idle_threshold': self.idle_threshold,
                'total_idle_seconds': int(self.total_idle_seconds),
                'total_active_seconds': int(self.total_active_seconds),
                'idle_periods_count': len(self.idle_periods)
            }

    def get_idle_periods(self, clear=False):
        """Get recorded idle periods"""
        with self.lock:
            periods = list(self.idle_periods)
            if clear:
                self.idle_periods.clear()
        return periods

    def get_productivity_ratio(self):
        """Calculate productivity ratio (active time / total time)"""
        with self.lock:
            total = self.total_active_seconds + self.total_idle_seconds
            if total == 0:
                return 1.0
            return self.total_active_seconds / total

    def set_threshold(self, seconds):
        """Update idle threshold"""
        self.idle_threshold = max(30, min(3600, seconds))  # Between 30s and 1h

    def start(self):
        """Start idle detection"""
        if self.running:
            return

        self.running = True
        self.active_start = datetime.now()
        self.thread = threading.Thread(target=self.monitor_loop, daemon=True)
        self.thread.start()
        print(f"Idle detector started (threshold: {self.idle_threshold}s)")

    def stop(self):
        """Stop idle detection"""
        self.running = False

        # Record final period
        if self.is_idle and self.idle_start:
            duration = (datetime.now() - self.idle_start).total_seconds()
            self.total_idle_seconds += duration
        elif not self.is_idle and self.active_start:
            duration = (datetime.now() - self.active_start).total_seconds()
            self.total_active_seconds += duration

        if self.thread:
            self.thread.join(timeout=2)
        print("Idle detector stopped")


if __name__ == "__main__":
    def on_change(event):
        print(f"State change: {event}")

    # Use 10 second threshold for testing
    detector = IdleDetector(idle_threshold_seconds=10, on_state_change_callback=on_change)
    detector.start()

    try:
        print("Idle detector running... Stop moving mouse for 10 seconds to test")
        print("Press Ctrl+C to stop\n")

        while True:
            status = detector.get_status()
            idle_secs = status['current_idle_seconds']
            state = "IDLE" if status['is_idle'] else "ACTIVE"
            ratio = detector.get_productivity_ratio()

            print(f"\rState: {state} | Idle: {idle_secs:3}s | Productivity: {ratio:.1%}", end='', flush=True)
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n")
        detector.stop()

        print("\nIdle periods:")
        for period in detector.get_idle_periods():
            print(f"  {period['start']} - {period['duration_seconds']}s")
