# Visual verification (SnapDiff) — focused change

Use when you're editing one specific UI element and scope bleed is not acceptable.

**SnapDiff project**: `YOUR_PROJECT_SLUG`

**Page map** (route → SnapDiff `page_name`):
- `/` → `home`

### When to call

When you're asked to verify a change — this is not an automatic step you run on
every edit. Make your edits, then run one verification for the route you touched.
Match `intent_regions` to the element the request named — not every element your
edit happened to touch — and don't widen it afterward to clear a diff.

Call `snapdiff_verify_ui_change` with:
- `project`: the slug above
- `page_name`: from the page map, for the route you edited
- `after`: `http://localhost:PORT`
- `intent`: one sentence, specific — not "updated UI"
- `intent_regions`: a single CSS selector (`#id`, `[data-testid="..."]`) for the element you were asked to change

### Verdicts

- **`proceed`**: done
- **`request_human_review`**: report "ready for visual review" with the `review_url` and stop
- **`rollback_and_retry`**: your change leaked outside the declared scope — revert completely, don't widen `intent_regions`, and investigate in the code what else consumed what you touched before trying again
- **`verify_deployment`**: your change didn't reach the URL — check the dev server

### Rule

Once you've run a verification, it isn't resolved until `next_action` is `proceed`, or `request_human_review` with the `review_url` handed to a human. `rollback_and_retry` means revert, not retry with a looser region.
