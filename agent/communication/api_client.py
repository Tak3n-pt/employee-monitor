"""
API Client for communicating with the admin panel server
"""

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

import sys
import os

# Fix imports for PyInstaller
if getattr(sys, 'frozen', False):
    # Running as compiled exe
    BASE_DIR = os.path.dirname(sys.executable)
else:
    # Running as script
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

sys.path.insert(0, BASE_DIR)

try:
    from config import SERVER_URL
except ImportError:
    SERVER_URL = "http://localhost:3847"


class APIClient:
    def __init__(self, server_url=None):
        self.server_url = server_url or SERVER_URL
        self.session = self._create_session()
        self.agent_id = None

    def _create_session(self):
        """Create a requests session with retry logic"""
        session = requests.Session()
        retry = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[500, 502, 503, 504]
        )
        adapter = HTTPAdapter(max_retries=retry)
        session.mount('http://', adapter)
        session.mount('https://', adapter)
        return session

    def register(self, employee_name, pc_name, os_version):
        """Register agent with the server"""
        try:
            response = self.session.post(
                f"{self.server_url}/api/agents/register",
                json={
                    'employee_name': employee_name,
                    'pc_name': pc_name,
                    'os_version': os_version
                },
                timeout=10
            )
            response.raise_for_status()
            data = response.json()

            if data.get('success'):
                self.agent_id = data.get('agent_id')
                return {
                    'success': True,
                    'agent_id': self.agent_id,
                    'usb_policies': data.get('usb_policies', []),
                    'blocked_apps': data.get('blocked_apps', []),
                    'blocked_websites': data.get('blocked_websites', []),
                    'device_policy': data.get('device_policy', {})
                }
            return {'success': False, 'error': 'Registration failed'}
        except requests.RequestException as e:
            return {'success': False, 'error': str(e)}

    def heartbeat(self):
        """Send heartbeat to server"""
        if not self.agent_id:
            return {'success': False, 'error': 'Not registered'}

        try:
            response = self.session.post(
                f"{self.server_url}/api/agents/heartbeat",
                json={'agent_id': self.agent_id},
                timeout=5
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {'success': False, 'error': str(e)}

    def send_activities(self, activities):
        """Send activity data to server"""
        if not self.agent_id:
            return {'success': False, 'error': 'Not registered'}

        if not activities:
            return {'success': True, 'count': 0}

        try:
            response = self.session.post(
                f"{self.server_url}/api/activities",
                json={
                    'agent_id': self.agent_id,
                    'activities': activities
                },
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {'success': False, 'error': str(e)}

    def upload_screenshot(self, image_bytes, filename):
        """Upload screenshot to server"""
        if not self.agent_id:
            return {'success': False, 'error': 'Not registered'}

        try:
            files = {
                'screenshot': (filename, image_bytes, 'image/png')
            }
            data = {
                'agent_id': self.agent_id
            }

            response = self.session.post(
                f"{self.server_url}/api/screenshots/upload",
                files=files,
                data=data,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {'success': False, 'error': str(e)}

    def log_usb_event(self, event):
        """Log USB event to server"""
        if not self.agent_id:
            return {'success': False, 'error': 'Not registered'}

        try:
            response = self.session.post(
                f"{self.server_url}/api/usb/log",
                json={
                    'agent_id': self.agent_id,
                    **event
                },
                timeout=5
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {'success': False, 'error': str(e)}

    def get_usb_policies(self):
        """Get USB policies for this agent"""
        if not self.agent_id:
            return []

        try:
            response = self.session.get(
                f"{self.server_url}/api/usb/policies/agent/{self.agent_id}",
                timeout=5
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException:
            return []

    def send_monitoring_data(self, data):
        """Send aggregated monitoring data to server"""
        if not self.agent_id:
            return {'success': False, 'error': 'Not registered'}

        try:
            response = self.session.post(
                f"{self.server_url}/api/monitoring/data",
                json=data,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {'success': False, 'error': str(e)}

    def send_alert(self, alert):
        """Send alert to server"""
        if not self.agent_id:
            return {'success': False, 'error': 'Not registered'}

        try:
            response = self.session.post(
                f"{self.server_url}/api/alerts",
                json={
                    'agent_id': self.agent_id,
                    **alert
                },
                timeout=5
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {'success': False, 'error': str(e)}

    def get_policies(self):
        """Get all policies for this agent"""
        if not self.agent_id:
            return {}

        try:
            response = self.session.get(
                f"{self.server_url}/api/policies/agent/{self.agent_id}",
                timeout=5
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException:
            return {}

    def check_connection(self):
        """Check if server is reachable"""
        try:
            response = self.session.get(
                f"{self.server_url}/api/health",
                timeout=5
            )
            return response.status_code == 200
        except requests.RequestException:
            return False


if __name__ == "__main__":
    # Test the API client
    client = APIClient()

    print("Checking server connection...")
    if client.check_connection():
        print("Server is reachable")

        # Test registration
        result = client.register("Test User", "TEST-PC", "Windows 10")
        print(f"Registration: {result}")

        if result.get('success'):
            # Test heartbeat
            hb = client.heartbeat()
            print(f"Heartbeat: {hb}")
    else:
        print("Server is not reachable")
