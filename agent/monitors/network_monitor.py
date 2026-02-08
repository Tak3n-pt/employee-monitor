"""
Network Monitor - Tracks per-process network bandwidth usage
Uses psutil to measure bytes sent/received per process
"""

import threading
import time
from datetime import datetime
from collections import deque, defaultdict

import psutil


class NetworkMonitor:
    def __init__(self, on_network_callback=None, interval=30):
        self.running = False
        self.thread = None
        self.on_network = on_network_callback
        self.interval = interval
        self.lock = threading.Lock()

        self.network_events = deque(maxlen=2000)
        self.process_usage = defaultdict(lambda: {
            'bytes_sent': 0,
            'bytes_received': 0,
            'connections': 0,
        })

        # Snapshot for delta calculation
        self._prev_counters = {}
        self._prev_total = None

    def _get_process_connections(self):
        """Map network connections to processes"""
        process_conns = defaultdict(int)
        try:
            connections = psutil.net_connections(kind='inet')
            for conn in connections:
                if conn.pid and conn.pid > 0:
                    try:
                        proc = psutil.Process(conn.pid)
                        name = proc.name()
                        process_conns[name] += 1
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue
        except (psutil.AccessDenied, PermissionError):
            pass
        return process_conns

    def _get_process_net_usage(self):
        """Get per-process network usage estimates based on connections and IO counters"""
        results = []
        process_conns = self._get_process_connections()

        # Get total network IO
        total = psutil.net_io_counters()
        if self._prev_total is None:
            self._prev_total = total
            return results

        total_sent_delta = total.bytes_sent - self._prev_total.bytes_sent
        total_recv_delta = total.bytes_recv - self._prev_total.bytes_recv
        self._prev_total = total

        if total_sent_delta <= 0 and total_recv_delta <= 0:
            return results

        # Get per-process IO counters where possible
        process_io = {}
        total_process_io_read = 0
        total_process_io_write = 0

        for proc in psutil.process_iter(['pid', 'name']):
            try:
                name = proc.info['name']
                if name in process_conns and process_conns[name] > 0:
                    io = proc.io_counters()
                    pid = proc.info['pid']
                    key = f"{name}_{pid}"

                    if key in self._prev_counters:
                        prev = self._prev_counters[key]
                        read_delta = io.read_bytes - prev['read']
                        write_delta = io.write_bytes - prev['write']

                        if read_delta > 0 or write_delta > 0:
                            process_io[name] = process_io.get(name, {'read': 0, 'write': 0})
                            process_io[name]['read'] += read_delta
                            process_io[name]['write'] += write_delta
                            total_process_io_read += read_delta
                            total_process_io_write += write_delta

                    self._prev_counters[key] = {
                        'read': io.read_bytes,
                        'write': io.write_bytes,
                    }
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        # Distribute network bytes proportionally to process IO
        now = datetime.now()
        for name, io in process_io.items():
            recv_share = 0
            sent_share = 0

            if total_process_io_read > 0:
                recv_share = int(total_recv_delta * (io['read'] / total_process_io_read))
            if total_process_io_write > 0:
                sent_share = int(total_sent_delta * (io['write'] / total_process_io_write))

            if recv_share > 0 or sent_share > 0:
                entry = {
                    'timestamp': now.isoformat(),
                    'process_name': name,
                    'bytes_sent': sent_share,
                    'bytes_received': recv_share,
                    'connections_count': process_conns.get(name, 0),
                }
                results.append(entry)

        return results

    def monitor_loop(self):
        """Main monitoring loop"""
        # Initial snapshot
        self._prev_total = psutil.net_io_counters()
        # Warm up process IO counters
        for proc in psutil.process_iter(['pid', 'name']):
            try:
                io = proc.io_counters()
                key = f"{proc.info['name']}_{proc.info['pid']}"
                self._prev_counters[key] = {
                    'read': io.read_bytes,
                    'write': io.write_bytes,
                }
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        time.sleep(self.interval)

        while self.running:
            try:
                usage = self._get_process_net_usage()

                if usage:
                    with self.lock:
                        for entry in usage:
                            self.network_events.append(entry)
                            name = entry['process_name']
                            self.process_usage[name]['bytes_sent'] += entry['bytes_sent']
                            self.process_usage[name]['bytes_received'] += entry['bytes_received']
                            self.process_usage[name]['connections'] = entry['connections_count']

                    if self.on_network:
                        for entry in usage:
                            self.on_network(entry)

            except Exception as e:
                print(f"Network monitor error: {e}")

            time.sleep(self.interval)

    def get_events(self, clear=False):
        """Get network usage events"""
        with self.lock:
            result = list(self.network_events)
            if clear:
                self.network_events.clear()
        return result

    def get_usage_summary(self):
        """Get total usage per process"""
        with self.lock:
            return dict(self.process_usage)

    def get_status(self):
        """Get monitor status"""
        return {
            'running': self.running,
            'tracked_processes': len(self.process_usage),
            'total_events': len(self.network_events),
        }

    def start(self):
        """Start network monitoring"""
        if self.running:
            return

        self.running = True
        self.thread = threading.Thread(target=self.monitor_loop, daemon=True)
        self.thread.start()
        print("Network monitor started")

    def stop(self):
        """Stop network monitoring"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=3)
        print("Network monitor stopped")
