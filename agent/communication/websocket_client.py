"""
WebSocket Client for real-time communication with admin panel
"""

import json
import threading
import time
import sys
import os

import websocket

# Fix imports for PyInstaller
if getattr(sys, 'frozen', False):
    # Running as compiled exe
    BASE_DIR = os.path.dirname(sys.executable)
else:
    # Running as script
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

sys.path.insert(0, BASE_DIR)

try:
    from config import WS_URL
except ImportError:
    WS_URL = "ws://localhost:3847/ws"


class WebSocketClient:
    def __init__(self, server_url=None):
        self.server_url = server_url or WS_URL
        self.ws = None
        self.agent_id = None
        self.running = False
        self.connected = False
        self.thread = None
        self.reconnect_delay = 5
        self._lock = threading.Lock()  # Thread-safe lock for send operations

        # Callbacks
        self.on_screenshot_request = None
        self.on_usb_policy_update = None
        self.on_status_request = None
        self.on_connected = None
        self.on_disconnected = None
        self.on_block_app = None
        self.on_block_website = None
        self.on_start_stream = None
        self.on_stop_stream = None
        self.on_data_sync_request = None
        # New remote command callbacks
        self.on_restart = None
        self.on_lock_screen = None
        self.on_show_message = None
        self.on_system_info_request = None
        self.on_toggle_stealth = None

    def connect(self, agent_id):
        """Connect to WebSocket server"""
        self.agent_id = agent_id
        self.running = True
        self.thread = threading.Thread(target=self._connection_loop, daemon=True)
        self.thread.start()

    def _connection_loop(self):
        """Main connection loop with auto-reconnect"""
        while self.running:
            try:
                self._connect()
            except Exception as e:
                print(f"WebSocket connection error: {e}")

            if self.running:
                print(f"Reconnecting in {self.reconnect_delay} seconds...")
                time.sleep(self.reconnect_delay)

    def _connect(self):
        """Establish WebSocket connection"""
        self.ws = websocket.WebSocketApp(
            self.server_url,
            on_open=self._on_open,
            on_message=self._on_message,
            on_error=self._on_error,
            on_close=self._on_close
        )
        self.ws.run_forever()

    def _on_open(self, ws):
        """Handle connection opened"""
        print("WebSocket connected")
        self.connected = True

        # Send agent identification
        self.send({
            'type': 'agent_connect',
            'agent_id': self.agent_id
        })

        if self.on_connected:
            self.on_connected()

    def _on_message(self, ws, message):
        """Handle incoming messages"""
        try:
            data = json.loads(message)
            self._handle_message(data)
        except json.JSONDecodeError:
            print(f"Invalid JSON message: {message}")

    def _handle_message(self, data):
        """Process incoming message based on type"""
        msg_type = data.get('type')

        if msg_type == 'connected':
            print(f"Agent confirmed connected: {data.get('agent_id')}")

        elif msg_type == 'take_screenshot':
            print("Screenshot requested")
            if self.on_screenshot_request:
                self.on_screenshot_request()

        elif msg_type == 'usb_policy_update':
            print("USB policy update received")
            if self.on_usb_policy_update:
                self.on_usb_policy_update(data.get('policy'))

        elif msg_type == 'status_request':
            print("Status requested")
            if self.on_status_request:
                self.on_status_request()

        elif msg_type == 'heartbeat_ack':
            pass  # Heartbeat acknowledged

        elif msg_type == 'block_app':
            app_name = data.get('app_name')
            print(f"Block app command received: {app_name}")
            if self.on_block_app and app_name:
                self.on_block_app(app_name)

        elif msg_type == 'block_website':
            domain = data.get('domain')
            print(f"Block website command received: {domain}")
            if self.on_block_website and domain:
                self.on_block_website(domain)

        elif msg_type == 'start_screen_stream' or msg_type == 'start_stream':
            print("Start screen stream command received")
            if self.on_start_stream:
                self.on_start_stream(data)

        elif msg_type == 'stop_screen_stream' or msg_type == 'stop_stream':
            print("Stop screen stream command received")
            if self.on_stop_stream:
                self.on_stop_stream()

        elif msg_type == 'request_data_sync':
            data_type = data.get('data_type')
            print(f"Data sync requested: {data_type}")
            if self.on_data_sync_request:
                self.on_data_sync_request(data_type)

        # New remote command handlers
        elif msg_type == 'restart_agent':
            print("Restart agent command received")
            if self.on_restart:
                self.on_restart()

        elif msg_type == 'lock_screen':
            print("Lock screen command received")
            if self.on_lock_screen:
                self.on_lock_screen()

        elif msg_type == 'show_message':
            print("Show message command received")
            if self.on_show_message:
                self.on_show_message(data)

        elif msg_type == 'get_system_info':
            print("Get system info command received")
            if self.on_system_info_request:
                self.on_system_info_request()

        elif msg_type == 'toggle_stealth':
            print("Toggle stealth command received")
            if self.on_toggle_stealth:
                self.on_toggle_stealth(data)

        elif msg_type == 'screenshot_now':
            print("Immediate screenshot command received")
            if self.on_screenshot_request:
                self.on_screenshot_request()

        else:
            print(f"Unknown message type: {msg_type}")

    def _on_error(self, ws, error):
        """Handle WebSocket errors"""
        print(f"WebSocket error: {error}")

    def _on_close(self, ws, close_status_code, close_msg):
        """Handle connection closed"""
        print(f"WebSocket closed: {close_status_code} - {close_msg}")
        self.connected = False

        if self.on_disconnected:
            self.on_disconnected()

    def send(self, data):
        """Send data to server (thread-safe)"""
        with self._lock:
            if self.ws and self.connected:
                try:
                    self.ws.send(json.dumps(data))
                    return True
                except Exception as e:
                    print(f"WebSocket send error: {e}")
            return False

    def send_heartbeat(self):
        """Send heartbeat to server"""
        return self.send({'type': 'heartbeat'})

    def send_screenshot_ready(self, screenshot_id):
        """Notify server that screenshot is ready"""
        return self.send({
            'type': 'screenshot_ready',
            'screenshot_id': screenshot_id
        })

    def send_usb_event(self, event):
        """Send USB event to server"""
        return self.send({
            'type': 'usb_event',
            'event': event
        })

    def send_status(self, status):
        """Send status to server"""
        return self.send({
            'type': 'status_response',
            'status': status
        })

    def send_data_sync_complete(self, data_type):
        """Notify server that data sync is complete"""
        return self.send({
            'type': 'data_sync_complete',
            'data_type': data_type
        })

    def disconnect(self):
        """Disconnect from server"""
        self.running = False
        if self.ws:
            self.ws.close()
        if self.thread:
            self.thread.join(timeout=3)
        print("WebSocket disconnected")


if __name__ == "__main__":
    # Test WebSocket client
    def on_screenshot():
        print(">>> Screenshot callback triggered!")

    def on_policy(policy):
        print(f">>> Policy update: {policy}")

    client = WebSocketClient()
    client.on_screenshot_request = on_screenshot
    client.on_usb_policy_update = on_policy

    # Test with a fake agent ID
    client.connect("test-agent-123")

    try:
        print("WebSocket client running... (Press Ctrl+C to stop)")
        while True:
            time.sleep(5)
            if client.connected:
                client.send_heartbeat()
    except KeyboardInterrupt:
        client.disconnect()
