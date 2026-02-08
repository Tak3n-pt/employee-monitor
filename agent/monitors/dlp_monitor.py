"""
DLP (Data Loss Prevention) Monitor
Detects sensitive data patterns in clipboard, files, and screen text
"""

import re
import threading
import time
from datetime import datetime
from collections import deque


# Sensitive data patterns
PATTERNS = {
    'credit_card': {
        'pattern': r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b',
        'description': 'Credit Card Number',
        'severity': 'critical',
    },
    'ssn': {
        'pattern': r'\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b',
        'description': 'Social Security Number',
        'severity': 'critical',
    },
    'email': {
        'pattern': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        'description': 'Email Address',
        'severity': 'low',
    },
    'phone': {
        'pattern': r'\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b',
        'description': 'Phone Number',
        'severity': 'low',
    },
    'ip_address': {
        'pattern': r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b',
        'description': 'IP Address',
        'severity': 'medium',
    },
    'aws_key': {
        'pattern': r'(?:A3T[A-Z0-9]|AKIA|AGPA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}',
        'description': 'AWS Access Key',
        'severity': 'critical',
    },
    'aws_secret': {
        'pattern': r'(?i)aws(.{0,20})?[\'"][0-9a-zA-Z\/+]{40}[\'"]',
        'description': 'AWS Secret Key',
        'severity': 'critical',
    },
    'private_key': {
        'pattern': r'-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----',
        'description': 'Private Key',
        'severity': 'critical',
    },
    'api_key': {
        'pattern': r'(?i)(?:api[_-]?key|apikey|api_secret)[\'"\s:=]+[\'"]?[a-zA-Z0-9_\-]{20,}[\'"]?',
        'description': 'API Key',
        'severity': 'high',
    },
    'password_field': {
        'pattern': r'(?i)(?:password|passwd|pwd)[\'"\s:=]+[\'"]?[^\s\'",]{6,}[\'"]?',
        'description': 'Password in Text',
        'severity': 'high',
    },
    'jwt_token': {
        'pattern': r'eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+',
        'description': 'JWT Token',
        'severity': 'high',
    },
    'github_token': {
        'pattern': r'(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}',
        'description': 'GitHub Token',
        'severity': 'critical',
    },
    'slack_token': {
        'pattern': r'xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}',
        'description': 'Slack Token',
        'severity': 'critical',
    },
    'bank_account': {
        'pattern': r'\b[0-9]{8,17}\b',  # Basic pattern, often needs context
        'description': 'Potential Bank Account',
        'severity': 'medium',
        'requires_context': True,  # Only flag if near banking keywords
    },
}

# Context keywords that increase severity
CONTEXT_KEYWORDS = {
    'financial': ['bank', 'account', 'routing', 'swift', 'iban', 'wire', 'transfer'],
    'credentials': ['password', 'secret', 'token', 'key', 'credential', 'auth'],
    'personal': ['ssn', 'social security', 'date of birth', 'dob', 'passport'],
}


