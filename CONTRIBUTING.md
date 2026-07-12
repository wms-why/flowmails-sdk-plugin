# Contributing

This plugin wraps the [`flowmails-sdk` skill](https://github.com/wms-why/flowmails-sdk-skill) for distribution through Claude Code and the broader Agent Skills ecosystem. The plugin adds a Claude Code manifest, a self-hosted marketplace, and a sync script — but **the bundled skill is not the source of truth**. Always edit the canonical skill first.

## Repository layout

```
.
├── .claude-plugin/
│   ├── plugin.json         # Claude Code plugin manifest
│   └── marketplace.json    # Self-hosted marketplace (lists this plugin)
├── skills/
│   └── flowmails-sdk/      # git submodule → wms-why/flowmails-sdk-skill
│                            # (same upstream as the monorepo's skills/flowmails-sdk/)
│       ├── SKILL.md
│       └── references/
│           ├── errors.md
│           ├── examples.md
│           └── payloads.md
├── SUBMISSION.md           # Draft for clau.de/plugin-directory-submission
├── README.md
├── LICENSE
└── package.json
```

## Sync contract

The canonical skill source lives at [wms-why/flowmails-sdk-skill](https://github.com/wms-why/flowmails-sdk-skill). The plugin includes it as a **git submodule** at `skills/flowmails-sdk/` — same upstream as the monorepo's `skills/flowmails-sdk/`. There is no copy/sync step; updating the bundle = bumping the submodule pointer.

Any change to the public SDK surface (endpoints, request/response fields, error codes, retry policy, auth shape, or a version bump) **must** bump:

1. The canonical skill at `wms-why/flowmails-sdk-skill` (push upstream).
2. The submodule pointer in this repo: `git submodule update --remote skills/flowmails-sdk && git add skills/flowmails-sdk && git commit`.
3. The submodule pointer at the monorepo's `skills/flowmails-sdk/` (same source — bump in lockstep with the plugin).
4. The relevant `/docs/*` page in the [flowmails-cf](https://github.com/wms-why/flowmails-cf) platform monorepo.

If you only update one of the four, agents will see drift between the canonical skill, the plugin's bundled skill, the monorepo's bundled skill, and the human docs.

## Editing the bundled skill

**Don't.** Edit the canonical source at `wms-why/flowmails-sdk-skill`, push upstream, then bump the submodule pointers in both this repo and the monorepo. There is no copy step — `git submodule update --remote skills/flowmails-sdk` pulls the new commit, and committing the new gitlink is the only write.

If you need to add a reference file (e.g. `references/auth.md`), add it to the canonical repo first, then update the `references:` array in the canonical `SKILL.md` frontmatter, push upstream. The new file ships automatically — git submodule content is opaque to this repo, so the plugin and the monorepo pick it up on the next submodule bump.

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

The submodule pointer is the source of truth, so the CI checklist is:

```yaml
# 1. Plugin manifest is valid
- run: pnpm --filter @flowmails/sdk-plugin validate

# 2. Submodule is in sync with the upstream skill repo's HEAD
- run: |
    git submodule update --remote skills/flowmails-sdk
    git diff --quiet skills/flowmails-sdk || (echo "skills/flowmails-sdk is behind upstream — bump the submodule" && exit 1)
```

The second step is the drift check: if `git submodule update --remote` produces any diff, the plugin is behind the canonical skill and a maintainer needs to commit the bump. (Validates that the bundle is pointing at `heads/main` of the upstream.)

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
