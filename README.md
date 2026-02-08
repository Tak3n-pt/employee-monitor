# Employee Monitoring System

A Windows employee monitoring solution with real-time tracking, screenshot capture, and USB device control.

## Features

- **Activity Tracking**: Monitor time spent on each application
- **Screenshots**: Capture screenshots on demand from admin panel
- **USB Control**: Monitor and block USB storage devices
- **Real-time Updates**: WebSocket connection for instant notifications

## Architecture

```
┌─────────────────────────┐                    ┌─────────────────────────────────┐
│   Employee Agent        │                    │   Admin Panel                   │
│   (Python)              │                    │   (Node.js + Electron)          │
├─────────────────────────┤    HTTP/WS         ├─────────────────────────────────┤
│ • Process Monitor       │ ←───────────────→  │ • Express Server (port 3847)    │
│ • Screenshot Capture    │                    │ • SQLite Database               │
│ • USB Monitor/Control   │                    │ • Web Dashboard                 │
└─────────────────────────┘                    └─────────────────────────────────┘
```

## Quick Start

### 1. Start Admin Panel

```bash
cd admin-panel
npm install
npm run server
```

Or on Windows, double-click `start.bat`

Open http://localhost:3847 in your browser.

### 2. Install Agent on Employee Machine

```bash
cd agent
pip install -r requirements.txt
python main.py --server ADMIN_IP --port 3847
```

Or on Windows:
1. Run `install.bat` to install dependencies
2. Run `start.bat ADMIN_IP` to start the agent

### Admin Panel Commands

```bash
# Start server only (for production)
npm run server

# Start with Electron app
npm start

# Start in development mode
npm run dev
```

### Agent Commands

```bash
# Connect to localhost
python main.py

# Connect to specific server
python main.py --server 192.168.1.100 --port 3847

# Set employee name
python main.py --server 192.168.1.100 --name "John Doe"
```

## USB Device Control

The agent can block USB storage devices. This requires **Administrator privileges**.

To run with admin rights:
- Right-click `start.bat` → "Run as administrator"
- Or run CMD as administrator and execute: `python main.py`

## Firewall Configuration

Ensure port 3847 is open on the admin machine:

```
Windows Firewall → Inbound Rules → New Rule → Port → TCP 3847
```

## Building Standalone Agent

To create an executable:

```bash
cd agent
pip install pyinstaller
pyinstaller --onefile --noconsole main.py --name EmployeeMonitor
```

The executable will be in `dist/EmployeeMonitor.exe`

## Antivirus Notes

Monitoring software may trigger antivirus alerts. For deployment:

1. Add Windows Defender exclusion for the agent folder
2. Whitelist via Group Policy for enterprise deployment
3. Sign the executable with a code signing certificate for commercial use

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/agents/register | Agent registration |
| POST | /api/agents/heartbeat | Agent heartbeat |
| POST | /api/activities | Submit activity data |
| POST | /api/screenshots/upload | Upload screenshot |
| GET | /api/agents | Get all agents |
| GET | /api/screenshots | Get recent screenshots |
| GET | /api/usb/policies | Get USB policies |
| POST | /api/usb/policies | Create USB policy |

## WebSocket Events

### Server → Agent
- `take_screenshot` - Request screenshot
- `usb_policy_update` - New USB policy

### Agent → Server
- `screenshot_ready` - Screenshot uploaded
- `usb_event` - USB device connected/disconnected

## Project Structure

```
employee-monitor/
├── admin-panel/
│   ├── server/           # Express API server
│   ├── public/           # Dashboard UI
│   ├── screenshots/      # Stored screenshots
│   ├── data/             # SQLite database
│   └── package.json
│
└── agent/
    ├── monitors/         # Monitoring modules
    ├── communication/    # API & WebSocket clients
    ├── utils/            # Utilities
    ├── main.py           # Entry point
    └── requirements.txt
```
