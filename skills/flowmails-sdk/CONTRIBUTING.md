# Contributing

This skill is a single-source-of-truth reference for AI agents integrating `@flowmails/sdk` v0.1. It is consumed by Claude Code, Cursor, GitHub Copilot, and other skill-aware agents.

## Repository layout

```
.
├── SKILL.md          # entry point — what Claude loads by default
├── README.md         # human-facing overview + install instructions
├── LICENSE           # MIT
├── CONTRIBUTING.md   # this file
└── references/
    ├── payloads.md   # SendOptions / SendResult / SendAttachment / FlowmailsOptions field reference
    ├── errors.md     # FlowmailsError hierarchy + retry policy + diagnosis
    └── examples.md   # drop-in code samples (Express / Hono / Next.js / Cloudflare Workers)
```

The `SKILL.md` frontmatter declares `references: [payloads, errors, examples]` so the agent loads these on demand rather than all upfront.

## Sync contract

This skill tracks `@flowmails/sdk` v0.1.x. Any change to the public SDK surface (endpoints, request/response fields, error codes, retry policy, auth shape, or a version bump) **must** also bump:

1. `SKILL.md` and `references/*.md` in this repo.
2. The relevant `/docs/*` page in the [flowmails-cf](https://github.com/wms-why/flowmails-cf) platform monorepo.

If you only update one of the two, agents will see drift between
this skill and the human-readable docs.

## Editing SKILL.md

- The frontmatter `name` and `description` are loaded eagerly. Keep `description` to one or two sentences — it's what the agent uses to decide whether to load the rest of the skill.
- Reference files (`references/*.md`) are loaded on demand. Use them for large field tables / error matrices / examples.

## Editing references/

- `payloads.md`: every field carries required-ness, type, length limits, and validation rules.
- `errors.md`: `code` matrix per class, retry policy, diagnosis table mapping each `code` to its fix.
- `examples.md`: one snippet per runtime. Keep imports explicit; never assume a bundler.

## Style

- US English.
- Code samples use the public SDK API only — never reference internal server paths or monorepo internals.
- This skill is the machine-readable source of truth for `@flowmails/sdk`. Update it (and the relevant `/docs/*` page in the platform monorepo) whenever the public SDK surface moves; never direct agents at a stale external reference.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.