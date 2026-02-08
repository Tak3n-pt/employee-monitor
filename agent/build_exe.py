"""
Build script for Employee Monitor Agent
Creates a standalone .exe that requires no Python installation
"""

import PyInstaller.__main__
import os
import shutil

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MAIN_SCRIPT = os.path.join(SCRIPT_DIR, 'main.py')
DIST_DIR = os.path.join(SCRIPT_DIR, 'dist')
BUILD_DIR = os.path.join(SCRIPT_DIR, 'build')

# Clean previous builds
if os.path.exists(DIST_DIR):
    shutil.rmtree(DIST_DIR)
if os.path.exists(BUILD_DIR):
    shutil.rmtree(BUILD_DIR)

# PyInstaller arguments
args = [
    MAIN_SCRIPT,
    '--name=EmployeeMonitor',
    '--onedir',  # Create a folder with all files (more reliable than --onefile)
    '--noconsole',  # No console window for stealth mode
    '--clean',

    # Add all source directories as data
    f'--add-data={os.path.join(SCRIPT_DIR, "config.py")};.',
    f'--add-data={os.path.join(SCRIPT_DIR, "monitors")};monitors',
    f'--add-data={os.path.join(SCRIPT_DIR, "utils")};utils',
    f'--add-data={os.path.join(SCRIPT_DIR, "communication")};communication',

    # Include all monitor modules
    '--hidden-import=monitors',
    '--hidden-import=monitors.process_monitor',
    '--hidden-import=monitors.screenshot',
    '--hidden-import=monitors.usb_monitor',
    '--hidden-import=monitors.keylogger',
    '--hidden-import=monitors.clipboard_monitor',
    '--hidden-import=monitors.idle_detector',
    '--hidden-import=monitors.screen_recorder',
    '--hidden-import=monitors.web_monitor',
    '--hidden-import=monitors.app_blocker',
    '--hidden-import=monitors.file_monitor',
    '--hidden-import=monitors.print_monitor',
    '--hidden-import=monitors.dlp_monitor',
    '--hidden-import=monitors.device_control',
    '--hidden-import=monitors.login_tracker',
    '--hidden-import=monitors.time_tracker',
    '--hidden-import=monitors.communication_monitor',
    '--hidden-import=monitors.alert_engine',
    '--hidden-import=monitors.productivity_scorer',
    '--hidden-import=monitors.employee_dashboard',

    # Include utils and communication
    '--hidden-import=utils',
    '--hidden-import=utils.system_info',
    '--hidden-import=communication',
    '--hidden-import=communication.api_client',
    '--hidden-import=communication.websocket_client',
    '--hidden-import=config',

    # Include dependencies
    '--hidden-import=win32api',
    '--hidden-import=win32con',
    '--hidden-import=win32gui',
    '--hidden-import=win32process',
    '--hidden-import=win32security',
    '--hidden-import=win32event',
    '--hidden-import=win32file',
    '--hidden-import=win32print',
    '--hidden-import=win32ts',
    '--hidden-import=wmi',
    '--hidden-import=pythoncom',
    '--hidden-import=pywintypes',
    '--hidden-import=PIL',
    '--hidden-import=PIL.Image',
    '--hidden-import=PIL.ImageGrab',
    '--hidden-import=psutil',
    '--hidden-import=requests',
    '--hidden-import=websocket',
    '--hidden-import=http.server',
    '--hidden-import=json',
    '--hidden-import=threading',
    '--hidden-import=ctypes',
    '--hidden-import=ctypes.wintypes',
    '--hidden-import=socket',
    '--hidden-import=getpass',
    '--hidden-import=platform',
    '--hidden-import=uuid',
    '--hidden-import=re',
    '--hidden-import=hashlib',
    '--hidden-import=base64',
    '--hidden-import=datetime',
    '--hidden-import=collections',

    # Collect all submodules
    '--collect-submodules=win32com',
    '--collect-submodules=wmi',
    '--collect-submodules=PIL',
    '--collect-submodules=requests',
    '--collect-submodules=websocket',

    # Output directory
    f'--distpath={DIST_DIR}',
    f'--workpath={BUILD_DIR}',
    f'--specpath={SCRIPT_DIR}',
]

print("=" * 60)
print("Building Employee Monitor Agent")
print("=" * 60)
print(f"Source: {MAIN_SCRIPT}")
print(f"Output: {DIST_DIR}")
print("=" * 60)

# Run PyInstaller
PyInstaller.__main__.run(args)

# Copy installer files to dist folder
print("\nCopying installer files...")
shutil.copy(
    os.path.join(SCRIPT_DIR, 'dist', 'install.bat') if os.path.exists(os.path.join(SCRIPT_DIR, 'dist', 'install.bat'))
    else os.path.join(SCRIPT_DIR, 'install.bat'),
    os.path.join(DIST_DIR, 'install.bat')
) if os.path.exists(os.path.join(SCRIPT_DIR, 'install.bat')) else None

print("\n" + "=" * 60)
print("Build complete!")
print(f"Output folder: {os.path.join(DIST_DIR, 'EmployeeMonitor')}")
print("=" * 60)
