# Data Model

## Existing Project 04 record

The source table is owned by Project 04. `leadId` is the identifier, and records
contain `submittedAt`, `submissionType`, `leadType`, common contact fields, and
category-specific intake fields. Project 06 must not alter that schema in Phase 1.

## Phase 1 API projection

| Field | Purpose | Default/validation |
|---|---|---|
| `leadId` | Stable record identity | Required, non-empty |
| `name` | Display name | Normalized from name/parent/athlete fields |
| `email` | Contact email | Required for a valid displayed record |
| `phone` | Contact phone | Optional |
| `leadType` | Inquiry category | Defaults to `general-inquiry` |
| `submissionType` | Pipeline category | Defaults to `lead` |
| `submittedAt` | UTC submission time | Valid ISO timestamp or blank |
| `status` | Business pipeline state | Allowlisted; defaults to `New` |
| `followUpStatus` | Readable follow-up state | Defaults to `Not started` |

Allowed future lead statuses are New, Contacted, Consultation Scheduled,
Converted, Not Interested, and Spam.

## Excluded fields

Phase 1 does not return messages, goals, injury history, medical notes, training
history, addresses, consent text, testimonials, or other narrative content.

## Future model guidance

Lead status changes should eventually use a separate audited entity rather than
silently overwriting the capture record. Athlete, client, session, training,
payment, and note entities should have separate access policies and retention
rules. Medical data should not be added until privacy, authorization, auditing,
and incident-response requirements are explicitly approved.
