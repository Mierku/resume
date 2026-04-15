# Gate G0 Checklist

Status: `BLOCKED`

## Completed

- [x] Evidence scaffold created under `.omx/evidence/scss-refactor-v2/`.
- [x] `qa:scss:v2` command contract documented.
- [x] Baseline artifact paths defined (`baseline.json`, `depth-report/all.json`, `summary/latest-run.md`).
- [x] PRD/test-spec links recorded in `README.md`.

## Blocking findings from first verifier pass

- [ ] PRD baseline `73/73` matches the current repository snapshot.
- [ ] No `.css` files remain in the scoped `app/**` + `components/**` tree.
- [ ] All scoped files satisfy `maxSelectorDepth <= 3`.
- [ ] Deterministic visual/e2e fixture workflow is attached.
- [ ] Production build passes on the integrated branch without the current `app/globals.scss` Sass import failure.

## Notes

- First run is expected to stay red until the implementation lanes converge and the stale coverage baseline is reconciled.
- Current verification command already confirms `maxSelectorDepth <= 3` for the visible `31` SCSS files; the gate remains blocked on scope mismatch, residual CSS, and build failure.
