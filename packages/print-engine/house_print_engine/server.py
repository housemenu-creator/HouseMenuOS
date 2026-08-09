"""HTTP server for the House Print Engine.

Exposes a REST API on localhost for the React frontend to send print jobs.

Endpoints:
    GET  /health       → { status, printer }
    GET  /status       → { connected, queue, ... }
    POST /print/test   → Print test ticket
    POST /print/order  → Print kitchen order ticket
    POST /print/receipt → Print customer receipt
    POST /print/drawer → Open cash drawer

Runs without external dependencies (stdlib only + pywin32).
"""

import json
import logging
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Any

from .printer import ThermalPrinter, PrinterError, PrinterNotFoundError
from .ticket import (
    build_test_ticket,
    build_order_ticket,
    build_receipt_ticket,
    build_dispatch_label,
    build_drawer_test,
)

logger = logging.getLogger("print-engine")

# ── Config ─────────────────────────────────────────────────────────────────

DEFAULT_PORT = 42784
CONFIG = {
    "port": int(os.environ.get("PRINT_ENGINE_PORT", DEFAULT_PORT)),
    "host": os.environ.get("PRINT_ENGINE_HOST", "127.0.0.1"),
}

# ── JSON helpers ──────────────────────────────────────────────────────────


def json_response(data: dict, status: int = 200) -> tuple[str, int, dict]:
    body = json.dumps(data, ensure_ascii=False)
    return body, status, {"Content-Type": "application/json; charset=utf-8"}


def error_response(msg: str, status: int = 500) -> tuple[str, int, dict]:
    return json_response({"success": False, "error": msg}, status)


# ── Print helpers ─────────────────────────────────────────────────────────


def _do_print(build_fn, *args) -> dict:
    """Execute a print job: open printer, send data, return result."""
    try:
        with ThermalPrinter() as printer:
            data = build_fn(*args) if args else build_fn()
            written = printer.write(data)
            return {
                "success": True,
                "bytes_written": written,
                "printer": printer.get_status(),
            }
    except PrinterNotFoundError as e:
        return error_response(str(e), 503)
    except PrinterError as e:
        return error_response(str(e), 500)


