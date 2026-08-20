"""Dry-run-first, additive seed for the Coach-approved Expansion 1 subset."""
import argparse
import json
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "seed" / "exercise-expansion-ready.json"
STABLE_FIELDS = {"exerciseId", "name", "category", "movementPattern", "equipment", "measurementType", "defaultUnit", "instructions", "tags", "aliases", "active", "customExercise"}


def item_for(record):
    return {
        **record,
        "PK": f"EXERCISE#{record['exerciseId']}",
        "SK": "METADATA",
        "entityType": "Exercise",
        "source": "F4F_SEED",
        "GSI1PK": "LIBRARY#F4F#EXERCISE",
        "GSI1SK": f"NAME#{record['name'].casefold()}#{record['exerciseId']}",
    }


def seed(table, records, apply=False):
    counts = {"inserted": 0, "would_insert": 0, "skipped": 0, "conflicting": 0, "invalid": 0, "issues": []}
    seen_ids = set()
    for record in records:
        exercise_id = record.get("exerciseId") if isinstance(record, dict) else None
        name = record.get("name") if isinstance(record, dict) else None
        required = {"exerciseId", "name", "category", "movementPattern", "equipment", "measurementType", "defaultUnit", "instructions", "tags", "aliases", "active", "customExercise"}
        if not exercise_id or exercise_id in seen_ids or not name or not required.issubset(record):
            counts["invalid"] += 1
            counts["issues"].append({"exerciseId": exercise_id or "UNKNOWN", "name": name or "UNKNOWN", "reason": "invalid seed record"})
            continue
        seen_ids.add(exercise_id)
        item = item_for(record)
        current = table.get_item(Key={"PK": item["PK"], "SK": "METADATA"}, ConsistentRead=True).get("Item")
        if current:
            same = all(current.get(field) == item.get(field) for field in STABLE_FIELDS)
            counts["skipped" if same else "conflicting"] += 1
            if not same:
                counts["issues"].append({"exerciseId": exercise_id, "name": name, "reason": "existing record differs"})
            continue
        if not apply:
            counts["would_insert"] += 1
            continue
        try:
            table.put_item(Item=item, ConditionExpression="attribute_not_exists(PK)")
            counts["inserted"] += 1
        except ClientError as error:
            if error.response.get("Error", {}).get("Code") != "ConditionalCheckFailedException":
                raise
            counts["conflicting"] += 1
            counts["issues"].append({"exerciseId": exercise_id, "name": name, "reason": "conditional insert conflict"})
    return counts


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--table", default="f4f-training-content")
    parser.add_argument("--profile")
    parser.add_argument("--region", default="us-east-1")
    parser.add_argument("--apply", action="store_true", help="Insert missing records; default is dry-run.")
    args = parser.parse_args()
    records = json.loads(SEED.read_text(encoding="utf-8"))
    if not records or len({item["exerciseId"] for item in records}) != len(records):
        raise SystemExit("Seed validation failed: exercise IDs must be present and unique.")
    session = boto3.Session(profile_name=args.profile, region_name=args.region)
    result = seed(session.resource("dynamodb").Table(args.table), records, apply=args.apply)
    print(json.dumps({"mode": "apply" if args.apply else "dry-run", **result}, sort_keys=True))
    if result["conflicting"] or result["invalid"]:
        raise SystemExit("Conflicts found; existing records were not overwritten.")


if __name__ == "__main__":
    main()
