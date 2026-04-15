# Metrics Report

## Measurement method

- Scope: CSS files under `components/resume-builder/**`
- Counted files:
  - `builder-theme.css`
  - `workbench/workbench-layout.css`
  - scoped `*.module.css` files inside `controls/`, `panels/`, and `workbench/`
- LOC = non-empty CSS lines
- Unique vars = distinct CSS custom properties referenced via `var(--token)`
- Var definitions = occurrences of `--token: ...`

## Baseline snapshot — 2026-04-15

| Metric | Value |
| --- | ---: |
| CSS files | 10 |
| CSS LOC (non-empty) | 5007 |
| Unique vars used | 86 |
| Var definitions | 235 |

## Plan targets

| Metric | Plan baseline | Stretch target |
| --- | ---: | ---: |
| CSS LOC | 5766 | <= 4000 |
| Unique vars | 105 | <= 45 |
| Var definitions | 235 | <= 90 |

## Notes

- Measured LOC differs from the plan baseline because this snapshot uses non-empty lines in the current worktree.
- Final G3 report should add post-refactor deltas and reuse-point notes once implementation lanes land.
