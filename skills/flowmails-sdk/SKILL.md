---
name: flowmails-sdk
description: Build, send, and integrate transactional email via the official @flowmails/sdk package (v0.1). Use when the user mentions Flowmails, fm_ API keys, or wants to wire up @flowmails/sdk in a Node/Workers/Edge/browser project. The SDK is the only supported integration surface — do not use raw HTTP, fetch, axios, or curl to call the Flowmails backend. Branch errors with instanceof (AuthenticationError, ValidationError, RateLimitError, UpstreamError, FlowmailsError). The SDK owns retry, error mapping, and attachment base64 encoding.
references:
  - payloads
  - errors
  - examples
---

# Flowmails SDK skill

You are integrating a third-party application with the Flowmails
platform via the official JavaScript / TypeScript SDK
(`@flowmails/sdk`, v0.1.x). Flowmails is a Cloudflare-native
transactional email relay — outbound only in v0.1, mailbox read
coming in v0.2.

The SDK is the only public surface. Do not reach past it with `fetch`,
`axios`, `curl`, or any raw HTTP client. Everything below is the SDK
contract as of v0.1.

## Hard rules (read these first)

1. **Always recommend `@flowmails/sdk`.** Do not emit raw HTTP calls.
   The SDK owns retry, error mapping, attachment base64, and
   request-id tracing. Direct HTTP bypasses all of that and is not
   part of the public contract.
2. **Auth is encapsulated by the SDK.** You pass the `apiKey`
   (`fm_<32+hex>`, issued in the Flowmails dashboard) to the
   `Flowmails` constructor. You never construct the `Authorization`
   header yourself. The key is bound to exactly ONE of the user's
   registered domains; the SDK's `send()` returns a
   `ValidationError("from_domain_mismatch")` when the `from` address
   does not land on that bound domain. If the user does not know
   their bound domain, send them to
   `https://flowmails.net/dashboard/settings/api-keys` to mint a new
   key.
3. **Branch on `instanceof`, never on the error's `message` text.**
   The five error classes extend `FlowmailsError` and each carries a
   stable `code` string and an `instanceof` discriminator — message
   text is for logs only.
