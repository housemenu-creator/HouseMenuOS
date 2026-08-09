"""ESC/POS ticket builders for SPRT SP-POS891UED.

Builds raw binary buffers for different ticket types:
- Order ticket (comanda para cocina)
- Receipt (boleta para el cliente)
- Test ticket
"""

import time

# ── ESC/POS control bytes ─────────────────────────────────────────────────
ESC = b"\x1b"
GS = b"\x1d"
LF = b"\x0a"

# ── Helpers ───────────────────────────────────────────────────────────────


def _txt(text: str) -> bytes:
    """Encode text as Latin-1 (best support for Spanish chars)."""
    return text.encode("latin-1", errors="replace")


def _center() -> bytes:
    return ESC + b"\x61\x01"


def _left() -> bytes:
    return ESC + b"\x61\x00"


def _bold_on() -> bytes:
    return ESC + b"\x45\x01"


def _bold_off() -> bytes:
    return ESC + b"\x45\x00"


def _font_b() -> bytes:
    """Condensed font (font B)."""
    return ESC + b"\x4d\x01"


def _font_a() -> bytes:
    """Normal font (font A)."""
    return ESC + b"\x4d\x00"


def _underline_on() -> bytes:
    return ESC + b"\x2d\x01"


def _underline_off() -> bytes:
    return ESC + b"\x2d\x00"


def _init() -> bytes:
    """Initialize printer."""
    return ESC + b"@"


def _cut() -> bytes:
    """Full cut."""
    return GS + b"V\x00"


def _partial_cut() -> bytes:
    return GS + b"V\x01"


def _beep() -> bytes:
    """Buzzer (if supported)."""
    return ESC + b"\x42\x03\x03"


def _open_drawer() -> bytes:
    """Open cash drawer (pin 2, usually works on SP-POS891UED)."""
    return ESC + b"\x70\x00\x19\xfa"


def _separator(char: str = "-", width: int = 32) -> bytes:
    return _txt(char * width) + LF


def _double_height() -> bytes:
    return ESC + b"\x21\x10"


def _double_width() -> bytes:
    return ESC + b"\x21\x20"


def _double_wh() -> bytes:
    return ESC + b"\x21\x30"


def _normal_size() -> bytes:
    return ESC + b"\x21\x00"


def _invert_on() -> bytes:
    """White-on-black reverse print."""
    return GS + b"\x42\x01"


def _invert_off() -> bytes:
    return GS + b"\x42\x00"


# ── Ticket builders ───────────────────────────────────────────────────────


def build_test_ticket() -> bytes:
    """Simple test ticket to verify printer connectivity."""
    buf = bytearray()
    buf += _init()
    buf += _center()
    buf += _double_wh()
    buf += _txt("HOUSE PORTAL OS\n")
    buf += _normal_size()
    buf += _bold_on()
    buf += _txt("SP-POS891UED TEST\n")
    buf += _bold_off()
    buf += _font_b()
    buf += _txt("Print Engine v1.0.0\n")
    buf += _font_a()
    buf += _separator("=")
    buf += _left()
    buf += _txt(f"Fecha: {time.strftime('%d/%m/%Y %H:%M:%S')}\n")
    buf += _txt("Estado: OK\n")
    buf += _separator("=")
    buf += _center()
    buf += _txt("Gracias por usar House Portal!\n")
    buf += LF * 3
    buf += _cut()
    return bytes(buf)


