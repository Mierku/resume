# Allowlist Checks

## Allowed product-code paths

- `components/resume-builder/**`
- `app/(main)/resume/editor/[resumeId]/page.tsx`
- `components/resume-builder/ResumeEditorPageClient.tsx`

## Allowed evidence-artifact path

- `.omx/evidence/resume-editor-style-refactor/**`

## Explicit failure paths

- `server/**`
- `lib/**`
- `prisma/**`
- `app/api/**`
- Any product code outside the allowlist above

## Baseline snapshot — 2026-04-15

| Command | Result |
| --- | --- |
| `git diff --name-only` | empty output |
| `git status --short` | empty output |

## Current verification-artifact diff

- `.omx/evidence/resume-editor-style-refactor/**` scaffold files are expected worker-4 outputs.
- Any additional product-code diff must still stay inside the product-code allowlist above.

## Gate sign-off table

| Gate | Diff command | Result | Reviewer note |
| --- | --- | --- | --- |
| G0 | `git diff --name-only` | PASS | Scaffold-only baseline, no product diff in worker-4 worktree. |
| G1 | `git diff --name-only <baseline>...HEAD` | PENDING | Run after token/layer lane is integrated. |
| G2 | `git diff --name-only <g1>...HEAD` | PENDING | Run after module convergence lane is integrated. |
| G3 | `git diff --name-only <g2>...HEAD` | PENDING | Final sign-off must fail on any out-of-scope product path. |
