from datetime import datetime


ALLOWED_STATUSES = {
    "New",
    "Contacted",
    "Consultation Scheduled",
    "Converted",
    "Not Interested",
    "Spam",
}


def _text(value, maximum=200):
    if value is None:
        return ""
    return " ".join(str(value).split())[:maximum]


def _submitted_at(value):
    raw = _text(value, 40)
    if not raw:
        return ""
    try:
        datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return raw
    except ValueError:
        return ""


def _name_parts(item):
    first_name = _text(item.get("firstName"), 80)
    last_name = _text(item.get("lastName"), 80)
    full_name = _text(
        item.get("name")
        or item.get("parentName")
        or item.get("athleteName"),
        120,
    )
    if not first_name and full_name:
        parts = full_name.split(" ", 1)
        first_name = parts[0]
        last_name = last_name or (parts[1] if len(parts) > 1 else "")
    return first_name, last_name


def normalize_lead(item):
    """Return only fields approved for the Phase 2 dashboard response."""
    if not isinstance(item, dict):
        return None
    lead_id = _text(item.get("leadId"), 80)
    email = _text(item.get("email") or item.get("parentEmail"), 254)
    if not lead_id or not email or "@" not in email:
        return None
    first_name, last_name = _name_parts(item)
    status = _text(item.get("status"), 40) or "New"
    if status not in ALLOWED_STATUSES:
        status = "New"
    return {
        "leadId": lead_id,
        "firstName": first_name,
        "lastName": last_name,
        "email": email,
        "phone": _text(item.get("phone") or item.get("parentPhone"), 30),
        "leadType": _text(item.get("leadType") or "general-inquiry", 80),
        "submissionType": _text(item.get("submissionType") or "lead", 80),
        "submittedAt": _submitted_at(item.get("submittedAt") or item.get("createdAt")),
        "status": status,
        "followUpStatus": _text(item.get("followUpStatus"), 80) or "Not started",
    }
