import copy
import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

LOGGER = logging.getLogger(); LOGGER.setLevel(logging.INFO)
ATHLETE_TABLE = boto3.resource("dynamodb").Table(os.environ.get("ATHLETE_TABLE_NAME", "f4f-athlete-training"))
TRAINING_TABLE = boto3.resource("dynamodb").Table(os.environ.get("TRAINING_TABLE_NAME", "f4f-training-content"))
UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)
REJECTED_FIELDS = {"athleteId", "prescriptionSnapshot", "snapshot", "status", "assignedBy", "createdBy", "sectionInstanceId", "exerciseInstanceId"}
SECTION_RESULT_TYPES = {"AMRAP": "ROUNDS_REPS", "For Time": "TIME", "Intervals": "ROUNDS", "Rounds": "COMPLETION"}


def response(status, payload): return {"statusCode": status, "headers": {"Content-Type": "application/json"}, "body": json.dumps(payload, default=str)}
def now(): return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
def claims(event): return (((event or {}).get("requestContext") or {}).get("authorizer") or {}).get("jwt", {}).get("claims", {})
def groups(event):
    raw = claims(event).get("cognito:groups", "")
    return {x.strip() for x in (raw if isinstance(raw, list) else str(raw).strip("[]").split(",")) if x.strip()}
def owner(event): return claims(event).get("sub") if groups(event) == {"OwnerAdmin"} else None


def snapshot(template, assignment_id):
    if template.get("schemaVersion") != 2 or not isinstance(template.get("sections"), list):
        raise ValueError("Only Phase 3C schemaVersion 2 templates can be assigned.")
    result = {"name": template.get("name", ""), "description": template.get("description", ""), "sections": []}
    for section_order, section in enumerate(template["sections"]):
        section_id = str(uuid.uuid5(uuid.UUID(assignment_id), f"section:{section_order}:{section.get('sectionId', '')}"))
        copied = {key: copy.deepcopy(section.get(key)) for key in ("order", "type", "format", "title", "instructions", "rounds", "duration", "durationUnit") if key in section}
        copied.update({"sectionInstanceId": section_id, "order": section_order, "exercises": []})
        if section.get("format") in SECTION_RESULT_TYPES:
            copied["resultType"] = SECTION_RESULT_TYPES[section["format"]]
        for exercise_order, exercise in enumerate(section.get("exercises", [])):
            instance_id = str(uuid.uuid5(uuid.UUID(assignment_id), f"exercise:{section_order}:{exercise_order}:{exercise.get('exerciseId', '')}"))
            copied["exercises"].append({"exerciseInstanceId": instance_id, "order": exercise_order, "exerciseId": exercise.get("exerciseId"), "exerciseName": exercise.get("exerciseName"), "measurementType": exercise.get("measurementType", "reps"), "prescription": copy.deepcopy(exercise.get("prescription", {}))})
        result["sections"].append(copied)
    return result


def clean(item):
    return {k: v for k, v in item.items() if k not in {"PK", "SK", "GSI1PK", "GSI1SK", "cognitoSub", "createdBy", "assignedBy"}}


