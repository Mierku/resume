# App Batches Impact Map

- Generated: 2026-04-15T19:06:01.076Z
- Worker: `worker-2`
- Task: `2`
- Scope: `app/**/*.scss` app lane deliverables, excluding `app/globals.scss` (globals/foundation lane ownership).
- DOM/className changes required: `false`

| SCSS file | Importer | Route / surface | Selector blocks | Max depth | Notes |
| --- | --- | --- | ---: | ---: | --- |
| `app/(auth)/login/login.module.scss` | `app/(auth)/login/page.tsx` | `/login` | 78 | 1 | Phone / WeChat / developer login surface. |
| `app/(main)/landing.module.scss` | `app/(main)/_components/HomePageClient.tsx` | `/` | 172 | 1 | Landing page + install modal surface. |
| `app/(main)/pricing/pricing.module.scss` | `app/(main)/pricing/page.tsx` | `/pricing` | 50 | 1 | Pricing hero/cards/FAQ surface. |
| `app/(main)/resume/resume-module-theme.scss` | `app/(main)/resume/layout.tsx` | `/resume*` | 11 | 1 | Resume subtree theme override surface. |
| `app/(main)/resume/templates/templates.module.scss` | `app/(main)/resume/templates/page.tsx` | `/resume/templates` | 37 | 1 | Template gallery/banner/filter surface. |

## Guardrail readout

- Hard depth limit (`<=3`): all scoped files are currently at `max_selector_depth = 1`.
- No parity-driven TSX/DOM rewiring is needed for these app imports in the current snapshot.
- `app/globals.scss` remains out of lane scope and was not edited.
