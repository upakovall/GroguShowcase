"""Grogu Multi-App Showcase Runner.

Launches both independent host web applications concurrently:
1. Nexus Cloud Studio       -> http://127.0.0.1:8000
2. Quantum Trade Terminal   -> http://127.0.0.1:8050

Both applications use the standalone `grogu-copilot` Python package.
"""

import sys
import subprocess
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

def run():
    print("=" * 70)
    print(" 🚀 Starting Grogu Voice AI Copilot Multi-Application Showcase")
    print("=" * 70)
    print(" • App 1: Nexus Cloud Studio     -> http://127.0.0.1:8000")
    print(" • App 2: Quantum Trade Terminal -> http://127.0.0.1:8050")
    print(" • Core Engine: grogu-copilot (Installed as standalone package)")
    print("=" * 70)

    nexus_script = BASE_DIR / "apps" / "nexus_cloud" / "main.py"
    quantum_script = BASE_DIR / "apps" / "quantum_trading" / "main.py"

    p1 = subprocess.Popen([sys.executable, str(nexus_script)], cwd=str(nexus_script.parent))
    p2 = subprocess.Popen([sys.executable, str(quantum_script)], cwd=str(quantum_script.parent))

    print("\n[INFO] Both servers are running. Press CTRL+C to terminate both.\n")

    try:
        while True:
            time.sleep(1)
            if p1.poll() is not None or p2.poll() is not None:
                break
    except KeyboardInterrupt:
        print("\n[INFO] Stopping all showcase applications...")
    finally:
        p1.terminate()
        p2.terminate()
        print("[INFO] All applications stopped.")

if __name__ == "__main__":
    run()
