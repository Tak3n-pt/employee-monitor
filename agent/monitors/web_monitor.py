"""
Web Monitor - Tracks browser activity and can block websites
"""

import threading
import time
import os
import sqlite3
import shutil
import re
from datetime import datetime, timedelta
from collections import deque, defaultdict
from urllib.parse import urlparse


# Productivity categories
SITE_CATEGORIES = {
    'productive': [
        'github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com',
        'docs.google.com', 'sheets.google.com', 'slides.google.com',
        'notion.so', 'trello.com', 'asana.com', 'jira.atlassian.com',
        'slack.com', 'teams.microsoft.com', 'zoom.us',
        'linkedin.com', 'indeed.com', 'glassdoor.com',
        'udemy.com', 'coursera.org', 'pluralsight.com',
        'aws.amazon.com', 'console.cloud.google.com', 'portal.azure.com',
        'figma.com', 'canva.com', 'adobe.com',
    ],
    'unproductive': [
        'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com',
        'youtube.com', 'netflix.com', 'hulu.com', 'twitch.tv',
        'reddit.com', '9gag.com', 'imgur.com',
        'espn.com', 'sports.yahoo.com',
        'amazon.com', 'ebay.com', 'etsy.com', 'aliexpress.com',
    ],
    'social_media': [
        'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com',
        'snapchat.com', 'pinterest.com', 'tumblr.com', 'linkedin.com',
    ],
    'entertainment': [
        'youtube.com', 'netflix.com', 'hulu.com', 'disney.com', 'twitch.tv',
        'spotify.com', 'soundcloud.com', 'primevideo.com',
    ],
    'shopping': [
        'amazon.com', 'ebay.com', 'walmart.com', 'target.com', 'etsy.com',
        'aliexpress.com', 'wish.com', 'alibaba.com',
    ],
    'news': [
        'cnn.com', 'bbc.com', 'nytimes.com', 'washingtonpost.com',
        'foxnews.com', 'reuters.com', 'bloomberg.com',
    ],
}

# SAFELIST - These domains can NEVER be blocked (critical services)
NEVER_BLOCK = {
    # Search engines
    'google.com', 'www.google.com', 'google.fr', 'google.co.uk',
    'bing.com', 'www.bing.com', 'duckduckgo.com',
    # DNS & connectivity
    'cloudflare.com', '1.1.1.1', '8.8.8.8',
    # Microsoft services
    'microsoft.com', 'live.com', 'outlook.com', 'office.com',
    # Auth & security
    'login.microsoftonline.com', 'accounts.google.com',
    # OS updates
    'windowsupdate.com', 'update.microsoft.com',
}

# Browser history database paths
BROWSER_PATHS = {
    'chrome': os.path.join(os.getenv('LOCALAPPDATA', ''), 'Google', 'Chrome', 'User Data', 'Default', 'History'),
    'edge': os.path.join(os.getenv('LOCALAPPDATA', ''), 'Microsoft', 'Edge', 'User Data', 'Default', 'History'),
    'firefox': None,  # Firefox uses a different structure
    'brave': os.path.join(os.getenv('LOCALAPPDATA', ''), 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'History'),
}


