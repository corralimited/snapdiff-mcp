# CLAUDE.md templates

Add the variant that matches your change type to your project as `CLAUDE.md`,
then set the SnapDiff project slug and the route → `page_name` map.

The page map is worth handing to your coding agent rather than typing by hand —
ask it to fill the map from your actual routes and capture the baselines; it
knows your app's structure better than a placeholder does. The project slug is
the one piece it can't invent — that's yours, from the
[SnapDiff dashboard](https://snapdiff.ai/dashboard). Each variant sets a
different verification scope.

| File | Use when |
|------|----------|
| [`CLAUDE.narrow.md`](CLAUDE.narrow.md) | Fixing one specific element; scope bleed is not acceptable |
| [`CLAUDE.broad.md`](CLAUDE.broad.md) | Change touches shared components that render on multiple routes |
| [`CLAUDE.token.md`](CLAUDE.token.md) | Changing a CSS variable, design token, or shared constant |
| [`CLAUDE.gate.md`](CLAUDE.gate.md) | Post-deploy regression check (CI, pre-push hook) |

**These are prompted, not automatic.** The authoring variants (`narrow`, `broad`,
`token`) assume **you ask** the agent to verify a change you've made — they do
not tell it to self-trigger after every edit. That's deliberate: an agent that
gates itself on every change tends to loop on `rollback_and_retry` and to game
its own `intent_regions` to force a pass. Keeping a human as the trigger avoids
both, and it's how the [drift-demo](https://github.com/supermotoo/snapdiff-drift-demo)
is set up.

`CLAUDE.gate.md` is the one exception, and it's a different context: a CI /
pre-push regression check against a deployed URL, where the pipeline is the
trigger and nobody's authoring changes — so there's no self-loop to worry about.

These adjust the scope philosophy, not the tool API.