def _safe_get_json(body: bytes) -> dict | None:
    """Parse JSON body safely."""
    try:
        return json.loads(body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


# ── Request handler ───────────────────────────────────────────────────────


class PrintHandler(BaseHTTPRequestHandler):
    """HTTP request handler for the print engine API."""

    # Suppress default logging (we use our own)
    def log_message(self, format, *args):
        logger.info("  ← %s %s", self.client_address[0], format % args)

    # ── Routing ─────────────────────────────────────────────────────────

    def _route(self):
        path = self.path.rstrip("/")
        method = self.command

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length) if content_length > 0 else b"{}"
        except Exception:
            body = b"{}"

        # GET /health
        if method == "GET" and path == "/health":
            return self._handle_health()

        # GET /status
        if method == "GET" and path == "/status":
            return self._handle_status()

        # POST /print/test
        if method == "POST" and path == "/print/test":
            return self._handle_print_test()

        # POST /print/order
        if method == "POST" and path == "/print/order":
            return self._handle_print_order(body)

        # POST /print/receipt
        if method == "POST" and path == "/print/receipt":
            return self._handle_print_receipt(body)

        # POST /print/dispatch-label
        if method == "POST" and path == "/print/dispatch-label":
            return self._handle_print_dispatch_label(body)

        # POST /print/drawer
        if method == "POST" and path == "/print/drawer":
            return self._handle_print_drawer()

        # 404
        return self._send_json(
            {"success": False, "error": f"Not found: {method} {path}"}, 404
        )

    # ── Handlers ────────────────────────────────────────────────────────

    def _handle_health(self):
        """Quick health check — no printer open required."""
        try:
            with ThermalPrinter() as p:
                connected = p.connected
        except (PrinterError, Exception):
            connected = False
        return self._send_json({
            "status": "ok" if connected else "printer_unavailable",
            "service": "house-print-engine",
            "version": "1.0.0",
            "printer_connected": connected,
        })

    def _handle_status(self):
        """Detailed printer status."""
        try:
            with ThermalPrinter() as p:
                status = p.get_status()
            return self._send_json({
                "success": True,
                "status": "connected",
                "printer": status,
            })
        except PrinterNotFoundError:
            return self._send_json({
                "success": False,
                "status": "disconnected",
                "error": "Impresora no detectada",
            }, 503)
        except PrinterError as e:
            return self._send_json({
                "success": False,
                "status": "error",
                "error": str(e),
            }, 500)

    def _handle_print_test(self):
        """Print a test ticket."""
        result = _do_print(build_test_ticket)
        return self._send_json(result,
                               200 if result.get("success") else
                               503 if result.get("bytes_written") is None else 500)

    def _handle_print_order(self, body: bytes):
        """Print a kitchen order ticket."""
        data = _safe_get_json(body)
        if not data or "order" not in data:
            return self._send_json(
                {"success": False, "error": "Se requiere body JSON con campo 'order'"},
                400,
            )
        order = data["order"]
        branch = data.get("branch_name", "")
        result = _do_print(build_order_ticket, order, branch)
        return self._send_json(result,
                               200 if result.get("success") else 503)

    def _handle_print_receipt(self, body: bytes):
        """Print a customer receipt."""
        data = _safe_get_json(body)
        if not data or "order" not in data:
            return self._send_json(
                {"success": False, "error": "Se requiere body JSON con campo 'order'"},
                400,
            )
        order = data["order"]
        branch = data.get("branch_name", "")
        result = _do_print(build_receipt_ticket, order, branch)
        return self._send_json(result,
                               200 if result.get("success") else 503)

    def _handle_print_dispatch_label(self, body: bytes):
        """Print a dispatch/rotulo label."""
        data = _safe_get_json(body)
        if not data or "order" not in data:
            return self._send_json(
                {"success": False, "error": "Se requiere body JSON con campo 'order'"},
                400,
            )
        order = data["order"]
        branch = data.get("branch_name", "")
        result = _do_print(build_dispatch_label, order, branch)
        return self._send_json(result,
                               200 if result.get("success") else 503)

    def _handle_print_drawer(self):
        """Open cash drawer."""
        result = _do_print(build_drawer_test)
        return self._send_json(result,
                               200 if result.get("success") else 503)

    # ── Response ────────────────────────────────────────────────────────

    def _send_json(self, data: dict, status: int = 200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self._route()

    def do_POST(self):
        self._route()

    def do_OPTIONS(self):
        """CORS preflight."""
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


# ── Server ─────────────────────────────────────────────────────────────────


def create_server(host: str = None, port: int = None) -> HTTPServer:
    """Create and configure the HTTP server.

    Args:
        host: Bind address (default: 127.0.0.1)
        port: Port number (default: 42784)

    Returns:
        Configured HTTPServer instance.
    """
    host = host or CONFIG["host"]
    port = port or CONFIG["port"]
    server = HTTPServer((host, port), PrintHandler)
    server.timeout = 30
    return server


def run_server(host: str = None, port: int = None):
    """Start the print engine HTTP server (blocking).

    Args:
        host: Bind address
        port: Port number
    """
    host = host or CONFIG["host"]
    port = port or CONFIG["port"]

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )

    # Test printer on startup
    try:
        with ThermalPrinter() as p:
            pipe = p.get_status().get("out_pipe", 0)
            logger.info("Impresora detectada: pipe OUT %s", pipe)
    except PrinterNotFoundError:
        logger.warning("Impresora NO detectada. Servidor iniciado, esperando conexión...")
    except PrinterError as e:
        logger.warning("Error al detectar impresora: %s", e)

    server = create_server(host, port)
    logger.info("Servidor iniciado en http://%s:%d", host, port)
    logger.info("Endpoints:")
    logger.info("  GET  /health      - Health check")
    logger.info("  GET  /status      - Printer status")
    logger.info("  POST /print/test  - Test ticket")
    logger.info("  POST /print/order - Order ticket")
    logger.info("  POST /print/receipt - Receipt")
    logger.info("  POST /print/dispatch-label - Dispatch label")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Servidor detenido.")
        server.server_close()


if __name__ == "__main__":
    run_server()
