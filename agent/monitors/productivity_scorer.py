"""
Productivity Scorer - Calculates productivity scores and generates reports
"""

import json
import os
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, List, Optional


# App productivity categories
PRODUCTIVITY_CATEGORIES = {
    'highly_productive': {
        'apps': [
            'code.exe', 'devenv.exe', 'pycharm64.exe', 'idea64.exe', 'sublime_text.exe',
            'notepad++.exe', 'atom.exe', 'webstorm64.exe', 'vscode.exe',
            'WINWORD.EXE', 'EXCEL.EXE', 'POWERPNT.EXE', 'OUTLOOK.EXE',
            'terminal.exe', 'powershell.exe', 'cmd.exe', 'WindowsTerminal.exe',
            'figma.exe', 'photoshop.exe', 'illustrator.exe', 'premiere.exe',
        ],
        'websites': [
            'github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com',
            'docs.google.com', 'docs.microsoft.com', 'developer.mozilla.org',
            'notion.so', 'trello.com', 'asana.com', 'jira.atlassian.com',
            'figma.com', 'canva.com',
        ],
        'weight': 1.0
    },
    'productive': {
        'apps': [
            'slack.exe', 'Teams.exe', 'zoom.exe',
            'notepad.exe', 'wordpad.exe',
            'acrobat.exe', 'AcroRd32.exe',
        ],
        'websites': [
            'linkedin.com', 'mail.google.com', 'outlook.office.com',
            'drive.google.com', 'dropbox.com', 'onedrive.live.com',
            'calendar.google.com',
        ],
        'weight': 0.75
    },
    'neutral': {
        'apps': [
            'chrome.exe', 'firefox.exe', 'msedge.exe', 'brave.exe',
            'explorer.exe', 'SearchHost.exe',
        ],
        'websites': [
            'google.com', 'bing.com', 'duckduckgo.com',
        ],
        'weight': 0.5
    },
    'unproductive': {
        'apps': [
            'spotify.exe', 'Discord.exe', 'vlc.exe', 'wmplayer.exe',
        ],
        'websites': [
            'facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com',
            'reddit.com', 'tumblr.com', 'pinterest.com',
            'youtube.com', 'netflix.com', 'twitch.tv', 'hulu.com',
            'amazon.com', 'ebay.com', 'aliexpress.com',
        ],
        'weight': 0.25
    },
    'highly_unproductive': {
        'apps': [
            'steam.exe', 'steamwebhelper.exe', 'epicgameslauncher.exe',
            'origin.exe', 'battle.net.exe', 'minecraft.exe',
        ],
        'websites': [
            'store.steampowered.com', 'epicgames.com',
            'miniclip.com', 'addictinggames.com',
        ],
        'weight': 0.0
    }
}


