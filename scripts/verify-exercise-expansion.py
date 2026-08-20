"""Authoritatively verify the completed Exercise Library Expansion 1 dataset."""
import argparse
import json
from pathlib import Path

import boto3

ROOT = Path(__file__).resolve().parents[1]


def read_json(name):
    return json.loads((ROOT / "seed" / name).read_text(encoding="utf-8"))


def all_exercises(table):
    items = []
    request = {
        "FilterExpression": "entityType = :exercise",
        "ExpressionAttributeValues": {":exercise": "Exercise"},
    }
    while True:
        response = table.scan(**request)
        items.extend(response.get("Items", []))
        if "LastEvaluatedKey" not in response:
            return items
        request["ExclusiveStartKey"] = response["LastEvaluatedKey"]


def verify(table):
    approved = read_json("exercises.json")
    expansion = read_json("exercise-expansion-ready.json")
    excluded = read_json("exercise-expansion-excluded.json")
    records = all_exercises(table)
    by_id = {item.get("exerciseId"): item for item in records}
    original_ids = {item["exerciseId"] for item in approved}
    expansion_ids = {item["exerciseId"] for item in expansion}
    excluded_names = {item["name"] for item in excluded}
    original_mismatches = [item["exerciseId"] for item in approved if item["exerciseId"] not in by_id or by_id[item["exerciseId"]].get("name") != item["name"]]
    alias_mismatches = [item["exerciseId"] for item in approved if by_id.get(item["exerciseId"], {}).get("aliases", []) != item.get("aliases", [])]
    expansion_mismatches = [item["exerciseId"] for item in expansion if item["exerciseId"] not in by_id or by_id[item["exerciseId"]].get("name") != item["name"]]
    result = {
        "canonicalCount": len(records),
        "uniqueExerciseIds": len(by_id),
        "originalExpected": len(original_ids),
        "originalMissingOrRenamed": len(original_mismatches),
        "originalAliasRecordsVerified": sum(bool(item.get("aliases")) for item in approved),
        "originalAliasMismatches": len(alias_mismatches),
        "expansionExpected": len(expansion_ids),
        "expansionRecordsVerified": sum(item_id in by_id for item_id in expansion_ids),
        "expansionMismatches": len(expansion_mismatches),
        "coachReviewOrHoldNamesFound": sum(item.get("name") in excluded_names for item in records),
    }
    result["valid"] = result == {
        "canonicalCount": 271,
        "uniqueExerciseIds": 271,
        "originalExpected": 89,
        "originalMissingOrRenamed": 0,
        "originalAliasRecordsVerified": 42,
        "originalAliasMismatches": 0,
        "expansionExpected": 182,
        "expansionRecordsVerified": 182,
        "expansionMismatches": 0,
        "coachReviewOrHoldNamesFound": 0,
    }
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--table", default="f4f-training-content")
    parser.add_argument("--profile")
    parser.add_argument("--region", default="us-east-1")
    args = parser.parse_args()
    session = boto3.Session(profile_name=args.profile, region_name=args.region)
    result = verify(session.resource("dynamodb").Table(args.table))
    print(json.dumps(result, sort_keys=True))
    if not result["valid"]:
        raise SystemExit("Exercise expansion verification failed.")


if __name__ == "__main__":
    main()
