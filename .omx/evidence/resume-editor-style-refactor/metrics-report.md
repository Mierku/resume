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

## Integrated snapshot — 2026-04-15

Measured against integrated `main` head `2170d34c72bed1b3029fd36c4df396255ac357bd`.

| Metric | Value | Delta vs baseline |
| --- | ---: | ---: |
| CSS files | 12 | +2 |
| CSS LOC (non-empty) | 5099 | +92 |
| Unique vars used | 218 | +132 |
| Var definitions | 343 | +108 |

## Plan targets

| Metric | Plan baseline | Stretch target |
| --- | ---: | ---: |
| CSS LOC | 5766 | <= 4000 |
| Unique vars | 105 | <= 45 |
| Var definitions | 235 | <= 90 |

## Notes

- Measured LOC differs from the plan baseline because this snapshot uses non-empty lines in the current worktree.
- The integrated snapshot reflects the parity-first bridge phase, not a cleanup-complete state.
- Metrics regressed because the token bridge introduced `--rb-*` layers while preserving legacy aliases and because shared panel/workbench primitives were added.
- Final cleanup claims should not be made until alias retirement and duplicate-rule removal actually land.
