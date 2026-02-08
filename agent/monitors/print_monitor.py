"""
Print Monitor - Tracks all print jobs
"""

import threading
import time
from datetime import datetime
from collections import deque

import win32print
import win32con


class PrintMonitor:
    def __init__(self, on_print_callback=None):
        self.running = False
        self.thread = None
        self.on_print = on_print_callback

        self.print_jobs = deque(maxlen=1000)
        self.seen_jobs = set()
        self.lock = threading.Lock()

        # Statistics
        self.total_pages = 0
        self.total_jobs = 0

    def get_printers(self):
        """Get list of installed printers"""
        printers = []
        try:
            flags = win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
            printer_list = win32print.EnumPrinters(flags, None, 2)

            for printer in printer_list:
                printers.append({
                    'name': printer['pPrinterName'],
                    'port': printer.get('pPortName', ''),
                    'driver': printer.get('pDriverName', ''),
                    'status': printer.get('Status', 0),
                })
        except Exception as e:
            print(f"Error getting printers: {e}")

        return printers

    def get_print_jobs(self, printer_name=None):
        """Get current print jobs for a printer or all printers"""
        jobs = []

        try:
            if printer_name:
                printers = [{'name': printer_name}]
            else:
                printers = self.get_printers()

            for printer in printers:
                try:
                    handle = win32print.OpenPrinter(printer['name'])
                    job_list = win32print.EnumJobs(handle, 0, 100, 2)
                    win32print.ClosePrinter(handle)

                    for job in job_list:
                        jobs.append({
                            'job_id': job.get('JobId'),
                            'printer': printer['name'],
                            'document': job.get('pDocument', 'Unknown'),
                            'user': job.get('pUserName', 'Unknown'),
                            'pages': job.get('TotalPages', 0),
                            'size': job.get('Size', 0),
                            'status': job.get('Status', 0),
                            'submitted': job.get('Submitted'),
                        })
                except Exception as e:
                    pass

        except Exception as e:
            print(f"Error getting print jobs: {e}")

        return jobs

    def monitor_loop(self):
        """Main monitoring loop"""
        while self.running:
            try:
                current_jobs = self.get_print_jobs()

                for job in current_jobs:
                    job_key = f"{job['printer']}:{job['job_id']}"

                    if job_key not in self.seen_jobs:
                        self.seen_jobs.add(job_key)

                        print_event = {
                            'timestamp': datetime.now().isoformat(),
                            'job_id': job['job_id'],
                            'printer': job['printer'],
                            'document': job['document'],
                            'user': job['user'],
                            'pages': job['pages'],
                            'size_bytes': job['size'],
                        }

                        with self.lock:
                            self.print_jobs.append(print_event)
                            self.total_jobs += 1
                            self.total_pages += job['pages'] or 0

                        print(f"[PRINT] {job['document']} -> {job['printer']} ({job['pages']} pages)")

                        if self.on_print:
                            self.on_print(print_event)

                # Cleanup old job IDs (keep last 1000)
                if len(self.seen_jobs) > 1000:
                    self.seen_jobs = set(list(self.seen_jobs)[-500:])

                time.sleep(2)  # Check every 2 seconds

            except Exception as e:
                print(f"Print monitor error: {e}")
                time.sleep(5)

    def get_job_history(self, clear=False):
        """Get print job history"""
        with self.lock:
            jobs = list(self.print_jobs)
            if clear:
                self.print_jobs.clear()
        return jobs

    def get_stats(self):
        """Get print statistics"""
        with self.lock:
            return {
                'total_jobs': self.total_jobs,
                'total_pages': self.total_pages,
                'recent_jobs': len(self.print_jobs)
            }

    def start(self):
        """Start print monitoring"""
        if self.running:
            return

        self.running = True
        self.thread = threading.Thread(target=self.monitor_loop, daemon=True)
        self.thread.start()
        print("Print monitor started")

    def stop(self):
        """Stop print monitoring"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=3)
        print("Print monitor stopped")


if __name__ == "__main__":
    def on_print(event):
        print(f"Print job: {event['document']} ({event['pages']} pages)")

    monitor = PrintMonitor(on_print_callback=on_print)

    print("Installed printers:")
    for printer in monitor.get_printers():
        print(f"  - {printer['name']}")

    print("\nStarting print monitor...")
    monitor.start()

    try:
        print("Print something to test! Press Ctrl+C to stop\n")
        while True:
            time.sleep(5)
    except KeyboardInterrupt:
        monitor.stop()

        print("\nPrint history:")
        for job in monitor.get_job_history():
            print(f"  {job['document']} -> {job['printer']}")
