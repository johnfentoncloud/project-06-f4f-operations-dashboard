"""Idempotently seed the approved F4F exercise library without overwriting records."""
import argparse
import json
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "seed" / "exercises.json"
STABLE_FIELDS = {"exerciseId", "name", "category", "movementPattern", "equipment", "measurementType", "defaultUnit", "instructions", "tags", "active", "customExercise"}


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


def seed(table, records):
    counts = {"inserted": 0, "skipped": 0, "conflicting": 0}
    for record in records:
        item = item_for(record)
        try:
            table.put_item(Item=item, ConditionExpression="attribute_not_exists(PK)")
            counts["inserted"] += 1
        except ClientError as error:
            if error.response.get("Error", {}).get("Code") != "ConditionalCheckFailedException":
                raise
            current = table.get_item(Key={"PK": item["PK"], "SK": "METADATA"}, ConsistentRead=True).get("Item", {})
            same = all(current.get(field) == item.get(field) for field in STABLE_FIELDS)
            counts["skipped" if same else "conflicting"] += 1
    return counts


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--table", default="f4f-training-content")
    parser.add_argument("--profile", default=None)
    parser.add_argument("--region", default="us-east-1")
    args = parser.parse_args()
    records = json.loads(SEED.read_text(encoding="utf-8"))
    if len(records) != 89 or len({item["exerciseId"] for item in records}) != 89:
        raise SystemExit("Seed validation failed: expected 89 unique stable IDs.")
    session = boto3.Session(profile_name=args.profile, region_name=args.region)
    result = seed(session.resource("dynamodb").Table(args.table), records)
    print(json.dumps(result, sort_keys=True))
    if result["conflicting"]:
        raise SystemExit("Conflicts found; no existing records were overwritten.")


if __name__ == "__main__":
    main()
