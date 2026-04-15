# App Batches Scan Summary

- Generated: 2026-04-15T19:06:01.076Z
- Source plan: `.omx/plans/prd-scss-system-refactor-consensus-20260416.md`
- Evidence JSON: `.omx/evidence/scss-refactor-v2/depth-report/app-batches.json`

## Scan result

- Files scanned: 5
- Max selector depth: 1
- Depth violations: 0
- Total selector blocks: 348
- Total non-empty lines: 2165
- New variables added by this lane: 0
- DOM/className changes required now: false

## Top offenders (by depth, then selector volume)

1. `app/(main)/landing.module.scss` — depth 1, selector blocks 172, route `/`.
2. `app/(auth)/login/login.module.scss` — depth 1, selector blocks 78, route `/login`.
3. `app/(main)/pricing/pricing.module.scss` — depth 1, selector blocks 50, route `/pricing`.

## First edit batch plan

- Batch 1: `app/(main)/landing.module.scss`, `app/(main)/resume/templates/templates.module.scss` — Largest app surfaces by selector volume; if future parity-safe cleanup is required, start here for highest review leverage.
- Batch 2: `app/(auth)/login/login.module.scss`, `app/(main)/pricing/pricing.module.scss` — Second-tier surfaces with moderate selector counts; hold until parity or complexity evidence requires edits.
- Batch 3: `app/(main)/resume/resume-module-theme.scss` — Small scoped override file; touch last because it is already compact and parity-sensitive.

## Lane conclusion

- All scoped app files already satisfy the <=3 nesting constraint; no source edits are required in this snapshot.
- Next feasible work is verification and leader checkpointing unless a new app-lane source edit is assigned.
