import os
import sys

from botocore.exceptions import ClientError
from boto3.dynamodb.types import TypeSerializer
import boto3

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from athlete_common import athlete_context, body, clean_item, now, response, session_sk, TABLE
from athlete_write.validation import validate_results

CLIENT = boto3.client("dynamodb")
SERIALIZER = TypeSerializer()
def ddb(item): return {key: SERIALIZER.serialize(value) for key, value in item.items()}


def lambda_handler(event, _context):
    context = athlete_context(event)
    if not context:
        return response(403, {"ok": False, "message": "Athlete access is required."})
    athlete_id, _ = context
    params = event.get("pathParameters") or {}
    date, assignment_id = params.get("scheduledDate"), params.get("assignmentId")
    pk, ask, ssk = f"ATHLETE#{athlete_id}", f"ASSIGNMENT#{date}#{assignment_id}", session_sk(date, assignment_id)
    path = ((event.get("requestContext") or {}).get("http") or {}).get("path", "")
    assignment = TABLE.get_item(Key={"PK": pk, "SK": ask}).get("Item")
    if not assignment:
        return response(404, {"ok": False, "message": "Assignment not found."})
    existing = TABLE.get_item(Key={"PK": pk, "SK": ssk}).get("Item")
    if path.endswith("/start"):
        if existing:
            return response(200, {"ok": True, "session": clean_item(existing)})
        stamp = now()
        session = {"PK": pk, "SK": ssk, "entityType": "WorkoutSession", "sessionId": assignment_id, "assignmentId": assignment_id, "athleteId": athlete_id, "scheduledDate": date, "workoutName": assignment.get("prescriptionSnapshot", {}).get("name", "Assigned workout"), "prescriptionSnapshot": assignment.get("prescriptionSnapshot", {}), "status": "IN_PROGRESS", "revision": 1, "results": [], "currentSectionIndex": 0, "startedAt": stamp, "updatedAt": stamp}
        try:
            CLIENT.transact_write_items(TransactItems=[
                {"Update": {"TableName": TABLE.name, "Key": ddb({"PK": pk, "SK": ask}), "UpdateExpression": "SET #s=:next, startedAt=:at", "ConditionExpression": "#s=:expected", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": ddb({":next": "IN_PROGRESS", ":expected": "ASSIGNED", ":at": stamp})}},
                {"Put": {"TableName": TABLE.name, "Item": ddb(session), "ConditionExpression": "attribute_not_exists(PK)"}}
            ])
            return response(201, {"ok": True, "session": clean_item(session)})
        except ClientError:
            current = TABLE.get_item(Key={"PK": pk, "SK": ssk}).get("Item")
            return response(200, {"ok": True, "session": clean_item(current)}) if current else response(409, {"ok": False, "message": "Assignment state changed."})
    payload = body(event)
    expected = payload.get("expectedRevision")
    results = payload.get("results")
    if not isinstance(expected, int) or not validate_results(results):
        return response(400, {"ok": False, "message": "Invalid session results or revision."})
    if not existing:
        return response(404, {"ok": False, "message": "Session not found."})
    if existing.get("status") == "COMPLETED":
        return response(200, {"ok": True, "session": clean_item(existing)}) if path.endswith("/complete") else response(409, {"ok": False, "message": "Completed sessions are immutable."})
    stamp, next_revision = now(), expected + 1
    if path.endswith("/complete"):
        try:
            CLIENT.transact_write_items(TransactItems=[
                {"Update": {"TableName": TABLE.name, "Key": ddb({"PK": pk, "SK": ssk}), "UpdateExpression": "SET #s=:done, results=:results, revision=:next, updatedAt=:at, completedAt=:at", "ConditionExpression": "#s=:progress AND revision=:expected", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": ddb({":done": "COMPLETED", ":progress": "IN_PROGRESS", ":results": results, ":next": next_revision, ":expected": expected, ":at": stamp})}},
                {"Update": {"TableName": TABLE.name, "Key": ddb({"PK": pk, "SK": ask}), "UpdateExpression": "SET #s=:done, completedAt=:at", "ConditionExpression": "#s=:progress", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": ddb({":done": "COMPLETED", ":progress": "IN_PROGRESS", ":at": stamp})}}
            ])
        except ClientError:
            return response(409, {"ok": False, "message": "Session revision conflict."})
    else:
        try:
            TABLE.update_item(Key={"PK": pk, "SK": ssk}, UpdateExpression="SET results=:results, currentSectionIndex=:idx, revision=:next, updatedAt=:at", ConditionExpression="#s=:progress AND revision=:expected", ExpressionAttributeNames={"#s": "status"}, ExpressionAttributeValues={":results": results, ":idx": int(payload.get("currentSectionIndex", 0)), ":next": next_revision, ":at": stamp, ":progress": "IN_PROGRESS", ":expected": expected})
        except ClientError:
            return response(409, {"ok": False, "message": "Session revision conflict."})
    current = TABLE.get_item(Key={"PK": pk, "SK": ssk}).get("Item")
    return response(200, {"ok": True, "session": clean_item(current)})
