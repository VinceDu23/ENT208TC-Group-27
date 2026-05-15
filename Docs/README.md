# ENT208TC-Group-27
# FitVision

Real-time AI-powered exercise form analysis and rep counting using YOLO pose estimation and BLE heart rate monitoring.

## Features

- **Real-time Pose Tracking** — YOLOv8n-pose detects 17 body keypoints and computes 6 joint angles per side
- **Trajectory-based Rep Counting** — Auto-calibrating state machine counts reps from barbell path (top → bottom → top)
- **Posture Scoring** — Joint angles compared against ideal biomechanical ranges per exercise
- **Form Warnings** — Real-time alerts for bar deviation, forward lean, knee valgus, and other common errors
- **Bluetooth Heart Rate** — Web Bluetooth API integration for BLE heart rate monitors (Chrome / Edge)
- **Training History** — Session summaries saved to localStorage with trend charts and volume analysis
- **Bilingual UI** — Chinese / English toggle with auto-detection
- **Dark / Light Theme** — Toggle with preference saved to localStorage
- **Simulation Fallback** — Full offline demo mode with simulated pose data when no camera or YOLO server is connected

## Supported Exercises

| Exercise | Primary Angle | Trajectory Pattern |
|----------|--------------|-------------------|
| Squat (深蹲) | Knee | Vertical line |
| Bench Press (卧推) | Elbow | Arc to lower chest |
| Deadlift (硬拉) | Hip | Vertical line |
| Overhead Press (肩推) | Shoulder | Vertical to overhead |

## Architecture

```
Camera → pose_server.py (YOLO + FastAPI/WebSocket)
              ↓ ws://
     yolo_client.js → data_fusion.js → rep_detector.js
              ↓                            ↓
         dashboard.js ←──────────────────┘
              ↓
      trajectory.js  skeleton.js  charts.js
```

- **Backend**: Python, FastAPI + Uvicorn, YOLOv8n-pose, OpenCV
- **Frontend**: Vanilla JavaScript, Canvas 2D, Chart.js
- **Real-time**: WebSocket (bidirectional, low-latency)
- **BLE**: Web Bluetooth API (Chromium browsers only)

## Project Structure

```
FitVision/
├── pose_server.py      # YOLO inference + WebSocket server
├── index.html           # Main app (4-tab dashboard)
├── landing.html         # Chinese landing page
├── landing-en.html      # Bilingual landing page
├── login.html           # Login / register page
├── styles.css           # Main app styles + theme variables
├── app.js               # Entry point, tab switching, YOLO/BLE UI
├── dashboard.js         # RealDataSource + Dashboard controller
├── data.js              # Exercise configs, ideal ranges, thresholds
├── simulation.js        # Offline simulated data engine
├── yolo_client.js       # WebSocket client for YOLO server
├── data_fusion.js       # Moving-average fusion of YOLO + BLE data
├── rep_detector.js      # Auto-calibrating rep counter (state machine)
├── trajectory.js        # Canvas 2D barbell trajectory renderer
├── skeleton.js          # Canvas 2D skeleton + joint angle overlay
├── charts.js            # Chart.js trend / volume / comparison charts
├── bluetooth.js         # Web Bluetooth API BLE manager
├── ai_coach.js          # AI coach chat module
├── i18n.js              # Chinese / English localization
├── favicon.jpg          # App favicon
└── README.md
```

## Setup

### Prerequisites

- Python 3.11+
- Chrome 121+ or Edge 121+ (for BLE support)
- A camera (built-in or USB)

### Install

```bash
git clone https://github.com/VinceDu23/ENT208TC-Group-27.git
cd FitVision

# Python virtual environment
python -m venv venv

# Windows
.\venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install ultralytics opencv-python fastapi uvicorn numpy

# Download YOLO model (auto-downloaded on first run, or place yolo26n-pose.pt in project root)
```

### Run

```bash
# Terminal 1 — Start the YOLO pose server
python pose_server.py

# Terminal 2 — Serve the frontend
python -m http.server 3000 --bind 127.0.0.1
```

Open `http://localhost:3000` in Chrome or Edge.

### Usage

1. Select an exercise (Squat, Bench, Deadlift, or OHP)
2. Click **Connect YOLO** to link the pose server
3. Click **Start** to begin tracking
4. Perform your exercise — reps are counted automatically
5. Click **Pause** to stop or **Save** to record the session

## Key Design Decisions

| Decision | Rationale |
|----------|----------|
| Vanilla JS (no framework) | Static 4-tab dashboard; zero build step, instant deploy |
| YOLOv8n-pose (nano) | Real-time CPU inference (~20 FPS on desktop) |
| WebSocket over SSE | Bidirectional, low-latency for pose data streaming |
| localStorage (no DB) | Zero setup; session data is small JSON arrays |
| Auto-calibrating rep detection | Adapts thresholds to the user's actual range without per-user setup |

## Browser Support

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| Pose tracking | ✓ | ✓ | ✓ | ✓ |
| BLE heart rate | ✓ | ✓ | ✗ | ✗ |
| Dark theme | ✓ | ✓ | ✓ | ✓ |

## License

MIT
