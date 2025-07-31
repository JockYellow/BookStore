from typing import Dict, List, Optional


def validate_required_fields(data: Dict, required: List[str]) -> Optional[str]:
    """Return error message if any required field is missing or empty."""
    missing = [field for field in required if not data.get(field)]
    if missing:
        return "缺少必要欄位: " + ", ".join(missing)
    return None
