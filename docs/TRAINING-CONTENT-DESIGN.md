# Phase 3 Training Content Design

This document records the storage and API design proposed by the local Exercise Library and Workout Builder MVP. It does not authorize or create AWS resources.

## Access patterns

1. List every active F4F library exercise in normalized name order.
2. Filter the small starter library by category, equipment, movement pattern, favorite status, and recently used status.
3. Get one exercise by `exerciseId` and reject missing or inactive records.
4. Distinguish immutable F4F seed records from future custom exercises; custom-exercise writes are explicitly deferred.
5. List workout templates available to the F4F organization, newest first.
6. Get the latest version of one template or a specific historical version.
7. Save a new template and create later versions without mutating older versions.
8. Preserve complete exercise and prescription snapshots when future assignments are created.
9. Store future per-user favorites/recent identifiers without putting profile or athlete data in exercise records.

At the current library size (89 records), the API can query the complete active library once and apply compound filters in memory. This avoids premature secondary indexes for every filter. A later search service can be added if the library grows enough to justify it.

## Recommended smallest storage model

Create one Project 06-owned DynamoDB table named `f4f-training-content`; do not use or modify `f4f-leads`.

| Entity | PK | SK | GSI1PK | GSI1SK |
|---|---|---|---|---|
| Exercise | `EXERCISE#<exerciseId>` | `METADATA` | `LIBRARY#F4F#EXERCISE` | `NAME#<normalizedName>#<exerciseId>` |
| Template current pointer | `TEMPLATE#<templateId>` | `METADATA` | `ORG#F4F#TEMPLATE` | `UPDATED#<timestamp>#<templateId>` |
| Immutable template version | `TEMPLATE#<templateId>` | `VERSION#<zero-padded version>` | omitted | omitted |
| Idempotency receipt | `IDEMPOTENCY#<Cognito sub>#<key>` | `REQUEST` | omitted | omitted |
| Future Coach preferences | `USER#<Cognito sub>` | `PREFS#EXERCISES` | omitted | omitted |

Use on-demand billing, point-in-time recovery, server-side encryption, and deletion protection. Seed records remain identifiable with `customExercise=false`, `source=F4F_SEED`, and `createdBy=F4F_LIBRARY`. The source-controlled seed has exactly 89 stable IDs. Conditional puts insert missing items, skip byte-equivalent seed-owned records, report conflicts, and never overwrite an existing record.

Template versions contain ordered sections, prescriptions, and exercise snapshots. Future assigned workouts must copy the selected template version rather than reference mutable current content.

## Proposed API routes

All routes use the existing Cognito JWT authorizer. Phase 3 production writes remain OwnerAdmin-only; the future `Coach` group can receive explicit permissions later.

- `GET /exercises`
- `GET /exercises/{exerciseId}`
- `GET /workout-templates`
- `GET /workout-templates/{templateId}`
- `GET /workout-templates/{templateId}/versions/{version}`
- `POST /workout-templates`
- `PUT /workout-templates/{templateId}` to create the next immutable version

Future custom-exercise, athlete assignment, and result routes are deliberately excluded. No medical, injury, minor-account, or athlete-result data belongs in this phase.

## Immutable writes and retries

Create and update requests require an 8–100 character idempotency key. A DynamoDB transaction writes the metadata pointer, a complete immutable version snapshot, and an idempotency receipt together. Create requires the metadata key not to exist. Update requires `expectedCurrentVersion` to match and increments exactly once. A retry with the same subject, key, and request hash returns the original result; reuse with a different payload conflicts. Historical version items are never updated.

Every version stores the ordered exercise ID and name, section, supported prescription values (sets, reps, load/unit, time, distance/unit, calories, rest, tempo, RPE, percentage, and Coach instruction), creator Cognito subject, and timestamp. Future assignments can safely point at `templateId + version`.

## Least-privilege boundary

Use separate read and write Lambda roles. Scope DynamoDB actions to the new table and GSI ARN only. The read handler receives `GetItem` and `Query`; the write handler receives `GetItem` and `TransactWriteItems`. No training role receives access to `f4f-leads`; its existing read-only Lambda policy remains unchanged.
