# Visual verification (SnapDiff) — multi-page change

Use when a change touches shared components, layout, or styles that could affect more than one route.

**SnapDiff project**: `YOUR_PROJECT_SLUG`

**Page map** (route → SnapDiff `page_name`):
- `/` → `home`
- `/dashboard` → `dashboard`
- `/settings` → `settings`

### When to call

When you're asked to verify a change that touched shared code — not on your own
after every edit. Finish all edits first, then verify every page that could show
the change, not just the file you edited. If a component renders on three routes,
check all three; a false-positive `request_human_review` is cheap, a missed
regression isn't.

Call `snapdiff_verify_ui_change` once per affected page, with:
- `project`: the slug above
- `page_name`: from the page map
- `after`: `http://localhost:PORT`
- `intent`: describe the change specific to this page — what a reviewer would expect to see different
- `intent_regions`: CSS selector for the region your change targets on this page; if the change is genuinely layout-wide, pass the root container, not `body`

All pages must pass before the task is complete.

### Verdicts

- **`proceed`**: this page is clear; continue to the next
- **`request_human_review`**: stop for this page — report it as "needs visual review" with the `review_url`; document which pages still need verification
- **`rollback_and_retry`**: unexpected diff outside your declared regions — revert and audit what shares the code path you changed, then re-scope before retrying
- **`verify_deployment`**: page didn't reflect the change — check route registration or dev-server state

### Rule

Once you're verifying, every page in the affected set needs a `proceed` or a human-acknowledged `request_human_review` before it's done. Partial coverage is not done.
