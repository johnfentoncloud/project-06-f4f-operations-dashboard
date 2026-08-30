# Roadmap

## Phase 1 - Dashboard foundation

Responsive shell, local preview guard, empty metrics, mock lead viewer, secure
API interfaces, deployment-gated Terraform, tests, and documentation.

## Phase 2 - Authenticated read-only production leads — complete

Cognito authorization-code/PKCE integration, mandatory TOTP MFA, OwnerAdmin
enforcement, production read integration, pagination, application states, and a
staged custom-domain plan. User onboarding and all mutation remain separately
approved work.

The Phase 2 production release was Coach/OwnerAdmin-only. Athlete access was
introduced later through the separately bounded Phase 4A slice.

## Phase 3 - Exercise Library and workout programming — complete

Production exercise search/filtering, sectioned workout construction, immutable
template versions, idempotent writes, and legacy-template normalization.

## Phase 4A - Adult Athlete beta

Slice 1 is deployed with adult-only profiles, subject mappings, immutable Coach
assignments, and resumable sessions. First-login and bounded assignment/session
acceptance remain operational checkpoints. Minor/guardian/medical data stays out
of scope.

## Future - Scheduling, training history, revenue, and analytics

Payment status, monthly revenue, conversion, retention, and coaching workload.
Financial integrations require another security and compliance review.

## Future - Messaging and automation

Template-controlled email, approved SNS/SMS notifications, reminders, apparel
operations, and auditable workflow automation.

## Future - AI-assisted workflows

Human-reviewed summaries, follow-up drafting, business insights, and coaching
support with minimum necessary data, explicit access control, audit, retention,
and human approval boundaries.
