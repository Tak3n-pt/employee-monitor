"""
Email Monitor - Captures email metadata from Outlook via COM automation
Tracks subject, sender, recipients, timestamp, snippet, and attachments
"""

import threading
import time
from datetime import datetime, timedelta
from collections import deque


class EmailMonitor:
    def __init__(self, on_email_callback=None, check_interval=60):
        self.running = False
        self.thread = None
        self.on_email = on_email_callback
        self.check_interval = check_interval
        self.lock = threading.Lock()

        self.emails = deque(maxlen=500)
        self.last_check_time = None
        self.outlook = None
        self.available = False

    def _init_outlook(self):
        """Initialize Outlook COM connection"""
        try:
            import win32com.client
            import pythoncom
            pythoncom.CoInitialize()
            self.outlook = win32com.client.Dispatch("Outlook.Application")
            namespace = self.outlook.GetNamespace("MAPI")
            # Test access
            namespace.GetDefaultFolder(6)  # Inbox
            self.available = True
            print("Outlook COM connection established")
            return True
        except Exception as e:
            print(f"Outlook not available: {e}")
            self.available = False
            return False

    def _get_recent_emails(self, folder, since):
        """Get emails from a folder since a given time"""
        results = []
        try:
            items = folder.Items
            items.Sort("[ReceivedTime]", True)

            since_str = since.strftime("%m/%d/%Y %H:%M %p")
            filtered = items.Restrict(f"[ReceivedTime] >= '{since_str}'")

            for i in range(min(filtered.Count, 50)):
                try:
                    mail = filtered.Item(i + 1)
                    # Only process MailItem objects (class 43)
                    if mail.Class != 43:
                        continue

                    # Get recipients
                    recipients = []
                    try:
                        for r in range(mail.Recipients.Count):
                            recipients.append(mail.Recipients.Item(r + 1).Name)
                    except Exception:
                        pass

                    # Get attachment names
                    attachment_names = []
                    has_attachments = False
                    try:
                        if mail.Attachments.Count > 0:
                            has_attachments = True
                            for a in range(mail.Attachments.Count):
                                attachment_names.append(mail.Attachments.Item(a + 1).FileName)
                    except Exception:
                        pass

                    # Get body snippet (first 200 chars)
                    snippet = ''
                    try:
                        body = mail.Body or ''
                        snippet = body[:200].replace('\r\n', ' ').replace('\n', ' ').strip()
                    except Exception:
                        pass

                    email_data = {
                        'timestamp': mail.ReceivedTime.isoformat() if hasattr(mail.ReceivedTime, 'isoformat') else str(mail.ReceivedTime),
                        'subject': mail.Subject or '(No Subject)',
                        'sender': mail.SenderName or '',
                        'sender_email': mail.SenderEmailAddress or '',
                        'recipients': recipients,
                        'folder': folder.Name,
                        'snippet': snippet,
                        'has_attachments': has_attachments,
                        'attachment_names': attachment_names,
                    }

                    results.append(email_data)
                except Exception:
                    continue

        except Exception as e:
            print(f"Error reading folder {folder.Name}: {e}")

        return results

    def monitor_loop(self):
        """Main monitoring loop"""
        import pythoncom
        pythoncom.CoInitialize()

        if not self._init_outlook():
            print("Email monitor: Outlook not available, will retry...")

        while self.running:
            try:
                if not self.available:
                    if not self._init_outlook():
                        time.sleep(self.check_interval)
                        continue

                now = datetime.now()
                since = self.last_check_time or (now - timedelta(minutes=5))

                namespace = self.outlook.GetNamespace("MAPI")

                new_emails = []

                # Check Inbox (folder 6)
                try:
                    inbox = namespace.GetDefaultFolder(6)
                    new_emails.extend(self._get_recent_emails(inbox, since))
                except Exception as e:
                    print(f"Error reading Inbox: {e}")

                # Check Sent Items (folder 5)
                try:
                    sent = namespace.GetDefaultFolder(5)
                    sent_emails = self._get_recent_emails(sent, since)
                    for email in sent_emails:
                        email['folder'] = 'Sent Items'
                    new_emails.extend(sent_emails)
                except Exception as e:
                    print(f"Error reading Sent Items: {e}")

                self.last_check_time = now

                if new_emails:
                    with self.lock:
                        for email in new_emails:
                            self.emails.append(email)

                    if self.on_email:
                        for email in new_emails:
                            self.on_email(email)

                    print(f"[EMAIL] {len(new_emails)} new email(s) captured")

            except Exception as e:
                print(f"Email monitor error: {e}")
                self.available = False

            time.sleep(self.check_interval)

    def get_emails(self, clear=False):
        """Get captured emails"""
        with self.lock:
            result = list(self.emails)
            if clear:
                self.emails.clear()
        return result

    def get_status(self):
        """Get monitor status"""
        return {
            'running': self.running,
            'outlook_available': self.available,
            'total_captured': len(self.emails),
            'last_check': self.last_check_time.isoformat() if self.last_check_time else None,
        }

    def start(self):
        """Start email monitoring"""
        if self.running:
            return

        self.running = True
        self.thread = threading.Thread(target=self.monitor_loop, daemon=True)
        self.thread.start()
        print("Email monitor started")

    def stop(self):
        """Stop email monitoring"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=3)
        print("Email monitor stopped")