class ProductivityScorer:
    """Calculates and tracks productivity scores"""

    def __init__(self, data_dir=None):
        self.data_dir = data_dir or os.path.join(os.getenv('APPDATA', '.'), 'EmployeeMonitor')
        os.makedirs(self.data_dir, exist_ok=True)

        # Build lookup tables
        self._build_lookups()

        # Daily data
        self.daily_data = defaultdict(lambda: {
            'app_time': defaultdict(float),
            'website_time': defaultdict(float),
            'category_time': defaultdict(float),
            'productive_seconds': 0,
            'total_active_seconds': 0,
            'idle_seconds': 0,
        })

        # Load historical data
        self._load_data()

    def _build_lookups(self):
        """Build efficient lookup tables"""
        self.app_lookup = {}
        self.website_lookup = {}

        for category, data in PRODUCTIVITY_CATEGORIES.items():
            weight = data['weight']
            for app in data['apps']:
                self.app_lookup[app.lower()] = {'category': category, 'weight': weight}
            for site in data['websites']:
                self.website_lookup[site.lower()] = {'category': category, 'weight': weight}

    def _load_data(self):
        """Load historical productivity data"""
        data_file = os.path.join(self.data_dir, 'productivity_data.json')
        try:
            if os.path.exists(data_file):
                with open(data_file, 'r') as f:
                    data = json.load(f)
                    # Convert to defaultdicts
                    for date_key, day_data in data.items():
                        self.daily_data[date_key] = defaultdict(lambda: defaultdict(float))
                        for key, value in day_data.items():
                            if isinstance(value, dict):
                                self.daily_data[date_key][key] = defaultdict(float, value)
                            else:
                                self.daily_data[date_key][key] = value
        except Exception as e:
            print(f"Error loading productivity data: {e}")

    def _save_data(self):
        """Save productivity data"""
        data_file = os.path.join(self.data_dir, 'productivity_data.json')
        try:
            # Convert defaultdicts to regular dicts for JSON
            save_data = {}
            for date_key, day_data in self.daily_data.items():
                save_data[date_key] = {}
                for key, value in day_data.items():
                    if hasattr(value, 'items'):
                        save_data[date_key][key] = dict(value)
                    else:
                        save_data[date_key][key] = value

            with open(data_file, 'w') as f:
                json.dump(save_data, f, indent=2)
        except Exception as e:
            print(f"Error saving productivity data: {e}")

    def get_app_category(self, app_name: str) -> dict:
        """Get productivity category for an app"""
        app_lower = app_name.lower()
        if app_lower in self.app_lookup:
            return self.app_lookup[app_lower]
        return {'category': 'neutral', 'weight': 0.5}

    def get_website_category(self, url: str) -> dict:
        """Get productivity category for a website"""
        url_lower = url.lower()

        # Check for exact match first
        for site, info in self.website_lookup.items():
            if site in url_lower:
                return info

        return {'category': 'neutral', 'weight': 0.5}

    def record_app_time(self, app_name: str, seconds: float, date: str = None):
        """Record time spent in an app"""
        if date is None:
            date = datetime.now().strftime('%Y-%m-%d')

        category_info = self.get_app_category(app_name)

        self.daily_data[date]['app_time'][app_name] += seconds
        self.daily_data[date]['category_time'][category_info['category']] += seconds
        self.daily_data[date]['total_active_seconds'] += seconds
        self.daily_data[date]['productive_seconds'] += seconds * category_info['weight']

        self._save_data()

    def record_website_time(self, url: str, seconds: float, date: str = None):
        """Record time spent on a website"""
        if date is None:
            date = datetime.now().strftime('%Y-%m-%d')

        category_info = self.get_website_category(url)

        self.daily_data[date]['website_time'][url] += seconds
        self.daily_data[date]['category_time'][category_info['category']] += seconds
        self.daily_data[date]['total_active_seconds'] += seconds
        self.daily_data[date]['productive_seconds'] += seconds * category_info['weight']

        self._save_data()

    def record_idle_time(self, seconds: float, date: str = None):
        """Record idle time"""
        if date is None:
            date = datetime.now().strftime('%Y-%m-%d')

        self.daily_data[date]['idle_seconds'] += seconds
        self._save_data()

    def calculate_score(self, date: str = None) -> dict:
        """Calculate productivity score for a date"""
        if date is None:
            date = datetime.now().strftime('%Y-%m-%d')

        day_data = self.daily_data[date]
        total_active = day_data.get('total_active_seconds', 0)
        productive = day_data.get('productive_seconds', 0)
        idle = day_data.get('idle_seconds', 0)

        if total_active == 0:
            return {
                'date': date,
                'score': 0,
                'grade': 'N/A',
                'total_active_seconds': 0,
                'productive_seconds': 0,
                'idle_seconds': idle,
            }

        # Calculate raw score (0-100)
        raw_score = (productive / total_active) * 100

        # Adjust for idle time (penalize excessive idle)
        total_tracked = total_active + idle
        if total_tracked > 0:
            idle_ratio = idle / total_tracked
            if idle_ratio > 0.3:  # More than 30% idle
                penalty = (idle_ratio - 0.3) * 20  # Up to 14% penalty
                raw_score = max(0, raw_score - penalty)

        score = min(100, max(0, raw_score))

        # Determine grade
        if score >= 90:
            grade = 'A+'
        elif score >= 85:
            grade = 'A'
        elif score >= 80:
            grade = 'A-'
        elif score >= 75:
            grade = 'B+'
        elif score >= 70:
            grade = 'B'
        elif score >= 65:
            grade = 'B-'
        elif score >= 60:
            grade = 'C+'
        elif score >= 55:
            grade = 'C'
        elif score >= 50:
            grade = 'C-'
        elif score >= 40:
            grade = 'D'
        else:
            grade = 'F'

        return {
            'date': date,
            'score': round(score, 1),
            'grade': grade,
            'total_active_seconds': total_active,
            'total_active_formatted': self._format_duration(total_active),
            'productive_seconds': productive,
            'productive_formatted': self._format_duration(productive),
            'idle_seconds': idle,
            'idle_formatted': self._format_duration(idle),
            'category_breakdown': dict(day_data.get('category_time', {})),
        }

    def _format_duration(self, seconds: float) -> str:
        """Format seconds as HH:MM"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        return f"{hours}h {minutes}m"

    def get_daily_report(self, date: str = None) -> dict:
        """Get detailed daily productivity report"""
        if date is None:
            date = datetime.now().strftime('%Y-%m-%d')

        score_data = self.calculate_score(date)
        day_data = self.daily_data[date]

        # Top apps
        app_time = day_data.get('app_time', {})
        top_apps = sorted(app_time.items(), key=lambda x: x[1], reverse=True)[:10]

        # Top websites
        website_time = day_data.get('website_time', {})
        top_websites = sorted(website_time.items(), key=lambda x: x[1], reverse=True)[:10]

        return {
            **score_data,
            'top_apps': [
                {
                    'name': app,
                    'seconds': secs,
                    'formatted': self._format_duration(secs),
                    'category': self.get_app_category(app)['category']
                }
                for app, secs in top_apps
            ],
            'top_websites': [
                {
                    'url': url,
                    'seconds': secs,
                    'formatted': self._format_duration(secs),
                    'category': self.get_website_category(url)['category']
                }
                for url, secs in top_websites
            ],
        }

    def get_weekly_report(self) -> dict:
        """Get weekly productivity report"""
        today = datetime.now()
        start_of_week = today - timedelta(days=today.weekday())

        daily_scores = []
        total_active = 0
        total_productive = 0
        total_idle = 0

        for i in range(7):
            day = start_of_week + timedelta(days=i)
            if day > today:
                break

            date_key = day.strftime('%Y-%m-%d')
            score_data = self.calculate_score(date_key)

            daily_scores.append({
                'date': date_key,
                'day_name': day.strftime('%A'),
                'score': score_data['score'],
                'grade': score_data['grade'],
                'active': score_data['total_active_formatted'],
            })

            total_active += score_data['total_active_seconds']
            total_productive += score_data['productive_seconds']
            total_idle += score_data['idle_seconds']

        # Calculate weekly average
        avg_score = sum(d['score'] for d in daily_scores) / len(daily_scores) if daily_scores else 0

        return {
            'start_date': start_of_week.strftime('%Y-%m-%d'),
            'end_date': today.strftime('%Y-%m-%d'),
            'average_score': round(avg_score, 1),
            'total_active_hours': round(total_active / 3600, 1),
            'total_productive_hours': round(total_productive / 3600, 1),
            'total_idle_hours': round(total_idle / 3600, 1),
            'daily_scores': daily_scores,
        }

    def get_trends(self, days: int = 30) -> dict:
        """Get productivity trends over time"""
        today = datetime.now()
        scores = []

        for i in range(days):
            date = today - timedelta(days=i)
            date_key = date.strftime('%Y-%m-%d')
            score_data = self.calculate_score(date_key)
            if score_data['total_active_seconds'] > 0:
                scores.append({
                    'date': date_key,
                    'score': score_data['score'],
                })

        if len(scores) < 2:
            return {'trend': 'insufficient_data', 'scores': scores}

        # Calculate trend
        recent = scores[:7]
        older = scores[7:14] if len(scores) > 7 else []

        if older:
            recent_avg = sum(s['score'] for s in recent) / len(recent)
            older_avg = sum(s['score'] for s in older) / len(older)

            if recent_avg > older_avg + 5:
                trend = 'improving'
            elif recent_avg < older_avg - 5:
                trend = 'declining'
            else:
                trend = 'stable'
        else:
            trend = 'insufficient_data'

        return {
            'trend': trend,
            'scores': list(reversed(scores)),  # Oldest first
        }

    def add_custom_category(self, category_name: str, apps: List[str] = None,
                           websites: List[str] = None, weight: float = 0.5):
        """Add custom productivity category"""
        if apps:
            for app in apps:
                self.app_lookup[app.lower()] = {'category': category_name, 'weight': weight}
        if websites:
            for site in websites:
                self.website_lookup[site.lower()] = {'category': category_name, 'weight': weight}


class ReportGenerator:
    """Generates and exports productivity reports"""

    def __init__(self, scorer: ProductivityScorer, data_dir=None):
        self.scorer = scorer
        self.data_dir = data_dir or os.path.join(os.getenv('APPDATA', '.'), 'EmployeeMonitor', 'reports')
        os.makedirs(self.data_dir, exist_ok=True)

    def generate_daily_report(self, date: str = None) -> str:
        """Generate daily report as text"""
        report = self.scorer.get_daily_report(date)

        lines = [
            f"DAILY PRODUCTIVITY REPORT - {report['date']}",
            "=" * 50,
            "",
            f"Productivity Score: {report['score']}/100 (Grade: {report['grade']})",
            "",
            f"Active Time: {report['total_active_formatted']}",
            f"Productive Time: {report['productive_formatted']}",
            f"Idle Time: {report['idle_formatted']}",
            "",
            "Top Applications:",
        ]

        for app in report['top_apps'][:5]:
            lines.append(f"  - {app['name']}: {app['formatted']} ({app['category']})")

        lines.extend(["", "Top Websites:"])

        for site in report['top_websites'][:5]:
            lines.append(f"  - {site['url']}: {site['formatted']} ({site['category']})")

        lines.extend(["", "Category Breakdown:"])
        for category, seconds in report.get('category_breakdown', {}).items():
            formatted = self.scorer._format_duration(seconds)
            lines.append(f"  - {category}: {formatted}")

        return "\n".join(lines)

    def generate_weekly_report(self) -> str:
        """Generate weekly report as text"""
        report = self.scorer.get_weekly_report()

        lines = [
            f"WEEKLY PRODUCTIVITY REPORT",
            f"{report['start_date']} to {report['end_date']}",
            "=" * 50,
            "",
            f"Average Score: {report['average_score']}/100",
            f"Total Active: {report['total_active_hours']} hours",
            f"Total Productive: {report['total_productive_hours']} hours",
            f"Total Idle: {report['total_idle_hours']} hours",
            "",
            "Daily Breakdown:",
        ]

        for day in report['daily_scores']:
            lines.append(f"  {day['day_name']}: {day['score']}/100 ({day['grade']}) - {day['active']}")

        return "\n".join(lines)

    def export_to_json(self, date: str = None) -> str:
        """Export report to JSON file"""
        report = self.scorer.get_daily_report(date)
        filename = f"report_{report['date']}.json"
        filepath = os.path.join(self.data_dir, filename)

        with open(filepath, 'w') as f:
            json.dump(report, f, indent=2)

        return filepath

    def export_to_csv(self, start_date: str = None, end_date: str = None) -> str:
        """Export data to CSV"""
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        if not end_date:
            end_date = datetime.now().strftime('%Y-%m-%d')

        filename = f"productivity_{start_date}_to_{end_date}.csv"
        filepath = os.path.join(self.data_dir, filename)

        lines = ["Date,Score,Grade,Active Hours,Productive Hours,Idle Hours"]

        current = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')

        while current <= end:
            date_key = current.strftime('%Y-%m-%d')
            score_data = self.scorer.calculate_score(date_key)

            active_hrs = round(score_data['total_active_seconds'] / 3600, 2)
            prod_hrs = round(score_data['productive_seconds'] / 3600, 2)
            idle_hrs = round(score_data['idle_seconds'] / 3600, 2)

            lines.append(f"{date_key},{score_data['score']},{score_data['grade']},{active_hrs},{prod_hrs},{idle_hrs}")

            current += timedelta(days=1)

        with open(filepath, 'w') as f:
            f.write("\n".join(lines))

        return filepath


if __name__ == "__main__":
    scorer = ProductivityScorer()

    # Simulate some data
    print("Simulating productivity data...\n")

    # Record some app time
    scorer.record_app_time('code.exe', 7200)  # 2 hours
    scorer.record_app_time('OUTLOOK.EXE', 3600)  # 1 hour
    scorer.record_app_time('chrome.exe', 1800)  # 30 min
    scorer.record_app_time('Discord.exe', 900)  # 15 min

    # Record some website time
    scorer.record_website_time('github.com', 3600)
    scorer.record_website_time('youtube.com', 1800)

    # Record idle
    scorer.record_idle_time(1800)  # 30 min idle

    # Get reports
    print("Daily Report:")
    print("-" * 40)
    report_gen = ReportGenerator(scorer)
    print(report_gen.generate_daily_report())

    print("\n\nWeekly Report:")
    print("-" * 40)
    print(report_gen.generate_weekly_report())

    print("\n\nTrends:")
    print("-" * 40)
    trends = scorer.get_trends()
    print(f"Trend: {trends['trend']}")
