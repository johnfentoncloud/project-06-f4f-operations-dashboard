import json
import os


OWNER_GROUP = os.environ.get("OWNER_GROUP", "OwnerAdmin")


def _groups(value):
    if isinstance(value, list):
        return {str(item) for item in value}
    if not value:
        return set()
    text = str(value).strip()
    try:
        decoded = json.loads(text)
        if isinstance(decoded, list):
            return {str(item) for item in decoded}
    except json.JSONDecodeError:
        pass
    return {part.strip(" []\"'") for part in text.split(",") if part.strip(" []\"'")}


def is_owner_admin(event):
    claims = (
        ((event or {}).get("requestContext") or {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
    )
    return OWNER_GROUP in _groups(claims.get("cognito:groups"))
