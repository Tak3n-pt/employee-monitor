"""
Application Blocker - Monitors and blocks specified applications
"""

import threading
import time
import os
from datetime import datetime
from collections import deque, defaultdict

import psutil
import win32gui
import win32process
import win32con
import win32api


# Default app categories
APP_CATEGORIES = {
    'productive': [
        'code.exe', 'devenv.exe', 'pycharm64.exe', 'idea64.exe', 'sublime_text.exe',
        'notepad++.exe', 'atom.exe', 'webstorm64.exe',
        'WINWORD.EXE', 'EXCEL.EXE', 'POWERPNT.EXE', 'OUTLOOK.EXE',
        'slack.exe', 'Teams.exe', 'zoom.exe',
        'figma.exe', 'photoshop.exe', 'illustrator.exe',
        'terminal.exe', 'powershell.exe', 'cmd.exe', 'WindowsTerminal.exe',
    ],
    'unproductive': [
        'spotify.exe', 'Discord.exe', 'vlc.exe', 'wmplayer.exe',
    ],
    'games': [
        'steam.exe', 'steamwebhelper.exe', 'epicgameslauncher.exe',
        'origin.exe', 'battle.net.exe', 'minecraft.exe',
    ],
    'browsers': [
        'chrome.exe', 'firefox.exe', 'msedge.exe', 'brave.exe',
        'opera.exe', 'iexplore.exe',
    ],
    'communication': [
        'slack.exe', 'Teams.exe', 'zoom.exe', 'discord.exe',
        'skype.exe', 'telegram.exe', 'whatsapp.exe',
    ],
}


