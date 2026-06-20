import sys
from pathlib import Path
_root = str(Path(__file__).resolve().parent.parent)
if _root not in sys.path:
    sys.path.insert(0, _root)

from governance import kill_switch, AuditTrail  # noqa: F401


def check_budget():
    trail = AuditTrail()
    return trail.get_stats()
