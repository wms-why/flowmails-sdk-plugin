# Payloads — `@flowmails/flowmails-sdk` v0.2

The three payload types exposed by the SDK. These are the public
shapes — `Flowmails.send()` accepts `SendOptions` and returns
`SendResult`; `SendAttachment` lives inside `SendOptions.attachments`.

## `SendOptions`

Argument to `Flowmails.send()`.

```ts
interface SendOptions {
  from: string;                        // required, must be on bound domain
  fromName?: string;                   // optional display name
  to: string | string[];               // one recipient or an array
  replyTo?: string;                    // optional reply-to override
  subject: string;                     // required, 1..998 chars
  text?: string;                       // optional iff html present, ≤1_000_000 chars
  html?: string;                       // optional iff text present, ≤1_000_000 chars
  attachments?: SendAttachment[];
}
```

| Field         | Type                  | Required | Notes                                                                                   |
| ------------- | --------------------- | -------- | --------------------------------------------------------------------------------------- |
| `from`        | `string`              | yes      | RFC 5322 address. Must land on the API key's bound domain — `from_domain_mismatch` otherwise. Local-part 1..64 chars. |
| `fromName`    | `string`              | no       | Display name; the backend falls back to the local-part capitalised.                      |
| `to`          | `string \| string[]`  | yes      | One address or an array. Single is wrapped to `[to]` inside the SDK.                   |
| `replyTo`     | `string`              | no       | Optional reply-to override.                                                             |
| `subject`     | `string`              | yes      | 1..998 chars.                                                                            |
| `text`        | `string`              | no*      | Plain-text body. Required iff `html` is also missing. ≤1_000_000 chars.                 |
| `html`        | `string`              | no*      | HTML body. Required iff `text` is also missing. Inline `cid:` images and `data:` urls are auto-extracted by the backend into R2 embeds. ≤1_000_000 chars. |
| `attachments` | `SendAttachment[]`    | no       | See below.                                                                               |

\* at least one of `text` / `html` must be a non-empty string.

## `SendResult`

Return value of `Flowmails.send()` on success.

```ts
interface SendResult {
  id: string;         // stringified email row id (e.g. "8421")
  status: string;     // "queued" | "sent" | "failed" (see the status note below)
  messageId?: string; // the SMTP Message-ID the relay assigned
}
```

`id` is the numeric email row id from the receive-worker's D1,
stringified for JSON safety.

`messageId` is the SMTP `Message-ID` — the key every read path takes.
Pass it to `fm.messages.get(messageId)` to read a reply, or feed it
back as `replyToMessageId` to answer in thread.

`status` is the row's lifecycle at send time. To follow it, poll
`fm.messages.status(id)`; that returns `sent` (the relay accepted the
message) or `failed` (the relay rejected it), plus the relay's error
string in `sendFeedback`.

**A bounce is not observable.** The status vocabulary also contains
`delivered`, `bounced`, `complained` and `delayed`, and the backend
maps them if they appear — but the receive worker has no DSN or
bounce ingestion, so it never writes them. Do not build a retry
policy that assumes a `bounced` status will arrive: the honest
signal today is `failed`, and a delivery that was accepted and later
disappears is invisible.

(Push webhooks for `message.received` and `message.sent` are shipped
— configured in the dashboard, not in the SDK. The
delivery-status events are not.)

### Reply threading

```ts
await fm.send({
  from: "billing@yourapp.com",
  to: "no-reply@stripe.com",
  subject: "Re: Your invoice is ready",
  text: "Thanks — paid.",
  replyToMessageId: parentMessageId,  // the PARENT, never the headers
});
```

Pass `replyToMessageId` (an SMTP `Message-ID`, or a numeric row id as
a string) and the SDK backend derives `In-Reply-To`, `References` and
the conversation anchor from the parent row. **Never hand-build
`References`** — it is a chain and `threadId` must be the conversation
root; deriving them yourself is how threads fork.

