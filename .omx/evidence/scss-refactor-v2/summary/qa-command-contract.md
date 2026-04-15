# `qa:scss:v2` Command Contract

Command:

```bash
npm run qa:scss:v2
```

## Current scope

1. Scan `app/**` and `components/**` for `.scss` / `.css`.
2. Write baseline evidence to:
   - `baseline.json`
   - `depth-report/all.json`
   - `summary/latest-run.md`
3. Block on:
   - SCSS coverage count mismatch vs PRD baseline (`73`)
   - any scoped `.css` file still present
   - any file with `maxSelectorDepth > 3`

## Intentional limitation

The initial verification command records structural depth/coverage blockers immediately. Visual regression, E2E, and ARIA drift checks still require batch artifacts from the implementation lanes before G1/G2/G3 can close green.
