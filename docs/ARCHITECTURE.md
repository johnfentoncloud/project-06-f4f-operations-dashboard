# Architecture

## Phase 1 target

```mermaid
flowchart TB
    subgraph PublicEdge[Public edge]
      CF[CloudFront distribution]
      S3[Private S3 frontend]
      CF -->|Origin Access Control| S3
    end

    subgraph Identity[Identity boundary]
      Cognito[Cognito user pool]
      Owners[OwnerAdmin group]
      Coaches[Future Coach group]
      Owners --> Cognito
      Coaches --> Cognito
    end

    subgraph Application[Authenticated application boundary]
      API[API Gateway HTTP API]
      Auth[JWT authorizer]
      Health[Health Lambda]
      Leads[Read-only leads Lambda]
      Logs[CloudWatch Logs]
      API --> Auth
      API --> Health
      API --> Leads
      Health --> Logs
      Leads --> Logs
    end

    subgraph Existing[Existing Project 04 boundary]
      DDB[(F4F lead table)]
      Capture[Lead capture Lambda]
      Capture --> DDB
    end

    Browser[John or Jess browser] -->|HTTPS| CF
    Browser -->|SRP authentication| Cognito
    Browser -->|Bearer JWT over HTTPS| API
    Leads -->|Scan/GetItem/Query only; projected fields| DDB
```

The frontend never calls DynamoDB. Cognito identity is evaluated at API Gateway,
and Lambda receives only already-authorized requests. Phase 1 keeps both routes
authenticated, including health, to avoid creating an unnecessary public API.

## Lead-read strategy

Project 04 uses `leadId` for idempotent writes and stores `submittedAt` as an ISO
timestamp. It does not currently expose a query-oriented index for chronological
lead lists. Phase 1 therefore proposes a capped, paginated `Scan` with a
`ProjectionExpression` and response allowlist. This is acceptable only for the
small initial dataset. Before volume increases, prefer a purpose-built index or
read model created through a separately reviewed Project 04 migration.

## Custom domain later

The initial deployment can use the generated CloudFront hostname. A future
`dashboard.fenton4fitness.com` change requires:

1. An ACM certificate in `us-east-1` covering the dashboard hostname.
2. The hostname added as a CloudFront alternate domain name.
3. A Porkbun CNAME from `dashboard` to the CloudFront domain.
4. Updated CORS and Cognito callback/logout URLs.

No DNS or ACM resource is included in the Phase 1 foundation.
