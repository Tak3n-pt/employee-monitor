"""
Screenshot Capture Module
"""

import os
import io
import tempfile
from datetime import datetime

from PIL import ImageGrab


class ScreenshotCapture:
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp(prefix='empmon_')

    def capture(self, quality=85):
        """
        Capture a screenshot of all screens
        Returns: tuple (image_bytes, filename)
        """
        try:
            # Capture the screen
            screenshot = ImageGrab.grab(all_screens=True)

            # Convert to JPEG for smaller file size
            buffer = io.BytesIO()
            screenshot.save(buffer, format='PNG', optimize=True)
            buffer.seek(0)

            # Generate filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"screenshot_{timestamp}.png"

            return buffer.getvalue(), filename
        except Exception as e:
            print(f"Screenshot capture error: {e}")
            return None, None

    def capture_to_file(self, output_path=None):
        """
        Capture screenshot and save to file
        Returns: filepath or None
        """
        try:
            image_bytes, filename = self.capture()
            if not image_bytes:
                return None

            if not output_path:
                output_path = os.path.join(self.temp_dir, filename)

            with open(output_path, 'wb') as f:
                f.write(image_bytes)

            return output_path
        except Exception as e:
            print(f"Screenshot save error: {e}")
            return None

    def cleanup(self):
        """Clean up temporary files"""
        try:
            import shutil
            if os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)
        except Exception as e:
            print(f"Cleanup error: {e}")


if __name__ == "__main__":
    # Test screenshot capture
    capture = ScreenshotCapture()

    print("Capturing screenshot...")
    image_bytes, filename = capture.capture()

    if image_bytes:
        print(f"Captured: {filename} ({len(image_bytes)} bytes)")

        # Save to test file
        filepath = capture.capture_to_file()
        print(f"Saved to: {filepath}")
    else:
        print("Screenshot capture failed")

    capture.cleanup()
