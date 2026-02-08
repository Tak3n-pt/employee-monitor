"""
Employee Monitor Windows Service
Runs the agent as a proper Windows service

Usage:
    python service.py install   - Install the service
    python service.py start     - Start the service
    python service.py stop      - Stop the service
    python service.py remove    - Remove the service
    python service.py restart   - Restart the service
    python service.py status    - Check service status
"""

import sys
import os
import time
import logging

# Add parent directory to path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

try:
    import win32serviceutil
    import win32service
    import win32event
    import servicemanager
except ImportError:
    print("ERROR: pywin32 is required for Windows service support.")
    print("Install it with: pip install pywin32")
    sys.exit(1)

from config import load_config, SERVER_HOST, SERVER_PORT


class EmployeeMonitorService(win32serviceutil.ServiceFramework):
    _svc_name_ = "EmployeeMonitor"
    _svc_display_name_ = "Employee Monitor Agent"
    _svc_description_ = "Monitors employee activity and reports to admin panel"

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.stop_event = win32event.CreateEvent(None, 0, 0, None)
        self.agent = None
        self.running = False

        # Setup logging
        self.setup_logging()

    def setup_logging(self):
        """Setup logging for the service"""
        log_dir = os.path.join(BASE_DIR, 'logs')
        os.makedirs(log_dir, exist_ok=True)

        log_file = os.path.join(log_dir, 'service.log')
        logging.basicConfig(
            filename=log_file,
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )

    def SvcStop(self):
        """Stop the service"""
        logging.info("Service stop requested")
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.stop_event)
        self.running = False

        if self.agent:
            try:
                self.agent.stop()
            except Exception as e:
                logging.error(f"Error stopping agent: {e}")

    def SvcDoRun(self):
        """Main service entry point"""
        logging.info("Service starting")
        servicemanager.LogMsg(
            servicemanager.EVENTLOG_INFORMATION_TYPE,
            servicemanager.PYS_SERVICE_STARTED,
            (self._svc_name_, '')
        )

        try:
            self.main()
        except Exception as e:
            logging.error(f"Service error: {e}")
            servicemanager.LogErrorMsg(f"Service error: {e}")

    def main(self):
        """Main service loop"""
        self.running = True

        try:
            # Import the agent here to avoid import issues
            from main import EmployeeMonitorAgent

            # Load config for server settings
            config = load_config()
            server_host = config.get('server_host', SERVER_HOST)
            server_port = config.get('server_port', SERVER_PORT)

            logging.info(f"Connecting to server: {server_host}:{server_port}")

            # Create and start agent
            self.agent = EmployeeMonitorAgent(
                server_host=server_host,
                server_port=server_port,
                enable_dashboard=False  # No dashboard in service mode
            )

            self.agent.start()
            logging.info("Agent started successfully")

            # Wait for stop signal
            while self.running:
                result = win32event.WaitForSingleObject(self.stop_event, 5000)
                if result == win32event.WAIT_OBJECT_0:
                    break

        except Exception as e:
            logging.error(f"Agent error: {e}")
            raise

        logging.info("Service stopped")


def get_service_status():
    """Get current service status"""
    try:
        status = win32serviceutil.QueryServiceStatus(EmployeeMonitorService._svc_name_)
        state = status[1]
        states = {
            win32service.SERVICE_STOPPED: "Stopped",
            win32service.SERVICE_START_PENDING: "Start Pending",
            win32service.SERVICE_STOP_PENDING: "Stop Pending",
            win32service.SERVICE_RUNNING: "Running",
            win32service.SERVICE_CONTINUE_PENDING: "Continue Pending",
            win32service.SERVICE_PAUSE_PENDING: "Pause Pending",
            win32service.SERVICE_PAUSED: "Paused",
        }
        return states.get(state, f"Unknown ({state})")
    except Exception as e:
        return f"Not Installed ({e})"


if __name__ == '__main__':
    if len(sys.argv) == 1:
        # Running as service
        servicemanager.Initialize()
        servicemanager.PrepareToHostSingle(EmployeeMonitorService)
        servicemanager.StartServiceCtrlDispatcher()
    elif sys.argv[1] == 'status':
        print(f"Service Status: {get_service_status()}")
    else:
        # Handle command line
        win32serviceutil.HandleCommandLine(EmployeeMonitorService)