def build_order_ticket(order: dict, branch_name: str = "") -> bytes:
    """Build kitchen ticket (comanda).

    Args:
        order: Order dict with keys: items, shortCode, customerName,
               table, notes, priority, etc.
        branch_name: Branch display name.
    """
    items = order.get("items", [])
    code = order.get("shortCode") or order.get("displayId", "")
    customer = order.get("customerName", "").strip() or "Cliente"
    table = order.get("table", order.get("location", ""))
    notes = order.get("notes", "")
    priority = order.get("priority", "")
    now = time.strftime("%d/%m %H:%M")

    buf = bytearray()
    buf += _init()

    # ── Header ──
    buf += _center()
    buf += _double_height()
    buf += _double_width()
    buf += _txt("COMANDA\n")
    buf += _normal_size()
    if code:
        buf += _bold_on()
        buf += _txt(f"#{code}\n")
        buf += _bold_off()
    buf += _separator()

    # ── Info line ──
    buf += _left()
    buf += _bold_on()
    if table:
        buf += _txt(f"Mesa: {table}  ")
    buf += _txt(f"{now}\n")
    buf += _bold_off()
    buf += _txt(f"Cliente: {customer}\n")
    if branch_name:
        buf += _font_b()
        buf += _txt(f"{branch_name}\n")
        buf += _font_a()

    # ── Priority badge ──
    if priority == "rush":
        buf += _center()
        buf += _double_wh()
        buf += _txt("*** RUSH ***\n")
        buf += _normal_size()
        buf += _separator()

    buf += _separator("-")

    # ── Items ──
    buf += _left()
    for item in items:
        qty = item.get("quantity", 1)
        name = item.get("name", "Item")
        buf += _bold_on()
        buf += _txt(f"{qty}x {name}\n")
        buf += _bold_off()

        details = item.get("details", [])
        if isinstance(details, list):
            for d in details:
                if d:
                    buf += _font_b()
                    buf += _txt(f"   - {d}\n")
                    buf += _font_a()
        elif isinstance(details, str) and details:
            buf += _font_b()
            buf += _txt(f"   - {details}\n")
            buf += _font_a()

    buf += _separator("-")

    # ── Notes ──
    if notes:
        buf += _underline_on()
        buf += _txt("Notas:\n")
        buf += _underline_off()
        buf += _font_b()
        buf += _txt(f"{notes}\n")
        buf += _font_a()
        buf += _separator("-")

    # ── Footer ──
    buf += _center()
    buf += _font_b()
    buf += _txt(f"Impreso: {time.strftime('%d/%m/%Y %H:%M:%S')}\n")
    buf += _font_a()
    buf += _separator("=")
    buf += _txt("Gracias!\n")
    buf += LF * 2

    # Beep and cut
    buf += _beep()
    buf += _cut()

    return bytes(buf)


def build_receipt_ticket(order: dict, branch_name: str = "") -> bytes:
    """Build customer receipt (boleta).

    Args:
        order: Order dict with items, financials, shortCode, etc.
        branch_name: Branch display name.
    """
    items = order.get("items", [])
    code = order.get("shortCode") or order.get("displayId", "")
    customer = order.get("customerName", "").strip()
    financials = order.get("financials", {})
    total = financials.get("total") or order.get("total", 0)
    now = time.strftime("%d/%m/%Y %H:%M:%S")

    buf = bytearray()
    buf += _init()

    # ── Header ──
    buf += _center()
    buf += _double_width()
    buf += _bold_on()
    buf += _txt("HOUSE PORTAL\n")
    buf += _bold_off()
    buf += _normal_size()
    if branch_name:
        buf += _font_b()
        buf += _txt(f"{branch_name}\n")
        buf += _font_a()
    buf += _txt(f"RUC: 20612345678\n")
    buf += _separator("=")

    # ── Order info ──
    buf += _left()
    buf += _bold_on()
    buf += _txt(f"# {code}\n")
    buf += _bold_off()
    buf += _font_b()
    buf += _txt(f"{now}\n")
    buf += _font_a()
    if customer:
        buf += _txt(f"Cliente: {customer}\n")
    buf += _separator("-")

    # ── Items ──
    for item in items:
        qty = item.get("quantity", 1)
        name = item.get("name", "Item")
        price = item.get("price", 0)
        buf += _txt(f"{qty}x {name:<15s} S/ {price:>6.2f}\n")
        details = item.get("details", [])
        if isinstance(details, list):
            for d in details:
                if d:
                    buf += _font_b()
                    buf += _txt(f"    {d}\n")
                    buf += _font_a()

    buf += _separator("-")

    # ── Totals ──
    buf += _bold_on()
    buf += _txt(f"TOTAL {'.' * 18} S/ {total:>6.2f}\n")
    buf += _bold_off()

    payment = order.get("payment_method", "")
    if payment:
        buf += _font_b()
        buf += _txt(f"Pago: {payment}\n")
        buf += _font_a()

    # ── Footer ──
    buf += _separator("=")
    buf += _center()
    buf += _txt("Gracias por su visita!\n")
    buf += _font_b()
    buf += _txt(f"{now}\n")
    buf += _font_a()
    buf += LF * 2
    buf += _cut()

    return bytes(buf)


