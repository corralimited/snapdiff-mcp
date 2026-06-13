# CLAUDE.md templates

Drop one of these into your project root (rename to `CLAUDE.md`) and fill in the project slug and page map. Each variant sets a different verification scope for the agent.

| File | Use when |
|------|----------|
| [`CLAUDE.narrow.md`](CLAUDE.narrow.md) | Fixing one specific element; scope bleed is not acceptable |
| [`CLAUDE.broad.md`](CLAUDE.broad.md) | Change touches shared components that render on multiple routes |
| [`CLAUDE.token.md`](CLAUDE.token.md) | Changing a CSS variable, design token, or shared constant |
| [`CLAUDE.gate.md`](CLAUDE.gate.md) | Post-deploy regression check (CI, pre-push hook) |

All variants share the same core rules from the [drift-demo CLAUDE.md](https://github.com/corralimited/snapdiff-drift-demo) — these adjust the scope philosophy, not the tool API.
