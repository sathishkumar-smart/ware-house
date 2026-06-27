"""Barcode generation using python-barcode (CODE128 → SVG string)."""
import io

try:
    import barcode
    from barcode.writer import SVGWriter
    _BARCODE_AVAILABLE = True
except ImportError:
    _BARCODE_AVAILABLE = False


def generate_barcode_svg(code: str) -> str:
    """Return an SVG string for the given barcode value, or empty string if library not installed."""
    if not _BARCODE_AVAILABLE:
        return ""
    try:
        cls = barcode.get_barcode_class("code128")
        buf = io.BytesIO()
        instance = cls(code, writer=SVGWriter())
        instance.write(buf, options={"write_text": True, "quiet_zone": 2.0, "font_size": 8})
        return buf.getvalue().decode("utf-8")
    except Exception:
        return ""
