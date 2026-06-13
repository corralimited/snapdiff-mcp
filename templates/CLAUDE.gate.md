# Visual verification (SnapDiff) — deployment gate

Use in pre-push hooks, CI, or any context where you're checking a deployed URL against approved baselines rather than authoring UI changes.

**SnapDiff project**: `YOUR_PROJECT_SLUG`

**Pages to check** (route → SnapDiff `page_name`):
- `https://staging.example.com/` → `home`
- `https://staging.example.com/dashboard` → `dashboard`
- `https://staging.example.com/settings` → `settings`

### When to call

After deployment is confirmed live. Check every page in the list. This is a regression gate — you're not describing a change, you're asserting there shouldn't be one.

Call `snapdiff_verify_ui_change` for each page, with:
- `project`: the slug above
- `page_name`: from the page map
- `after`: the full staging/preview URL for this route
- `intent`: `"no visual changes expected"`
- `intent_regions`: omit — full-page comparison

Do not pass `intent_regions`. You're not scoping to a region; you're checking the whole page for unintended drift.

### Verdicts

- **`proceed`**: page matches baseline — continue to next
- **`request_human_review`**: unexpected visual change detected — block the deploy, include the `review_url` in the failure output, and stop checking further pages
- **`rollback_and_retry`**: treat the same as `request_human_review` in gate mode — something changed outside an expected region, which means something changed; block and report
- **`verify_deployment`**: page didn't load or match the URL — check that the deploy actually succeeded before re-running

### Rule

All pages must be `proceed` to pass the gate. Any other verdict is a hard block. In gate mode there is no "ready for review" handoff — block, report the `review_url`, and let the human decide whether to re-deploy or approve the drift.
