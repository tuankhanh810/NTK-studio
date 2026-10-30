import sys
import os

# Ensure backend root is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import uvicorn
from app.config import config
from app.main import app

def main():
    print(f"Starting NTK Studio Backend on {config.host}:{config.port}...")
    uvicorn.run(app, host=config.host, port=config.port, log_level="info")

if __name__ == "__main__":
    main()