def build_dispatch_label(order: dict, branch_name: str = "") -> bytes:
    """Build dispatch label for packaging/rotuling.

    Compact label with: order type, customer, phone, address, items, notes.
    Designed to be torn and attached to the package.

    Args:
        order: Order dict with customerName, customerPhone, location, items, etc.
        branch_name: Branch display name.
    """
    items = order.get("items", [])
    code = order.get("shortCode") or order.get("displayId", "")
    oid = order.get("id", "")
    customer = order.get("customerName", "").strip()
    phone = order.get("customerPhone", "") or order.get("phone", "")
    address = order.get("location", "").strip()
    order_type = (order.get("type") or order.get("order_type", "")).lower()
    notes = order.get("observaciones", "").strip()
    table = order.get("tableNumber", "")
    driver = order.get("driverName", "").strip()
    payment = order.get("payment_method", "")
    total = (order.get("financials", {}) or {}).get("total") or order.get("total", 0)
    now = time.strftime("%d/%m/%Y %H:%M")

    buf = bytearray()
    buf += _init()

    # ── Header ──
    buf += _center()
    buf += _double_width()
    buf += _bold_on()
    buf += _txt("RÓTULO\n")
    buf += _bold_off()
    buf += _normal_size()
    if branch_name:
        buf += _font_b()
        buf += _txt(f"{branch_name}\n")
        buf += _font_a()
    buf += _separator("=")

    # ── Type badge ──
    buf += _center()
    if "delivery" in order_type:
        buf += _invert_on()
        buf += _txt(" DELIVERY ")
        buf += _invert_off()
    else:
        buf += _invert_on()
        if table:
            buf += _txt(f" MESA {table} ")
        else:
            buf += _txt(" LOCAL ")
        buf += _invert_off()
    buf += b"\n"
    buf += _separator("-")

    # ── Customer info ──
    buf += _left()
    buf += _bold_on()
    buf += _txt(f"{customer}\n")
    buf += _bold_off()
    if phone:
        buf += _font_b()
        buf += _txt(f"T: {phone}\n")
        buf += _font_a()
    if address:
        buf += _font_b()
        buf += _txt(f"Dir: {address}\n")
        buf += _font_a()
    if payment:
        buf += _bold_on()
        buf += _txt(f"Pago: {payment}\n")
        buf += _bold_off()
    buf += _separator("-")

    # ── Items ──
    buf += _font_b()
    buf += _txt(f"{'Item':<15s} {'Cant':>5s}\n")
    buf += _font_a()
    for item in items:
        qty = item.get("quantity", 1)
        name = item.get("name", "Item")
        buf += _txt(f"{name:<15s} x{qty:>2d}\n")
        details = item.get("details", [])
        if isinstance(details, list):
            for d in details:
                if d:
                    buf += _font_b()
                    buf += _txt(f"  - {d}\n")
                    buf += _font_a()
    buf += _separator("-")

    # ── Notes ──
    if notes:
        buf += _invert_on()
        buf += _txt(" NOTA: ")
        buf += _invert_off()
        buf += _font_b()
        buf += _txt(f" {notes}\n")
        buf += _font_a()
        buf += _separator("-")

    # ── Footer ──
    buf += _font_b()
    buf += _txt(f"Total: S/ {total:>6.2f}\n")
    if driver:
        buf += _txt(f"Repartidor: {driver}\n")
    buf += _font_a()
    buf += _left()
    buf += _font_b()
    badge = oid[-4:].upper() if oid else code
    buf += _txt(f"#{badge}  {now}\n")
    buf += _font_a()
    buf += _separator("=")
    buf += LF * 2
    buf += _cut()

    return bytes(buf)


def build_drawer_test() -> bytes:
    """Open cash drawer."""
    buf = bytearray()
    buf += _init()
    buf += _open_drawer()
    return bytes(buf)
