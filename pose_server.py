"""
FitVision Pose Server
YOLOv8-pose real-time inference + WebSocket streaming
Usage: python pose_server.py [--port 8765] [--camera 0] [--model yolo26n-pose.pt]
"""
import asyncio
import json
import time
import math
import threading
from pathlib import Path
import argparse
import logging

import cv2
import numpy as np

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
log = logging.getLogger("pose_server")

# ─── YOLO Keypoint Indices (COCO 17-keypoint format) ───
KP = {
    'nose': 0, 'left_eye': 1, 'right_eye': 2, 'left_ear': 3, 'right_ear': 4,
    'left_shoulder': 5, 'right_shoulder': 6, 'left_elbow': 7, 'right_elbow': 8,
    'left_wrist': 9, 'right_wrist': 10, 'left_hip': 11, 'right_hip': 12,
    'left_knee': 13, 'right_knee': 14, 'left_ankle': 15, 'right_ankle': 16
}

# Skeleton bone connections for drawing
SKELETON_EDGES = [
    (5, 6),   # shoulders
    (5, 7), (7, 9),   # left arm
    (6, 8), (8, 10),  # right arm
    (5, 11), (6, 12), # torso
    (11, 12),          # hips
    (11, 13), (13, 15), # left leg
    (12, 14), (14, 16), # right leg
]

# Colors for drawing
JOINT_COLOR = (0, 255, 136)       # green
BONE_COLOR = (0, 200, 100)        # darker green
WARNING_COLOR = (0, 140, 255)     # orange
TEXT_COLOR = (255, 255, 255)

# ─── FastAPI app ───
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="FitVision Pose Server", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Global State ───
class ServerState:
    def __init__(self):
        self.model = None
        self.cap = None
        self.running = False
        self.connected_clients = []
        self.current_angles = {}
        self.current_keypoints = {}
        self.fps = 0.0
        self.frame_count = 0
        self.last_fps_time = time.time()
        self.confidence = {}
        self.use_camera = True
        self.camera_id = 0
        self.model_name = "yolo26n-pose.pt"
        self.annotated_frame = None  # JPEG bytes for MJPEG stream
        self.frame_lock = None       # threading.Lock for frame access
        self.raw_frame = None        # raw frame for skipped-frame streaming
        self.skip_count = 0          # counter for frame skipping
        self.skip_interval = 1       # run YOLO every N frames (2 = every other frame)

state = ServerState()


def compute_angle(a, b, c):
    """Compute angle ABC (angle at point B) in degrees."""
    a = np.array(a); b = np.array(b); c = np.array(c)
    ba = a - b
    bc = c - b
    cos_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8)
    cos_angle = np.clip(cos_angle, -1.0, 1.0)
    return float(np.degrees(np.arccos(cos_angle)))


def compute_body_angles(keypoints, side='right'):
    """Convert YOLO keypoints to joint angles (degrees)."""
    s = side
    required = [f'{s}_shoulder', f'{s}_hip', f'{s}_knee', f'{s}_ankle', f'{s}_elbow', f'{s}_wrist']
    for kp_name in required:
        if kp_name not in keypoints:
            return {}

    shoulder = keypoints[f'{s}_shoulder']
    hip = keypoints[f'{s}_hip']
    knee = keypoints[f'{s}_knee']
    ankle = keypoints[f'{s}_ankle']
    elbow = keypoints[f'{s}_elbow']
    wrist = keypoints[f'{s}_wrist']

    angles = {}
    angles['hip'] = compute_angle(shoulder, hip, knee)
    angles['knee'] = compute_angle(hip, knee, ankle)
    vertical_point = [hip[0], hip[1] - 100]
    angles['trunk'] = compute_angle(vertical_point, hip, shoulder)
    angles['shoulder'] = compute_angle(elbow, shoulder, hip)
    angles['elbow'] = compute_angle(shoulder, elbow, wrist)
    foot_ball = [ankle[0] + 30, ankle[1] + 10]
    angles['ankle'] = compute_angle(knee, ankle, foot_ball)
    return angles


def compute_bar_position(keypoints):
    """Estimate barbell position from shoulder keypoints (normalized 0-1).

       Uses MIDPOINT of both shoulders for stable X/Y tracking.
       Y coordinate: high bar_y = standing/top, low bar_y = bottom depth.
       This flipped Y is intentional so the rep detector works correctly
       (top zone = high bar_y, bottom zone = low bar_y).
    """
    img_w, img_h = 480, 360
    # Gather both shoulders for averaging
    shoulders = []
    for side in ['right_shoulder', 'left_shoulder']:
        if side in keypoints:
            shoulders.append(keypoints[side])

    if not shoulders:
        return {'x': 0.50, 'y': 0.85}

    # Average shoulder positions for stability
    avg_x = sum(s[0] for s in shoulders) / len(shoulders)
    avg_y = sum(s[1] for s in shoulders) / len(shoulders)

    bar_x = max(0.1, min(0.9, avg_x / img_w))
    bar_y = max(0.05, min(0.95, 1.0 - (avg_y / img_h)))
    return {'x': float(bar_x), 'y': float(bar_y)}


