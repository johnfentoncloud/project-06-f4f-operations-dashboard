import json
import os

OWNER_GROUP = os.environ.get("OWNER_GROUP", "OwnerAdmin")

def _groups(value):
    if isinstance(value, list): return {str(item) for item in value}
    if not value: return set()
    try:
        decoded = json.loads(str(value))
        if isinstance(decoded, list): return {str(item) for item in decoded}
    except json.JSONDecodeError: pass
    return {part.strip(" []\"'") for part in str(value).split(",") if part.strip(" []\"'")}

def owner_subject(event):
    claims = (((event or {}).get("requestContext") or {}).get("authorizer", {}).get("jwt", {}).get("claims", {}))
    return claims.get("sub") if OWNER_GROUP in _groups(claims.get("cognito:groups")) else None
