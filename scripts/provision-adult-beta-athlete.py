"""Atomic adult-beta profile provisioner. Defaults to validation-only; never logs email or sub."""
import argparse
import uuid
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.types import TypeSerializer


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--username", required=True)
    parser.add_argument("--display-name", required=True)
    parser.add_argument("--user-pool-id", required=True)
    parser.add_argument("--table", default="f4f-athlete-training")
    parser.add_argument("--created-by", required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    cognito = boto3.client("cognito-idp")
    user = cognito.admin_get_user(UserPoolId=args.user_pool_id, Username=args.username)
    groups = {x["GroupName"] for x in cognito.admin_list_groups_for_user(UserPoolId=args.user_pool_id, Username=args.username)["Groups"]}
    if groups != {"Athlete"}: raise SystemExit("User must belong to exactly the Athlete group.")
    attrs = {x["Name"]: x["Value"] for x in user["UserAttributes"]}
    if not attrs.get("sub"): raise SystemExit("Cognito subject is missing.")
    athlete_id, stamp = str(uuid.uuid4()), datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    profile = {"PK": f"ATHLETE#{athlete_id}", "SK": "PROFILE", "entityType": "AthleteProfile", "athleteId": athlete_id, "displayName": args.display_name, "email": attrs.get("email", ""), "cognitoSub": attrs["sub"], "adultBeta": True, "status": "ACTIVE", "createdAt": stamp, "createdBy": args.created_by, "GSI1PK": "ADULT_BETA#ACTIVE", "GSI1SK": f"NAME#{args.display_name.upper()}#{athlete_id}"}
    mapping = {"PK": f"SUBJECT#{attrs['sub']}", "SK": "ATHLETE", "entityType": "AthleteSubjectMapping", "athleteId": athlete_id, "status": "ACTIVE", "createdAt": stamp}
    if not args.apply:
        print("Validation passed. No writes performed. Re-run with --apply only after explicit approval.")
        return
    serializer = TypeSerializer(); encode = lambda item: {k: serializer.serialize(v) for k, v in item.items()}
    boto3.client("dynamodb").transact_write_items(TransactItems=[
        {"Put": {"TableName": args.table, "Item": encode(profile), "ConditionExpression": "attribute_not_exists(PK)"}},
        {"Put": {"TableName": args.table, "Item": encode(mapping), "ConditionExpression": "attribute_not_exists(PK)"}},
    ])
    print(f"Provisioned adult-beta athlete {athlete_id} atomically.")


if __name__ == "__main__": main()