def lambda_handler(event, _context):
    subject = owner(event)
    if not subject: return response(403, {"ok": False, "message": "OwnerAdmin access is required."})
    path = ((event.get("requestContext") or {}).get("http") or {}).get("path", "")
    method = ((event.get("requestContext") or {}).get("http") or {}).get("method", "GET")
    params = event.get("pathParameters") or {}
    athlete_id = params.get("athleteId")
    if path == "/athletes" and method == "GET":
        result = ATHLETE_TABLE.query(IndexName="GSI1", KeyConditionExpression=Key("GSI1PK").eq("ADULT_BETA#ACTIVE"), Limit=min(int((event.get("queryStringParameters") or {}).get("limit", 25)), 50))
        return response(200, {"ok": True, "items": [clean(x) for x in result.get("Items", [])]})
    profile = ATHLETE_TABLE.get_item(Key={"PK": f"ATHLETE#{athlete_id}", "SK": "PROFILE"}).get("Item")
    if not profile or profile.get("adultBeta") is not True or profile.get("status") != "ACTIVE":
        return response(404, {"ok": False, "message": "Active adult-beta athlete not found."})
    if method == "GET" and path.endswith(f"/athletes/{athlete_id}"):
        return response(200, {"ok": True, "profile": clean(profile)})
    if method == "GET" and path.endswith("/assignments"):
        result = ATHLETE_TABLE.query(KeyConditionExpression=Key("PK").eq(f"ATHLETE#{athlete_id}") & Key("SK").begins_with("ASSIGNMENT#"), Limit=50)
        return response(200, {"ok": True, "items": [clean(x) for x in result.get("Items", [])]})
    if method == "POST" and path.endswith("/assignments"):
        payload = json.loads(event.get("body") or "{}")
        if REJECTED_FIELDS.intersection(payload): return response(400, {"ok": False, "message": "Assignment contains server-owned fields."})
        assignment_id, template_id, version, date = payload.get("assignmentId"), payload.get("templateId"), payload.get("templateVersion"), payload.get("scheduledDate")
        if not UUID_RE.fullmatch(str(assignment_id or "")) or not isinstance(version, int) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(date or "")):
            return response(400, {"ok": False, "message": "Invalid assignment request."})
        existing_items = ATHLETE_TABLE.query(KeyConditionExpression=Key("PK").eq(f"ATHLETE#{athlete_id}") & Key("SK").begins_with("ASSIGNMENT#"), ProjectionExpression="assignmentId,athleteId,templateId,templateVersion,scheduledDate,#s,prescriptionSnapshot,snapshotSchemaVersion,sourceTemplateSchemaVersion", ExpressionAttributeNames={"#s": "status"}).get("Items", [])
        existing = next((x for x in existing_items if x.get("assignmentId") == assignment_id), None)
        requested = (athlete_id, template_id, version, date)
        if existing:
            stored = (existing.get("athleteId"), existing.get("templateId"), int(existing.get("templateVersion")), existing.get("scheduledDate"))
            return response(200, {"ok": True, "assignment": clean(existing), "idempotentReplay": True}) if stored == requested else response(409, {"ok": False, "message": "Assignment UUID conflicts with an existing request."})
        template = TRAINING_TABLE.get_item(Key={"PK": f"TEMPLATE#{template_id}", "SK": f"VERSION#{version:06d}"}, ConsistentRead=True).get("Item")
        if not template: return response(404, {"ok": False, "message": "Template version not found."})
        try: prescription = snapshot(template, assignment_id)
        except ValueError as error: return response(409, {"ok": False, "message": str(error)})
        item = {"PK": f"ATHLETE#{athlete_id}", "SK": f"ASSIGNMENT#{date}#{assignment_id}", "entityType": "WorkoutAssignment", "assignmentId": assignment_id, "athleteId": athlete_id, "scheduledDate": date, "programTimeZone": "America/New_York", "workoutName": prescription.get("name", "Assigned workout"), "templateId": template_id, "templateVersion": version, "sourceTemplateSchemaVersion": 2, "snapshotSchemaVersion": 1, "prescriptionSnapshot": prescription, "status": "ASSIGNED", "assignedAt": now(), "assignedBy": subject}
        try: ATHLETE_TABLE.put_item(Item=item, ConditionExpression="attribute_not_exists(PK) AND attribute_not_exists(SK)")
        except ClientError: return response(409, {"ok": False, "message": "Assignment changed during creation."})
        return response(201, {"ok": True, "assignment": clean(item), "idempotentReplay": False})
    date, assignment_id = params.get("scheduledDate"), params.get("assignmentId")
    if method == "GET" and "/sessions/" in path:
        assignment = ATHLETE_TABLE.get_item(Key={"PK": f"ATHLETE#{athlete_id}", "SK": f"ASSIGNMENT#{date}#{assignment_id}"}).get("Item")
        session = ATHLETE_TABLE.get_item(Key={"PK": f"ATHLETE#{athlete_id}", "SK": f"SESSION#{date}#{assignment_id}"}).get("Item")
        return response(200, {"ok": True, "assignment": clean(assignment), "session": clean(session) if session else None}) if assignment else response(404, {"ok": False, "message": "Assignment not found."})
    return response(404, {"ok": False, "message": "Route not found."})
