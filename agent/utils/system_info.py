"""
System Information Utilities
"""

import platform
import socket
import os
import getpass


def get_pc_name():
    """Get the computer name"""
    return platform.node() or socket.gethostname()


def get_username():
    """Get the current username"""
    return getpass.getuser()


def get_os_version():
    """Get the operating system version"""
    return f"{platform.system()} {platform.release()} ({platform.version()})"


def get_ip_address():
    """Get the local IP address"""
    try:
        # Connect to a remote server to determine local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def get_system_info():
    """Get all system information"""
    return {
        'pc_name': get_pc_name(),
        'username': get_username(),
        'os_version': get_os_version(),
        'ip_address': get_ip_address(),
        'employee_name': f"{get_username()}@{get_pc_name()}"
    }


if __name__ == "__main__":
    # Test
    info = get_system_info()
    for key, value in info.items():
        print(f"{key}: {value}")
