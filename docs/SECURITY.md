# Security

## Data classification

Lead names, emails, phone numbers, and follow-up state are private business data.
Messages, goals, injury history, medical notes, and training narratives are more
sensitive and are explicitly excluded from Phase 1 API responses.

## Controls in the foundation

- Cognito SRP authentication; no browser client secret and no credentials in Git
- JWT authorization on every API route
- Optional TOTP MFA architecture and strong password policy
- OwnerAdmin and future Coach groups, with no real users created
- Exact-table DynamoDB read permission; no write, update, or delete permissions
- Projected DynamoDB reads and a second response-level allowlist
- Private S3 with CloudFront OAC, TLS, CSP, HSTS, clickjacking protection, and a
  restrictive permissions policy
- Explicit CORS origins and API throttling
- Finite CloudWatch retention and logs without contact details or record bodies
- Deployment gate defaulting to false

## Required review before production

- Confirm Cognito threat-protection cost and MFA enrollment policy.
- Add CloudTrail/audit-event design before any data mutation is introduced.
- Decide whether the Coach role may view contact information.
- Add automated dependency and infrastructure scanning in CI.
- Confirm data retention, deletion, export, and incident-response procedures.
- Review privacy and regulatory obligations before storing medical information.
- Add WAF/rate-based controls if risk or traffic justifies them.

The local preview gate is a UI-development convenience only. It stores a marker
in browser session storage and provides no production security boundary.
