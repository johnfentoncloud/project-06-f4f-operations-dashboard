import hashlib
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.types import TypeSerializer
from botocore.exceptions import ClientError
from authz import owner_subject
from validation import validate_template

LOGGER = logging.getLogger(); LOGGER.setLevel(logging.INFO)
TABLE_NAME = os.environ.get("TRAINING_TABLE_NAME", "")
TABLE = boto3.resource("dynamodb").Table(TABLE_NAME) if TABLE_NAME else None
CLIENT = boto3.client("dynamodb") if TABLE_NAME else None
SERIALIZER = TypeSerializer()

def response(status, payload): return {"statusCode": status, "headers": {"Content-Type": "application/json"}, "body": json.dumps(payload)}
def now(): return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
def ddb(item): return {key: SERIALIZER.serialize(value) for key, value in item.items()}
def stable_hash(payload): return hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()

def log_client_error(error):
    response_data = error.response if isinstance(getattr(error, "response", None), dict) else {}
    aws_error = response_data.get("Error") if isinstance(response_data.get("Error"), dict) else {}
    metadata = response_data.get("ResponseMetadata") if isinstance(response_data.get("ResponseMetadata"), dict) else {}
    details = {
        "exceptionClass": type(error).__name__,
        "errorCode": str(aws_error.get("Code") or "UnknownClientError"),
        "errorMessage": str(aws_error.get("Message") or "AWS request failed"),
    }
    if metadata.get("HTTPStatusCode") is not None: details["httpStatus"] = metadata["HTTPStatusCode"]
    if metadata.get("RequestId"): details["requestId"] = str(metadata["RequestId"])
    reasons = []
    for index, reason in enumerate(response_data.get("CancellationReasons") or []):
        if not isinstance(reason, dict): continue
        normalized = {"index": index, "code": str(reason.get("Code") or "Unknown")}
        if reason.get("Message") is not None: normalized["message"] = str(reason["Message"])
        reasons.append(normalized)
    if reasons: details["reasons"] = reasons
    LOGGER.error("Template write failed: %s", json.dumps(details, separators=(",", ":"), sort_keys=True))

def body(event):
    try: return json.loads((event or {}).get("body") or "{}")
    except json.JSONDecodeError: return None

def retry_result(subject, key, request_hash):
    item = TABLE.get_item(Key={"PK": f"IDEMPOTENCY#{subject}#{key}", "SK": "REQUEST"}, ConsistentRead=True).get("Item")
    if item and item.get("requestHash") == request_hash: return {"templateId": item["templateId"], "version": int(item["version"]), "idempotentReplay": True}
    return None

def version_snapshot(payload, template_id, version, subject, timestamp):
    exercises = []
    for order, item in enumerate(payload["exercises"]):
        exercises.append({"order": order, "section": item["section"], "exerciseId": item["exerciseId"], "exerciseName": item["exerciseName"], "prescription": item["prescription"]})
    return {"PK": f"TEMPLATE#{template_id}", "SK": f"VERSION#{version:06d}", "entityType": "WorkoutTemplateVersion", "templateId": template_id, "version": version, "name": payload["name"].strip(), "description": str(payload.get("description", "")).strip(), "sections": list(dict.fromkeys(item["section"] for item in exercises)), "exercises": exercises, "createdAt": timestamp, "createdBy": subject}

def lambda_handler(event, context):
    subject = owner_subject(event)
    if not subject: return response(403, {"ok": False, "message": "OwnerAdmin access is required."})
    if TABLE is None: return response(503, {"ok": False, "message": "Training storage is not configured."})
    payload = body(event)
    errors = validate_template(payload)
    if errors: return response(400, {"ok": False, "message": "Invalid workout template.", "errors": errors})
    key = str(payload.get("idempotencyKey", ""))
    if not 8 <= len(key) <= 100: return response(400, {"ok": False, "message": "A valid idempotencyKey is required."})
    request_hash = stable_hash({k: v for k, v in payload.items() if k != "idempotencyKey"})
    route = ((event or {}).get("requestContext") or {}).get("http", {}).get("path", "")
    template_id = ((event or {}).get("pathParameters") or {}).get("templateId") or str(payload.get("templateId") or uuid.uuid4())
    timestamp = now()
    try:
        if route == "/workout-templates":
            version = 1
            metadata = {"PK": f"TEMPLATE#{template_id}", "SK": "METADATA", "entityType": "WorkoutTemplate", "templateId": template_id, "name": payload["name"].strip(), "description": str(payload.get("description", "")).strip(), "currentVersion": version, "createdAt": timestamp, "createdBy": subject, "updatedAt": timestamp, "updatedBy": subject, "GSI1PK": "ORG#F4F#TEMPLATE", "GSI1SK": f"UPDATED#{timestamp}#{template_id}"}
            condition = "attribute_not_exists(PK)"
            update = {"Put": {"TableName": TABLE_NAME, "Item": ddb(metadata), "ConditionExpression": condition}}
        else:
            expected = payload.get("expectedCurrentVersion")
            if not isinstance(expected, int) or expected < 1: return response(400, {"ok": False, "message": "expectedCurrentVersion is required for updates."})
            version = expected + 1
            update = {"Update": {"TableName": TABLE_NAME, "Key": ddb({"PK": f"TEMPLATE#{template_id}", "SK": "METADATA"}), "UpdateExpression": "SET #name=:name, description=:description, currentVersion=:next, updatedAt=:updated, updatedBy=:subject, GSI1SK=:gsi", "ConditionExpression": "currentVersion=:expected", "ExpressionAttributeNames": {"#name": "name"}, "ExpressionAttributeValues": ddb({":name": payload["name"].strip(), ":description": str(payload.get("description", "")).strip(), ":next": version, ":updated": timestamp, ":subject": subject, ":gsi": f"UPDATED#{timestamp}#{template_id}", ":expected": expected})}}
        version_item = version_snapshot(payload, template_id, version, subject, timestamp)
        idem = {"PK": f"IDEMPOTENCY#{subject}#{key}", "SK": "REQUEST", "requestHash": request_hash, "templateId": template_id, "version": version, "createdAt": timestamp}
        CLIENT.transact_write_items(TransactItems=[update, {"Put": {"TableName": TABLE_NAME, "Item": ddb(version_item), "ConditionExpression": "attribute_not_exists(PK)"}}, {"Put": {"TableName": TABLE_NAME, "Item": ddb(idem), "ConditionExpression": "attribute_not_exists(PK)"}}])
        return response(201 if version == 1 else 200, {"ok": True, "templateId": template_id, "version": version, "idempotentReplay": False})
    except ClientError as error:
        log_client_error(error)
        if error.response.get("Error", {}).get("Code") == "TransactionCanceledException":
            replay = retry_result(subject, key, request_hash)
            if replay: return response(200, {"ok": True, **replay})
            return response(409, {"ok": False, "message": "The template changed or this request conflicts with an existing write."})
        return response(500, {"ok": False, "message": "The template could not be saved. Your in-progress workout remains in the browser."})
    except Exception as error:
        LOGGER.error("Template write failed: errorType=%s", type(error).__name__)
        return response(500, {"ok": False, "message": "The template could not be saved. Your in-progress workout remains in the browser."})
