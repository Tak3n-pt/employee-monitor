"""
Stealth Mode Utilities - Hide agent window and taskbar presence
"""

import sys
import os


def hide_console_window():
    """Hide the console window from view"""
    try:
        if sys.platform == 'win32':
            import ctypes

            # Get the console window handle
            hwnd = ctypes.windll.kernel32.GetConsoleWindow()

            if hwnd:
                # SW_HIDE = 0
                ctypes.windll.user32.ShowWindow(hwnd, 0)
                return True
    except Exception as e:
        print(f"Could not hide console window: {e}")
    return False


def show_console_window():
    """Show the console window (for debugging)"""
    try:
        if sys.platform == 'win32':
            import ctypes

            hwnd = ctypes.windll.kernel32.GetConsoleWindow()

            if hwnd:
                # SW_SHOW = 5
                ctypes.windll.user32.ShowWindow(hwnd, 5)
                return True
    except Exception as e:
        print(f"Could not show console window: {e}")
    return False


def is_window_visible():
    """Check if the console window is currently visible"""
    try:
        if sys.platform == 'win32':
            import ctypes

            hwnd = ctypes.windll.kernel32.GetConsoleWindow()

            if hwnd:
                return bool(ctypes.windll.user32.IsWindowVisible(hwnd))
    except Exception:
        pass
    return True  # Assume visible if we can't check


def set_window_visibility(visible):
    """Set console window visibility"""
    if visible:
        return show_console_window()
    else:
        return hide_console_window()


def remove_from_taskbar():
    """Remove the window from the taskbar (advanced stealth)"""
    try:
        if sys.platform == 'win32':
            import ctypes
            from ctypes import wintypes

            # Get console window
            hwnd = ctypes.windll.kernel32.GetConsoleWindow()

            if hwnd:
                # Get extended window style
                GWL_EXSTYLE = -20
                WS_EX_TOOLWINDOW = 0x00000080
                WS_EX_APPWINDOW = 0x00040000

                # Get current style
                style = ctypes.windll.user32.GetWindowLongW(hwnd, GWL_EXSTYLE)

                # Remove from taskbar: add TOOLWINDOW, remove APPWINDOW
                style = style | WS_EX_TOOLWINDOW
                style = style & ~WS_EX_APPWINDOW

                ctypes.windll.user32.SetWindowLongW(hwnd, GWL_EXSTYLE, style)
                return True
    except Exception as e:
        print(f"Could not remove from taskbar: {e}")
    return False


def enable_stealth_mode():
    """Enable full stealth mode - hide window and remove from taskbar"""
    hidden = hide_console_window()
    removed = remove_from_taskbar()
    return hidden or removed


def disable_stealth_mode():
    """Disable stealth mode - show window"""
    return show_console_window()


if __name__ == "__main__":
    # Test stealth functions
    import time

    print("Testing stealth mode...")
    print(f"Window visible: {is_window_visible()}")

    print("Hiding window in 2 seconds...")
    time.sleep(2)

    hide_console_window()
    time.sleep(3)

    print("Showing window...")
    show_console_window()
    print("Done!")
