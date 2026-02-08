"""
File Monitor - Tracks file operations (create, modify, delete, rename)
"""

import threading
import time
import os
from datetime import datetime
from collections import deque
from pathlib import Path

import win32file
import win32con
import pywintypes


# File action constants
FILE_ACTIONS = {
    1: 'created',
    2: 'deleted',
    3: 'modified',
    4: 'renamed_from',
    5: 'renamed_to',
}

# Sensitive file patterns
SENSITIVE_PATTERNS = [
    '.env', '.pem', '.key', '.pfx', '.p12',
    'password', 'secret', 'credential', 'token',
    'id_rsa', 'id_dsa', 'id_ecdsa',
    '.ssh', 'aws_credentials',
]

# File type categories
FILE_CATEGORIES = {
    'documents': ['.doc', '.docx', '.pdf', '.txt', '.rtf', '.odt', '.xls', '.xlsx', '.ppt', '.pptx'],
    'images': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.psd', '.ai'],
    'code': ['.py', '.js', '.ts', '.java', '.c', '.cpp', '.h', '.cs', '.go', '.rs', '.rb', '.php'],
    'archives': ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'],
    'data': ['.json', '.xml', '.csv', '.sql', '.db', '.sqlite'],
    'executables': ['.exe', '.msi', '.bat', '.cmd', '.ps1', '.sh'],
}


