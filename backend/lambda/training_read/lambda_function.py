import base64
import json
import logging
import os
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key
from authz import owner_subject

LOGGER = logging.getLogger()
LOGGER.setLevel(logging.INFO)
TABLE_NAME = os.environ.get("TRAINING_TABLE_NAME", "")
TABLE = boto3.resource("dynamodb").Table(TABLE_NAME) if TABLE_NAME else None

def _json_default(value):
    if isinstance(value, Decimal): return int(value) if value % 1 == 0 else float(value)
    raise TypeError()

def response(status, payload):
    return {"statusCode": status, "headers": {"Content-Type": "application/json"}, "body": json.dumps(payload, default=_json_default)}

def public_item(item):
    return {key: value for key, value in item.items() if key not in {"PK", "SK", "GSI1PK", "GSI1SK"}}

def encode_cursor(key):
    return base64.urlsafe_b64encode(json.dumps(key).encode()).decode() if key else None

def decode_cursor(value):
    try: return json.loads(base64.urlsafe_b64decode(value.encode()).decode()) if value else None
    except (ValueError, UnicodeError, json.JSONDecodeError): return None

def list_index(partition, cursor=None, limit=100):
    options = {"IndexName": "GSI1", "KeyConditionExpression": Key("GSI1PK").eq(partition), "Limit": min(max(int(limit), 1), 100)}
    if cursor: options["ExclusiveStartKey"] = cursor
    result = TABLE.query(**options)
    return [public_item(item) for item in result.get("Items", [])], encode_cursor(result.get("LastEvaluatedKey"))

def lambda_handler(event, context):
    if not owner_subject(event): return response(403, {"ok": False, "message": "OwnerAdmin access is required."})
    if TABLE is None: return response(503, {"ok": False, "message": "Training storage is not configured."})
    route = ((event or {}).get("requestContext") or {}).get("http", {}).get("path", "")
    params = (event or {}).get("pathParameters") or {}
    query = (event or {}).get("queryStringParameters") or {}
    try:
        if route == "/exercises":
            items, cursor = list_index("LIBRARY#F4F#EXERCISE", decode_cursor(query.get("cursor")), query.get("limit", 100))
            return response(200, {"ok": True, "items": [item for item in items if item.get("active", True)], "nextCursor": cursor})
        if route.startswith("/exercises/"):
            result = TABLE.get_item(Key={"PK": f"EXERCISE#{params.get('exerciseId')}", "SK": "METADATA"})
            return response(200, {"ok": True, "item": public_item(result["Item"])}) if result.get("Item") else response(404, {"ok": False, "message": "Exercise not found."})
        if route == "/workout-templates":
            items, cursor = list_index("ORG#F4F#TEMPLATE", decode_cursor(query.get("cursor")), query.get("limit", 50))
            return response(200, {"ok": True, "items": items, "nextCursor": cursor})
        template_id = params.get("templateId")
        version = params.get("version")
        if template_id and version:
            key = {"PK": f"TEMPLATE#{template_id}", "SK": f"VERSION#{int(version):06d}"}
        elif template_id:
            metadata = TABLE.get_item(Key={"PK": f"TEMPLATE#{template_id}", "SK": "METADATA"}).get("Item")
            if not metadata: return response(404, {"ok": False, "message": "Workout template not found."})
            key = {"PK": f"TEMPLATE#{template_id}", "SK": f"VERSION#{int(metadata['currentVersion']):06d}"}
        else: return response(404, {"ok": False, "message": "Route not found."})
        item = TABLE.get_item(Key=key).get("Item")
        return response(200, {"ok": True, "item": public_item(item)}) if item else response(404, {"ok": False, "message": "Template version not found."})
    except Exception as error:
        LOGGER.error("Training read failed: route=%s errorType=%s", route, type(error).__name__)
        return response(500, {"ok": False, "message": "Training content is temporarily unavailable."})
