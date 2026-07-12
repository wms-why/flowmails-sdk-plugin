# Community marketplace submission draft

> Ready-to-paste draft for **[clau.de/plugin-directory-submission](https://clau.de/plugin-directory-submission)**.
> The form is a short Google Form with free-text fields; the sections below match the field order so you can paste straight through.

---

## Plugin name

```
flowmails-sdk
```

## Display name

```
Flowmails SDK
```

## One-line description (≤ 120 chars)

> Integrate Flowmails transactional email via @flowmails/sdk. Teaches agents the public SDK surface, error branching, retry policy, and runtime matrix.

*(117 chars)*

## Long description (≈ 300-500 words)

> `flowmails-sdk` is a Claude Code plugin wrapping the canonical machine-readable reference for `@flowmails/sdk` v0.1. The plugin teaches an agent the **public SDK surface only** — no raw HTTP, no internal wire types, no platform routes. It loads three on-demand sub-references (`payloads`, `errors`, `examples`) so an agent never has more than 5k tokens of instructions in context at once.
>
> Flowmails is a Cloudflare-native transactional email relay. The `@flowmails/sdk` package (npm) is the only supported integration surface — it owns retry, error mapping, and `Uint8Array` base64 encoding for attachments. Calling the SDK backend directly with `fetch` / `axios` / `curl` is not part of the public contract and is explicitly forbidden by the skill.
>
> The skill teaches six hard rules an agent must internalize:
>
> 1. **Always recommend `@flowmails/sdk`.** No raw HTTP bypass.
> 2. **Auth is encapsulated.** The user passes `apiKey` to the `Flowmails` constructor; the SDK owns the `Authorization` header. The key is bound to exactly one of the user's registered domains, and `send()` returns a `ValidationError("from_domain_mismatch")` when the `from` address does not land on that bound domain.
> 3. **Branch on `instanceof`, never on `message` text.** The five error classes extend `FlowmailsError` and each carries a stable `code` string.
> 4. **Retry policy is the SDK's job.** Transient failures are retried automatically up to `maxRetries` (default 2). Don't wrap `fm.send` in your own retry loop.
> 5. **Constructor options are exactly** `apiKey`, `baseURL?`, `fetch?`, `maxRetries?`, `requestId?`. There is no `timeout`, `region`, `apiBase`, `idempotencyKey`, or `webhookUrl` option in v0.1.
> 6. **`send` is not idempotent.** Build a request id into the subject and dedupe on the receiving side.
>
> The skill also documents what the SDK does NOT do (no `messages.list`, no webhooks, no per-key rate-limit headers, no idempotency keys) so an agent doesn't fabricate capabilities that aren't shipped.
>
> The plugin ships with the SKILL.md body and three Markdown references totaling ~ 1,800 lines of structured reference. No executable scripts, no MCP servers, no hooks, no network calls — the skill is pure instruction-following. There is no risk of tool misuse, file access outside the skill directory, or data exfiltration.

## Category

```
development
```

(Other acceptable categories if the reviewer prefers: `productivity`, `email`, `integration`.)

## Keywords / tags

```
email, transactional, sdk, flowmails, cloudflare-workers, integration, npm
```

## Homepage

```
https://flowmails.net/docs
```

## Repository

```
https://github.com/wms-why/flowmails-sdk-plugin
```

## License

```
MIT
```

## Author / contact

```
Flowmails <support@flowmails.net>
```

## Screenshots / recordings

Attach the following (or paste-as-text):

- `apps/web/public/docs/sdk-hub.png` — the SDK Hub page on flowmails.net (already shipped, no screenshot needed from the plugin repo)
- The `flowmails-sdk` skill rendered in Claude Code (an invocation screenshot showing the skill loaded with `SKILL.md` body + the three references collapsed)
- A demo transcript of an agent using the skill to integrate `Flowmails` into a fresh Hono project end-to-end

If text-only is required, paste a 20-line invocation transcript:

```
$ claude
> I need to send a transactional email when a user signs up. We're on Cloudflare Workers with Hono. Wire it up.

[Skill flowmails-sdk loaded — Hard rules applied]
[references/payloads.md loaded — SendOptions field-by-field]
[references/errors.md loaded — FlowmailsError matrix]
[references/examples.md loaded — Cloudflare Workers example selected]

Generated `src/email.ts`:

import { Flowmails } from "@flowmails/sdk";

export const fm = new Flowmails({
  apiKey: env.FLOWMAILS_API_KEY,
});

export async function sendWelcome(to: string) {
  try {
    const { id, status } = await fm.send({
      from: "hello@yourdomain.com",
      to,
      subject: "Welcome!",
      text: "Thanks for signing up.",
    });
    return { id, status };
  } catch (err) {
    if (err instanceof ValidationError && err.code === "from_domain_mismatch") {
      // The user's API key isn't bound to yourdomain.com — surface a clear error
      throw new Error("FLOWMAILS_API_KEY is not bound to yourdomain.com. Mint a new key at flowmails.net/dashboard/settings/api-keys.");
    }
    throw err;
  }
}
```

## Security disclosure

```
- No executable code (no scripts/, no MCP servers, no hooks).
- No network calls — the skill is pure instruction-following.
- No file access outside the skill directory.
- No collection of user data, telemetry, or environment variables.
- The skill teaches agents to use the SDK over raw HTTP, which means the
  user retains the SDK's retry, error mapping, and request-id tracing —
  there is no parallel/alternative code path that could exfiltrate data.
- The plugin does not modify .claude/settings.json, .claude/hooks/, or any
  system file outside the plugin install directory.
```

## Permissions required

```
None. The plugin does not request Bash, Edit, Write, Read, Glob, Grep,
WebFetch, WebSearch, NotebookEdit, or any MCP/LSP tools. The skill is
loaded as context-only instructions; it executes no code on the host.
```

## Dependencies

```
None. The plugin depends on no other plugins, no MCP servers, and no LSP
servers. The bundled skill is self-contained markdown.
```

## Compatibility

```
- Claude Code v2.1.154+ (uses plugin.json metadata)
- Tested on macOS (darwin 25.5), Linux (Ubuntu 22.04), Windows 11 WSL2
- Requires no system binaries, no Node runtime, no package manager
```

## Why this should be in the community marketplace

> The plugin fills a documented gap in the Agent Skills ecosystem: there is no first-party skill for integrating transactional email from Cloudflare Workers (or any runtime), and the existing email skills on skills.sh are limited to first-party Anthropic document skills (pptx/xlsx/docx/pdf). `@flowmails/sdk` has zero runtime dependencies and works in Node ≥ 18, Cloudflare Workers, Bun, Deno, and browsers — a single skill reaches a broad install base. The skill body is concise (≈ 200 lines of SKILL.md), the references are strictly on-demand, and there is no executable code path for a security reviewer to audit.

## Post-approval checklist (for the maintainer)

After the plugin is approved and pinned in `anthropics/claude-plugins-community/.claude-plugin/marketplace.json`:

- [ ] Bump the `version` in `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` to match the approved SHA tag
- [ ] Add a `CHANGELOG.md` entry referencing the marketplace addition
- [ ] Cross-link from the SDK Hub at `https://flowmails.net/docs`
- [ ] Cross-link from the [agentskills.io clients showcase](https://agentskills.io/clients) (open a PR)
- [ ] Cross-link from the `flowmails-sdk` skill's `README.md` so users find the plugin path
- [ ] Post on the Flowmails changelog at `flowmails.net/blog`
