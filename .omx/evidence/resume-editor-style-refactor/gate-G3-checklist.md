# Gate G3 Checklist

Status: `EVIDENCE COMPLETE WITH RESIDUAL RISK`

## Baseline command results already collected

- [x] `npx tsc --noEmit` — PASS
- [ ] `PATH=/Users/mierku/Personal/idaa/一键投递/website/node_modules/.bin:$PATH pnpm build` — PASS on integrated branch
- [ ] Scoped `eslint` clean for allowed files

## Required before final sign-off

- [ ] G1 and G2 fully green
- [ ] Final parity report completed
- [x] Final allowlist check attached
- [x] Final metric deltas added to `metrics-report.md`
- [x] Semantic drift review documented in `integrated-review-summary.md`

## Current note

- Typecheck passed on the integrated snapshot.
- Scoped lint still fails in touched files due existing `ResumeBuilderClient.tsx` and `LayoutAndStylePanel.tsx` issues.
- Integrated build verification was blocked by an already-running `next build` process.
- This checklist supports task-7 closure as an evidence package, not a claim of gate-green parity.
