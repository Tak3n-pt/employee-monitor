"""
Device Control - Enhanced USB whitelist, CD/DVD, Bluetooth blocking
"""

import threading
import time
import winreg
import ctypes
from datetime import datetime
from collections import deque

import wmi
import pythoncom


class DeviceControl:
    def __init__(self, on_device_event_callback=None):
        self.running = False
        self.thread = None
        self.on_device_event = on_device_event_callback

        # Whitelist by serial number
        self.usb_whitelist = set()  # Allowed device serial numbers
        self.usb_blacklist = set()  # Blocked device serial numbers

        # Device class controls
        self.block_usb_storage = False
        self.block_cd_dvd = False
        self.block_bluetooth = False
        self.block_portable_devices = False  # Phones, cameras

        # Tracking
        self.connected_devices = {}
        self.device_events = deque(maxlen=500)
        self.blocked_events = deque(maxlen=200)
        self.lock = threading.Lock()

    def get_all_devices(self):
        """Get all connected devices with details"""
        devices = []

        try:
            pythoncom.CoInitialize()
            c = wmi.WMI()

            # USB devices
            for device in c.Win32_USBHub():
                devices.append({
                    'type': 'usb_hub',
                    'device_id': device.DeviceID,
                    'name': device.Name or 'USB Hub',
                    'pnp_device_id': device.PNPDeviceID,
                    'status': device.Status,
                })

            # USB storage
            for disk in c.Win32_DiskDrive():
                if disk.InterfaceType == 'USB' or (disk.PNPDeviceID and 'USB' in disk.PNPDeviceID):
                    # Get serial number
                    serial = self._extract_serial(disk.PNPDeviceID)

                    devices.append({
                        'type': 'usb_storage',
                        'device_id': disk.DeviceID,
                        'name': disk.Model or disk.Caption or 'USB Storage',
                        'pnp_device_id': disk.PNPDeviceID,
                        'serial_number': serial,
                        'size': disk.Size,
                        'status': disk.Status,
                    })

            # CD/DVD drives
            for cdrom in c.Win32_CDROMDrive():
                devices.append({
                    'type': 'cd_dvd',
                    'device_id': cdrom.DeviceID,
                    'name': cdrom.Name or 'CD/DVD Drive',
                    'drive_letter': cdrom.Drive,
                    'status': cdrom.Status,
                })

            # Bluetooth devices
            for bt in c.Win32_PnPEntity():
                if bt.PNPDeviceID and 'BLUETOOTH' in bt.PNPDeviceID.upper():
                    devices.append({
                        'type': 'bluetooth',
                        'device_id': bt.DeviceID,
                        'name': bt.Name or 'Bluetooth Device',
                        'pnp_device_id': bt.PNPDeviceID,
                        'status': bt.Status,
                    })

            # Portable devices (phones, cameras)
            for portable in c.Win32_PnPEntity():
                if portable.PNPDeviceID:
                    pnp_upper = portable.PNPDeviceID.upper()
                    if 'ANDROID' in pnp_upper or 'IPHONE' in pnp_upper or 'MTP' in pnp_upper or 'PTP' in pnp_upper:
                        devices.append({
                            'type': 'portable',
                            'device_id': portable.DeviceID,
                            'name': portable.Name or 'Portable Device',
                            'pnp_device_id': portable.PNPDeviceID,
                            'status': portable.Status,
                        })

        except Exception as e:
            print(f"Error getting devices: {e}")
        finally:
            try:
                pythoncom.CoUninitialize()
            except:
                pass

        return devices

    def _extract_serial(self, pnp_device_id):
        """Extract serial number from PNP device ID"""
        if not pnp_device_id:
            return None

        # PNP ID format: USB\VID_xxxx&PID_xxxx\serial
        parts = pnp_device_id.split('\\')
        if len(parts) >= 3:
            return parts[-1]
        return None

    def is_device_allowed(self, device):
        """Check if device is allowed based on rules"""
        device_type = device.get('type', '')
        serial = device.get('serial_number', '')
        pnp_id = device.get('pnp_device_id', '')

        # Check blacklist first (by serial)
        if serial and serial in self.usb_blacklist:
            return False, 'blacklisted'

        # Check whitelist (if whitelist is enabled and device is USB storage)
        if device_type == 'usb_storage' and self.usb_whitelist:
            if serial and serial not in self.usb_whitelist:
                return False, 'not_whitelisted'

        # Check device class blocks
        if device_type == 'usb_storage' and self.block_usb_storage:
            return False, 'storage_blocked'

        if device_type == 'cd_dvd' and self.block_cd_dvd:
            return False, 'cd_dvd_blocked'

        if device_type == 'bluetooth' and self.block_bluetooth:
            return False, 'bluetooth_blocked'

        if device_type == 'portable' and self.block_portable_devices:
            return False, 'portable_blocked'

        return True, 'allowed'

    def set_usb_storage_enabled(self, enabled):
        """Enable/disable USB storage via registry"""
        try:
            key_path = r"SYSTEM\CurrentControlSet\Services\USBSTOR"
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path, 0, winreg.KEY_SET_VALUE)
            value = 3 if enabled else 4  # 3=enabled, 4=disabled
            winreg.SetValueEx(key, "Start", 0, winreg.REG_DWORD, value)
            winreg.CloseKey(key)

            self.block_usb_storage = not enabled
            print(f"USB storage {'enabled' if enabled else 'disabled'}")
            return True
        except PermissionError:
            print("Admin privileges required for USB storage control")
            return False
        except Exception as e:
            print(f"Error setting USB storage: {e}")
            return False

    def set_cd_dvd_enabled(self, enabled):
        """Enable/disable CD/DVD drives via registry"""
        try:
            key_path = r"SYSTEM\CurrentControlSet\Services\cdrom"
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path, 0, winreg.KEY_SET_VALUE)
            value = 1 if enabled else 4  # 1=enabled, 4=disabled
            winreg.SetValueEx(key, "Start", 0, winreg.REG_DWORD, value)
            winreg.CloseKey(key)

            self.block_cd_dvd = not enabled
            print(f"CD/DVD {'enabled' if enabled else 'disabled'}")
            return True
        except PermissionError:
            print("Admin privileges required for CD/DVD control")
            return False
        except Exception as e:
            print(f"Error setting CD/DVD: {e}")
            return False

    def set_bluetooth_enabled(self, enabled):
        """Enable/disable Bluetooth via registry"""
        try:
            # Bluetooth radio manager service
            key_path = r"SYSTEM\CurrentControlSet\Services\bthserv"
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path, 0, winreg.KEY_SET_VALUE)
            value = 2 if enabled else 4  # 2=auto, 4=disabled
            winreg.SetValueEx(key, "Start", 0, winreg.REG_DWORD, value)
            winreg.CloseKey(key)

            self.block_bluetooth = not enabled
            print(f"Bluetooth {'enabled' if enabled else 'disabled'}")
            return True
        except PermissionError:
            print("Admin privileges required for Bluetooth control")
            return False
        except Exception as e:
            print(f"Error setting Bluetooth: {e}")
            return False

    def add_to_whitelist(self, serial_number):
        """Add device serial to whitelist"""
        self.usb_whitelist.add(serial_number)
        print(f"Added to whitelist: {serial_number}")

    def remove_from_whitelist(self, serial_number):
        """Remove device serial from whitelist"""
        self.usb_whitelist.discard(serial_number)
        print(f"Removed from whitelist: {serial_number}")

    def add_to_blacklist(self, serial_number):
        """Add device serial to blacklist"""
        self.usb_blacklist.add(serial_number)
        print(f"Added to blacklist: {serial_number}")

    def remove_from_blacklist(self, serial_number):
        """Remove device serial from blacklist"""
        self.usb_blacklist.discard(serial_number)
        print(f"Removed from blacklist: {serial_number}")

    def monitor_loop(self):
        """Main device monitoring loop"""
        pythoncom.CoInitialize()

        try:
            while self.running:
                try:
                    current_devices = {d.get('pnp_device_id') or d.get('device_id'): d
                                       for d in self.get_all_devices()}

                    # Detect new devices
                    for dev_id, device in current_devices.items():
                        if dev_id not in self.connected_devices:
                            # New device connected
                            allowed, reason = self.is_device_allowed(device)

                            event = {
                                'timestamp': datetime.now().isoformat(),
                                'action': 'connected',
                                'device': device,
                                'allowed': allowed,
                                'reason': reason,
                            }

                            with self.lock:
                                self.device_events.append(event)

                                if not allowed:
                                    self.blocked_events.append(event)
                                    print(f"[BLOCKED] {device['name']} - {reason}")

                            if self.on_device_event:
                                self.on_device_event(event)

                    # Detect removed devices
                    for dev_id in list(self.connected_devices.keys()):
                        if dev_id not in current_devices:
                            device = self.connected_devices[dev_id]

                            event = {
                                'timestamp': datetime.now().isoformat(),
                                'action': 'disconnected',
                                'device': device,
                            }

                            with self.lock:
                                self.device_events.append(event)

                            if self.on_device_event:
                                self.on_device_event(event)

                    self.connected_devices = current_devices
                    time.sleep(3)

                except Exception as e:
                    print(f"Device monitor error: {e}")
                    time.sleep(3)

        finally:
            try:
                pythoncom.CoUninitialize()
            except:
                pass

    def get_events(self, clear=False):
        """Get device events"""
        with self.lock:
            events = list(self.device_events)
            if clear:
                self.device_events.clear()
        return events

    def get_blocked_events(self, clear=False):
        """Get blocked device events"""
        with self.lock:
            events = list(self.blocked_events)
            if clear:
                self.blocked_events.clear()
        return events

    def get_status(self):
        """Get device control status"""
        return {
            'running': self.running,
            'block_usb_storage': self.block_usb_storage,
            'block_cd_dvd': self.block_cd_dvd,
            'block_bluetooth': self.block_bluetooth,
            'block_portable': self.block_portable_devices,
            'whitelist_count': len(self.usb_whitelist),
            'blacklist_count': len(self.usb_blacklist),
            'connected_devices': len(self.connected_devices),
        }

    def apply_policy(self, policy):
        """Apply device control policy from server"""
        if 'block_usb_storage' in policy:
            self.set_usb_storage_enabled(not policy['block_usb_storage'])

        if 'block_cd_dvd' in policy:
            self.set_cd_dvd_enabled(not policy['block_cd_dvd'])

        if 'block_bluetooth' in policy:
            self.set_bluetooth_enabled(not policy['block_bluetooth'])

        if 'block_portable' in policy:
            self.block_portable_devices = policy['block_portable']

        if 'whitelist' in policy:
            self.usb_whitelist = set(policy['whitelist'])

        if 'blacklist' in policy:
            self.usb_blacklist = set(policy['blacklist'])

    def start(self):
        """Start device monitoring"""
        if self.running:
            return

        self.running = True
        self.connected_devices = {d.get('pnp_device_id') or d.get('device_id'): d
                                  for d in self.get_all_devices()}
        self.thread = threading.Thread(target=self.monitor_loop, daemon=True)
        self.thread.start()
        print("Device control started")

    def stop(self):
        """Stop device monitoring"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        print("Device control stopped")


if __name__ == "__main__":
    def on_event(event):
        action = event['action']
        device = event['device']
        allowed = event.get('allowed', True)
        status = "ALLOWED" if allowed else "BLOCKED"
        print(f"[{action.upper()}] [{status}] {device['type']}: {device['name']}")

    control = DeviceControl(on_device_event_callback=on_event)

    print("Connected devices:")
    for device in control.get_all_devices():
        serial = device.get('serial_number', 'N/A')
        print(f"  [{device['type']}] {device['name']} (Serial: {serial})")

    print("\nStarting device monitor...")
    control.start()

    try:
        print("Connect/disconnect devices to test. Press Ctrl+C to stop\n")
        while True:
            time.sleep(5)
    except KeyboardInterrupt:
        control.stop()
