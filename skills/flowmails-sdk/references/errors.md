# Errors & retries — `@flowmails/sdk` v0.1

Every failure thrown by `Flowmails.send()` is one of five typed
error classes. All extend `FlowmailsError`, which extends `Error`.

```ts
class FlowmailsError extends Error {
  readonly code: string;        // stable string identifier (e.g. "validation_failed")
  readonly retryable: boolean;  // true for transient failures
}

class AuthenticationError extends FlowmailsError {}   // key missing / invalid / revoked
class ValidationError extends FlowmailsError {        // request was rejected
  readonly detail?: string;
}
class RateLimitError extends FlowmailsError {}         // back off
class UpstreamError extends FlowmailsError {          // SDK backend or network
  readonly upstreamMessage?: string;
}
```

## Class → `code` matrix

| Class                  | `code` values                                                           |
| ---------------------- | ----------------------------------------------------------------------- |
| `AuthenticationError`  | `api_key_invalid`, `api_key_revoked`                                    |
| `ValidationError`      | `invalid_json`, `validation_failed`, `missing_or_invalid_bearer`, `domain_not_found`, `from_domain_mismatch`, `domain_not_bound`, `worker_not_deployed` |
| `RateLimitError`       | `rate_limited`                                                           |
| `UpstreamError`        | `send_failed`, `decode_failed`, `internal_error`, `network_error`        |

## Retry policy

The SDK retries **automatically** up to `maxRetries` (default `2`,
exponential backoff with jitter). The total request is bounded by an
internal timeout.

The discriminator is `FlowmailsError.retryable`:

- **`retryable === true`** — `RateLimitError` and `UpstreamError`. The
  SDK has already retried up to `maxRetries`; if you receive one of
  these, give up and route to a queue / dead-letter for human
  attention.
- **`retryable === false`** — `AuthenticationError` and
  `ValidationError`. Deterministic; will keep failing until you fix
  the request. Do not retry.

**Hard rule for agent code:** do NOT wrap `fm.send` in your own
retry loop. The SDK already covers the retryable cases. Re-retrying
deterministic failures just burns CPU.

## Common `code` → diagnosis

| `code`                   | Diagnosis                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| `from_domain_mismatch`   | `from` does not land on the API key's bound domain — ask the user which domain to use    |
| `domain_not_bound`       | The bound domain has no receive-worker deployed (deploy is in flight / failed)           |
| `worker_not_deployed`    | The bound domain's per-account worker has not been deployed yet                          |
| `api_key_invalid`        | Wrong key, or key was rotated — mint a new one in the dashboard                          |
| `api_key_revoked`        | Key was explicitly revoked in the dashboard — mint a new one                             |
| `rate_limited`           | Back off and retry (the SDK already does); do not hammer the API                         |
| `send_failed`            | Upstream SMTP relay rejected the message — check `upstreamMessage`                       |
| `network_error`          | DNS / TLS / fetch abort — usually transient, the SDK has already retried                 |

## Idempotency

`send` is **not** idempotent. The SDK writes a new email row on every
successful call. If your caller can retry after a transient failure,
build a request id into the subject line (e.g.
`"Order #1234 [trace-abc]"`) or your own dedupe key before forwarding
to `fm.send`. There is no idempotency option in v0.1.
