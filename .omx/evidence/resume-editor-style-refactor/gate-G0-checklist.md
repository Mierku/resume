# Gate G0 Checklist

Status: `IN_PROGRESS`

## Completed

- [x] Evidence directory created.
- [x] Source plan and test spec linked in `README.md`.
- [x] Allowlist baseline recorded in `allowlist-checks.md`.
- [x] Baseline command contract recorded (`tsc`, `build`, scoped `eslint`).
- [x] Metrics baseline recorded in `metrics-report.md`.

## Pending

- [ ] Deterministic resume fixture path locked for baseline captures.
- [ ] Screenshot set captured for `header`, `toolbar`, `toolbar-panels`, `right-editor`, `tabs-sorting`.
- [ ] Both `light` and `dark` theme baselines captured.
- [ ] Interaction script order fixed and linked to the artifact set.

## Risks / blockers

- Visual baseline capture workflow is not yet checked into this evidence lane.
- Final G0 closure should happen from the integrated verification branch used for post-refactor comparison.