class AppBlocker:
    def __init__(self, on_block_callback=None, on_app_launch_callback=None):
        self.running = False
        self.thread = None
        self.on_block = on_block_callback
        self.on_app_launch = on_app_launch_callback

        # Blocking rules
        self.blocked_apps = set()  # App names to block
        self.blocked_categories = set()  # Categories to block
        self.whitelist = set()  # Never block these

        # Tracking
        self.running_apps = {}  # pid -> app_info
        self.app_launches = deque(maxlen=1000)
        self.blocked_attempts = deque(maxlen=500)
        self.app_time = defaultdict(int)  # app_name -> seconds

        self.lock = threading.Lock()

    def get_running_apps(self):
        """Get list of currently running applications"""
        apps = {}

        for proc in psutil.process_iter(['pid', 'name', 'exe', 'create_time']):
            try:
                info = proc.info
                if info['exe']:  # Only apps with executables
                    apps[info['pid']] = {
                        'pid': info['pid'],
                        'name': info['name'],
                        'exe': info['exe'],
                        'create_time': datetime.fromtimestamp(info['create_time']).isoformat()
                    }
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        return apps

    def categorize_app(self, app_name):
        """Get category for an application"""
        app_lower = app_name.lower()

        for category, apps in APP_CATEGORIES.items():
            if app_lower in [a.lower() for a in apps]:
                return category

        return 'other'

    def is_app_blocked(self, app_name):
        """Check if an app should be blocked"""
        app_lower = app_name.lower()

        # Check whitelist first
        if app_lower in [w.lower() for w in self.whitelist]:
            return False

        # Check direct block list
        if app_lower in [b.lower() for b in self.blocked_apps]:
            return True

        # Check category blocks
        category = self.categorize_app(app_name)
        if category in self.blocked_categories:
            return True

        return False

    def kill_process(self, pid, app_name):
        """Kill a process by PID"""
        try:
            proc = psutil.Process(pid)
            proc.terminate()

            # Wait a bit then force kill if still running
            time.sleep(0.5)
            if proc.is_running():
                proc.kill()

            print(f"Blocked app terminated: {app_name} (PID: {pid})")
            return True

        except psutil.NoSuchProcess:
            return True  # Already gone
        except psutil.AccessDenied:
            print(f"Cannot kill {app_name}: Access denied (may need admin)")
            return False
        except Exception as e:
            print(f"Error killing {app_name}: {e}")
            return False

    def monitor_loop(self):
        """Main monitoring loop"""
        while self.running:
            try:
                current_apps = self.get_running_apps()

                # Detect new apps
                for pid, app_info in current_apps.items():
                    if pid not in self.running_apps:
                        # New app launched
                        app_name = app_info['name']
                        category = self.categorize_app(app_name)

                        launch_event = {
                            'timestamp': datetime.now().isoformat(),
                            'pid': pid,
                            'name': app_name,
                            'exe': app_info['exe'],
                            'category': category
                        }

                        with self.lock:
                            self.app_launches.append(launch_event)

                        if self.on_app_launch:
                            self.on_app_launch(launch_event)

                        # Check if should be blocked
                        if self.is_app_blocked(app_name):
                            blocked_event = {
                                'timestamp': datetime.now().isoformat(),
                                'pid': pid,
                                'name': app_name,
                                'category': category,
                                'action': 'blocked'
                            }

                            if self.kill_process(pid, app_name):
                                with self.lock:
                                    self.blocked_attempts.append(blocked_event)

                                if self.on_block:
                                    self.on_block(blocked_event)

                # Detect closed apps
                closed_pids = set(self.running_apps.keys()) - set(current_apps.keys())
                for pid in closed_pids:
                    del self.running_apps[pid]

                # Update running apps
                self.running_apps = current_apps

                time.sleep(2)  # Check every 2 seconds

            except Exception as e:
                print(f"App blocker error: {e}")
                time.sleep(2)

    def block_app(self, app_name):
        """Add app to block list"""
        self.blocked_apps.add(app_name.lower())
        print(f"App blocked: {app_name}")

        # Kill if currently running
        self._kill_blocked_apps()

    def unblock_app(self, app_name):
        """Remove app from block list"""
        self.blocked_apps.discard(app_name.lower())
        print(f"App unblocked: {app_name}")

    def block_category(self, category):
        """Block all apps in a category"""
        self.blocked_categories.add(category)
        print(f"Category blocked: {category}")
        self._kill_blocked_apps()

    def unblock_category(self, category):
        """Unblock all apps in a category"""
        self.blocked_categories.discard(category)
        print(f"Category unblocked: {category}")

    def add_to_whitelist(self, app_name):
        """Add app to whitelist (never block)"""
        self.whitelist.add(app_name.lower())

    def remove_from_whitelist(self, app_name):
        """Remove app from whitelist"""
        self.whitelist.discard(app_name.lower())

    def _kill_blocked_apps(self):
        """Kill any currently running blocked apps"""
        for pid, app_info in list(self.running_apps.items()):
            if self.is_app_blocked(app_info['name']):
                self.kill_process(pid, app_info['name'])

    def get_app_launches(self, clear=False):
        """Get app launch history"""
        with self.lock:
            launches = list(self.app_launches)
            if clear:
                self.app_launches.clear()
        return launches

    def get_blocked_attempts(self, clear=False):
        """Get blocked app attempts"""
        with self.lock:
            attempts = list(self.blocked_attempts)
            if clear:
                self.blocked_attempts.clear()
        return attempts

    def get_running_apps_summary(self):
        """Get summary of currently running apps by category"""
        summary = defaultdict(list)

        for pid, app_info in self.running_apps.items():
            category = self.categorize_app(app_info['name'])
            summary[category].append(app_info['name'])

        return dict(summary)

    def get_status(self):
        """Get blocker status"""
        return {
            'running': self.running,
            'blocked_apps': list(self.blocked_apps),
            'blocked_categories': list(self.blocked_categories),
            'whitelist': list(self.whitelist),
            'running_apps_count': len(self.running_apps),
            'total_launches': len(self.app_launches),
            'total_blocks': len(self.blocked_attempts)
        }

    def start(self):
        """Start app monitoring/blocking"""
        if self.running:
            return

        self.running = True
        self.running_apps = self.get_running_apps()
        self.thread = threading.Thread(target=self.monitor_loop, daemon=True)
        self.thread.start()
        print("App blocker started")

    def stop(self):
        """Stop app monitoring/blocking"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=3)
        print("App blocker stopped")


if __name__ == "__main__":
    def on_launch(event):
        print(f"[LAUNCH] {event['name']} ({event['category']})")

    def on_block(event):
        print(f"[BLOCKED] {event['name']}")

    blocker = AppBlocker(on_block_callback=on_block, on_app_launch_callback=on_launch)

    # Show current apps
    print("Currently running apps by category:")
    apps = blocker.get_running_apps()
    summary = defaultdict(list)
    for app in apps.values():
        cat = blocker.categorize_app(app['name'])
        summary[cat].append(app['name'])

    for cat, app_list in sorted(summary.items()):
        print(f"\n{cat.upper()}:")
        for app in sorted(set(app_list))[:10]:
            print(f"  - {app}")

    # Test blocking
    print("\n\nStarting monitor... (Will block 'notepad.exe' for testing)")
    blocker.block_app('notepad.exe')
    blocker.start()

    try:
        print("Try opening Notepad - it will be blocked!")
        print("Press Ctrl+C to stop\n")
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        blocker.stop()
        blocker.unblock_app('notepad.exe')
