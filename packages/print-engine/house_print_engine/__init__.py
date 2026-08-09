"""House Print Engine — Thermal printer service for House-Portal-OS.

Communicates with SPRT SP-POS891UED (ESC/POS) via WinUSB.
Exposes a local HTTP API for the React frontend.

Usage:
    python -m house_print_engine           # Start HTTP server
    python -m house_print_engine print      # Quick test ticket
    python -m house_print_engine status     # Check printer status
"""

__version__ = "1.0.0"
