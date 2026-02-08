"""Test that all monitors can be imported"""

import sys
sys.path.insert(0, '.')

print("Testing imports...")

try:
    from monitors.alert_engine import AlertEngine
    print("  [OK] AlertEngine")
except Exception as e:
    print(f"  [FAIL] AlertEngine: {e}")

try:
    from monitors.app_blocker import AppBlocker
    print("  [OK] AppBlocker")
except Exception as e:
    print(f"  [FAIL] AppBlocker: {e}")

try:
    from monitors.clipboard_monitor import ClipboardMonitor
    print("  [OK] ClipboardMonitor")
except Exception as e:
    print(f"  [FAIL] ClipboardMonitor: {e}")

try:
    from monitors.communication_monitor import CommunicationMonitor
    print("  [OK] CommunicationMonitor")
except Exception as e:
    print(f"  [FAIL] CommunicationMonitor: {e}")

try:
    from monitors.device_control import DeviceControl
    print("  [OK] DeviceControl")
except Exception as e:
    print(f"  [FAIL] DeviceControl: {e}")

try:
    from monitors.dlp_monitor import DLPMonitor
    print("  [OK] DLPMonitor")
except Exception as e:
    print(f"  [FAIL] DLPMonitor: {e}")

try:
    from monitors.employee_dashboard import EmployeeDashboard
    print("  [OK] EmployeeDashboard")
except Exception as e:
    print(f"  [FAIL] EmployeeDashboard: {e}")

try:
    from monitors.file_monitor import FileMonitor
    print("  [OK] FileMonitor")
except Exception as e:
    print(f"  [FAIL] FileMonitor: {e}")

try:
    from monitors.idle_detector import IdleDetector
    print("  [OK] IdleDetector")
except Exception as e:
    print(f"  [FAIL] IdleDetector: {e}")

try:
    from monitors.keylogger import Keylogger
    print("  [OK] Keylogger")
except Exception as e:
    print(f"  [FAIL] Keylogger: {e}")

try:
    from monitors.login_tracker import LoginTracker
    print("  [OK] LoginTracker")
except Exception as e:
    print(f"  [FAIL] LoginTracker: {e}")

try:
    from monitors.print_monitor import PrintMonitor
    print("  [OK] PrintMonitor")
except Exception as e:
    print(f"  [FAIL] PrintMonitor: {e}")

try:
    from monitors.process_monitor import ProcessMonitor
    print("  [OK] ProcessMonitor")
except Exception as e:
    print(f"  [FAIL] ProcessMonitor: {e}")

try:
    from monitors.productivity_scorer import ProductivityScorer
    print("  [OK] ProductivityScorer")
except Exception as e:
    print(f"  [FAIL] ProductivityScorer: {e}")

try:
    from monitors.screenshot import ScreenshotCapture
    print("  [OK] ScreenshotCapture")
except Exception as e:
    print(f"  [FAIL] ScreenshotCapture: {e}")

try:
    from monitors.screen_recorder import ScreenRecorder
    print("  [OK] ScreenRecorder")
except Exception as e:
    print(f"  [FAIL] ScreenRecorder: {e}")

try:
    from monitors.time_tracker import TimeTracker
    print("  [OK] TimeTracker")
except Exception as e:
    print(f"  [FAIL] TimeTracker: {e}")

try:
    from monitors.usb_monitor import USBMonitor
    print("  [OK] USBMonitor")
except Exception as e:
    print(f"  [FAIL] USBMonitor: {e}")

try:
    from monitors.web_monitor import WebMonitor
    print("  [OK] WebMonitor")
except Exception as e:
    print(f"  [FAIL] WebMonitor: {e}")

try:
    from communication.api_client import APIClient
    print("  [OK] APIClient")
except Exception as e:
    print(f"  [FAIL] APIClient: {e}")

try:
    from communication.websocket_client import WebSocketClient
    print("  [OK] WebSocketClient")
except Exception as e:
    print(f"  [FAIL] WebSocketClient: {e}")

try:
    from utils.system_info import get_system_info
    print("  [OK] system_info")
except Exception as e:
    print(f"  [FAIL] system_info: {e}")

try:
    import config
    print("  [OK] config")
except Exception as e:
    print(f"  [FAIL] config: {e}")

print("\nImport test complete!")
