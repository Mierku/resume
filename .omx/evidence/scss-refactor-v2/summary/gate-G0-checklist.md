# Gate G0 Checklist

Status: `EVIDENCE COMPLETE WITH RESIDUAL BLOCKERS`

## Completed

- [x] Evidence scaffold created under `.omx/evidence/scss-refactor-v2/`.
- [x] `qa:scss:v2` command contract documented.
- [x] Baseline artifact paths defined (`baseline.json`, `depth-report/all.json`, `summary/latest-run.md`).
- [x] PRD/test-spec links recorded in `README.md`.

## Blocking findings from first verifier pass

- [x] Baseline decision recorded: use the current repo snapshot (`31` SCSS files) for verification evidence while preserving the PRD `73` count as historical context.
- [ ] No `.css` files remain in the scoped `app/**` + `components/**` tree.
- [x] All scoped files satisfy `maxSelectorDepth <= 3`.
- [ ] Deterministic visual/e2e fixture workflow is attached.
- [ ] Production build passes on the integrated branch without the current `app/globals.scss` Sass import failure.

## Notes

- Task 4 is complete when the evidence lane is consolidated and handed off; this checklist is intentionally left with residual repo blockers rather than claiming a green gate.
- Current verification command confirms `maxSelectorDepth <= 3` for the accepted `31`-SCSS snapshot; remaining blockers are residual CSS and the shared globals build failure.
