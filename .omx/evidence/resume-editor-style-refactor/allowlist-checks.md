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
| G1 | `git diff --name-only 5c61c5e...2170d34` | PASS | Integrated diff stays within `components/resume-builder/**` plus evidence artifacts; foundation files are covered in `g1-worker-1-foundation-draft.md`. |
| G2 | `git diff --name-only 5c61c5e...2170d34` | PASS | Integrated workbench/panels/controls files remain inside the same allowlist; lane-level workbench audit is captured in `task-5-workbench-audit.md`. |
| G3 | `git diff --name-only 5c61c5e...2170d34` | PASS WITH RESIDUAL RISK | Scope guard passed on the integrated snapshot, but final parity/visual/manual gate evidence remains incomplete. |