def draw_skeleton(frame, keypoints, confidence):
    """Overlay skeleton and joint dots on the frame. Returns annotated frame."""
    if not keypoints:
        return frame
    annotated = frame.copy()
    h, w = annotated.shape[:2]

    # Draw bones
    for a_idx, b_idx in SKELETON_EDGES:
        kp_a = KP_list[a_idx] if a_idx < len(KP_list) else None
        kp_b = KP_list[b_idx] if b_idx < len(KP_list) else None
        if kp_a and kp_b and kp_a in keypoints and kp_b in keypoints:
            a_conf = confidence.get(kp_a, 0)
            b_conf = confidence.get(kp_b, 0)
            if a_conf > 0.4 and b_conf > 0.4:
                pt1 = (int(keypoints[kp_a][0]), int(keypoints[kp_a][1]))
                pt2 = (int(keypoints[kp_b][0]), int(keypoints[kp_b][1]))
                thickness = 3
                cv2.line(annotated, pt1, pt2, BONE_COLOR, thickness)

    # Draw joints
    for name, pt in keypoints.items():
        conf = confidence.get(name, 0)
        if conf > 0.4:
            px, py = int(pt[0]), int(pt[1])
            radius = 6 if conf > 0.7 else 4
            cv2.circle(annotated, (px, py), radius, JOINT_COLOR, -1)
            cv2.circle(annotated, (px, py), radius, (0, 0, 0), 1)

    # Draw FPS
    cv2.putText(annotated, f"FitVision FPS: {state.fps:.1f}",
                (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, JOINT_COLOR, 2)

    return annotated


# Build reverse mapping: index -> name
KP_list = [None] * 17
for name, idx in KP.items():
    KP_list[idx] = name


def init_model(model_name):
    """Load YOLO model."""
    from ultralytics import YOLO
    log.info(f"Loading model: {model_name}")
    try:
        model = YOLO(model_name)
        log.info("Model loaded successfully")
        return model
    except Exception as e:
        log.error(f"Failed to load {model_name}: {e}, trying download...")
        model = YOLO("yolo26n-pose.pt")
        return model


def inference_loop():
    """Main inference loop running in background thread."""
    if state.model is None:
        state.model = init_model(state.model_name)

    if state.cap is None and state.use_camera:
        state.cap = cv2.VideoCapture(state.camera_id)
        state.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 480)
        state.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 360)
        state.cap.set(cv2.CAP_PROP_FPS, 30)
        log.info(f"Camera {state.camera_id} opened @ 480x360")

    state.running = True
    log.info("Inference loop started")

    last_pose_data = None  # cached for skipped frames

    while state.running:
        if not state.use_camera or state.cap is None:
            time.sleep(0.05)
            continue

        ret, frame = state.cap.read()
        if not ret:
            time.sleep(0.1)
            continue

        state.skip_count += 1
        do_inference = (state.skip_count % state.skip_interval == 0)

        if not do_inference:
            # Skip YOLO — just stream raw frame, keep video smooth
            _, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
            with state.frame_lock:
                state.annotated_frame = jpeg.tobytes()
            continue

        try:
            results = state.model(frame, verbose=False, conf=0.3, iou=0.7)
        except Exception as e:
            log.error(f"Inference error: {e}")
            time.sleep(0.05)
            continue

        if len(results) > 0 and results[0].keypoints is not None:
            kpts = results[0].keypoints
            if kpts.xy is not None and len(kpts.xy) > 0:
                kp_array = kpts.xy[0].cpu().numpy()
                kp_conf = kpts.conf[0].cpu().numpy() if kpts.conf is not None else []

                keypoints = {}
                confidence = {}
                for name, idx in KP.items():
                    if idx < len(kp_array):
                        keypoints[name] = [float(kp_array[idx][0]), float(kp_array[idx][1])]
                        if idx < len(kp_conf):
                            confidence[name] = float(kp_conf[idx])

                state.current_keypoints = keypoints
                state.confidence = confidence

                for side in ['right', 'left']:
                    side_angles = compute_body_angles(keypoints, side)
                    if side_angles:
                        state.current_angles[side] = side_angles

                angles_to_send = state.current_angles.get('right', state.current_angles.get('left', {}))
                bar_pos = compute_bar_position(keypoints)

                state.frame_count += 1
                now = time.time()
                elapsed = now - state.last_fps_time
                if elapsed >= 1.0:
                    state.fps = state.frame_count / elapsed
                    state.frame_count = 0
                    state.last_fps_time = now

                data = {
                    'type': 'pose_data',
                    'timestamp': time.time(),
                    'angles': angles_to_send,
                    'bar_position': bar_pos,
                    'fps': round(state.fps, 1)
                }

                # Include keypoints with confidence > 0.5
                data['keypoints'] = {}
                for name, conf in confidence.items():
                    if conf > 0.5 and name in keypoints:
                        data['keypoints'][name] = {
                            'x': keypoints[name][0],
                            'y': keypoints[name][1],
                            'conf': round(conf, 2)
                        }

                last_pose_data = json.dumps(data)

                # Draw skeleton on frame and store for video stream
                annotated = draw_skeleton(frame, keypoints, confidence)
                _, jpeg = cv2.imencode('.jpg', annotated, [cv2.IMWRITE_JPEG_QUALITY, 75])
                with state.frame_lock:
                    state.annotated_frame = jpeg.tobytes()

            else:
                _, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
                with state.frame_lock:
                    state.annotated_frame = jpeg.tobytes()

        else:
            _, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
            with state.frame_lock:
                state.annotated_frame = jpeg.tobytes()

        # Broadcast latest pose data to WebSocket clients
        if last_pose_data:
            asyncio.run_coroutine_threadsafe(
                broadcast_to_clients(last_pose_data),
                loop
            )


