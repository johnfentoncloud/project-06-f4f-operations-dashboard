import json

from authz import is_owner_admin


def lambda_handler(event, context):
    """Return a minimal, non-sensitive service health response."""
    if not is_owner_admin(event):
        return {
            "statusCode": 403,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"ok": False, "message": "OwnerAdmin access is required."}),
        }
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"ok": True, "service": "f4f-operations-dashboard"}),
    }
