"""
Employee Monitor Agent Configuration
"""

import os
import json
import uuid

# Server Configuration
SERVER_HOST = "localhost"
SERVER_PORT = 3847
SERVER_URL = f"http://{SERVER_HOST}:{SERVER_PORT}"
WS_URL = f"ws://{SERVER_HOST}:{SERVER_PORT}/ws"

# Agent Configuration
HEARTBEAT_INTERVAL = 30  # seconds
ACTIVITY_SEND_INTERVAL = 30  # seconds
PROCESS_CHECK_INTERVAL = 1  # seconds

# Auto Screenshot Configuration
SCREENSHOT_INTERVAL = 300  # seconds (5 minutes default)

# Network Monitoring
NETWORK_MONITOR_INTERVAL = 30  # seconds

# Email Monitoring
EMAIL_CHECK_INTERVAL = 60  # seconds

# Application Install Monitoring
INSTALL_CHECK_INTERVAL = 60  # seconds

# File paths
APP_DATA_DIR = os.path.join(os.getenv('APPDATA', '.'), 'EmployeeMonitor')
CONFIG_FILE = os.path.join(APP_DATA_DIR, 'config.json')

# Ensure app data directory exists
os.makedirs(APP_DATA_DIR, exist_ok=True)


def load_config():
    """Load configuration from file or create default"""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            pass

    # Default configuration
    return {
        'agent_id': None,
        'server_host': SERVER_HOST,
        'server_port': SERVER_PORT,
        'employee_name': None,
        'stealth_mode': True,  # Hide console window by default
        'show_systray': False,  # Don't show system tray icon
        'hide_from_taskbar': True  # Remove from taskbar
    }


def save_config(config):
    """Save configuration to file"""
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        print(f"Error saving config: {e}")


def get_or_create_agent_id():
    """Get existing agent ID or create a new one"""
    config = load_config()
    if not config.get('agent_id'):
        config['agent_id'] = str(uuid.uuid4())
        save_config(config)
    return config['agent_id']
