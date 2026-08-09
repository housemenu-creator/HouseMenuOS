#!/usr/bin/env python3
"""CLI entry point for house-print-engine.

Usage:
    python -m house_print_engine           Start HTTP server
    python -m house_print_engine test       Quick test ticket
    python -m house_print_engine status     Check printer status
    python -m house_print_engine drawer     Open cash drawer
    python -m house_print_engine server     Start HTTP server (default)
"""

import sys
import logging
import json

from .printer import ThermalPrinter, PrinterError, PrinterNotFoundError
from .ticket import (
    build_test_ticket,
    build_order_ticket,
    build_receipt_ticket,
    build_drawer_test,
)
from .server import run_server


def cmd_test():
    """Print a test ticket."""
    try:
        data = build_test_ticket()
        with ThermalPrinter() as p:
            written = p.write(data)
        print(f"Test ticket enviado: {written} bytes")
        return 0
    except PrinterNotFoundError as e:
        print(f"Error: {e}")
        return 1
    except PrinterError as e:
        print(f"Error: {e}")
        return 1


def cmd_status():
    """Check printer status."""
    try:
        with ThermalPrinter() as p:
            status = p.get_status()
        print(json.dumps(status, indent=2))
        return 0
    except PrinterNotFoundError:
        print('{"connected": false, "error": "Impresora no detectada"}')
        return 1
    except PrinterError as e:
        print(f'{{"connected": false, "error": "{e}"}}')
        return 1


def cmd_drawer():
    """Open cash drawer."""
    try:
        data = build_drawer_test()
        with ThermalPrinter() as p:
            written = p.write(data)
        print(f"Cajon abierto: {written} bytes")
        return 0
    except PrinterError as e:
        print(f"Error: {e}")
        return 1


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )

    cmd = sys.argv[1] if len(sys.argv) > 1 else "server"

    commands = {
        "server": lambda: run_server(),
        "test": cmd_test,
        "status": cmd_status,
        "drawer": cmd_drawer,
    }

    fn = commands.get(cmd)
    if fn is None:
        print(f"Comando desconocido: {cmd}")
        print("Usos: python -m house_print_engine [server|test|status|drawer]")
        return 1

    return fn()


if __name__ == "__main__":
    sys.exit(main())
