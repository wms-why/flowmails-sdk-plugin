# `flowmails-sdk` skill

Distilled, machine-actionable instructions for AI agents integrating
the [`@flowmails/sdk`](https://flowmails.net/docs) v0.1.

## For humans

This directory is a [Claude Code skill](https://skills.sh/). The entry
point is `SKILL.md`. The supporting files under `references/` are
loaded on demand by agents that pull the skill into their context.

This skill is the single source of truth for method signatures,
error classes, and field names — the body plus the references
together cover the public SDK surface. If you only read one thing,
read `SKILL.md` (the section "Hard rules (read these first)" alone
covers ~90% of integration work).

## For agents

You are integrating `@flowmails/sdk` (v0.1). The skill body (`SKILL.md`)
plus the references under `references/` (loaded on demand) cover the
public SDK surface. When in doubt, read the relevant sub-reference
and quote from it — never re-derive method names, class names, or
field names from memory.

## Install

```bash
npx skills add wms-why/flowmails-sdk-skill
```

Or, for a stable URL install:

```bash
npx skills add https://flowmails.net/skill/flowmails-sdk-skill/SKILL.md
```

### Claude Code (plugin wrapper)

For namespaced install as a Claude Code plugin (recommended for teams):

```bash
/plugin marketplace add wms-why/flowmails-sdk-plugin
/plugin install flowmails-sdk@flowmails-plugins
```

The plugin source lives at [`wms-why/flowmails-sdk-plugin`](https://github.com/wms-why/flowmails-sdk-plugin) — it bundles this skill verbatim and adds the Claude Code plugin manifest. Keep the two in lockstep via the sync contract in `wms-why/flowmails-sdk-plugin`'s `CONTRIBUTING.md`.

## Versioning

This skill tracks `@flowmails/sdk` v0.1.x. The update contract lives in
this repo's `CONTRIBUTING.md`: any change to the public SDK surface
bumps `SKILL.md` and `references/*.md` in the same PR.