class WebMonitor:
    def __init__(self, on_visit_callback=None):
        self.running = False
        self.thread = None
        self.on_visit = on_visit_callback

        # History tracking
        self.visits = deque(maxlen=10000)
        self.site_time = defaultdict(int)  # domain -> seconds
        self.last_check = {}  # browser -> last_visit_time
        self.lock = threading.Lock()

        # Blocking
        self.blocked_sites = set()
        self.blocked_categories = set()
        self.hosts_file = r"C:\Windows\System32\drivers\etc\hosts"
        self.hosts_backup = None

        # Custom categories
        self.custom_categories = {}

    def get_browser_history(self, browser='chrome', since_minutes=5):
        """Get recent browser history"""
        history = []

        db_path = BROWSER_PATHS.get(browser)
        if not db_path or not os.path.exists(db_path):
            return history

        try:
            # Open database in immutable mode to avoid locking issues with running browser
            db_uri = f'file:{db_path}?mode=ro&immutable=1'
            conn = sqlite3.connect(db_uri, uri=True)
            cursor = conn.cursor()

            # Chrome/Edge timestamp is microseconds since 1601-01-01 in UTC
            # Must use UTC time for comparison
            chrome_epoch = datetime(1601, 1, 1)
            now = datetime.utcnow()
            since = now - timedelta(minutes=since_minutes)

            # Chrome timestamp calculation (UTC-based)
            chrome_since = int((since - chrome_epoch).total_seconds() * 1000000)

            cursor.execute('''
                SELECT url, title, visit_count, last_visit_time
                FROM urls
                WHERE last_visit_time > ?
                ORDER BY last_visit_time DESC
                LIMIT 100
            ''', (chrome_since,))

            for row in cursor.fetchall():
                url, title, visit_count, last_visit = row

                # Convert Chrome timestamp to datetime
                visit_time = chrome_epoch + timedelta(microseconds=last_visit)

                history.append({
                    'url': url,
                    'title': title,
                    'visit_count': visit_count,
                    'visit_time': visit_time.isoformat(),
                    'browser': browser
                })

            conn.close()

        except Exception as e:
            print(f"Error reading {browser} history: {e}")

        return history

    def get_domain(self, url):
        """Extract domain from URL"""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            # Remove www.
            if domain.startswith('www.'):
                domain = domain[4:]
            return domain
        except Exception:
            return None

    def categorize_site(self, domain):
        """Categorize a website"""
        if not domain:
            return 'unknown', False

        # Check custom categories first
        for category, sites in self.custom_categories.items():
            if domain in sites or any(domain.endswith(f'.{site}') for site in sites):
                return category, category in ['productive', 'work']

        # Check built-in categories
        for category, sites in SITE_CATEGORIES.items():
            if domain in sites or any(domain.endswith(f'.{site}') for site in sites):
                is_productive = category == 'productive'
                return category, is_productive

        return 'other', True  # Unknown sites assumed neutral/productive

    def monitor_loop(self):
        """Main monitoring loop"""
        while self.running:
            try:
                for browser in ['chrome', 'edge', 'brave']:
                    history = self.get_browser_history(browser, since_minutes=6)

                    for entry in history:
                        url = entry['url']
                        visit_key = f"{browser}:{url}"

                        # Skip if already processed
                        if visit_key in self.last_check:
                            if self.last_check[visit_key] == entry['visit_time']:
                                continue

                        self.last_check[visit_key] = entry['visit_time']

                        # Process visit
                        domain = self.get_domain(url)
                        category, is_productive = self.categorize_site(domain)

                        visit = {
                            'timestamp': entry['visit_time'],
                            'url': url,
                            'title': entry['title'],
                            'domain': domain,
                            'category': category,
                            'is_productive': is_productive,
                            'browser': browser
                        }

                        with self.lock:
                            self.visits.append(visit)

                        if self.on_visit:
                            self.on_visit(visit)

                time.sleep(10)  # Check every 10 seconds

            except Exception as e:
                print(f"Web monitor error: {e}")
                time.sleep(10)

    def block_site(self, domain):
        """Block a website using hosts file"""
        # Check safelist - never block critical domains
        domain_lower = domain.lower().strip()
        for safe in NEVER_BLOCK:
            if safe in domain_lower or domain_lower in safe:
                print(f"Cannot block {domain} - critical domain protected")
                return False
        self.blocked_sites.add(domain)
        self._update_hosts_file()
        return True

    def unblock_site(self, domain):
        """Unblock a website"""
        self.blocked_sites.discard(domain)
        self._update_hosts_file()

    def block_category(self, category):
        """Block all sites in a category"""
        self.blocked_categories.add(category)
        if category in SITE_CATEGORIES:
            for site in SITE_CATEGORIES[category]:
                self.blocked_sites.add(site)
        self._update_hosts_file()

    def unblock_category(self, category):
        """Unblock all sites in a category"""
        self.blocked_categories.discard(category)
        if category in SITE_CATEGORIES:
            for site in SITE_CATEGORIES[category]:
                self.blocked_sites.discard(site)
        self._update_hosts_file()

    def _update_hosts_file(self):
        """Update the Windows hosts file to block sites"""
        try:
            # Read current hosts file
            with open(self.hosts_file, 'r') as f:
                lines = f.readlines()

            # Remove our previous entries
            marker_start = "# EMPLOYEE-MONITOR-START\n"
            marker_end = "# EMPLOYEE-MONITOR-END\n"

            new_lines = []
            skip = False
            for line in lines:
                if line == marker_start:
                    skip = True
                    continue
                if line == marker_end:
                    skip = False
                    continue
                if not skip:
                    new_lines.append(line)

            # Add our blocked sites (excluding protected domains)
            safe_to_block = []
            for site in self.blocked_sites:
                is_protected = False
                for safe in NEVER_BLOCK:
                    if safe in site.lower() or site.lower() in safe:
                        is_protected = True
                        break
                if not is_protected:
                    safe_to_block.append(site)

            if safe_to_block:
                new_lines.append(marker_start)
                for site in sorted(safe_to_block):
                    new_lines.append(f"127.0.0.1 {site}\n")
                    new_lines.append(f"127.0.0.1 www.{site}\n")
                new_lines.append(marker_end)

            # Write back
            with open(self.hosts_file, 'w') as f:
                f.writelines(new_lines)

            # Flush DNS cache
            os.system('ipconfig /flushdns >nul 2>&1')

            print(f"Hosts file updated: {len(self.blocked_sites)} sites blocked")

        except PermissionError:
            print("Error: Administrator privileges required to modify hosts file")
        except Exception as e:
            print(f"Error updating hosts file: {e}")

    def get_visits(self, clear=False):
        """Get visit history"""
        with self.lock:
            visits = list(self.visits)
            if clear:
                self.visits.clear()
        return visits

    def get_site_stats(self):
        """Get statistics per site"""
        stats = defaultdict(lambda: {'visits': 0, 'category': 'unknown', 'is_productive': True})

        with self.lock:
            for visit in self.visits:
                domain = visit.get('domain', 'unknown')
                stats[domain]['visits'] += 1
                stats[domain]['category'] = visit.get('category', 'unknown')
                stats[domain]['is_productive'] = visit.get('is_productive', True)

        return dict(stats)

    def get_category_stats(self):
        """Get statistics per category"""
        stats = defaultdict(int)

        with self.lock:
            for visit in self.visits:
                category = visit.get('category', 'unknown')
                stats[category] += 1

        return dict(stats)

    def set_custom_category(self, category, sites, is_productive=True):
        """Set custom category for sites"""
        self.custom_categories[category] = {
            'sites': set(sites),
            'is_productive': is_productive
        }

    def start(self):
        """Start web monitoring"""
        if self.running:
            return

        self.running = True
        self.thread = threading.Thread(target=self.monitor_loop, daemon=True)
        self.thread.start()
        print("Web monitor started")

    def stop(self):
        """Stop web monitoring"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        print("Web monitor stopped")


if __name__ == "__main__":
    def on_visit(visit):
        prod = "✓" if visit['is_productive'] else "✗"
        print(f"[{prod}] [{visit['category']}] {visit['domain']} - {visit['title'][:50]}")

    monitor = WebMonitor(on_visit_callback=on_visit)

    # Test getting history
    print("Recent browser history:")
    for browser in ['chrome', 'edge']:
        history = monitor.get_browser_history(browser, since_minutes=60)
        print(f"\n{browser.upper()}: {len(history)} entries")
        for entry in history[:5]:
            domain = monitor.get_domain(entry['url'])
            print(f"  - {domain}: {entry['title'][:50]}")

    # Start monitoring
    print("\n\nStarting continuous monitoring...")
    monitor.start()

    try:
        while True:
            time.sleep(10)
            stats = monitor.get_category_stats()
            if stats:
                print(f"\nCategory stats: {dict(stats)}")
    except KeyboardInterrupt:
        monitor.stop()
