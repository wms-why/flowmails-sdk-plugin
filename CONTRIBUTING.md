# Contributing

This plugin wraps the [`flowmails-sdk` skill](https://github.com/wms-why/flowmails-sdk-skill) for distribution through Claude Code and the broader Agent Skills ecosystem. The plugin adds a Claude Code manifest, a self-hosted marketplace, and a sync script — but **the bundled skill is not the source of truth**. Always edit the canonical skill first.

## Repository layout

```
.
├── .claude-plugin/
│   ├── plugin.json         # Claude Code plugin manifest
│   └── marketplace.json    # Self-hosted marketplace (lists this plugin)
├── skills/
│   └── flowmails-sdk/      # Bundled skill — synced from ../../skills/flowmails-sdk
│       ├── SKILL.md
│       └── references/
│           ├── errors.md
│           ├── examples.md
│           └── payloads.md
├── scripts/
│   └── sync-skill.mjs      # Pulls SKILL.md + references from the canonical submodule
├── SUBMISSION.md           # Draft for clau.de/plugin-directory-submission
├── README.md
├── LICENSE
└── package.json
```

## Sync contract

The canonical skill source lives at [wms-why/flowmails-sdk-skill](https://github.com/wms-why/flowmails-sdk-skill), mounted in the platform monorepo at `skills/flowmails-sdk/` as a git submodule. The bundle in `skills/flowmails-sdk/` here is what ships to GitHub and to the community marketplace — `pnpm --filter @flowmails/sdk-plugin sync` keeps the two in lockstep.

Any change to the public SDK surface (endpoints, request/response fields, error codes, retry policy, auth shape, or a version bump) **must** bump:

1. The canonical skill at `wms-why/flowmails-sdk-skill` (push upstream).
2. The submodule pointer at `skills/flowmails-sdk/` in this repo (`git submodule update --remote skills/flowmails-sdk && git add skills/flowmails-sdk`).
3. The bundled skill in this repo's `skills/flowmails-sdk/` — run `pnpm --filter @flowmails/sdk-plugin sync` and commit the result.
4. The relevant `/docs/*` page in the [flowmails-cf](https://github.com/wms-why/flowmails-cf) platform monorepo.

If you only update one of the four, agents will see drift between the canonical skill, the bundled plugin skill, and the human docs.

## Editing the bundled skill

**Don't.** Edit the canonical source at `wms-why/flowmails-sdk-skill`, push upstream, then run `pnpm sync` to regenerate the bundle. The bundle is generated, not authored.

If you need to add a reference file (e.g. `references/auth.md`), add it to the canonical repo first, then update the `references:` array in the canonical `SKILL.md` frontmatter, push, and `pnpm sync`. The sync script copies any file in `references/` automatically.

## Editing the plugin manifest

The `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` files are hand-authored here. Update them when:

- A new author / maintainer joins
- The license changes
- The `description` no longer matches the canonical skill's lead sentence
- A new `keywords` term is needed for skills.sh discovery

Always keep the plugin name (`flowmails-sdk`) and the marketplace name (`flowmails-plugins`) stable — users install with these literal strings.

## Editing `SUBMISSION.md`

`SUBMISSION.md` is the draft text for [clau.de/plugin-directory-submission](https://clau.de/plugin-directory-submission). Update it when:

- The plugin's long description changes
- A new screenshot or transcript is available
- The security disclosure changes (e.g. we add an MCP server or hook)
- The post-approval checklist gains or loses items

The submission form is just a Google Form, so `SUBMISSION.md` is the canonical copy-paste source — don't auto-submit, but keep it current so a manual re-submission is one paste away.

## CI

Add the drift check to your CI to fail when the bundle has drifted:

```yaml
- run: pnpm --filter @flowmails/sdk-plugin test
```

(That's the alias for `node scripts/sync-skill.mjs --check`.)

For Claude Code's plugin schema validation:

```yaml
- run: pnpm --filter @flowmails/sdk-plugin validate
```

(Requires `claude` CLI ≥ 2.1.)

## Style

- US English in all prose.
- 2-space indent in JSON files.
- No trailing whitespace.
- All file paths in docs use POSIX form (forward slashes).
- The plugin name `flowmails-sdk` is reserved — do not change it without a major version bump.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
