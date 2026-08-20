"""Dry-run-first, exact-ID alias metadata backfill for approved F4F exercises."""
import argparse
import json
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

ROOT = Path(__file__).resolve().parents[1]
BACKFILL = ROOT / "seed" / "exercise-alias-backfill.json"


def backfill(table, records, apply=False):
    counts = {"updated": 0, "would_update": 0, "skipped": 0, "conflicting": 0, "missing": 0, "invalid": 0, "issues": []}
    seen_ids = set()
    for record in records:
        exercise_id = record.get("exerciseId") if isinstance(record, dict) else None
        expected_name = record.get("expectedName") if isinstance(record, dict) else None
        aliases = record.get("aliases") if isinstance(record, dict) else None
        if not exercise_id or exercise_id in seen_ids or not expected_name or not isinstance(aliases, list) or not aliases or any(not isinstance(alias, str) or not alias.strip() for alias in aliases):
            counts["invalid"] += 1
            counts["issues"].append({"exerciseId": exercise_id or "UNKNOWN", "name": expected_name or "UNKNOWN", "reason": "invalid backfill record"})
            continue
        seen_ids.add(exercise_id)
        key = {"PK": f"EXERCISE#{record['exerciseId']}", "SK": "METADATA"}
        current = table.get_item(Key=key, ConsistentRead=True).get("Item")
        if not current:
            counts["missing"] += 1
            counts["issues"].append({"exerciseId": exercise_id, "name": expected_name, "reason": "exercise record missing"})
            continue
        if current.get("exerciseId") != record["exerciseId"] or current.get("name") != record["expectedName"]:
            counts["conflicting"] += 1
            counts["issues"].append({"exerciseId": exercise_id, "name": expected_name, "reason": "stored ID or canonical name differs"})
            continue
        current_aliases = current.get("aliases", [])
        if current_aliases == record["aliases"]:
            counts["skipped"] += 1
            continue
        if current_aliases:
            counts["conflicting"] += 1
            counts["issues"].append({"exerciseId": exercise_id, "name": expected_name, "reason": "stored aliases differ"})
            continue
        if not apply:
            counts["would_update"] += 1
            continue
        try:
            table.update_item(
                Key=key,
                UpdateExpression="SET aliases = :aliases",
                ConditionExpression="exerciseId = :exercise_id AND #name = :expected_name AND (attribute_not_exists(aliases) OR size(aliases) = :zero)",
                ExpressionAttributeNames={"#name": "name"},
                ExpressionAttributeValues={":aliases": record["aliases"], ":exercise_id": record["exerciseId"], ":expected_name": record["expectedName"], ":zero": 0},
            )
            counts["updated"] += 1
        except ClientError as error:
            if error.response.get("Error", {}).get("Code") != "ConditionalCheckFailedException":
                raise
            counts["conflicting"] += 1
            counts["issues"].append({"exerciseId": exercise_id, "name": expected_name, "reason": "conditional update conflict"})
    return counts


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--table", default="f4f-training-content")
    parser.add_argument("--profile")
    parser.add_argument("--region", default="us-east-1")
    parser.add_argument("--apply", action="store_true", help="Perform conditional updates; default is dry-run.")
    args = parser.parse_args()
    records = json.loads(BACKFILL.read_text(encoding="utf-8"))
    session = boto3.Session(profile_name=args.profile, region_name=args.region)
    result = backfill(session.resource("dynamodb").Table(args.table), records, apply=args.apply)
    print(json.dumps({"mode": "apply" if args.apply else "dry-run", **result}, sort_keys=True))
    if result["conflicting"] or result["missing"] or result["invalid"]:
        raise SystemExit("Backfill issues found; affected records were not modified.")


if __name__ == "__main__":
    main()
