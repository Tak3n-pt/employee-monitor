"""
Time Tracker - Clock in/out, break tracking, work time calculation
"""

import threading
import time
import json
import os
from datetime import datetime, timedelta
from collections import deque
from pathlib import Path


class TimeTracker:
    def __init__(self, on_time_event_callback=None, data_dir=None):
        self.on_time_event = on_time_event_callback

        # Data directory for persistence
        self.data_dir = data_dir or os.path.join(os.getenv('APPDATA', '.'), 'EmployeeMonitor')
        os.makedirs(self.data_dir, exist_ok=True)
        self.data_file = os.path.join(self.data_dir, 'time_tracking.json')

        # Current state
        self.clocked_in = False
        self.clock_in_time = None
        self.on_break = False
        self.break_start_time = None

        # History
        self.time_entries = deque(maxlen=10000)
        self.breaks = deque(maxlen=1000)
        self.daily_summaries = {}

        # Statistics
        self.today_work_seconds = 0
        self.today_break_seconds = 0
        self.current_session_seconds = 0

        self.lock = threading.Lock()

        # Load previous data
        self._load_data()

        # Auto clock-in on start
        self.auto_clock_in = True

    def _load_data(self):
        """Load time tracking data from file"""
        try:
            if os.path.exists(self.data_file):
                with open(self.data_file, 'r') as f:
                    data = json.load(f)

                self.daily_summaries = data.get('daily_summaries', {})

                # Check if still clocked in from previous session
                last_entry = data.get('last_entry')
                if last_entry and last_entry.get('type') == 'clock_in':
                    # Continue from previous clock-in
                    self.clocked_in = True
                    self.clock_in_time = datetime.fromisoformat(last_entry['timestamp'])

        except Exception as e:
            print(f"Error loading time data: {e}")

    def _save_data(self):
        """Save time tracking data to file"""
        try:
            data = {
                'daily_summaries': self.daily_summaries,
                'last_entry': {
                    'type': 'clock_in' if self.clocked_in else 'clock_out',
                    'timestamp': self.clock_in_time.isoformat() if self.clock_in_time else None
                }
            }

            with open(self.data_file, 'w') as f:
                json.dump(data, f, indent=2)

        except Exception as e:
            print(f"Error saving time data: {e}")

    def clock_in(self, note=None):
        """Clock in - start work session"""
        if self.clocked_in:
            return {'success': False, 'message': 'Already clocked in'}

        with self.lock:
            self.clocked_in = True
            self.clock_in_time = datetime.now()
            self.current_session_seconds = 0

            entry = {
                'type': 'clock_in',
                'timestamp': self.clock_in_time.isoformat(),
                'note': note,
            }
            self.time_entries.append(entry)

            self._save_data()

        print(f"[CLOCK IN] {self.clock_in_time.strftime('%H:%M:%S')}")

        if self.on_time_event:
            self.on_time_event(entry)

        return {'success': True, 'time': self.clock_in_time.isoformat()}

    def clock_out(self, note=None):
        """Clock out - end work session"""
        if not self.clocked_in:
            return {'success': False, 'message': 'Not clocked in'}

        # End any active break first
        if self.on_break:
            self.end_break()

        with self.lock:
            clock_out_time = datetime.now()
            session_duration = (clock_out_time - self.clock_in_time).total_seconds()

            entry = {
                'type': 'clock_out',
                'timestamp': clock_out_time.isoformat(),
                'clock_in_time': self.clock_in_time.isoformat(),
                'duration_seconds': session_duration,
                'note': note,
            }
            self.time_entries.append(entry)

            # Update daily summary
            date_key = self.clock_in_time.strftime('%Y-%m-%d')
            if date_key not in self.daily_summaries:
                self.daily_summaries[date_key] = {
                    'work_seconds': 0,
                    'break_seconds': 0,
                    'sessions': 0,
                }
            self.daily_summaries[date_key]['work_seconds'] += session_duration
            self.daily_summaries[date_key]['sessions'] += 1

            self.today_work_seconds += session_duration

            self.clocked_in = False
            self.clock_in_time = None

            self._save_data()

        print(f"[CLOCK OUT] Duration: {self._format_duration(session_duration)}")

        if self.on_time_event:
            self.on_time_event(entry)

        return {
            'success': True,
            'duration_seconds': session_duration,
            'duration_formatted': self._format_duration(session_duration)
        }

    def start_break(self, break_type='general', note=None):
        """Start a break"""
        if not self.clocked_in:
            return {'success': False, 'message': 'Must be clocked in to take a break'}

        if self.on_break:
            return {'success': False, 'message': 'Already on break'}

        with self.lock:
            self.on_break = True
            self.break_start_time = datetime.now()

            entry = {
                'type': 'break_start',
                'break_type': break_type,
                'timestamp': self.break_start_time.isoformat(),
                'note': note,
            }
            self.breaks.append(entry)

        print(f"[BREAK START] {break_type}")

        if self.on_time_event:
            self.on_time_event(entry)

        return {'success': True, 'time': self.break_start_time.isoformat()}

    def end_break(self, note=None):
        """End a break"""
        if not self.on_break:
            return {'success': False, 'message': 'Not on break'}

        with self.lock:
            break_end_time = datetime.now()
            break_duration = (break_end_time - self.break_start_time).total_seconds()

            entry = {
                'type': 'break_end',
                'timestamp': break_end_time.isoformat(),
                'break_start': self.break_start_time.isoformat(),
                'duration_seconds': break_duration,
                'note': note,
            }
            self.breaks.append(entry)

            # Update daily break time
            date_key = self.break_start_time.strftime('%Y-%m-%d')
            if date_key in self.daily_summaries:
                self.daily_summaries[date_key]['break_seconds'] += break_duration

            self.today_break_seconds += break_duration
            self.on_break = False
            self.break_start_time = None

            self._save_data()

        print(f"[BREAK END] Duration: {self._format_duration(break_duration)}")

        if self.on_time_event:
            self.on_time_event(entry)

        return {
            'success': True,
            'duration_seconds': break_duration,
            'duration_formatted': self._format_duration(break_duration)
        }

    def _format_duration(self, seconds):
        """Format seconds as HH:MM:SS"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"

    def get_current_status(self):
        """Get current time tracking status"""
        current_session = 0
        current_break = 0

        if self.clocked_in and self.clock_in_time:
            current_session = (datetime.now() - self.clock_in_time).total_seconds()

        if self.on_break and self.break_start_time:
            current_break = (datetime.now() - self.break_start_time).total_seconds()

        return {
            'clocked_in': self.clocked_in,
            'clock_in_time': self.clock_in_time.isoformat() if self.clock_in_time else None,
            'on_break': self.on_break,
            'break_start': self.break_start_time.isoformat() if self.break_start_time else None,
            'current_session_seconds': current_session,
            'current_session_formatted': self._format_duration(current_session),
            'current_break_seconds': current_break,
            'current_break_formatted': self._format_duration(current_break),
        }

    def get_today_summary(self):
        """Get today's time summary"""
        today = datetime.now().strftime('%Y-%m-%d')
        summary = self.daily_summaries.get(today, {
            'work_seconds': 0,
            'break_seconds': 0,
            'sessions': 0,
        })

        # Add current session if still clocked in
        current_work = 0
        current_break = 0
        if self.clocked_in and self.clock_in_time:
            current_work = (datetime.now() - self.clock_in_time).total_seconds()
        if self.on_break and self.break_start_time:
            current_break = (datetime.now() - self.break_start_time).total_seconds()

        total_work = summary['work_seconds'] + current_work
        total_break = summary['break_seconds'] + current_break
        net_work = total_work - total_break

        return {
            'date': today,
            'total_work_seconds': total_work,
            'total_work_formatted': self._format_duration(total_work),
            'total_break_seconds': total_break,
            'total_break_formatted': self._format_duration(total_break),
            'net_work_seconds': net_work,
            'net_work_formatted': self._format_duration(net_work),
            'sessions': summary['sessions'] + (1 if self.clocked_in else 0),
        }

    def get_week_summary(self):
        """Get this week's time summary"""
        today = datetime.now()
        start_of_week = today - timedelta(days=today.weekday())

        week_data = {
            'start_date': start_of_week.strftime('%Y-%m-%d'),
            'end_date': today.strftime('%Y-%m-%d'),
            'days': [],
            'total_work_seconds': 0,
            'total_break_seconds': 0,
        }

        for i in range(7):
            day = start_of_week + timedelta(days=i)
            if day > today:
                break

            date_key = day.strftime('%Y-%m-%d')
            day_data = self.daily_summaries.get(date_key, {
                'work_seconds': 0,
                'break_seconds': 0,
                'sessions': 0,
            })

            week_data['days'].append({
                'date': date_key,
                'day_name': day.strftime('%A'),
                'work_seconds': day_data['work_seconds'],
                'work_formatted': self._format_duration(day_data['work_seconds']),
                'break_seconds': day_data['break_seconds'],
                'sessions': day_data['sessions'],
            })

            week_data['total_work_seconds'] += day_data['work_seconds']
            week_data['total_break_seconds'] += day_data['break_seconds']

        week_data['total_work_formatted'] = self._format_duration(week_data['total_work_seconds'])
        week_data['total_break_formatted'] = self._format_duration(week_data['total_break_seconds'])

        return week_data

    def get_time_entries(self, limit=100, date_filter=None):
        """Get time entries history"""
        with self.lock:
            entries = list(self.time_entries)

            if date_filter:
                entries = [e for e in entries if e['timestamp'].startswith(date_filter)]

            return entries[-limit:]

    def get_breaks(self, limit=50, date_filter=None):
        """Get break history"""
        with self.lock:
            breaks = list(self.breaks)

            if date_filter:
                breaks = [b for b in breaks if b['timestamp'].startswith(date_filter)]

            return breaks[-limit:]

    def auto_start(self):
        """Auto clock-in if configured"""
        if self.auto_clock_in and not self.clocked_in:
            self.clock_in(note="Auto clock-in on agent start")


if __name__ == "__main__":
    def on_event(event):
        print(f"Time event: {event['type']}")

    tracker = TimeTracker(on_time_event_callback=on_event)

    # Test clock in
    print("\nTesting clock in...")
    result = tracker.clock_in(note="Test session")
    print(f"Result: {result}")

    print(f"\nStatus: {tracker.get_current_status()}")

    # Wait a bit
    time.sleep(2)

    # Test break
    print("\nStarting break...")
    tracker.start_break(break_type='coffee')
    time.sleep(2)
    tracker.end_break()

    # Wait more
    time.sleep(2)

    # Clock out
    print("\nClocking out...")
    result = tracker.clock_out(note="Test complete")
    print(f"Result: {result}")

    print(f"\nToday's summary: {tracker.get_today_summary()}")
    print(f"\nWeek summary: {tracker.get_week_summary()}")
