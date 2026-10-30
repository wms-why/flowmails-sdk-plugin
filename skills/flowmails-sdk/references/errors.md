# Errors & retries — `@flowmails/flowmails-sdk` v0.2

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
| `ValidationError`      | `invalid_json`, `validation_failed`, `missing_or_invalid_bearer`, `domain_not_found`, `from_domain_mismatch`, `from_domain_not_bound`, `domain_not_bound`, `worker_not_deployed`, `idempotency_key_conflict` |
| `RateLimitError`       | `rate_limited`, `rate_limit_exceeded`, `idempotency_key_in_progress`     |
| `UpstreamError`        | `send_failed`, `decode_failed`, `internal_error`, `network_error`, `idempotency_unavailable` |

## Retry policy

The SDK retries **automatically** up to `maxRetries` (default `2`,
exponential backoff with jitter). The total request is bounded by an
internal timeout.

The discriminator is `FlowmailsError.retryable`:

- **`retryable === true`** — `UpstreamError` (5xx, network failures)
  and the one 429 that is worth retrying:
  `idempotency_key_in_progress` — the first attempt under that key is
  still running, so the retry replays its answer rather than sending
  twice. The SDK has already retried up to `maxRetries`; if you
  receive one of these, give up and route to a queue / dead-letter
  for human attention.
- **`retryable === false`** — `AuthenticationError` and
  `ValidationError`. Deterministic; will keep failing until you fix
  the request. Do not retry.

**The send quota's 429 is NOT retried.** `rate_limit_exceeded` is a
429 whose window is an hour — a retry cannot succeed and would burn
another slot. It carries `limit`, `remaining` and `resetAt`
(ISO-8601) on the `RateLimitError`, so you can schedule the next
attempt instead of guessing.

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
| `rate_limit_exceeded`   | The send quota refused the send — wait for `resetAt`, do not retry                       |
| `idempotency_key_in_progress` | The first attempt under that key is still running — retrying replays its answer         |
| `idempotency_key_conflict` | The same idempotency key was used for a **different** payload — fix the caller            |
| `idempotency_unavailable` | The platform could not read its idempotency record — it refused to send unprotected      |
| `from_domain_not_bound` | The `from` address is on a domain the credential is not bound to — ask which domain       |
| `send_failed`            | Upstream SMTP relay rejected the message — check `upstreamMessage`                       |
| `network_error`          | DNS / TLS / fetch abort — usually transient, the SDK has already retried                 |

## Idempotency

`send` is idempotent **when you give it a key**. Pass
`idempotencyKey` and a retry replays the first answer instead of
sending twice:

```ts
await fm.send({ from, to, subject, text, idempotencyKey: "order-1234-attempt-1" });
```

- The key is scoped to your **account** — two accounts may use the
  same string.
- The same key with a **different** payload is a bug on your side:
  the platform answers `idempotency_key_conflict` (409) rather than
  quietly returning the first answer.
- A retry that arrives while the first attempt is still running
  answers `idempotency_key_in_progress` (429) — the SDK retries that
  one, because the retry replays the first answer.
- A **failed** attempt consumes the key: after a dispatch failure the
  platform cannot know whether the worker took the message, so the
  retry replays the failure rather than risking a double send.
- Without a key, every call sends a new row — the right default for a
  caller that does its own dedupe.
