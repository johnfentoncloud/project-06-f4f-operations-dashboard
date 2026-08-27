# Phase 4A Adult Beta — Slice 1

Slice 1 adds adult-only Athlete accounts, immutable Coach-created assignments, and one resumable session per assignment. It stores no minor, guardian, injury, medical, nutrition, or free-text Athlete note data.

## Identity and provisioning

Production Athlete access requires exactly the Cognito `Athlete` group, an active `SUBJECT#<sub>` mapping, and an active profile with `adultBeta=true`. Conflicting, missing, Coach, and OwnerAdmin groups are denied from Athlete routes. Applying Terraform creates the group only. It does not create users or profiles.

After a separately approved user invitation and group assignment, run `scripts/provision-adult-beta-athlete.py` without `--apply` to validate. The approved operational run adds `--apply`; one DynamoDB transaction conditionally creates the profile and subject mapping, so neither can exist alone.

## Storage

The encrypted, deletion-protected, PITR-enabled `f4f-athlete-training` table uses `PK`/`SK` and one sparse GSI used only for active beta Athlete listing. Athlete partitions contain `PROFILE`, `ASSIGNMENT#<date>#<uuid>`, and `SESSION#<date>#<uuid>` items. Public identifiers are opaque UUIDs; DynamoDB prefixes never appear as public IDs.

Assignments accept only a UUID, template ID, immutable version, and date. The server loads `TEMPLATE#<id>` / `VERSION#<six-digit-version>` from `f4f-training-content`, requires `schemaVersion=2`, deep-copies it, and creates stable assignment section/exercise instance IDs. Browser snapshots and ownership fields are rejected.

## Session state

`ASSIGNED -> IN_PROGRESS -> COMPLETED` is enforced server-side. Starting uses a transaction to update the assignment and create the deterministic one-per-assignment session. Autosaves require `expectedRevision`; stale writes return 409. Completion transactionally updates session and assignment. Athlete writes to completed sessions are rejected; repeat completion safely returns the completed record.

## Privacy and operations

CloudWatch retention is 30 days. Logs contain route/request/status/error metadata only, never tokens, headers, email, snapshots, or result payloads. Requests are capped at 256 KB, lists at 50 items, snapshots at 300 KB, 30 sections, and 200 exercises/results.

For a later approved export/deletion: disable the Cognito user, query and encrypt-export the Athlete partition and subject mapping, verify the export, delete partition items in controlled batches, delete the mapping, then delete the Cognito user. Record operator/time only; do not log result values.

Future Slice 2 correction route: `POST /athletes/{athleteId}/sessions/{scheduledDate}/{assignmentId}/corrections`.
