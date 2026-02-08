"""
Screen Recorder - Records screen activity as video or streams live
"""

import threading
import time
import os
import io
import base64
from datetime import datetime
from queue import Queue

from PIL import ImageGrab
import win32gui
import win32con


class ScreenRecorder:
    def __init__(self, output_dir=None, fps=1, quality=50):
        """
        Initialize screen recorder

        Args:
            output_dir: Directory to save recordings
            fps: Frames per second for recording (1-10)
            quality: JPEG quality (1-100)
        """
        self.output_dir = output_dir or os.path.join(os.getenv('APPDATA', '.'), 'EmployeeMonitor', 'recordings')
        os.makedirs(self.output_dir, exist_ok=True)

        self.fps = max(1, min(10, fps))
        self.quality = max(10, min(100, quality))

        self.recording = False
        self.streaming = False
        self.record_thread = None
        self.stream_thread = None

        # Recording state
        self.current_recording = None
        self.frames = []
        self.frame_count = 0

        # Streaming
        self.stream_callback = None
        self.stream_queue = Queue(maxsize=10)

        # Statistics
        self.total_frames = 0
        self.total_recordings = 0

    def capture_screen(self, quality=None):
        """Capture a single screenshot"""
        try:
            screenshot = ImageGrab.grab(all_screens=True)

            # Convert to JPEG bytes
            buffer = io.BytesIO()
            screenshot.save(buffer, format='JPEG', quality=quality or self.quality)
            buffer.seek(0)

            return buffer.getvalue(), screenshot.size
        except Exception as e:
            print(f"Screen capture error: {e}")
            return None, None

    def capture_screen_base64(self, quality=None):
        """Capture screenshot and return as base64"""
        image_bytes, size = self.capture_screen(quality)
        if image_bytes:
            return base64.b64encode(image_bytes).decode('utf-8'), size
        return None, None

    def start_recording(self, duration_seconds=None, filename=None):
        """
        Start recording screen

        Args:
            duration_seconds: Optional max duration (None for unlimited)
            filename: Optional filename (auto-generated if None)
        """
        if self.recording:
            return False

        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"recording_{timestamp}"

        self.current_recording = {
            'filename': filename,
            'start_time': datetime.now(),
            'duration_limit': duration_seconds,
            'frames': []
        }

        self.recording = True
        self.record_thread = threading.Thread(target=self._record_loop, daemon=True)
        self.record_thread.start()

        print(f"Recording started: {filename}")
        return True

    def _record_loop(self):
        """Recording loop"""
        frame_interval = 1.0 / self.fps
        start_time = time.time()

        while self.recording:
            try:
                frame_start = time.time()

                # Capture frame
                image_bytes, size = self.capture_screen()
                if image_bytes:
                    self.current_recording['frames'].append({
                        'timestamp': datetime.now().isoformat(),
                        'data': image_bytes,
                        'size': size
                    })
                    self.frame_count += 1
                    self.total_frames += 1

                # Check duration limit
                if self.current_recording['duration_limit']:
                    elapsed = time.time() - start_time
                    if elapsed >= self.current_recording['duration_limit']:
                        self.recording = False
                        break

                # Maintain frame rate
                elapsed = time.time() - frame_start
                if elapsed < frame_interval:
                    time.sleep(frame_interval - elapsed)

            except Exception as e:
                print(f"Recording error: {e}")
                time.sleep(0.1)

        # Save recording when done
        self._save_recording()

    def stop_recording(self):
        """Stop current recording"""
        if not self.recording:
            return None

        self.recording = False
        if self.record_thread:
            self.record_thread.join(timeout=5)

        return self.current_recording

    def _save_recording(self):
        """Save recorded frames"""
        if not self.current_recording or not self.current_recording['frames']:
            return

        try:
            filename = self.current_recording['filename']
            output_path = os.path.join(self.output_dir, filename)

            # Save as individual frames (simple approach)
            frames_dir = f"{output_path}_frames"
            os.makedirs(frames_dir, exist_ok=True)

            for i, frame in enumerate(self.current_recording['frames']):
                frame_path = os.path.join(frames_dir, f"frame_{i:05d}.jpg")
                with open(frame_path, 'wb') as f:
                    f.write(frame['data'])

            # Save metadata
            metadata = {
                'filename': filename,
                'start_time': self.current_recording['start_time'].isoformat(),
                'end_time': datetime.now().isoformat(),
                'frame_count': len(self.current_recording['frames']),
                'fps': self.fps
            }

            import json
            with open(f"{output_path}_metadata.json", 'w') as f:
                json.dump(metadata, f, indent=2)

            self.total_recordings += 1
            print(f"Recording saved: {frames_dir} ({len(self.current_recording['frames'])} frames)")

        except Exception as e:
            print(f"Error saving recording: {e}")

        finally:
            self.current_recording = None
            self.frame_count = 0

    def start_streaming(self, callback, fps=1, quality=30):
        """
        Start streaming screen to callback

        Args:
            callback: Function to call with each frame (base64 image)
            fps: Stream frame rate
            quality: JPEG quality for streaming (lower for bandwidth)
        """
        if self.streaming:
            return False

        self.stream_callback = callback
        self.stream_fps = max(0.5, min(5, fps))
        self.stream_quality = max(10, min(50, quality))

        self.streaming = True
        self.stream_thread = threading.Thread(target=self._stream_loop, daemon=True)
        self.stream_thread.start()

        print(f"Streaming started (fps={self.stream_fps}, quality={self.stream_quality})")
        return True

    def _stream_loop(self):
        """Streaming loop"""
        frame_interval = 1.0 / self.stream_fps

        while self.streaming:
            try:
                frame_start = time.time()

                # Capture and encode frame
                image_b64, size = self.capture_screen_base64(self.stream_quality)
                if image_b64 and self.stream_callback:
                    self.stream_callback({
                        'timestamp': datetime.now().isoformat(),
                        'image': image_b64,
                        'size': size
                    })

                # Maintain frame rate
                elapsed = time.time() - frame_start
                if elapsed < frame_interval:
                    time.sleep(frame_interval - elapsed)

            except Exception as e:
                print(f"Streaming error: {e}")
                time.sleep(0.5)

    def stop_streaming(self):
        """Stop streaming"""
        self.streaming = False
        if self.stream_thread:
            self.stream_thread.join(timeout=2)
        self.stream_callback = None
        print("Streaming stopped")

    def get_status(self):
        """Get recorder status"""
        return {
            'recording': self.recording,
            'streaming': self.streaming,
            'current_frame_count': self.frame_count,
            'total_frames': self.total_frames,
            'total_recordings': self.total_recordings,
            'fps': self.fps,
            'quality': self.quality
        }


if __name__ == "__main__":
    recorder = ScreenRecorder(fps=2, quality=60)

    # Test single capture
    print("Testing single capture...")
    b64, size = recorder.capture_screen_base64()
    if b64:
        print(f"Captured: {size}, base64 length: {len(b64)}")

    # Test recording
    print("\nTesting 5-second recording...")
    recorder.start_recording(duration_seconds=5)

    while recorder.recording:
        status = recorder.get_status()
        print(f"\rFrames: {status['current_frame_count']}", end='', flush=True)
        time.sleep(0.5)

    print(f"\nRecording complete!")

    # Test streaming
    print("\nTesting streaming for 5 seconds...")

    def on_frame(frame):
        print(f"\rStream frame: {frame['size']}, size: {len(frame['image'])//1024}KB", end='', flush=True)

    recorder.start_streaming(on_frame, fps=1, quality=30)
    time.sleep(5)
    recorder.stop_streaming()

    print("\nDone!")
