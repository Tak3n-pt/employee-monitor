"""
USB Device Monitor and Control Module
"""

import threading
import time
import winreg
import ctypes
from datetime import datetime

import wmi
import pythoncom


class USBMonitor:
    def __init__(self, on_event_callback=None):
        self.running = False
        self.thread = None
        self.on_event = on_event_callback
        self.connected_devices = set()
        self.policies = {}  # device_class -> allowed (bool)
        self._com_initialized = threading.local()

    def _ensure_com_initialized(self):
        """Ensure COM is initialized for current thread"""
        if not getattr(self._com_initialized, 'initialized', False):
            pythoncom.CoInitialize()
            self._com_initialized.initialized = True

    def _get_usb_devices_internal(self):
        """Internal method to get USB devices (assumes COM already initialized)"""
        devices = []
        try:
            c = wmi.WMI()

            for disk in c.Win32_DiskDrive():
                if disk.InterfaceType and 'USB' in disk.InterfaceType:
                    devices.append({
                        'device_id': disk.PNPDeviceID,
                        'device_name': disk.Model or disk.Caption or 'USB Device',
                        'device_class': 'storage',
                        'size': disk.Size
                    })
                elif disk.PNPDeviceID and 'USB' in disk.PNPDeviceID:
                    devices.append({
                        'device_id': disk.PNPDeviceID,
                        'device_name': disk.Model or disk.Caption or 'USB Device',
                        'device_class': 'storage',
                        'size': disk.Size
                    })

            for device in c.Win32_PnPEntity():
                if device.PNPDeviceID and 'USB' in device.PNPDeviceID:
                    # Check if it's a phone/portable device
                    name = device.Name or ''
                    if 'Android' in name or 'iPhone' in name or 'MTP' in name:
                        devices.append({
                            'device_id': device.PNPDeviceID,
                            'device_name': name or 'Mobile Device',
                            'device_class': 'phone'
                        })
        except Exception as e:
            print(f"Error getting USB devices: {e}")

        return devices

    def get_connected_usb_devices(self):
        """Get list of currently connected USB devices (public method, handles COM)"""
        devices = []
        try:
            pythoncom.CoInitialize()
            devices = self._get_usb_devices_internal()
        except Exception as e:
            print(f"Error getting USB devices: {e}")
        finally:
            try:
                pythoncom.CoUninitialize()
            except Exception:
                pass
        return devices

    def monitor_loop(self):
        """Main USB monitoring loop"""
        pythoncom.CoInitialize()
        self._com_initialized.initialized = True

        try:
            # Initial scan
            current_devices = {d['device_id'] for d in self._get_usb_devices_internal()}
            self.connected_devices = current_devices

            while self.running:
                try:
                    # Check for changes (use internal method since COM is already initialized)
                    new_devices = {d['device_id'] for d in self._get_usb_devices_internal()}

                    # Detect new connections
                    connected = new_devices - self.connected_devices
                    for device_id in connected:
                        device_info = self._get_device_info_internal(device_id)
                        if device_info:
                            self.handle_device_connected(device_info)

                    # Detect disconnections
                    disconnected = self.connected_devices - new_devices
                    for device_id in disconnected:
                        self.handle_device_disconnected(device_id)

                    self.connected_devices = new_devices
                    time.sleep(2)  # Check every 2 seconds

                except Exception as e:
                    print(f"USB monitor loop error: {e}")
                    time.sleep(2)

        finally:
            try:
                pythoncom.CoUninitialize()
            except Exception:
                pass
            self._com_initialized.initialized = False

    def _get_device_info_internal(self, device_id):
        """Get device info (assumes COM already initialized)"""
        try:
            devices = self._get_usb_devices_internal()
            for device in devices:
                if device['device_id'] == device_id:
                    return device
        except Exception as e:
            print(f"Error getting device info: {e}")
        return {'device_id': device_id, 'device_name': 'Unknown USB Device', 'device_class': 'unknown'}

    def get_device_info(self, device_id):
        """Get information about a specific device (public method)"""
        try:
            pythoncom.CoInitialize()
            return self._get_device_info_internal(device_id)
        except Exception as e:
            print(f"Error getting device info: {e}")
            return {'device_id': device_id, 'device_name': 'Unknown USB Device', 'device_class': 'unknown'}
        finally:
            try:
                pythoncom.CoUninitialize()
            except Exception:
                pass

    def handle_device_connected(self, device_info):
        """Handle USB device connection"""
        device_class = device_info.get('device_class', 'unknown')

        # Check if device is allowed
        allowed = self.is_device_allowed(device_class)

        action = 'connected' if allowed else 'blocked'

        event = {
            'device_id': device_info.get('device_id'),
            'device_name': device_info.get('device_name'),
            'device_class': device_class,
            'action': action,
            'timestamp': datetime.now().isoformat()
        }

        print(f"USB {action}: {device_info.get('device_name')}")

        if not allowed:
            # Block the device
            self.block_device(device_class)

        if self.on_event:
            self.on_event(event)

    def handle_device_disconnected(self, device_id):
        """Handle USB device disconnection"""
        event = {
            'device_id': device_id,
            'device_name': 'USB Device',
            'device_class': 'unknown',
            'action': 'disconnected',
            'timestamp': datetime.now().isoformat()
        }

        print(f"USB disconnected: {device_id}")

        if self.on_event:
            self.on_event(event)

    def is_device_allowed(self, device_class):
        """Check if a device class is allowed"""
        # Check specific class policy
        if device_class in self.policies:
            return self.policies[device_class]

        # Check 'all' policy
        if 'all' in self.policies:
            return self.policies['all']

        # Default: allowed
        return True

    def update_policies(self, policies):
        """Update USB policies from server"""
        if not policies or not isinstance(policies, list):
            return

        self.policies = {}
        for policy in policies:
            if not isinstance(policy, dict):
                continue
            device_class = policy.get('device_class')
            if not device_class:
                continue
            allowed = policy.get('allowed', True)
            if isinstance(allowed, int):
                allowed = bool(allowed)
            self.policies[device_class] = allowed

        print(f"USB policies updated: {self.policies}")

        # Apply policies to currently connected devices
        self.apply_policies()

    def apply_policies(self):
        """Apply current policies"""
        for device_class, allowed in self.policies.items():
            if not allowed:
                self.block_device(device_class)
            else:
                self.unblock_device(device_class)

    def block_device(self, device_class):
        """Block a device class"""
        if device_class == 'storage' or device_class == 'all':
            self.set_usb_storage_enabled(False)
        # Note: Blocking phones requires more complex device-specific handling

    def unblock_device(self, device_class):
        """Unblock a device class"""
        if device_class == 'storage' or device_class == 'all':
            self.set_usb_storage_enabled(True)

    def set_usb_storage_enabled(self, enabled):
        """
        Enable or disable USB storage devices via registry
        Requires administrator privileges
        """
        if not self.is_admin():
            print("Warning: Administrator privileges required to modify USB settings")
            return False

        try:
            key_path = r"SYSTEM\CurrentControlSet\Services\USBSTOR"
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path, 0, winreg.KEY_SET_VALUE)

            # 3 = enabled, 4 = disabled
            value = 3 if enabled else 4
            winreg.SetValueEx(key, "Start", 0, winreg.REG_DWORD, value)
            winreg.CloseKey(key)

            status = "enabled" if enabled else "disabled"
            print(f"USB storage {status}")
            return True
        except PermissionError:
            print("Error: Administrator privileges required to modify USB settings")
            return False
        except Exception as e:
            print(f"Error modifying USB settings: {e}")
            return False

    def is_admin(self):
        """Check if running with administrator privileges"""
        try:
            return ctypes.windll.shell32.IsUserAnAdmin()
        except Exception:
            return False

    def start(self):
        """Start USB monitoring"""
        if self.running:
            return

        self.running = True
        self.thread = threading.Thread(target=self.monitor_loop, daemon=True)
        self.thread.start()
        print("USB monitor started")

    def stop(self):
        """Stop USB monitoring"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=3)
        print("USB monitor stopped")


if __name__ == "__main__":
    def on_usb_event(event):
        print(f"USB Event: {event}")

    monitor = USBMonitor(on_event_callback=on_usb_event)

    # Check admin status
    if monitor.is_admin():
        print("Running with administrator privileges")
    else:
        print("Running without administrator privileges (USB blocking limited)")

    # Test getting devices
    print("\nConnected USB devices:")
    devices = monitor.get_connected_usb_devices()
    for device in devices:
        print(f"  - {device['device_name']} ({device['device_class']})")

    # Start monitoring
    monitor.start()

    try:
        print("\nMonitoring for USB events... (Press Ctrl+C to stop)")
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        monitor.stop()
