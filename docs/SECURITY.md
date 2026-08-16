# Security

## Data classification

Lead names, emails, phone numbers, and follow-up state are private business data.
Messages, goals, injury history, medical notes, and training narratives are more
sensitive and are excluded from Phase 2 API responses.

## Phase 2 controls

- Cognito authorization-code flow with PKCE; no browser client secret or AWS credentials
- JWT authorization on every API route plus Lambda OwnerAdmin enforcement
- Required TOTP MFA, strong passwords, verified email recovery, and short tokens
- OwnerAdmin and future Coach groups, with no real users created by Terraform
- Exact-table `dynamodb:Scan` permission only; no wildcard or write permission
- Projected DynamoDB reads and a second response-level field allowlist
- Private S3 with CloudFront OAC, TLS, CSP, HSTS, clickjacking protection, and a
  restrictive permissions policy
- Explicit CORS origins, API throttling, finite log retention, and logs that do
  not contain contact details or record bodies
- A deployment stage defaulting to `local`, which creates nothing

## Required review before production

- Establish and test break-glass owner recovery before onboarding users.
- Add CloudTrail/audit-event design before any data mutation is introduced.
- Decide whether the future Coach role may view contact information.
- Add automated dependency and infrastructure scanning in CI.
- Confirm data retention, deletion, export, and incident-response procedures.
- Review privacy obligations before storing or displaying medical information.
- Add WAF/rate controls if risk or traffic justifies them.

The local preview gate is a UI convenience only. Production mode refuses that
bypass. Tokens remain in session storage, are cleared on expiry/logout, and are
never logged.

The fictional Athlete experience is also localhost-only. Production role
resolution remains Coach/OwnerAdmin until athlete identity, relationship-based
authorization, and production data controls receive separate approval.
