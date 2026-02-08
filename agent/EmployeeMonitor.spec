# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_submodules

hiddenimports = ['monitors', 'monitors.process_monitor', 'monitors.screenshot', 'monitors.usb_monitor', 'monitors.keylogger', 'monitors.clipboard_monitor', 'monitors.idle_detector', 'monitors.screen_recorder', 'monitors.web_monitor', 'monitors.app_blocker', 'monitors.file_monitor', 'monitors.print_monitor', 'monitors.dlp_monitor', 'monitors.device_control', 'monitors.login_tracker', 'monitors.time_tracker', 'monitors.communication_monitor', 'monitors.alert_engine', 'monitors.productivity_scorer', 'monitors.employee_dashboard', 'utils', 'utils.system_info', 'communication', 'communication.api_client', 'communication.websocket_client', 'config', 'win32api', 'win32con', 'win32gui', 'win32process', 'win32security', 'win32event', 'win32file', 'win32print', 'win32ts', 'wmi', 'pythoncom', 'pywintypes', 'PIL', 'PIL.Image', 'PIL.ImageGrab', 'psutil', 'requests', 'websocket', 'http.server', 'json', 'threading', 'ctypes', 'ctypes.wintypes', 'socket', 'getpass', 'platform', 'uuid', 're', 'hashlib', 'base64', 'datetime', 'collections']
hiddenimports += collect_submodules('win32com')
hiddenimports += collect_submodules('wmi')
hiddenimports += collect_submodules('PIL')
hiddenimports += collect_submodules('requests')
hiddenimports += collect_submodules('websocket')


a = Analysis(
    ['C:\\Users\\3440\\Documents\\employee-monitor\\agent\\main.py'],
    pathex=[],
    binaries=[],
    datas=[('C:\\Users\\3440\\Documents\\employee-monitor\\agent\\config.py', '.'), ('C:\\Users\\3440\\Documents\\employee-monitor\\agent\\monitors', 'monitors'), ('C:\\Users\\3440\\Documents\\employee-monitor\\agent\\utils', 'utils'), ('C:\\Users\\3440\\Documents\\employee-monitor\\agent\\communication', 'communication')],
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='EmployeeMonitor',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='EmployeeMonitor',
)
