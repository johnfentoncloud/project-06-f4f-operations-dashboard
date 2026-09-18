# Phase 4A Slice 2 decision record

## PWA architecture

Use one installable **Fenton4Fitness Hub** at `https://app.fenton4fitness.com/`. The authenticated token determines whether the Coach or Athlete shell is shown. Two manifests or icons on the same origin would not isolate sessions: both experiences use the same origin and the current authentication implementation uses the same origin-scoped `sessionStorage` keys. Separate icons could therefore overwrite or unexpectedly share the active identity. True simultaneous Coach and Athlete sessions require separate origins (for example dedicated subdomains), separate CloudFront/S3 frontends, callback URLs, and deliberately isolated token storage. That infrastructure is deferred.

The service worker precaches only public static shell assets and an offline notice. Navigations are network-first. Requests carrying `Authorization`, cross-origin requests, runtime configuration, and all API/authenticated data are network-only. Cache names are versioned; activation deletes older F4F shell caches and claims clients immediately.

## Authentication decision

### Current architecture and verified constraint

The production frontend uses Cognito managed login with OAuth authorization-code + PKCE. Tokens are kept in `sessionStorage`, never in the service worker or persistent application storage. Terraform sets pool MFA to `ON` with software-token MFA, 15-minute access/ID tokens, a one-day refresh token, token revocation, and user-existence error prevention. MFA is a user-pool policy: another app client in this pool cannot exempt Athlete users from pool-required MFA. Live AWS inspection was attempted, but the available AWS principal lacks Cognito/API Gateway/CloudFront read permissions; the checked-in Terraform and current Terraform state remain the source of truth for this checkpoint.

### Options

| Option | Athlete usability | OwnerAdmin security | Migration / Terraform | Cost and recovery |
|---|---|---|---|---|
| A. Current pool, better UX | TOTP remains, but managed login supports platform password-manager autofill and refresh sessions | Unchanged mandatory TOTP | No identity migration; frontend guidance only | No material cost change. Lost phone uses the existing administrator-assisted recovery process. |
| B. Optional pool MFA | Password-only is easier | Not acceptable without a server-side token-issuance control that guarantees OwnerAdmin MFA | Pool policy and enforcement redesign | Similar direct cost; materially greater policy/recovery risk. |
| C. Separate Athlete pool | Password-only or Athlete-specific policy | Existing pool remains mandatory MFA | New pool/client/authorizer, route split, profile subject remap, invitation and controlled migration | Small usage-based Cognito cost, but meaningful operational overhead. Lost-phone recovery can use verified email under the Athlete policy. |
| D. Passkeys/WebAuthn | Best repeat-login experience using Face ID, fingerprint, or device PIN | Can coexist only with a carefully designed managed-login and recovery policy | Managed-login/passkey configuration, UX, enrollment, fallback, and migration work | Likely small direct cost; recovery and cross-device enrollment require product design. |

### Recommendation

Choose Option A for the three-person adult beta and keep OwnerAdmin protection unchanged. Cognito owns the actual username, current-password, new-password, password visibility, and TOTP fields because authentication happens on the Cognito-hosted page; adding duplicate local password inputs would be insecure and would not improve standards compliance. Validate iCloud Keychain, Google Password Manager, Face ID password fill, and Android biometric fill against the hosted page manually. After beta, evaluate Option D first. Choose Option C only if password-only Athlete access remains a firm requirement. Defer Options B–D, MFA changes, new pools/clients, passkey enrollment, recovery redesign, and all migrations until separate architecture approval.

## Inline exercise creation

OwnerAdmin quick-create uses the existing Exercise entity shape and `f4f-training-content` table. The server validates the approved category and measurement enums, creates a UUID, enforces exact normalized-name uniqueness with a transactional lock, checks legacy records for likely normalized-name matches, and stores an idempotency record in the same transaction. Duplicate responses return the existing exercise for explicit selection. Athlete routes have no creation UI, and the write Lambda still fails closed unless the JWT contains exactly the approved OwnerAdmin role semantics.
