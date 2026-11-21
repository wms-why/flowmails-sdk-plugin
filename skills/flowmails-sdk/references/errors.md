# Errors & retries — `@flowmails/flowmails-sdk` v2.0

Every failure thrown by an SDK method is one of five typed error
classes. All extend `FlowmailsError`, which extends `Error`.

```ts
class FlowmailsError extends Error {
  readonly code: string;        // stable slug from the wire (e.g. "validation_failed")
  readonly status: number;      // HTTP status the backend answered (0 = transport)
  readonly retryable: boolean;  // true for 5xx, 408, 429, and transport failures
}

class AuthenticationError extends FlowmailsError {}    // 401
class ValidationError extends FlowmailsError {         // 400 / 404 / 409 / 422
  readonly detail?: string;
  readonly extra?: Record<string, unknown>;            // claimedBy / claimedAt, reason, …
}
class RateLimitError extends FlowmailsError {          // 408 / 429
  readonly limit?: number;
  readonly remaining?: number;
  readonly resetAt?: string;                           // ISO-8601
}
class UpstreamError extends FlowmailsError {           // 5xx, 502/504, transport
  readonly upstreamMessage?: string;
}
```

The class is decided by the **HTTP status**, never by the code string:

| Status                  | Class                 | Retried by the SDK? |
| ----------------------- | --------------------- | ------------------- |
| `401`                   | `AuthenticationError` | no                  |
| `400` / `404` / `409` / `422` | `ValidationError` | no              |
| `429` `idempotency_key_in_progress` | `RateLimitError` | yes      |
| `429` `rate_limit_exceeded` | `RateLimitError`  | no                  |
| `408`, `5xx`            | `UpstreamError`       | yes                 |
| transport failure / timeout | `UpstreamError("network_error", …, 0)` | yes |
| anything else (`403` `scope_denied`) | `FlowmailsError` | no    |

## The codes that actually ship

`code` is the platform's own slug, passed through unchanged. These are
the ones the backend emits today; treat any string as valid and
pattern-match the well-known ones.

| HTTP | `code`                                                              | What it means                                                                 |
| ---- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 400  | `invalid_json`                                                      | The body was not JSON. Nothing was sent.                                       |
| 400  | `validation_failed`                                                 | A field is wrong or missing — `detail` says which («must not be empty», «must be a string», …). |
| 401  | `missing_or_invalid_bearer`                                         | No `Authorization: Bearer` header, or it is malformed. `extra.reason` is `empty` or `key_format`. |
| 401  | `api_key_invalid`                                                   | The key is unknown, or was rotated / revoked. Mint a new one — the old one never comes back. |
| 401  | `agent_credential_invalid`                                          | An `agc_…` scoped credential was refused (`/api/agent/*` and MCP).            |
| 403  | `scope_denied`                                                      | The credential lacks the operation's scope. `extra` names the scope.           |
| 404  | `not_found`                                                         | Unknown route — a typed JSON body, not plain text.                             |
| 404  | `message_not_found`                                                 | No message with that `Message-ID` (or numeric id) under this tenant.           |
| 404  | `reply_parent_not_found`                                            | `replyToMessageId` names a message the platform cannot see.                    |
| 404  | `domain_not_found`                                                  | A `domainId` that is not this tenant's — including another tenant's, which answers the same way on purpose. |
| 409  | `idempotency_key_conflict`                                          | The same key was reused for a **different** payload. A caller bug — fix it, do not retry. |
| 409  | `sending_not_configured`                                            | The bound domain has no outbound provider. Refused **before** dispatch, so no quota slot is burned. |
| 409  | `domain_scope_missing`                                              | The credential carries no tenant scope. Reissue it from the dashboard.         |
| 409  | `message already claimed`                                           | Another credential of the same account holds a live claim. `extra.claimedBy` / `extra.claimedAt` say who and when. An expired claim does not block. |
| 422  | `from_domain_mismatch`                                              | `from` is not on the domain the key is bound to.                               |
| 422  | `reply_domain_unresolved`                                           | The address being replied to is not on a domain this tenant owns.              |
| 422  | `reply_parent_unthreadable`                                         | The parent message has no usable `Message-ID`/subject to thread on.            |
| 422  | `send_status_domain_unresolved`                                     | The delivery-status read could not resolve the domain's outbound provider.     |
| 429  | `rate_limit_exceeded`                                               | The send quota refused the send. Carries `limit` / `remaining` / `resetAt`. **Not retried** — the window is an hour. |
| 429  | `idempotency_key_in_progress`                                       | The same request is still running under that key. Retrying replays its answer, so the SDK does. |
| 502  | `send_failed`                                                       | The provider refused the message. Check `upstreamMessage`. **Also appears inside a 201** — see below. |
| 502  | `send_status_failed`                                                | The delivery-status read reached the provider and failed.                      |
| 502  | `internal_error`                                                    | Catch-all upstream failure.                                                    |
| 503  | `idempotency_unavailable`                                           | An `idempotencyKey` was supplied but the platform could not read its own record. The send is refused rather than sent unprotected. |
| —    | `network_error`                                                     | Client-side: DNS, TLS, abort, or the 15 s timeout. `status` is `0`.            |

