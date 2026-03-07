#!/usr/bin/env python3
"""
Two-phase startup for Render deployment:
1. Bind port instantly with a minimal Python HTTP server (health check passes)
2. Start R/plumber in background; once it's ready, proxy switches over

This beats Render's ~30s port-binding deadline even when R takes 60-90s to load.
"""
import os
import subprocess
import threading
import socket
import time
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = int(os.environ.get("PORT", "8000"))
R_PORT = PORT + 1  # R plumber runs on adjacent port during init

ready = threading.Event()
r_started = False


class ProxyHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # suppress access logs during startup

    def do_GET(self):
        if not ready.is_set():
            self._respond(200, b'{"status":"starting"}')
        else:
            self._proxy()

    def do_POST(self):
        if not ready.is_set():
            self._respond(503, b'{"status":"starting","message":"Server initializing"}')
        else:
            self._proxy()

    def do_OPTIONS(self):
        self._respond(204, b'')

    def _respond(self, code, body):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _proxy(self):
        """Forward request to R plumber on R_PORT."""
        import http.client
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length else None
        try:
            conn = http.client.HTTPConnection("127.0.0.1", R_PORT, timeout=300)
            conn.request(self.command, self.path, body, dict(self.headers))
            resp = conn.getresponse()
            resp_body = resp.read()
            self.send_response(resp.status)
            for k, v in resp.getheaders():
                if k.lower() not in ("transfer-encoding",):
                    self.send_header(k, v)
            self.end_headers()
            self.wfile.write(resp_body)
        except Exception as e:
            self._respond(502, f'{{"error":"{e}"}}'.encode())


def start_r():
    """Load R plumber on R_PORT, then signal ready."""
    global r_started
    env = os.environ.copy()
    env["PORT"] = str(R_PORT)
    print(f"Starting R plumber on port {R_PORT}...")
    proc = subprocess.Popen(
        ["Rscript", "-e",
         f"port <- {R_PORT}; pr <- plumber::plumb('plumber.R'); pr$run(host='0.0.0.0', port=port)"],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    # Wait until R plumber is accepting connections
    for _ in range(300):  # up to 5 minutes
        time.sleep(1)
        try:
            s = socket.create_connection(("127.0.0.1", R_PORT), timeout=1)
            s.close()
            print("R plumber is ready! Switching proxy...")
            ready.set()
            break
        except (ConnectionRefusedError, OSError):
            pass
    # Forward R logs
    for line in proc.stdout:
        print("[R]", line.decode().rstrip())
    proc.wait()


# Start R in background thread
t = threading.Thread(target=start_r, daemon=True)
t.start()

# Bind port immediately — Render health check will pass
print(f"Python proxy binding port {PORT} immediately...")
server = HTTPServer(("0.0.0.0", PORT), ProxyHandler)
print(f"Listening on port {PORT}. Waiting for R to load...")
server.serve_forever()
