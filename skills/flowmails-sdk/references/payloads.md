# Payloads — `@flowmails/sdk` v0.1

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
  id: string;        // stringified email row id (e.g. "msg_8421")
  status: "queued";  // always the literal string "queued" in v0.1
}
```

`id` is the numeric email row id from the receive-worker's D1,
stringified for JSON safety. `status` is always `"queued"` in v0.1 —
the SDK does not surface the SMTP `delivered` / `bounced` lifecycle
(webhooks are v0.2).

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
  baseURL?: string;                   // override (default: Flowmails SDK backend)
  fetch?: typeof globalThis.fetch;    // inject for Workers / tests
  maxRetries?: number;                // default 2; set 0 to disable
  requestId?: string;                 // optional request-id for cross-stack tracing
}
```

| Field        | Type                       | Required | Notes                                                                                          |
| ------------ | -------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `apiKey`     | `string`                   | yes      | `fm_<32+hex>`. Issued in `/dashboard/settings/api-keys`.                                       |
| `baseURL`    | `string`                   | no       | Override the SDK's base URL (for staging). Default: production.                                |
| `fetch`      | `typeof globalThis.fetch`  | no       | Inject a custom `fetch` (Workers `ctx.waitUntil`, test harnesses, custom middleware).          |
| `maxRetries` | `number`                   | no       | Auto-retry budget on transient failures. Default `2`. Set `0` to disable.                      |
| `requestId`  | `string`                   | no       | Optional request-id for cross-stack tracing; propagated to platform logs.                     |