## Retired codes — if you pattern-match these, you are reading an old doc

`api_key_revoked` (a revoked key answers `api_key_invalid`),
`worker_not_deployed`, `domain_not_bound`, `decode_failed`. There is no
per-tenant worker to be "not deployed" any more and no decode step in
the send path; a match on any of them is dead code. Two more that never
existed on the REST surface: `from_domain_not_bound` and
`no_bound_domain` are **MCP tool-result** slugs (the MCP server folds
the platform's prose into a slug), not `/api/v1/*` codes.

## Retry policy

The SDK retries **automatically** up to `maxRetries` (constructor
option, default `2`), with exponential backoff and jitter. Each attempt
is bounded by a 15 s timeout.

The discriminator is `FlowmailsError.retryable` **and** the code, and
they do not always agree — read both:

- **retried for you:** `5xx`, `408`, `network_error`, and the one 429
  worth retrying, `idempotency_key_in_progress` (a retry replays the
  first attempt's answer instead of sending twice).
- **never retried:** `AuthenticationError` and `ValidationError`
  (deterministic — a retry sends the same wrong thing again), and
  `rate_limit_exceeded` (the window is an hour; wait for `resetAt`
  rather than burning another slot).

If an error surfaces after the SDK's own retries, do not wrap the call
in a second retry loop. Route it to a queue / dead-letter and let a
human look.

## One slug appears inside a success

`send_failed` is the slug of a **refused send**, and a refused send is a
`201` with `status: "failed"` — not a thrown error. A caller that only
reads the HTTP status believes the mail went out. Always read
`status` (`sent` | `partial` | `failed`) and `error` on the result:

```ts
const result = await fm.send({ from, to, subject, text });
if (result.status !== "sent") throw new Error(result.error ?? "send refused");
```

`sending_not_configured` is the exception on purpose: a domain with no
outbound provider is refused with a `409` **before** dispatch, so no
failed row is written and no quota is consumed.

## Idempotency

`send` is idempotent **when you give it a key**. Pass `idempotencyKey`
and a retry replays the first answer instead of sending twice:

```ts
await fm.send({ from, to, subject, text, idempotencyKey: "order-1234-attempt-1" });
```

- The key is scoped to your **account** — two accounts may use the same
  string.
- Same key + **different** payload = `idempotency_key_conflict` (409).
- A retry arriving while the first attempt still runs answers
  `idempotency_key_in_progress` (429), which the SDK retries.
- A **failed** attempt consumes the key: the platform cannot know
  whether the worker took the message, so the retry replays the failure
  rather than risking a double send.
- Without a key, every call sends a new row — the right default for a
  caller that does its own dedupe.
