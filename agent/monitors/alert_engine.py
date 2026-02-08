"""
Alert Engine - Risk scoring, alert rules, anomaly detection
Analyzes monitoring data and generates security/policy alerts
"""

import threading
import time
from datetime import datetime, timedelta
from collections import deque, defaultdict
from dataclasses import dataclass
from typing import Dict, List, Optional, Callable
import json


@dataclass
class AlertRule:
    """Alert rule definition"""
    rule_id: str
    name: str
    description: str
    category: str  # security, policy, productivity, behavior
    severity: str  # critical, high, medium, low, info
    condition: Callable
    cooldown_seconds: int = 300  # Minimum time between repeated alerts
    enabled: bool = True


class RiskScorer:
    """Calculates risk scores based on various factors"""

    def __init__(self):
        self.weights = {
            'dlp_critical': 30,
            'dlp_high': 20,
            'dlp_medium': 10,
            'blocked_device': 25,
            'blocked_app': 15,
            'blocked_website': 10,
            'sensitive_file_access': 20,
            'failed_login': 15,
            'after_hours_activity': 10,
            'excessive_printing': 10,
            'usb_activity': 15,
            'anomaly_detected': 25,
        }

        # Running totals for score calculation
        self.event_counts = defaultdict(int)
        self.score_history = deque(maxlen=1000)

    def add_event(self, event_type: str, severity: str = 'medium'):
        """Record an event for risk scoring"""
        weight_key = f"{event_type}_{severity}" if severity else event_type
        if weight_key in self.weights:
            self.event_counts[weight_key] += 1
        elif event_type in self.weights:
            self.event_counts[event_type] += 1

    def calculate_score(self) -> dict:
        """Calculate current risk score"""
        total_score = 0
        breakdown = {}

        for event_type, count in self.event_counts.items():
            weight = self.weights.get(event_type, 5)
            contribution = min(count * weight, 100)  # Cap individual contributions
            breakdown[event_type] = {
                'count': count,
                'weight': weight,
                'contribution': contribution
            }
            total_score += contribution

        # Normalize to 0-100 scale
        normalized_score = min(total_score, 100)

        # Determine risk level
        if normalized_score >= 80:
            risk_level = 'critical'
        elif normalized_score >= 60:
            risk_level = 'high'
        elif normalized_score >= 40:
            risk_level = 'medium'
        elif normalized_score >= 20:
            risk_level = 'low'
        else:
            risk_level = 'minimal'

        result = {
            'score': normalized_score,
            'risk_level': risk_level,
            'breakdown': breakdown,
            'timestamp': datetime.now().isoformat()
        }

        self.score_history.append(result)
        return result

    def get_trend(self) -> str:
        """Get risk score trend"""
        if len(self.score_history) < 2:
            return 'stable'

        recent = list(self.score_history)[-10:]
        if len(recent) < 2:
            return 'stable'

        first_half = sum(r['score'] for r in recent[:len(recent)//2]) / (len(recent)//2)
        second_half = sum(r['score'] for r in recent[len(recent)//2:]) / (len(recent) - len(recent)//2)

        if second_half > first_half + 10:
            return 'increasing'
        elif second_half < first_half - 10:
            return 'decreasing'
        return 'stable'

    def reset_daily(self):
        """Reset daily counters"""
        self.event_counts.clear()


class AnomalyDetector:
    """Detects anomalous behavior patterns"""

    def __init__(self):
        # Baseline data
        self.baselines = {
            'active_hours': {'start': 8, 'end': 18},  # Normal work hours
            'avg_apps_per_hour': 5,
            'avg_websites_per_hour': 20,
            'avg_files_per_hour': 10,
            'avg_keystrokes_per_minute': 30,
        }

        # Current metrics
        self.current_metrics = defaultdict(list)
        self.anomalies = deque(maxlen=500)

    def record_metric(self, metric_name: str, value: float):
        """Record a metric value"""
        self.current_metrics[metric_name].append({
            'value': value,
            'timestamp': datetime.now()
        })

        # Keep only last hour of data
        cutoff = datetime.now() - timedelta(hours=1)
        self.current_metrics[metric_name] = [
            m for m in self.current_metrics[metric_name]
            if m['timestamp'] > cutoff
        ]

    def check_anomalies(self) -> List[dict]:
        """Check for anomalous patterns"""
        detected = []
        now = datetime.now()

        # After hours activity
        if now.hour < self.baselines['active_hours']['start'] or \
           now.hour > self.baselines['active_hours']['end']:
            # Check if there's significant activity
            if any(len(metrics) > 10 for metrics in self.current_metrics.values()):
                detected.append({
                    'type': 'after_hours_activity',
                    'severity': 'medium',
                    'description': f"Significant activity detected outside work hours ({now.strftime('%H:%M')})",
                    'timestamp': now.isoformat()
                })

        # Unusual data volume
        if 'data_transferred' in self.current_metrics:
            recent = self.current_metrics['data_transferred']
            if recent and sum(m['value'] for m in recent) > 100_000_000:  # 100MB
                detected.append({
                    'type': 'large_data_transfer',
                    'severity': 'high',
                    'description': "Unusually large data transfer detected",
                    'timestamp': now.isoformat()
                })

        # Rapid file access
        if 'file_access' in self.current_metrics:
            recent = [m for m in self.current_metrics['file_access']
                     if m['timestamp'] > now - timedelta(minutes=5)]
            if len(recent) > 50:
                detected.append({
                    'type': 'rapid_file_access',
                    'severity': 'high',
                    'description': f"Rapid file access detected ({len(recent)} files in 5 minutes)",
                    'timestamp': now.isoformat()
                })

        # Weekend activity
        if now.weekday() >= 5:  # Saturday or Sunday
            if any(len(metrics) > 5 for metrics in self.current_metrics.values()):
                detected.append({
                    'type': 'weekend_activity',
                    'severity': 'low',
                    'description': "Activity detected on weekend",
                    'timestamp': now.isoformat()
                })

        # Store detected anomalies
        for anomaly in detected:
            self.anomalies.append(anomaly)

        return detected

    def get_anomalies(self, clear: bool = False) -> List[dict]:
        """Get detected anomalies"""
        result = list(self.anomalies)
        if clear:
            self.anomalies.clear()
        return result


class AlertEngine:
    """Main alert engine that coordinates risk scoring and anomaly detection"""

    def __init__(self, on_alert_callback=None):
        self.on_alert = on_alert_callback
        self.running = False
        self.thread = None

        self.risk_scorer = RiskScorer()
        self.anomaly_detector = AnomalyDetector()

        self.alerts = deque(maxlen=2000)
        self.alert_history = defaultdict(list)  # rule_id -> list of timestamps
        self.lock = threading.Lock()

        # Built-in alert rules
        self.rules: Dict[str, AlertRule] = {}
        self._init_default_rules()

        # Statistics
        self.stats = {
            'total_alerts': 0,
            'alerts_by_severity': defaultdict(int),
            'alerts_by_category': defaultdict(int),
        }

    def _init_default_rules(self):
        """Initialize default alert rules"""
        default_rules = [
            AlertRule(
                rule_id='dlp_critical',
                name='Critical DLP Alert',
                description='Critical sensitive data detected (SSN, credit card, private key)',
                category='security',
                severity='critical',
                condition=lambda e: e.get('type') == 'dlp' and e.get('severity') == 'critical',
                cooldown_seconds=60,
            ),
            AlertRule(
                rule_id='blocked_device',
                name='Blocked Device Connected',
                description='Unauthorized device connection attempt',
                category='security',
                severity='high',
                condition=lambda e: e.get('type') == 'device' and e.get('blocked') == True,
                cooldown_seconds=300,
            ),
            AlertRule(
                rule_id='multiple_failed_logins',
                name='Multiple Failed Login Attempts',
                description='Multiple failed login attempts detected',
                category='security',
                severity='high',
                condition=lambda e: e.get('type') == 'login' and e.get('event_type') == 'login_failed',
                cooldown_seconds=600,
            ),
            AlertRule(
                rule_id='blocked_app_launch',
                name='Blocked Application Launch',
                description='Attempt to launch blocked application',
                category='policy',
                severity='medium',
                condition=lambda e: e.get('type') == 'app_blocked',
                cooldown_seconds=300,
            ),
            AlertRule(
                rule_id='blocked_website',
                name='Blocked Website Access',
                description='Attempt to access blocked website',
                category='policy',
                severity='medium',
                condition=lambda e: e.get('type') == 'website_blocked',
                cooldown_seconds=300,
            ),
            AlertRule(
                rule_id='sensitive_file',
                name='Sensitive File Activity',
                description='Activity on potentially sensitive file',
                category='security',
                severity='medium',
                condition=lambda e: e.get('type') == 'file' and e.get('is_sensitive') == True,
                cooldown_seconds=180,
            ),
            AlertRule(
                rule_id='excessive_idle',
                name='Excessive Idle Time',
                description='Extended idle time detected during work hours',
                category='productivity',
                severity='low',
                condition=lambda e: e.get('type') == 'idle' and e.get('duration_seconds', 0) > 1800,
                cooldown_seconds=3600,
            ),
            AlertRule(
                rule_id='after_hours',
                name='After Hours Activity',
                description='Significant activity outside normal work hours',
                category='behavior',
                severity='info',
                condition=lambda e: e.get('type') == 'anomaly' and e.get('anomaly_type') == 'after_hours_activity',
                cooldown_seconds=7200,
            ),
            AlertRule(
                rule_id='large_print',
                name='Large Print Job',
                description='Unusually large print job detected',
                category='policy',
                severity='medium',
                condition=lambda e: e.get('type') == 'print' and e.get('pages', 0) > 50,
                cooldown_seconds=600,
            ),
            AlertRule(
                rule_id='usb_storage',
                name='USB Storage Connected',
                description='USB storage device connected',
                category='security',
                severity='info',
                condition=lambda e: e.get('type') == 'device' and e.get('device_type') == 'usb_storage',
                cooldown_seconds=300,
            ),
        ]

        for rule in default_rules:
            self.rules[rule.rule_id] = rule

    def add_rule(self, rule: AlertRule):
        """Add a custom alert rule"""
        self.rules[rule.rule_id] = rule

    def remove_rule(self, rule_id: str):
        """Remove an alert rule"""
        if rule_id in self.rules:
            del self.rules[rule_id]

    def enable_rule(self, rule_id: str, enabled: bool = True):
        """Enable or disable a rule"""
        if rule_id in self.rules:
            self.rules[rule_id].enabled = enabled

    def process_event(self, event: dict):
        """Process an event through alert rules"""
        now = datetime.now()
        triggered_alerts = []

        for rule_id, rule in self.rules.items():
            if not rule.enabled:
                continue

            # Check cooldown
            if rule_id in self.alert_history:
                last_alert = self.alert_history[rule_id]
                if last_alert:
                    last_time = datetime.fromisoformat(last_alert[-1])
                    if (now - last_time).total_seconds() < rule.cooldown_seconds:
                        continue

            # Check condition
            try:
                if rule.condition(event):
                    alert = {
                        'alert_id': f"{rule_id}_{now.timestamp()}",
                        'rule_id': rule_id,
                        'rule_name': rule.name,
                        'description': rule.description,
                        'category': rule.category,
                        'severity': rule.severity,
                        'timestamp': now.isoformat(),
                        'event': event,
                    }

                    triggered_alerts.append(alert)

                    with self.lock:
                        self.alerts.append(alert)
                        self.alert_history[rule_id].append(now.isoformat())
                        self.stats['total_alerts'] += 1
                        self.stats['alerts_by_severity'][rule.severity] += 1
                        self.stats['alerts_by_category'][rule.category] += 1

                    # Update risk score
                    self.risk_scorer.add_event(rule.category, rule.severity)

                    if self.on_alert:
                        self.on_alert(alert)

                    print(f"[ALERT-{rule.severity.upper()}] {rule.name}")

            except Exception as e:
                print(f"Error evaluating rule {rule_id}: {e}")

        return triggered_alerts

    def record_activity(self, activity_type: str, value: float = 1.0):
        """Record activity for anomaly detection"""
        self.anomaly_detector.record_metric(activity_type, value)

    def check_for_anomalies(self):
        """Run anomaly detection and generate alerts"""
        anomalies = self.anomaly_detector.check_anomalies()

        for anomaly in anomalies:
            event = {
                'type': 'anomaly',
                'anomaly_type': anomaly['type'],
                **anomaly
            }
            self.process_event(event)

        return anomalies

    def get_alerts(self, clear: bool = False, severity_filter: str = None,
                   category_filter: str = None, limit: int = 100) -> List[dict]:
        """Get alerts with optional filters"""
        with self.lock:
            alerts = list(self.alerts)

            if severity_filter:
                alerts = [a for a in alerts if a['severity'] == severity_filter]

            if category_filter:
                alerts = [a for a in alerts if a['category'] == category_filter]

            if clear:
                self.alerts.clear()

            return alerts[-limit:]

    def get_critical_alerts(self, clear: bool = False) -> List[dict]:
        """Get critical severity alerts"""
        return self.get_alerts(clear=clear, severity_filter='critical')

    def get_risk_score(self) -> dict:
        """Get current risk score"""
        return self.risk_scorer.calculate_score()

    def get_stats(self) -> dict:
        """Get alert statistics"""
        with self.lock:
            return {
                **self.stats,
                'risk_score': self.risk_scorer.calculate_score(),
                'risk_trend': self.risk_scorer.get_trend(),
                'anomalies_detected': len(self.anomaly_detector.anomalies),
            }

    def get_rules(self) -> List[dict]:
        """Get all alert rules"""
        return [
            {
                'rule_id': r.rule_id,
                'name': r.name,
                'description': r.description,
                'category': r.category,
                'severity': r.severity,
                'enabled': r.enabled,
                'cooldown_seconds': r.cooldown_seconds,
            }
            for r in self.rules.values()
        ]

    def monitor_loop(self):
        """Background monitoring loop for anomaly detection"""
        while self.running:
            try:
                self.check_for_anomalies()
                time.sleep(60)  # Check every minute
            except Exception as e:
                print(f"Alert engine error: {e}")
                time.sleep(60)

    def start(self):
        """Start alert engine background processing"""
        if self.running:
            return

        self.running = True
        self.thread = threading.Thread(target=self.monitor_loop, daemon=True)
        self.thread.start()
        print("Alert engine started")

    def stop(self):
        """Stop alert engine"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        print("Alert engine stopped")


if __name__ == "__main__":
    def on_alert(alert):
        print(f"[{alert['severity'].upper()}] {alert['rule_name']}: {alert['description']}")

    engine = AlertEngine(on_alert_callback=on_alert)

    print("Testing alert engine...\n")

    # Test various events
    test_events = [
        {'type': 'dlp', 'severity': 'critical', 'pattern': 'credit_card'},
        {'type': 'device', 'blocked': True, 'device_type': 'usb_storage'},
        {'type': 'login', 'event_type': 'login_failed', 'user': 'test'},
        {'type': 'app_blocked', 'app': 'steam.exe'},
        {'type': 'file', 'is_sensitive': True, 'path': 'passwords.txt'},
        {'type': 'print', 'pages': 100, 'document': 'large_report.pdf'},
    ]

    for event in test_events:
        print(f"\nProcessing event: {event['type']}")
        engine.process_event(event)

    print(f"\n\nRisk Score: {engine.get_risk_score()}")
    print(f"\nStats: {engine.get_stats()}")

    print("\n\nAlert Rules:")
    for rule in engine.get_rules():
        status = "ON" if rule['enabled'] else "OFF"
        print(f"  [{status}] {rule['name']} ({rule['severity']})")
