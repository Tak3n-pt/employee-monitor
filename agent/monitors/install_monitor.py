"""
Application Install Monitor - Detects new installs and uninstalls
Monitors Windows registry Uninstall keys for changes
"""

import threading
import time
from datetime import datetime
from collections import deque

import winreg


# Registry paths for installed applications
UNINSTALL_KEYS = [
    (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
    (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
    (winreg.HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
]


class InstallMonitor:
    def __init__(self, on_install_callback=None, check_interval=60):
        self.running = False
        self.thread = None
        self.on_install = on_install_callback
        self.check_interval = check_interval
        self.lock = threading.Lock()

        self.install_events = deque(maxlen=500)
        self._known_apps = {}  # key -> app_info dict

    def _read_reg_value(self, key, name):
        """Safely read a registry value"""
        try:
            value, _ = winreg.QueryValueEx(key, name)
            return value
        except (FileNotFoundError, OSError):
            return None

    def _get_installed_apps(self):
        """Get all currently installed applications from registry"""
        apps = {}

        for hive, path in UNINSTALL_KEYS:
            try:
                reg_key = winreg.OpenKey(hive, path)
            except (FileNotFoundError, OSError):
                continue

            try:
                i = 0
                while True:
                    try:
                        subkey_name = winreg.EnumKey(reg_key, i)
                        i += 1

                        try:
                            subkey = winreg.OpenKey(reg_key, subkey_name)
                        except (FileNotFoundError, OSError):
                            continue

                        display_name = self._read_reg_value(subkey, "DisplayName")
                        if not display_name:
                            winreg.CloseKey(subkey)
                            continue

                        # Build a unique key
                        unique_key = f"{path}\\{subkey_name}"

                        apps[unique_key] = {
                            'app_name': display_name,
                            'version': self._read_reg_value(subkey, "DisplayVersion") or '',
                            'publisher': self._read_reg_value(subkey, "Publisher") or '',
                            'install_location': self._read_reg_value(subkey, "InstallLocation") or '',
                            'install_date': self._read_reg_value(subkey, "InstallDate") or '',
                        }

                        winreg.CloseKey(subkey)
                    except OSError:
                        break
            finally:
                winreg.CloseKey(reg_key)

        return apps

    def monitor_loop(self):
        """Main monitoring loop"""
        # Take initial snapshot
        self._known_apps = self._get_installed_apps()
        print(f"Install monitor: tracking {len(self._known_apps)} installed apps")

        while self.running:
            time.sleep(self.check_interval)

            if not self.running:
                break

            try:
                current_apps = self._get_installed_apps()
                now = datetime.now()

                # Detect new installs
                for key, info in current_apps.items():
                    if key not in self._known_apps:
                        event = {
                            'timestamp': now.isoformat(),
                            'action': 'install',
                            **info,
                        }
                        with self.lock:
                            self.install_events.append(event)

                        if self.on_install:
                            self.on_install(event)

                        print(f"[INSTALL] New app: {info['app_name']} {info['version']}")

                # Detect uninstalls
                for key, info in self._known_apps.items():
                    if key not in current_apps:
                        event = {
                            'timestamp': now.isoformat(),
                            'action': 'uninstall',
                            **info,
                        }
                        with self.lock:
                            self.install_events.append(event)

                        if self.on_install:
                            self.on_install(event)

                        print(f"[UNINSTALL] Removed: {info['app_name']}")

                self._known_apps = current_apps

            except Exception as e:
                print(f"Install monitor error: {e}")

    def get_events(self, clear=False):
        """Get install/uninstall events"""
        with self.lock:
            result = list(self.install_events)
            if clear:
                self.install_events.clear()
        return result

    def get_installed_count(self):
        """Get current count of installed apps"""
        return len(self._known_apps)

    def get_status(self):
        """Get monitor status"""
        return {
            'running': self.running,
            'tracked_apps': len(self._known_apps),
            'total_events': len(self.install_events),
        }

    def start(self):
        """Start install monitoring"""
        if self.running:
            return

        self.running = True
        self.thread = threading.Thread(target=self.monitor_loop, daemon=True)
        self.thread.start()
        print("Install monitor started")

    def stop(self):
        """Stop install monitoring"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=3)
        print("Install monitor stopped")
