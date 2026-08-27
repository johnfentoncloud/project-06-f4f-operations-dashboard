import json
import os
import re
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import boto3
from boto3.dynamodb.conditions import Key

TABLE_NAME = os.environ.get("ATHLETE_TABLE_NAME", "f4f-athlete-training")
TABLE = boto3.resource("dynamodb").Table(TABLE_NAME)
PROGRAM_TIMEZONE = ZoneInfo("America/New_York")
UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)


def response(status, payload):
    return {"statusCode": status, "headers": {"Content-Type": "application/json"}, "body": json.dumps(payload)}


def claims(event):
    return (((event or {}).get("requestContext") or {}).get("authorizer") or {}).get("jwt", {}).get("claims", {})


def groups(event):
    raw = claims(event).get("cognito:groups", "")
    if isinstance(raw, list):
        return set(raw)
    return {item.strip() for item in str(raw).strip("[]").split(",") if item.strip()}


def exact_role(event, role):
    return groups(event) == {role}


def subject(event):
    return str(claims(event).get("sub", "")).strip()


def body(event, maximum=262144):
    raw = (event or {}).get("body") or "{}"
    if len(raw.encode("utf-8")) > maximum:
        raise ValueError("Request body is too large.")
    value = json.loads(raw)
    if not isinstance(value, dict):
        raise ValueError("JSON body must be an object.")
    return value


def athlete_context(event):
    if not exact_role(event, "Athlete") or not subject(event):
        return None
    mapping = TABLE.get_item(Key={"PK": f"SUBJECT#{subject(event)}", "SK": "ATHLETE"}).get("Item")
    if not mapping or mapping.get("status") != "ACTIVE":
        return None
    athlete_id = mapping.get("athleteId")
    profile = TABLE.get_item(Key={"PK": f"ATHLETE#{athlete_id}", "SK": "PROFILE"}).get("Item")
    if not profile or profile.get("status") != "ACTIVE" or profile.get("adultBeta") is not True:
        return None
    return athlete_id, profile


def public_profile(profile):
    return {key: profile.get(key) for key in ("athleteId", "displayName", "email", "status", "adultBeta") if key in profile}


def assignment_sk(date, assignment_id):
    return f"ASSIGNMENT#{date}#{assignment_id}"


def session_sk(date, assignment_id):
    return f"SESSION#{date}#{assignment_id}"


def valid_date(value):
    try:
        parsed = datetime.strptime(str(value), "%Y-%m-%d").date()
        return parsed.isoformat() == value
    except (TypeError, ValueError):
        return False


def now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def today():
    return datetime.now(PROGRAM_TIMEZONE).date().isoformat()


def page_for_athlete(athlete_id, prefix, limit=25, cursor=None):
    options = {
        "KeyConditionExpression": Key("PK").eq(f"ATHLETE#{athlete_id}") & Key("SK").begins_with(prefix),
        "Limit": min(max(int(limit), 1), 50),
    }
    if cursor:
        options["ExclusiveStartKey"] = json.loads(cursor)
    result = TABLE.query(**options)
    return result.get("Items", []), json.dumps(result.get("LastEvaluatedKey")) if result.get("LastEvaluatedKey") else None


def valid_uuid(value):
    return bool(UUID_RE.fullmatch(str(value or "")))


def clean_item(item):
    hidden = {"PK", "SK", "GSI1PK", "GSI1SK", "cognitoSub", "createdBy", "assignedBy"}
    return {key: value for key, value in item.items() if key not in hidden}
