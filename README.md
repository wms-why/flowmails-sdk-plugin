# `@flowmails/sdk` Claude Code Plugin

> Distilled, machine-actionable instructions for AI agents integrating the [`@flowmails/sdk`](https://flowmails.net/docs) v0.1 — packaged as a Claude Code plugin.

This repository is the **plugin wrapper** around the [`flowmails-sdk` skill](https://github.com/wms-why/flowmails-sdk-plugin/tree/main/skills/flowmails-sdk). The skill body (`SKILL.md` + `references/`) is the single source of truth for the public SDK surface; this repo adds the Claude Code plugin manifest, a self-hosted marketplace, and the sync tooling that keeps the bundled skill in lockstep with the platform's `/docs/*` pages.

## What you get

- **`flowmails-sdk` skill** — the SKILL.md body and three on-demand sub-references (`payloads`, `errors`, `examples`) teach an agent the full public SDK surface for `@flowmails/sdk` v0.1: constructor options, `SendOptions` / `SendResult` / `SendAttachment` field shapes, the five `FlowmailsError` subclasses, retry policy, and runtime matrix (Node / Workers / Bun / Deno / browser).
- **Plugin manifest** at `.claude-plugin/plugin.json` so Claude Code can install the skill as a namespaced plugin (`flowmails-sdk:flowmails-sdk`).
- **Self-hosted marketplace** at `.claude-plugin/marketplace.json` so a single `git clone` is enough to ship the plugin to your team.

## Install

### Claude Code (plugin / marketplace)

```bash
# Add the marketplace, then install the plugin
/plugin marketplace add wms-why/flowmails-sdk-plugin
/plugin install flowmails-sdk@flowmails-plugins
```

Or one-shot from a local checkout:

```bash
claude --plugin-dir /path/to/flowmails-sdk-plugin
```

### Claude Code (raw skill via skills.sh)

The plugin bundles the skill, but if you only want the bare skill (no plugin wrapper), skills.sh installs it directly. The canonical install command is kept in lockstep with `apps/web/app/routes/docs/ai-agents.tsx` in the platform monorepo:

```bash
npx skills add wms-why/flowmails-sdk-plugin@flowmails-sdk
```

### Other Agent Skills clients

The bundled skill follows the [Agent Skills spec](https://agentskills.io), so any skills-compatible client auto-discovers it from the GitHub repo. Pick your client:

| Client | Install | Notes |
|---|---|---|
| **Claude Code** | `/plugin marketplace add wms-why/flowmails-sdk-plugin` | recommended |
| **Cursor** | drop the repo into `.cursor/skills/`, or symlink | [docs](https://cursor.com/docs/context/skills) |
| **VS Code + GitHub Copilot** | drop the repo into `.github/skills/` | [docs](https://code.visualstudio.com/docs/copilot/customization/agent-skills) |
| **OpenAI Codex** | drop into `.codex/skills/` | [docs](https://developers.openai.com/codex/skills/) |
| **Gemini CLI** | drop into `.gemini/skills/` | [docs](https://geminicli.com/docs/cli/skills/) |
| **JetBrains Junie** | drop into `.junie/skills/` | [docs](https://junie.jetbrains.com/docs/agent-skills.html) |
| **Kiro** | drop into `.kiro/skills/` | [docs](https://kiro.dev/docs/skills/) |
| **OpenCode** | drop into `.opencode/skills/` | [docs](https://opencode.ai/docs/skills/) |
| **Goose** | drop into `.goose/skills/` | [docs](https://block.github.io/goose/docs/guides/context-engineering/using-skills/) |
| **Roo Code** | drop into `.roo/skills/` | [docs](https://docs.roocode.com/features/skills) |
| **Amp** | drop into `.amp/skills/` | [docs](https://ampcode.com/manual#agent-skills) |
| **Letta Code** | drop into `.letta/skills/` | [docs](https://docs.letta.com/letta-code/skills/) |
| **Trae** | drop into `.trae/skills/` | [docs](https://www.trae.ai/blog/trae_tutorial_0115) |
| **Qodo** | drop into `.qodo/skills/` | [docs](https://www.qodo.ai/blog/how-i-use-qodos-agent-skills-to-auto-fix-issues-in-pull-requests/) |
| **Laravel Boost** | drop into `boost/skills/` | [docs](https://laravel.com/docs/12.x/boost#agent-skills) |
| **Factory** | `factory skills add wms-why/flowmails-sdk-plugin` | [docs](https://docs.factory.ai/cli/configuration/skills) |
| **skills.sh** (registry) | `npx skills add wms-why/flowmails-sdk-plugin@flowmails-sdk` | [registry](https://skills.sh) |

A full list of compatible clients lives at [agentskills.io/clients](https://agentskills.io/clients).

## What the skill teaches

The skill is the **single source of truth** for the public SDK. Key contracts:

- **Always recommend `@flowmails/sdk`.** No raw `fetch` / `axios` / `curl` to the SDK backend.
- **Constructor**: `new Flowmails({ apiKey, baseURL?, fetch?, maxRetries?, requestId? })`. No `timeout`, `region`, `apiBase`, `idempotencyKey`, or `webhookUrl`.
- **`send(options)`** with `from`, `to`, `subject`, `text` / `content`, `attachments?`, `fromName?`, `replyTo?`. `attachments[].content` is `string` or `Uint8Array` (auto base64).
- **Error branching**: `instanceof FlowmailsError` → branch on `RateLimitError | UpstreamError | AuthenticationError | ValidationError`. Never on `message`.
- **Retry policy**: SDK auto-retries transient failures up to `maxRetries` (default 2). Don't wrap in your own retry loop.
- **`send` is not idempotent.** Build a request id into the subject and dedupe on the receiving side.
- **Runtime matrix**: Node ≥ 18, Cloudflare Workers, Bun ≥ 1.0, Deno ≥ 1.30, modern browsers.

For the field-by-field reference, the full error matrix, and drop-in code samples, the skill loads its sub-references on demand:

- `references/payloads.md` — `SendOptions` / `SendResult` / `SendAttachment` field shapes, required-ness, length limits, validation rules
- `references/errors.md` — `FlowmailsError` hierarchy, the `code` matrix per class, retry policy, diagnosis table
- `references/examples.md` — Express, Hono, Next.js (Route Handlers and Server Actions), Cloudflare Workers minimal integrations

## Repository layout

```
.
├── .claude-plugin/
│   ├── plugin.json         # Claude Code plugin manifest
│   └── marketplace.json    # Self-hosted marketplace (lists this plugin)
├── skills/
│   └── flowmails-sdk/      # canonical skill source (same content as the monorepo's skills/flowmails-sdk/)
│       ├── SKILL.md
│       └── references/
│           ├── errors.md
│           ├── examples.md
│           └── payloads.md
├── SUBMISSION.md           # Draft for clau.de/plugin-directory-submission
├── README.md               # this file
├── CONTRIBUTING.md
├── LICENSE
└── package.json
```

The canonical skill source lives at this repo's `skills/flowmails-sdk/` subpath. The monorepo's `apps/flowmails-sdk-plugin` submodule pulls the same content — there is no copy/sync step. Updating the bundle = bump the monorepo's submodule pointer.

## Local development

```bash
# Clone (or update an existing checkout) — submodules are NOT auto-fetched
git clone --recurse-submodules https://github.com/wms-why/flowmails-sdk-plugin.git
# or, if you already cloned without --recurse-submodules:
git submodule update --init --recursive

# Pull the latest skill from the upstream skill repo
git submodule update --remote skills/flowmails-sdk
git add skills/flowmails-sdk
git commit -m "chore(plugin): bump flowmails-sdk submodule to <sha>"

# Validate the plugin manifest (requires claude CLI ≥ 2.1)
pnpm --filter @flowmails/sdk-plugin validate
```

## Publishing

### To your own GitHub

This repo is shaped so a single `git push` is enough:

```bash
git remote add origin git@github.com:wms-why/flowmails-sdk-plugin.git
git push -u origin main
git tag v0.1.0
git push --tags
```

After the tag is live, `/plugin marketplace add wms-why/flowmails-sdk-plugin` resolves to the `main` ref.

### To the Anthropic community marketplace

The community marketplace at [anthropics/claude-plugins-community](https://github.com/anthropics/claude-plugins-community) is a read-only mirror of Anthropic's internal review pipeline. **Pull requests are not accepted** — all submissions go through the form at **[clau.de/plugin-directory-submission](https://clau.de/plugin-directory-submission)**. The full submission draft lives in [`SUBMISSION.md`](./SUBMISSION.md).

After approval, the plugin is pinned to a commit SHA in `anthropics/claude-plugins-community/.claude-plugin/marketplace.json` and users install it via:

```bash
/plugin marketplace add anthropics/claude-plugins-community
/plugin install flowmails-sdk@claude-community
```

## Sync contract

Any change to the public SDK surface (endpoints, request/response fields, error codes, retry policy, auth shape, or a version bump) **must** bump two things in the same PR:

1. The canonical skill at this repo's `skills/flowmails-sdk/` subpath (push upstream to `wms-why/flowmails-sdk-plugin`).
2. The relevant `/docs/*` page in the [flowmails-cf](https://github.com/wms-why/flowmails-cf) platform monorepo.

The monorepo's `apps/flowmails-sdk-plugin/` is a submodule of this repo — bumping it is a one-line `git add apps/flowmails-sdk-plugin && git commit` once the upstream push lands. If you only update one of the two, agents will see drift between the skill they read, the plugin they install, and the human docs they reference.

## License

MIT — see [`LICENSE`](./LICENSE).