class DLPMonitor:
    def __init__(self, on_alert_callback=None):
        self.on_alert = on_alert_callback
        self.alerts = deque(maxlen=1000)
        self.lock = threading.Lock()

        # Compile regex patterns
        self.compiled_patterns = {}
        for name, config in PATTERNS.items():
            try:
                self.compiled_patterns[name] = {
                    'regex': re.compile(config['pattern']),
                    'description': config['description'],
                    'severity': config['severity'],
                    'requires_context': config.get('requires_context', False),
                }
            except re.error as e:
                print(f"Invalid pattern for {name}: {e}")

        # Statistics
        self.scan_count = 0
        self.alert_count = 0

    def scan_text(self, text, source='unknown', context=None):
        """
        Scan text for sensitive data patterns

        Args:
            text: Text to scan
            source: Source of the text (clipboard, file, etc.)
            context: Additional context (window title, app name, etc.)

        Returns:
            List of alerts found
        """
        if not text or not isinstance(text, str):
            return []

        self.scan_count += 1
        found_alerts = []

        # Check for context keywords
        text_lower = text.lower()
        has_financial_context = any(kw in text_lower for kw in CONTEXT_KEYWORDS['financial'])
        has_credential_context = any(kw in text_lower for kw in CONTEXT_KEYWORDS['credentials'])

        for name, config in self.compiled_patterns.items():
            # Skip patterns that require context if no context present
            if config['requires_context']:
                if name == 'bank_account' and not has_financial_context:
                    continue

            matches = config['regex'].findall(text)

            for match in matches:
                # Mask the sensitive data
                if isinstance(match, tuple):
                    match = match[0]

                masked = self._mask_data(match, name)

                alert = {
                    'timestamp': datetime.now().isoformat(),
                    'type': name,
                    'description': config['description'],
                    'severity': config['severity'],
                    'source': source,
                    'context': context,
                    'masked_value': masked,
                    'original_length': len(match),
                }

                # Increase severity based on context
                if config['severity'] == 'medium':
                    if has_credential_context or has_financial_context:
                        alert['severity'] = 'high'

                found_alerts.append(alert)

        # Store alerts
        if found_alerts:
            with self.lock:
                for alert in found_alerts:
                    self.alerts.append(alert)
                    self.alert_count += 1

                    if self.on_alert:
                        self.on_alert(alert)

        return found_alerts

    def _mask_data(self, data, data_type):
        """Mask sensitive data for logging"""
        if not data:
            return ''

        length = len(data)

        if data_type == 'credit_card':
            # Show last 4 digits
            return '*' * (length - 4) + data[-4:]

        elif data_type == 'ssn':
            # Show last 4 digits
            return '***-**-' + data[-4:]

        elif data_type == 'email':
            # Show first char and domain
            parts = data.split('@')
            if len(parts) == 2:
                return parts[0][0] + '***@' + parts[1]
            return '***@***'

        elif data_type in ['aws_key', 'github_token', 'slack_token', 'api_key']:
            # Show first 4 and last 4 chars
            if length > 8:
                return data[:4] + '*' * (length - 8) + data[-4:]
            return '*' * length

        elif data_type == 'private_key':
            return '-----BEGIN PRIVATE KEY----- [REDACTED]'

        elif data_type == 'jwt_token':
            return data[:10] + '...[REDACTED]...' + data[-10:]

        else:
            # Generic masking - show first and last char
            if length > 2:
                return data[0] + '*' * (length - 2) + data[-1]
            return '*' * length

    def scan_file(self, filepath):
        """Scan a file for sensitive data"""
        try:
            # Check file size (skip very large files)
            import os
            size = os.path.getsize(filepath)
            if size > 10 * 1024 * 1024:  # 10MB limit
                return []

            # Read file
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            return self.scan_text(content, source=f'file:{filepath}')

        except Exception as e:
            print(f"Error scanning file {filepath}: {e}")
            return []

    def get_alerts(self, clear=False, severity_filter=None):
        """Get DLP alerts"""
        with self.lock:
            alerts = list(self.alerts)

            if severity_filter:
                alerts = [a for a in alerts if a['severity'] == severity_filter]

            if clear:
                self.alerts.clear()

        return alerts

    def get_critical_alerts(self, clear=False):
        """Get only critical severity alerts"""
        return self.get_alerts(clear=clear, severity_filter='critical')

    def get_stats(self):
        """Get DLP statistics"""
        severity_counts = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}

        with self.lock:
            for alert in self.alerts:
                sev = alert.get('severity', 'low')
                severity_counts[sev] = severity_counts.get(sev, 0) + 1

        return {
            'total_scans': self.scan_count,
            'total_alerts': self.alert_count,
            'alerts_by_severity': severity_counts
        }

    def add_custom_pattern(self, name, pattern, description, severity='medium'):
        """Add a custom detection pattern"""
        try:
            self.compiled_patterns[name] = {
                'regex': re.compile(pattern),
                'description': description,
                'severity': severity,
                'requires_context': False,
            }
            return True
        except re.error as e:
            print(f"Invalid pattern: {e}")
            return False


# Convenience function for one-off scans
def scan_for_sensitive_data(text):
    """Quick scan for sensitive data"""
    monitor = DLPMonitor()
    return monitor.scan_text(text)


if __name__ == "__main__":
    def on_alert(alert):
        print(f"[{alert['severity'].upper()}] {alert['description']}: {alert['masked_value']}")

    dlp = DLPMonitor(on_alert_callback=on_alert)

    # Test with sample data
    test_data = """
    Here's my credit card: 4532015112830366
    My SSN is 123-45-6789
    Email me at john.doe@example.com
    API_KEY=sk_live_EXAMPLE_KEY_PLACEHOLDER_0000000
    AWS Access Key: AKIA_EXAMPLE_KEY_0000000
    -----BEGIN RSA PRIVATE KEY-----
    MIIEpAIBAAKCAQEA...
    -----END RSA PRIVATE KEY-----
    Password: mysecretpassword123
    GitHub token: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    """

    print("Scanning test data...\n")
    alerts = dlp.scan_text(test_data, source='test')

    print(f"\n\nFound {len(alerts)} alerts:")
    for alert in alerts:
        print(f"  [{alert['severity']}] {alert['description']}")

    print(f"\nStats: {dlp.get_stats()}")
