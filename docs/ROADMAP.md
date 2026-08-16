# Roadmap

## Phase 1 - Dashboard foundation

Responsive shell, local preview guard, empty metrics, mock lead viewer, secure
API interfaces, deployment-gated Terraform, tests, and documentation.

## Phase 2 - Authenticated read-only production leads

Cognito authorization-code/PKCE integration, mandatory TOTP MFA, OwnerAdmin
enforcement, production read integration, pagination, application states, and a
staged custom-domain plan. User onboarding and all mutation remain separately
approved work.

The permanent platform hostname is `app.fenton4fitness.com`; the initial
production release remains Coach/OwnerAdmin only.

## Phase 3 - Athlete and client profiles

Separate youth athlete, adult client, parent/guardian, and team records with
explicit privacy boundaries and migration plans.

## Phase 4 - Scheduling and training

Session scheduling, attendance, packages, programming, workout history,
progress, and personal records.

## Phase 5 - Revenue and analytics

Payment status, monthly revenue, conversion, retention, and coaching workload.
Financial integrations require another security and compliance review.

## Phase 6 - Messaging and automation

Template-controlled email, approved SNS/SMS notifications, reminders, apparel
operations, and auditable workflow automation.

## Phase 7 - AI-assisted workflows

Human-reviewed summaries, follow-up drafting, business insights, and coaching
support with minimum necessary data, explicit access control, audit, retention,
and human approval boundaries.
