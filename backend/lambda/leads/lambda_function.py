import base64
import json
import logging
import os

import boto3

from authz import is_owner_admin
from lead_normalizer import normalize_lead


LOGGER = logging.getLogger()
LOGGER.setLevel(logging.INFO)
TABLE_NAME = os.environ.get("LEADS_TABLE_NAME", "")
MAX_RESULTS = min(max(int(os.environ.get("MAX_RESULTS", "50")), 1), 100)
TABLE = boto3.resource("dynamodb").Table(TABLE_NAME) if TABLE_NAME else None


def _response(status_code, payload):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(payload),
    }


def _decode_cursor(value):
    if not value:
        return None
    try:
        decoded = base64.urlsafe_b64decode(value.encode("ascii")).decode("utf-8")
        cursor = json.loads(decoded)
        return cursor if isinstance(cursor, dict) and "leadId" in cursor else None
    except (ValueError, UnicodeError, json.JSONDecodeError):
        return None


def _encode_cursor(value):
    if not value:
        return None
    encoded = json.dumps(value, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(encoded).decode("ascii")


def lambda_handler(event, context):
    """Return a paginated, allowlisted projection of existing lead records."""
    if not is_owner_admin(event):
        return _response(403, {"ok": False, "message": "OwnerAdmin access is required."})
    if TABLE is None:
        return _response(503, {"ok": False, "message": "Lead storage is not configured."})

    query = (event or {}).get("queryStringParameters") or {}
    cursor = _decode_cursor(query.get("cursor"))
    scan_options = {
        "Limit": MAX_RESULTS,
        "ProjectionExpression": "leadId,#name,firstName,lastName,email,phone,parentName,parentEmail,parentPhone,leadType,submissionType,createdAt,submittedAt,#status,followUpStatus,athleteName,#source,#location,#program,campaign",
        "ExpressionAttributeNames": {"#name": "name", "#status": "status", "#source": "source", "#location": "location", "#program": "program"},
    }
    if cursor:
        scan_options["ExclusiveStartKey"] = cursor

    try:
        result = TABLE.scan(**scan_options)
    except Exception as error:
        LOGGER.error("Lead read failed: errorType=%s", type(error).__name__)
        return _response(500, {"ok": False, "message": "Leads are temporarily unavailable."})

    leads = [lead for lead in (normalize_lead(item) for item in result.get("Items", [])) if lead]
    leads.sort(key=lambda item: item.get("submittedAt", ""), reverse=True)
    LOGGER.info("Lead page read: returned=%s malformedSkipped=%s", len(leads), len(result.get("Items", [])) - len(leads))
    return _response(200, {"ok": True, "items": leads, "nextCursor": _encode_cursor(result.get("LastEvaluatedKey"))})
