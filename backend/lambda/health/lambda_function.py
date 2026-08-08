import json


def lambda_handler(event, context):
    """Return a minimal, non-sensitive service health response."""
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"ok": True, "service": "f4f-operations-dashboard"}),
    }