class FileMonitor:
    def __init__(self, watch_paths=None, on_file_event_callback=None):
        """
        Initialize file monitor

        Args:
            watch_paths: List of directories to watch (default: user folders)
            on_file_event_callback: Called when file event occurs
        """
        self.watch_paths = watch_paths or self._get_default_watch_paths()
        self.on_file_event = on_file_event_callback

        self.running = False
        self.threads = []
        self.events = deque(maxlen=10000)
        self.lock = threading.Lock()

        # Statistics
        self.stats = {
            'created': 0,
            'modified': 0,
            'deleted': 0,
            'renamed': 0,
        }

    def _get_default_watch_paths(self):
        """Get default paths to watch"""
        user_profile = os.getenv('USERPROFILE', '')
        paths = []

        default_folders = [
            'Desktop',
            'Documents',
            'Downloads',
            'Pictures',
        ]

        for folder in default_folders:
            path = os.path.join(user_profile, folder)
            if os.path.exists(path):
                paths.append(path)

        return paths

    def categorize_file(self, filepath):
        """Get category for a file"""
        ext = Path(filepath).suffix.lower()

        for category, extensions in FILE_CATEGORIES.items():
            if ext in extensions:
                return category

        return 'other'

    def is_sensitive_file(self, filepath):
        """Check if file might contain sensitive data"""
        filepath_lower = filepath.lower()
        filename = os.path.basename(filepath_lower)

        for pattern in SENSITIVE_PATTERNS:
            if pattern in filepath_lower or pattern in filename:
                return True

        return False

    def watch_directory(self, path):
        """Watch a directory for file changes"""
        try:
            # Get handle to directory
            handle = win32file.CreateFile(
                path,
                win32con.GENERIC_READ,
                win32con.FILE_SHARE_READ | win32con.FILE_SHARE_WRITE | win32con.FILE_SHARE_DELETE,
                None,
                win32con.OPEN_EXISTING,
                win32con.FILE_FLAG_BACKUP_SEMANTICS,
                None
            )

            print(f"Watching: {path}")

            while self.running:
                try:
                    # Read directory changes
                    results = win32file.ReadDirectoryChangesW(
                        handle,
                        1024,  # Buffer size
                        True,  # Watch subtree
                        win32con.FILE_NOTIFY_CHANGE_FILE_NAME |
                        win32con.FILE_NOTIFY_CHANGE_DIR_NAME |
                        win32con.FILE_NOTIFY_CHANGE_ATTRIBUTES |
                        win32con.FILE_NOTIFY_CHANGE_SIZE |
                        win32con.FILE_NOTIFY_CHANGE_LAST_WRITE |
                        win32con.FILE_NOTIFY_CHANGE_SECURITY,
                        None,
                        None
                    )

                    for action, filename in results:
                        self._handle_file_event(path, action, filename)

                except pywintypes.error as e:
                    if e.winerror == 995:  # Operation aborted
                        break
                    print(f"Watch error in {path}: {e}")
                    time.sleep(1)

            win32file.CloseHandle(handle)

        except Exception as e:
            print(f"Error watching {path}: {e}")

    def _handle_file_event(self, base_path, action, filename):
        """Process a file event"""
        action_name = FILE_ACTIONS.get(action, 'unknown')
        filepath = os.path.join(base_path, filename)

        # Skip temporary files
        if filename.startswith('~') or filename.endswith('.tmp'):
            return

        category = self.categorize_file(filepath)
        is_sensitive = self.is_sensitive_file(filepath)

        event = {
            'timestamp': datetime.now().isoformat(),
            'action': action_name,
            'filepath': filepath,
            'filename': filename,
            'directory': base_path,
            'category': category,
            'is_sensitive': is_sensitive,
            'extension': Path(filename).suffix.lower(),
        }

        # Get file size for created/modified
        if action_name in ['created', 'modified'] and os.path.exists(filepath):
            try:
                event['file_size'] = os.path.getsize(filepath)
            except Exception:
                event['file_size'] = 0

        with self.lock:
            self.events.append(event)

            # Update stats
            if action_name in ['created', 'modified', 'deleted']:
                self.stats[action_name] += 1
            elif action_name.startswith('renamed'):
                self.stats['renamed'] += 1

        if self.on_file_event:
            self.on_file_event(event)

        # Alert on sensitive files
        if is_sensitive:
            print(f"[SENSITIVE] {action_name}: {filepath}")

    def add_watch_path(self, path):
        """Add a directory to watch"""
        if path not in self.watch_paths and os.path.exists(path):
            self.watch_paths.append(path)
            if self.running:
                # Start new watcher thread
                thread = threading.Thread(target=self.watch_directory, args=(path,), daemon=True)
                thread.start()
                self.threads.append(thread)

    def remove_watch_path(self, path):
        """Remove a directory from watch list"""
        if path in self.watch_paths:
            self.watch_paths.remove(path)
            # Thread will stop on next iteration

    def get_events(self, clear=False, action_filter=None, category_filter=None):
        """Get file events with optional filters"""
        with self.lock:
            events = list(self.events)

            if action_filter:
                events = [e for e in events if e['action'] == action_filter]

            if category_filter:
                events = [e for e in events if e['category'] == category_filter]

            if clear:
                self.events.clear()

        return events

    def get_sensitive_events(self, clear=False):
        """Get only sensitive file events"""
        with self.lock:
            events = [e for e in self.events if e.get('is_sensitive')]
            if clear:
                # Only clear sensitive events
                self.events = deque([e for e in self.events if not e.get('is_sensitive')], maxlen=10000)
        return events

    def get_stats(self):
        """Get file operation statistics"""
        with self.lock:
            return dict(self.stats)

    def get_status(self):
        """Get monitor status"""
        return {
            'running': self.running,
            'watch_paths': self.watch_paths,
            'total_events': len(self.events),
            'stats': self.get_stats()
        }

    def start(self):
        """Start file monitoring"""
        if self.running:
            return

        self.running = True

        # Start watcher thread for each path
        for path in self.watch_paths:
            thread = threading.Thread(target=self.watch_directory, args=(path,), daemon=True)
            thread.start()
            self.threads.append(thread)

        print(f"File monitor started ({len(self.watch_paths)} directories)")

    def stop(self):
        """Stop file monitoring"""
        self.running = False

        # Threads will stop on their own
        for thread in self.threads:
            thread.join(timeout=2)

        self.threads.clear()
        print("File monitor stopped")


if __name__ == "__main__":
    def on_event(event):
        sens = "[SENSITIVE] " if event['is_sensitive'] else ""
        print(f"{sens}[{event['action'].upper()}] {event['filepath']}")

    monitor = FileMonitor(on_file_event_callback=on_event)

    print(f"Watching directories:")
    for path in monitor.watch_paths:
        print(f"  - {path}")

    monitor.start()

    try:
        print("\nFile monitor running... Create/modify/delete files to test")
        print("Press Ctrl+C to stop\n")

        while True:
            time.sleep(10)
            stats = monitor.get_stats()
            print(f"\nStats: Created={stats['created']}, Modified={stats['modified']}, "
                  f"Deleted={stats['deleted']}, Renamed={stats['renamed']}")

    except KeyboardInterrupt:
        monitor.stop()

        print("\n\nRecent events:")
        for event in monitor.get_events()[-10:]:
            print(f"  [{event['action']}] {event['filename']}")
