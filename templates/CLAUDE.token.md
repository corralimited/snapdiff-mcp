# Visual verification (SnapDiff) — design token / shared value change

Use when you're changing a CSS variable, design token, shared constant, or anything that cascades to components you didn't explicitly touch.

**SnapDiff project**: `YOUR_PROJECT_SLUG`

**All pages** (verify every one after a token change, regardless of which files you edited):
- `/` → `home`
- `/dashboard` → `dashboard`
- `/settings` → `settings`

### When to call

When you're asked to verify a token or shared-value change, verify the full page
list — not just the page you were working on. You don't know which components
consumed the token visually until you look; skipping pages is how cascading
regressions ship.

Call `snapdiff_verify_ui_change` for each page above, with:
- `project`: the slug above
- `page_name`: from the page map
- `after`: `http://localhost:PORT`
- `intent`: what the token change should look like on this specific page (e.g. "brand color on nav and buttons is now #4f46e5")
- `intent_regions`: the selector for the primary consumer on this page; if multiple components use the token, list them as an array

Each page needs its own call. Do not batch.

### Verdicts

- **`proceed`**: this page is clean; continue through the list
- **`request_human_review`**: stop — the change landed on this page and needs approval. Report the `review_url`. Continue verifying remaining pages; each result is independent.
- **`rollback_and_retry`**: unintended visual change outside your declared regions — revert the token change entirely, figure out what else inherits the value (check computed styles, component inheritance, CSS specificity), and re-scope
- **`verify_deployment`**: change didn't appear on this page — check whether the CSS is being imported and the dev server picked up the file

### Rule

Once you're verifying, every page in the full list must reach `proceed` or an acknowledged `request_human_review` before it's done. A token change that looks clean on one page but breaks another is still a regression.
