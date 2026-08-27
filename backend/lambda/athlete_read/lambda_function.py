import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from athlete_common import athlete_context, clean_item, page_for_athlete, public_profile, response, session_sk, TABLE


def lambda_handler(event, _context):
    context = athlete_context(event)
    if not context:
        return response(403, {"ok": False, "message": "Athlete access is required."})
    athlete_id, profile = context
    path = ((event.get("requestContext") or {}).get("http") or {}).get("path", "")
    query = event.get("queryStringParameters") or {}
    params = event.get("pathParameters") or {}
    if path == "/me/profile":
        return response(200, {"ok": True, "profile": public_profile(profile)})
    if path == "/me/assignments":
        items, cursor = page_for_athlete(athlete_id, "ASSIGNMENT#", query.get("limit", 25), query.get("cursor"))
        return response(200, {"ok": True, "items": [clean_item(x) for x in items], "cursor": cursor})
    date, assignment_id = params.get("scheduledDate"), params.get("assignmentId")
    if "/me/assignments/" in path:
        item = TABLE.get_item(Key={"PK": f"ATHLETE#{athlete_id}", "SK": f"ASSIGNMENT#{date}#{assignment_id}"}).get("Item")
        return response(200, {"ok": True, "assignment": clean_item(item)}) if item else response(404, {"ok": False, "message": "Assignment not found."})
    if "/me/sessions/" in path:
        item = TABLE.get_item(Key={"PK": f"ATHLETE#{athlete_id}", "SK": session_sk(date, assignment_id)}).get("Item")
        return response(200, {"ok": True, "session": clean_item(item)}) if item else response(404, {"ok": False, "message": "Session not found."})
    return response(404, {"ok": False, "message": "Route not found."})