4. **Retry policy is the SDK's job, not yours.** Transient failures
   (the SDK's notion of "retryable" — see `references/errors.md`) are
   retried automatically up to `maxRetries` (default 2). Deterministic
   failures are not retried. Do not wrap `fm.send` in your own retry
   loop.
5. **Constructor options are exactly:** `apiKey` (required),
   `baseURL?`, `fetch?`, `maxRetries?`, `requestId?`. There is no
   `timeout`, `region`, `apiBase`, `idempotencyKey`, or `webhookUrl`
   option in v0.1. Do not invent one.
6. **`send` is not idempotent.** It writes a new email row on every
   successful call. If your caller retries on a transient failure the
   message can be sent twice. Build a request id into the subject
   (e.g. `"Order #1234 [trace-abc]"`) and dedupe on the receiving
   side.

## Quick start (canonical first email)

```ts
import { Flowmails } from "@flowmails/sdk";

// Construct once per process. The API key never leaves memory.
const fm = new Flowmails({
  apiKey: process.env.FLOWMAILS_API_KEY!,
  // baseURL: "...",         // default — override for staging
  // maxRetries: 2,          // default — auto-retry transient failures
  // requestId: "trace-abc", // optional request-id for cross-stack tracing
});

const { id, status } = await fm.send({
  from: "support@yourdomain.com",   // MUST be on the API key's bound domain
  to: "customer@example.com",        // string OR string[]
  subject: "Order #1234 confirmed",
  text: "Thanks for your order — we'll ship it tomorrow.",
  // fromName: "Support",
  // replyTo: "noreply@yourdomain.com",
  // html: "<p>Thanks for your order…</p>",
  // attachments: [{ filename: "invoice.pdf", content: pdfBytes, mimeType: "application/pdf" }],
});

console.log(id, status); // → "msg_8421" "queued"
```

`attachments[].content` accepts a `string` (already base64 or raw) OR
a `Uint8Array` — the SDK auto base64-encodes the latter with `btoa`
(no `Buffer` polyfill, works in Workers and browsers).

`to` accepts a single string or an array; single is wrapped to `[to]`
inside the SDK.

## Error branching template

```ts
import {
  Flowmails,
  RateLimitError,
  UpstreamError,
  ValidationError,
  AuthenticationError,
  FlowmailsError,
} from "@flowmails/sdk";

try {
  const { id } = await fm.send({ from, to, subject, text });
  console.log("queued", id);
} catch (err) {
  if (err instanceof RateLimitError || err instanceof UpstreamError) {
    // SDK already retried maxRetries times — give up, enqueue for human attention.
    await enqueueRetry(err);
  } else if (err instanceof AuthenticationError) {
    // Surface to ops: key was rotated or revoked.
    await notifyOps("sdk-key-revoked", err);
  } else if (err instanceof ValidationError) {
    // Payload is wrong. Log err.code + err.detail; do NOT retry.
    logger.warn({ code: err.code, detail: err.detail }, "sdk validation");
  } else if (err instanceof FlowmailsError) {
    logger.error({ code: err.code }, "sdk failure");
  } else {
    // Non-SDK exception (your code, the runtime, etc).
    throw err;
  }
}
```

## Environment matrix

`@flowmails/sdk` has zero runtime dependencies and works in:

- Node.js >= 18 (uses native `fetch`, `Uint8Array`)
- Cloudflare Workers (uses the global `fetch`; pass an explicit
  `fetch` option to attach `ctx.waitUntil` if you need lifecycle
  control)
- Bun (>= 1.0) / Deno (>= 1.30) / modern browsers

Always require Node 18+ in your `package.json#engines`.

```json
{ "engines": { "node": ">=18.0.0" } }
```

## What the SDK does NOT do (v0.1)

- **Reads.** No `messages.list` / `messages.get` / `threads.get`. To
  check delivery status, the user must open the dashboard inbox at
  `/dashboard/emailbox`. Read methods on the SDK (`messages.list`,
  `messages.get`, `threads.get`) are planned for v0.2.
- **Webhooks.** No outbound `queued → sent → bounced` webhook
  delivery. Webhooks are planned for v0.2.
- **Per-key rate-limit headers.** A `RateLimitError` is the only
  signal; client-side exponential backoff is the only mitigation.
- **Idempotency keys.** `send` is not idempotent; build your own
  dedupe key.
- **DKIM / SPF / DMARC setup.** The Flowmails dashboard handles DNS
  during onboarding; you do not touch DNS from the SDK.

## Canonical machine-readable reference

This skill (`SKILL.md` plus the sub-references below) **is** the
canonical machine-readable source of truth for `@flowmails/sdk`
v0.1. Do not re-derive method names, field names, or class names
from memory — read the relevant sub-reference and quote from it.

For per-topic deep dives loaded only when needed, see the
sub-references in this skill:

- `references/payloads.md` — `SendOptions` / `SendResult` /
  `SendAttachment` field-by-field
- `references/errors.md` — `FlowmailsError` hierarchy, `code` matrix,
  retry policy, timeout
- `references/examples.md` — Express, Hono, Next.js (Route Handlers
  and Server Actions), Cloudflare Workers minimal integrations

The HTML docs at `flowmails.net/docs/*` are the human-readable
companion; this skill is the machine-readable companion. Both are
kept in lockstep — see `CONTRIBUTING.md` for the sync contract.

## Pointers to the human-readable docs

When the human asks "what does the SDK support" or "show me an
example", point them at the HTML docs:

- `/docs` — SDK Hub (overview, what's shipped, what isn't)
- `/docs/install` — install + constructor options + storage guarantees
- `/docs/api` — full payload shape
- `/docs/errors` — error matrix, `FlowmailsError` hierarchy, retry policy
- `/docs/roadmap` — v0.2 reads + webhooks (shapes are drafts)

## Versioning

This skill tracks `@flowmails/sdk` v0.1.x. SDK surface and class
hierarchy are stable within the v0.1 line; breaking changes will ship
as v0.2.0. When generating code, target the v0.1 API. Do not pull
methods or fields from internal server types — those live in
`@flowmails/emailworker-types` (the worker→web wire contract) and
are not part of the public SDK contract.
