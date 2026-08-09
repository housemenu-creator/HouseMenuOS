"""WinUSB low-level communication with SPRT SP-POS891UED.

This module handles raw USB I/O via WinUSB API (built into Windows).
No libusb or extra drivers needed beyond WinUSB.
"""

import ctypes
import ctypes.wintypes
import time

# ── Device identity ──────────────────────────────────────────────────────
PRINTER_VID = 0x0483
PRINTER_PID = 0x5720

# USB device interface path (from registry SymbolicName)
# GUID {a5dcbf10-6530-11d2-901f-00c04fb951ed} = GUID_DEVINTERFACE_USB_DEVICE
DEFAULT_DEVICE_PATH = (
    r"\\?\USB#VID_0483&PID_5720#11101800002#"
    r"{a5dcbf10-6530-11d2-901f-00c04fb951ed}"
)

# ── WinUSB structs ────────────────────────────────────────────────────────


class WinUsbPipeInfo(ctypes.Structure):
    """WINUSB_PIPE_INFORMATION — packed, 8 bytes total on x64."""
    _pack_ = 1
    _fields_ = [
        ("PipeType", ctypes.c_uint32),      # USBD_PIPE_TYPE
        ("PipeId", ctypes.c_ubyte),          # UCHAR
        ("MaximumPacketSize", ctypes.c_ushort),  # USHORT
        ("Interval", ctypes.c_ubyte),        # UCHAR
    ]


# Pipe type constants
UsbdPipeTypeControl = 0
UsbdPipeTypeIsochronous = 1
UsbdPipeTypeBulk = 2
UsbdPipeTypeInterrupt = 3

# ── Exceptions ────────────────────────────────────────────────────────────


class PrinterError(Exception):
    """Base printer error."""


class PrinterNotFoundError(PrinterError):
    """Printer not detected."""


class PrinterBusyError(PrinterError):
    """Printer busy or offline."""


class PrinterWriteError(PrinterError):
    """Failed to write to printer."""


# ── Printer class ─────────────────────────────────────────────────────────


class ThermalPrinter:
    """Manages WinUSB connection to the SPRT thermal printer.

    Usage:
        with ThermalPrinter() as printer:
            printer.write(b"\\x1b@")
    """

    def __init__(self, device_path: str | None = None):
        self._device_path = device_path or DEFAULT_DEVICE_PATH
        self._dev_handle = None
        self._winusb_handle = None
        self._kernel32 = ctypes.windll.kernel32
        self._winusb = ctypes.windll.WinUSB
        self._out_pipe = None
        self._in_pipe = None
        self._max_packet = 16384

    # ── Context manager ─────────────────────────────────────────────────

    def __enter__(self):
        self.open()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    # ── Open / Close ────────────────────────────────────────────────────

    def open(self) -> None:
        """Open USB device and initialize WinUSB."""
        if self._dev_handle is not None:
            return

        # 1. CreateFile
        self._dev_handle = self._kernel32.CreateFileW(
            self._device_path,
            0xC0000000,          # GENERIC_READ | GENERIC_WRITE
            3,                    # FILE_SHARE_READ | FILE_SHARE_WRITE
            None,
            3,                    # OPEN_EXISTING
            0x40000000,           # FILE_FLAG_OVERLAPPED
            None,
        )
        if not self._dev_handle or self._dev_handle == -1:
            err = ctypes.GetLastError()
            self._dev_handle = None
            raise PrinterNotFoundError(
                f"No se pudo abrir la impresora (error {err}). "
                f"Verificá que esté conectada y con driver WinUSB."
            )

        # 2. WinUsb_Initialize
        wh = ctypes.c_void_p(0)
        ok = self._winusb.WinUsb_Initialize(
            self._dev_handle, ctypes.byref(wh)
        )
        if not ok:
            err = ctypes.GetLastError()
            self._kernel32.CloseHandle(self._dev_handle)
            self._dev_handle = None
            raise PrinterError(
                f"WinUsb_Initialize falló (error {err}). "
                f"¿El driver WinUSB está instalado?"
            )
        self._winusb_handle = wh

        # 3. Enumerate pipes to find Bulk endpoints
        for idx in range(10):
            pi = WinUsbPipeInfo()
            ret = self._winusb.WinUsb_QueryPipe(
                self._winusb_handle, 0, idx, ctypes.byref(pi)
            )
            if not ret:
                break
            if pi.PipeType == UsbdPipeTypeBulk:
                if (pi.PipeId >> 7) == 0:   # OUT (host → device)
                    self._out_pipe = pi.PipeId
                    self._max_packet = pi.MaximumPacketSize or 16384
                else:                        # IN (device → host)
                    self._in_pipe = pi.PipeId

        if self._out_pipe is None:
            self.close()
            raise PrinterError(
                "No se encontró pipe Bulk OUT en la impresora."
            )

    def close(self) -> None:
        """Release WinUSB handle and device handle."""
        if self._winusb_handle is not None:
            self._winusb.WinUsb_Free(self._winusb_handle)
            self._winusb_handle = None
        if self._dev_handle is not None:
            self._kernel32.CloseHandle(self._dev_handle)
            self._dev_handle = None
        self._out_pipe = None
        self._in_pipe = None

    @property
    def connected(self) -> bool:
        """Check if the printer is connected and initialized."""
        return (
            self._dev_handle is not None
            and self._winusb_handle is not None
            and self._out_pipe is not None
        )

    # ── Write ──────────────────────────────────────────────────────────

    def write(self, data: bytes) -> int:
        """Write raw bytes to the printer. Returns bytes sent.

        Args:
            data: Raw ESC/POS command bytes.

        Returns:
            Number of bytes written.

        Raises:
            PrinterError: If write fails or printer disconnected.
        """
        if not self.connected:
            raise PrinterError("Impresora no conectada. Llamá open() primero.")

        written = ctypes.c_ulong(0)
        ok = self._winusb.WinUsb_WritePipe(
            self._winusb_handle,
            self._out_pipe,
            data,
            len(data),
            ctypes.byref(written),
            None,
        )
        if not ok:
            err = ctypes.GetLastError()
            # Check if device was removed
            if err == 1167:  # ERROR_DEVICE_NOT_CONNECTED
                self.close()
                raise PrinterNotFoundError(
                    "Impresora desconectada durante escritura."
                )
            raise PrinterWriteError(
                f"Error de escritura (código {err}). "
                f"Verificá que la impresora esté encendida y con papel."
            )
        return written.value

    # ── Status ──────────────────────────────────────────────────────────

    def get_status(self) -> dict:
        """Get printer status (basic connectivity check).

        Returns a dict with keys: connected, out_pipe, in_pipe, max_packet.
        """
        return {
            "connected": self.connected,
            "out_pipe": f"0x{self._out_pipe:02x}" if self._out_pipe else None,
            "in_pipe": f"0x{self._in_pipe:02x}" if self._in_pipe else None,
            "max_packet": self._max_packet,
        }


# ── Standalone helper ─────────────────────────────────────────────────────


def detect_printer() -> bool:
    """Quick check if the printer can be opened."""
    try:
        with ThermalPrinter() as p:
            return p.connected
    except PrinterError:
        return False
