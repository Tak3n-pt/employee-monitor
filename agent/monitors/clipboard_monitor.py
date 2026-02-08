"""
Clipboard Monitor - Tracks copy/paste content
"""

import threading
import time
from datetime import datetime
from collections import deque

import win32clipboard
import win32con


class ClipboardMonitor:
    def __init__(self, on_clipboard_callback=None):
        self.running = False
        self.thread = None
        self.on_clipboard = on_clipboard_callback
        self.buffer = deque(maxlen=500)
        self.last_content = None
        self.lock = threading.Lock()

    def get_clipboard_content(self):
        """Get current clipboard content"""
        content = None
        content_type = None

        try:
            win32clipboard.OpenClipboard()

            # Try to get text
            if win32clipboard.IsClipboardFormatAvailable(win32con.CF_UNICODETEXT):
                content = win32clipboard.GetClipboardData(win32con.CF_UNICODETEXT)
                content_type = 'text'
            elif win32clipboard.IsClipboardFormatAvailable(win32con.CF_TEXT):
                content = win32clipboard.GetClipboardData(win32con.CF_TEXT)
                if isinstance(content, bytes):
                    content = content.decode('utf-8', errors='ignore')
                content_type = 'text'
            # Check for files
            elif win32clipboard.IsClipboardFormatAvailable(win32con.CF_HDROP):
                import win32api
                content = win32clipboard.GetClipboardData(win32con.CF_HDROP)
                content_type = 'files'
            # Check for image
            elif win32clipboard.IsClipboardFormatAvailable(win32con.CF_DIB):
                content = '[IMAGE DATA]'
                content_type = 'image'

        except Exception as e:
            pass
        finally:
            try:
                win32clipboard.CloseClipboard()
            except Exception:
                pass

        return content, content_type

    def monitor_loop(self):
        """Main clipboard monitoring loop"""
        while self.running:
            try:
                content, content_type = self.get_clipboard_content()

                # Check if content changed
                if content and content != self.last_content:
                    self.last_content = content

                    # Truncate very long content
                    display_content = content
                    if isinstance(content, str) and len(content) > 5000:
                        display_content = content[:5000] + '... [TRUNCATED]'

                    entry = {
                        'timestamp': datetime.now().isoformat(),
                        'content_type': content_type,
                        'content': display_content,
                        'content_length': len(content) if isinstance(content, str) else 0
                    }

                    with self.lock:
                        self.buffer.append(entry)

                    if self.on_clipboard:
                        self.on_clipboard(entry)

                time.sleep(0.5)  # Check every 500ms

            except Exception as e:
                print(f"Clipboard monitor error: {e}")
                time.sleep(1)

    def start(self):
        """Start clipboard monitoring"""
        if self.running:
            return

        self.running = True
        # Get initial clipboard content
        self.last_content, _ = self.get_clipboard_content()

        self.thread = threading.Thread(target=self.monitor_loop, daemon=True)
        self.thread.start()
        print("Clipboard monitor started")

    def stop(self):
        """Stop clipboard monitoring"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=2)
        print("Clipboard monitor stopped")

    def get_logs(self, clear=True):
        """Get clipboard logs"""
        with self.lock:
            logs = list(self.buffer)
            if clear:
                self.buffer.clear()
        return logs


if __name__ == "__main__":
    def on_clip(entry):
        content_preview = entry['content'][:100] if isinstance(entry['content'], str) else str(entry['content'])
        print(f"[{entry['content_type']}] {content_preview}")

    monitor = ClipboardMonitor(on_clipboard_callback=on_clip)
    monitor.start()

    try:
        print("Clipboard monitor running... Copy something! Press Ctrl+C to stop")
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        monitor.stop()