async def broadcast_to_clients(message):
    """Send message to all connected WebSocket clients."""
    disconnected = []
    for ws in state.connected_clients:
        try:
            await ws.send_text(message)
        except Exception:
            disconnected.append(ws)
    for ws in disconnected:
        if ws in state.connected_clients:
            state.connected_clients.remove(ws)


# ─── Routes ───

@app.get("/")
async def root():
    return {
        "service": "FitVision Pose Server",
        "version": "2.0.0",
        "endpoints": {
            "websocket": "ws://localhost:{port}/ws",
            "status": "GET /api/status",
            "config": "POST /api/config"
        }
    }


def generate_video():
    """MJPEG video stream generator."""
    blank = None
    while True:
        with state.frame_lock:
            frame_bytes = state.annotated_frame
        if frame_bytes:
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        else:
            # No frame yet — send a blank placeholder
            if blank is None:
                blank_img = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(blank_img, "Waiting for camera...", (140, 250),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
                _, buf = cv2.imencode('.jpg', blank_img, [cv2.IMWRITE_JPEG_QUALITY, 75])
                blank = buf.tobytes()
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + blank + b'\r\n')
        time.sleep(0.04)  # ~25fps


@app.get("/video")
async def video_feed():
    return StreamingResponse(
        generate_video(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@app.get("/api/status")
async def get_status():
    return JSONResponse({
        'running': state.running,
        'model': state.model_name,
        'camera': state.camera_id,
        'fps': round(state.fps, 1),
        'connected_clients': len(state.connected_clients),
        'angles_available': 'right' in state.current_angles or 'left' in state.current_angles,
        'last_angles': state.current_angles.get('right', state.current_angles.get('left', {})),
        'keypoints_count': len(state.current_keypoints)
    })


@app.post("/api/config")
async def update_config(request: Request):
    try:
        body = await request.json()
        if 'camera_id' in body:
            state.camera_id = int(body['camera_id'])
            if state.cap:
                state.cap.release()
                state.cap = None
        if 'use_camera' in body:
            state.use_camera = bool(body['use_camera'])
            if not state.use_camera and state.cap:
                state.cap.release()
                state.cap = None
        if 'model_name' in body:
            state.model_name = body['model_name']
            state.model = None
        return JSONResponse({'status': 'ok'})
    except Exception as e:
        return JSONResponse({'status': 'error', 'message': str(e)}, status_code=400)


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    state.connected_clients.append(ws)
    cid = id(ws)
    log.info(f"Client connected: {cid} (total: {len(state.connected_clients)})")

    await ws.send_text(json.dumps({
        'type': 'server_info',
        'model': state.model_name,
        'camera': state.camera_id,
        'fps': round(state.fps, 1),
        'message': 'Connected to FitVision Pose Server'
    }))

    try:
        while True:
            msg = await ws.receive_text()
            try:
                cmd = json.loads(msg)
                if cmd.get('type') == 'ping':
                    await ws.send_text(json.dumps({'type': 'pong', 'timestamp': time.time()}))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        log.info(f"Client disconnected: {cid}")
    except Exception as e:
        log.error(f"WebSocket error: {e}")
    finally:
        if ws in state.connected_clients:
            state.connected_clients.remove(ws)


# ─── Entry Point ───
def main():
    global loop
    import threading

    parser = argparse.ArgumentParser(description="FitVision Pose Server")
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--host', type=str, default='0.0.0.0')
    parser.add_argument('--camera', type=int, default=0)
    parser.add_argument('--model', type=str, default='yolo26n-pose.pt')
    parser.add_argument('--no-camera', action='store_true')
    args = parser.parse_args()

    state.camera_id = args.camera
    state.model_name = args.model
    state.use_camera = not args.no_camera
    state.frame_lock = threading.Lock()

    log.info(f"Starting FitVision Pose Server on {args.host}:{args.port}")
    log.info(f"Video stream: http://localhost:{args.port}/video")

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    t = threading.Thread(target=inference_loop, daemon=True)
    t.start()

    config = uvicorn.Config(app, host=args.host, port=args.port, log_level="info")
    server = uvicorn.Server(config)
    loop.run_until_complete(server.serve())


if __name__ == '__main__':
    main()