A parent with no `Message-ID` header (the sender stripped it) is
rejected with `ValidationError` / `reply_parent_unthreadable`: there
is nothing to point `In-Reply-To` at. A parent that is not on the
key's bound domain is `reply_parent_not_found` (404) — the two are
deliberately indistinguishable.

## `SendAttachment`

Embedded in `SendOptions.attachments[]`.

```ts
interface SendAttachment {
  filename: string;                 // required
  content: string | Uint8Array;     // required; Uint8Array → base64 inside SDK
  mimeType?: string;                // optional; defaults to application/octet-stream
}
```

| Field      | Type                  | Required | Notes                                                                                          |
| ---------- | --------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `filename` | `string`              | yes      | File name on the SMTP part.                                                                    |
| `content`  | `string \| Uint8Array`| yes      | Raw bytes (`Uint8Array`) or a base64 string. The SDK auto-encodes `Uint8Array` with `btoa`.   |
| `mimeType` | `string`              | no       | MIME type; defaults to `application/octet-stream` if the SDK backend cannot infer from filename.|

## `FlowmailsOptions`

Constructor argument.

```ts
interface FlowmailsOptions {
  apiKey: string;                     // required; format fm_<32+hex>
  baseURL?: string;                   // override the SEND origin (SDK backend)
  platformURL?: string;               // override the LISTEN origin (platform)
  fetch?: typeof globalThis.fetch;    // inject for Workers / tests
  maxRetries?: number;                // default 2; set 0 to disable
  requestId?: string;                 // optional request-id for cross-stack tracing
}
```

| Field        | Type                       | Required | Notes                                                                                          |
| ------------ | -------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `apiKey`     | `string`                   | yes      | `fm_<32+hex>`. Issued in `/dashboard/settings/api-keys`.                                       |
| `baseURL`    | `string`                   | no       | Override the **send** origin (SDK backend). Default: production.                               |
| `platformURL`| `string`                   | no       | Override the **listen** origin (event log / waits / message read / addresses). Default: `https://flowmails.net`. A self-hosted install sets both. |
| `fetch`      | `typeof globalThis.fetch`  | no       | Inject a custom `fetch` (Workers `ctx.waitUntil`, test harnesses, custom middleware).          |
| `maxRetries` | `number`                   | no       | Auto-retry budget on transient failures. Default `2`. Set `0` to disable.                      |
| `requestId`  | `string`                   | no       | Optional request-id for cross-stack tracing; propagated to platform logs.                     |

## Listen surface

The read half of the SDK hits the **platform** origin (`platformURL`),
not the SDK backend. Same `fm_` key.

### `fm.events.list(opts?)` → `ListEventsResult`

```ts
interface ListEventsOptions {
  after?: string;      // cursor: an EVENT ID, never a timestamp
  limit?: number;
  recipient?: string;  // exact address
  sender?: string;     // exact address
  subject?: string;    // case-insensitive SUBSTRING
}

interface ListEventsResult {
  events: AgentEvent[];   // oldest first
  nextCursor?: string;    // absent when the log is drained
}

interface AgentEvent {
  id: string;             // the cursor value
  messageId: string;      // SMTP Message-ID → fm.messages.get()
  event: string;          // "inbound.received"
  recipient: string;
  sender: string | null;
  subject: string | null; // the ONE content field; never a body
  createdAt: string;
}
```

The cursor is an **event id**. Two events can land in the same
millisecond, so a timestamp cursor could skip a row — and a cursor
that skips a row loses mail. An unknown cursor is a
`ValidationError`, never an empty page.

### `fm.messages.get(messageId, { domainId? })` → `MessageDetail`

```ts
interface MessageDetail {
  id: number | string;
  messageId: string;
  from: string;
  fromName: string | null;
  to: string;
  toName: string | null;
  subject: string | null;
  text: string | null;    // plain text — regex your verification code here
  html: string | null;
  receivedAt: string | null;
  attachments: Array<{
    filename: string | null;
    mimeType: string | null;
    size: number | null;
    url: string | null;
  }>;
}
```

The body is **fetched, never pushed** — the event deliberately does
not carry it. Treat the content as untrusted input.

