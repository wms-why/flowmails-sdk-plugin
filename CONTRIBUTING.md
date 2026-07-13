# Contributing

This plugin wraps the [`flowmails-sdk` skill](https://github.com/wms-why/flowmails-sdk-plugin/tree/main/skills/flowmails-sdk) for distribution through Claude Code and the broader Agent Skills ecosystem. The plugin adds a Claude Code manifest and a self-hosted marketplace; the skill content under `skills/flowmails-sdk/` is the canonical source — edit it directly here, then bump the monorepo's submodule pointer to ship the change.

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
├── README.md
├── LICENSE
└── package.json
```

## Sync contract

The canonical skill source lives at this repo's `skills/flowmails-sdk/` subpath. The [flowmails-cf](https://github.com/wms-why/flowmails-cf) monorepo mounts this whole repo as a submodule at `apps/flowmails-sdk-plugin/`, so the monorepo picks up skill edits automatically on the next submodule bump — there is no inner copy step.

Any change to the public SDK surface (endpoints, request/response fields, error codes, retry policy, auth shape, or a version bump) **must** bump:

1. The skill content under `skills/flowmails-sdk/` in this repo (push upstream to `wms-why/flowmails-sdk-plugin`).
2. The submodule pointer in the monorepo: `git add apps/flowmails-sdk-plugin && git commit` once the upstream push lands.
3. The relevant `/docs/*` page in the [flowmails-cf](https://github.com/wms-why/flowmails-cf) platform monorepo.

If you only update one of the three, agents will see drift between the canonical skill, the monorepo's bundled skill, and the human docs.

## Editing the bundled skill

**Edit `skills/flowmails-sdk/` directly in this repo**, push upstream, then bump the monorepo's `apps/flowmails-sdk-plugin/` submodule pointer. The standalone skill repo `wms-why/flowmails-sdk-skill` is archived — do not push there.

If you need to add a reference file (e.g. `references/auth.md`), add it under `skills/flowmails-sdk/references/` in this repo and update the `references:` array in `skills/flowmails-sdk/SKILL.md` frontmatter in the same commit. The new file ships automatically — the monorepo picks it up on the next submodule bump.

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

The CI checklist validates the Claude Code plugin manifest and the skill body. This repo is not part of a pnpm workspace, so invoke `npm run validate` (or `pnpm validate` with a standalone `pnpm install`) instead of `pnpm --filter`.

```yaml
# 1. Plugin manifest is valid (requires claude CLI ≥ 2.1)
- run: npm run validate

# 2. Skill body references still resolve to real files
- run: |
    cd skills/flowmails-sdk
    for ref in $(yq '.references // [] | .[]' SKILL.md); do
      test -f "references/${ref}.md" || (echo "SKILL.md references ${ref}.md which does not exist" && exit 1)
    done
```

No submodule drift check is needed — the skill content lives directly in this repo, so any drift is just an out-of-date commit.

## Style

- US English in all prose.
- 2-space indent in JSON files.
- No trailing whitespace.
- All file paths in docs use POSIX form (forward slashes).
- The plugin name `flowmails-sdk` is reserved — do not change it without a major version bump.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
