# Data Model

## Existing Project 04 record

The source table is owned by Project 04. `leadId` is the string partition key.
The table has no secondary indexes. Project 06 does not alter its schema,
capacity, backups, or stored records.

## Phase 2 API projection

| Field | Purpose | Default or normalization |
|---|---|---|
| `leadId` | Stable identity | Required and non-empty |
| `firstName`, `lastName` | Display name | Existing fields or conservative split of `name` |
| `email` | Contact email | Required for a displayed record |
| `phone` | Contact phone | Optional |
| `leadType` | Inquiry category | Defaults to `general-inquiry` |
| `submissionType` | Pipeline category | Defaults to `lead` |
| `submittedAt` | Submission time | `submittedAt`, then `createdAt`, or blank |
| `status` | Pipeline state | Allowlisted; defaults to `New` |
| `followUpStatus` | Follow-up state | Defaults to `Not started` |

Allowed future statuses are New, Contacted, Consultation Scheduled, Converted,
Not Interested, and Spam.

## Excluded fields

Phase 2 does not return messages, goals, injury history, medical notes, training
history, addresses, consent text, testimonials, or other narrative content.

## Future model guidance

Status changes should use a separate audited entity rather than overwrite the
capture record. Athlete, client, session, training, payment, and note entities
need distinct access and retention policies. Medical data must not be added
without an explicit privacy, authorization, audit, and incident-response review.
