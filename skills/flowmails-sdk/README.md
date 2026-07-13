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

The canonical command (kept in sync with the platform's user-facing docs at
`apps/web/app/routes/docs/ai-agents.tsx`):

```bash
npx skills add wms-why/flowmails-sdk-plugin@flowmails-sdk
```

The standalone skill repo `wms-why/flowmails-sdk-skill` is archived — install
commands pointing at it will 404. Always pin to `wms-why/flowmails-sdk-plugin`
with the `@flowmails-sdk` skill selector.

## Versioning

This skill tracks `@flowmails/sdk` v0.1.x. The update contract lives in
this repo's `CONTRIBUTING.md`: any change to the public SDK surface
bumps `SKILL.md` and `references/*.md` in the same PR.