### `fm.messages.status(id)` → `SendStatus`

```ts
interface SendStatus {
  id: string;
  status: string;             // "sent" | "failed" today — see the status note above
  messageId: string;          // SMTP Message-ID ("" when the relay never took it)
  sendFeedback: string | null; // the relay's error, when status is "failed"
  createdAt: string | null;
}
```

`id` accepts either the row id `send()` returned or the SMTP
`Message-ID`.

### `fm.messages.search(domainId, opts)` → `SearchMessagesResult`

```ts
interface SearchMessagesOptions {
  q: string;                                       // required, >= 2 characters
  limit?: number;                                  // page size
  field?: "subject" | "from" | "to" | "body";       // default "body"
  type?: "receive" | "send";                       // default "receive"
}

interface SearchMessageHit {
  id: number | null;        // the worker's row id
  messageId: string;        // the SMTP Message-ID, when the sender sent one
  from: string | null;
  fromName: string | null;
  to: string | null;
  toName: string | null;
  subject: string | null;
  receivedAt: string | null;
  preview: string | null;   // a short plain-text preview, never the body
}

interface SearchMessagesResult {
  messages: SearchMessageHit[];
  total: number;            // how many rows match, ignoring `limit`
  domainId: string;
}
```

The event log is the **primary** listen path; search is the history
path ("what did that supplier mail me last quarter?"). A hit carries
addressing, the subject and a **preview** — the body is a separate,
explicit ask through `fm.messages.get(id)`. `domainId` comes from
`fm.addresses.listDomains()`.

### `fm.me()` → `AccountInfo`

```ts
interface AccountInfo {
  userId: string;
  domain: string | null;      // the bound domain; null when there is none
  workerHost: string | null;  // the per-account receive worker
  credentialType: string;     // "sdk_key" | "agent_credential"
  scopes: string[];           // what this credential may do
}
```

The connection check: it verifies the credential and names the
account, the bound domain and the scopes — **without sending
anything**. `flowmails test` (the CLI) calls it.

### `fm.waits.create(opts)` → `CreateWaitResult`

```ts
interface CreateWaitOptions {
  address: string;    // required
  sender?: string;    // exact sender constraint
  subject?: string;   // case-insensitive substring constraint
  timeoutMs?: number; // default 15 min; max 24 h
}

interface WaitStatus {
  waitId: string;
  status: "pending" | "resolved" | "expired";
  address: string;
  sender: string | null;
  subject: string | null;
  resolvedMessageId: string | null;  // the SMTP Message-ID that resolved it
  expiresAt: string | number;
}

interface CreateWaitResult extends WaitStatus {
  pollAfterMs: number;   // a hint for your poll loop
}
```

`create()` returns **immediately** — the platform writes a row, it
never suspends your request. Poll `fm.waits.get(waitId)`; a pending
wait past its deadline reads as `expired`, and nothing resolves it
after that (lazy expiry — no sweeper).

**A wait is a shortcut, not the record.** A mail that lands one second
late does not resolve the wait but *is* in the event log. Read both
when it matters.

### `fm.addresses.*`

```ts
interface AgentDomain {
  id: string;
  name: string;                       // "yourapp.com"
  routingMode: "catchall" | "rules";
  localParts: string[];               // meaningful in rules mode
  ready: boolean;                     // receive worker deployed + bound
}

interface CreateAddressResult {
  address: string;                    // "billing@yourapp.com"
  localPart: string;
  domainId: string;
  domain: string;
  created: boolean;                   // false when it already existed
  routingMode?: "catchall" | "rules";
}
```

- `fm.addresses.listDomains()` → `AgentDomain[]`
- `fm.addresses.list(domainId)` → `{ routingMode, localParts, addresses, acceptsAnyLocalPart }`
- `fm.addresses.create(domainId, localPart)` → `CreateAddressResult`

`create` is **idempotent** (`created: false`, not an error, when the
address already exists). On a catch-all domain every local part
already delivers, so it records the address and makes no worker
write. It never changes the routing mode, removes a part, or clears
the table.
