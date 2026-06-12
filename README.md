# @corralimited/snapdiff-mcp

Standalone Model Context Protocol server for [SnapDiff](https://snapdiff.ai). Gives local AI
agents the ability to:

- **Compare two web pages visually** and get back a diff percentage plus a highlighted diff image
- **Capture a screenshot** of any URL
- **Check whether a page changed** vs. a previous capture
- **Render HTML/CSS to an image** (OG cards, social images, email headers)

Hits the public SnapDiff REST API. Bring your own [API key](https://snapdiff.ai/dashboard).

---

## Quickstart

Get an API key at https://snapdiff.ai/dashboard, then drop the snippet for your agent below.

### Claude Code

```bash
claude mcp add snapdiff -e SNAPDIFF_API_KEY=sk_live_... -- npx -y @corralimited/snapdiff-mcp
```

Or edit `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "snapdiff": {
      "command": "npx",
      "args": ["-y", "@corralimited/snapdiff-mcp"],
      "env": { "SNAPDIFF_API_KEY": "sk_live_..." }
    }
  }
}
```

### Cursor

`~/.cursor/mcp.json` (or project-level `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "snapdiff": {
      "command": "npx",
      "args": ["-y", "@corralimited/snapdiff-mcp"],
      "env": { "SNAPDIFF_API_KEY": "sk_live_..." }
    }
  }
}
```

### Cline (VS Code)

`Cline > MCP Servers > Edit Config`:

```json
{
  "mcpServers": {
    "snapdiff": {
      "command": "npx",
      "args": ["-y", "@corralimited/snapdiff-mcp"],
      "env": { "SNAPDIFF_API_KEY": "sk_live_..." }
    }
  }
}
```

### Zed

`~/.config/zed/settings.json`:

```json
{
  "context_servers": {
    "snapdiff": {
      "command": {
        "path": "npx",
        "args": ["-y", "@corralimited/snapdiff-mcp"],
        "env": { "SNAPDIFF_API_KEY": "sk_live_..." }
      }
    }
  }
}
```

### Continue

`~/.continue/config.yaml`:

```yaml
mcpServers:
  - name: snapdiff
    command: npx
    args: ["-y", "@corralimited/snapdiff-mcp"]
    env:
      SNAPDIFF_API_KEY: sk_live_...
```

### Anything else with a generic stdio MCP slot

```
command: npx
args:    -y @corralimited/snapdiff-mcp
env:     SNAPDIFF_API_KEY=sk_live_...
```

---

## Tools

| Name                          | Purpose                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `snapdiff_verify_ui_change`   | Opinionated verdict for agent self-verification: did the change match intent? Returns `verdict` (`pass` / `expected_change_detected` / `unexpected_regression` / `no_change_detected` / `needs_human_review`) and a `next_action` the agent can act on. Requires a project + baseline. **Primary tool for the agent verification loop.** |
| `snapdiff_compare_pages`      | Raw visual diff between two URLs, or a URL vs. a stored project baseline. Use for ad-hoc diffs that don't fit the verify-ui-change verdict shape.                                                                                                                                                                                        |
| `snapdiff_capture_screenshot` | Single screenshot of a URL.                                                                                                                                                                                                                                                                                                              |
| `snapdiff_html_to_image`      | Render HTML/CSS to an image (OG cards, social images, email headers).                                                                                                                                                                                                                                                                    |

Schemas live in [`src/tools/`](./src/tools/) and are exported from `@corralimited/snapdiff-mcp/tools`.
The hosted SnapDiff backend imports the same schemas so its in-process `/mcp` endpoint and this
standalone stdio server expose an identical surface — agents see the same tool names, descriptions,
and parameters whether they connect to `https://api.snapdiff.ai/mcp` or run this server locally.

---

## HTTP transport (advanced)

Besides stdio, if you're hosting an MCP gateway
and need a streamable HTTP server, run with `--http`:

```bash
SNAPDIFF_API_KEY=sk_live_... npx @corralimited/snapdiff-mcp --http --port 8787
```

Then point clients at `http://localhost:8787/mcp` with the standard MCP HTTP transport.

---

## Configuration

| Env var            | Required | Notes                                                            |
| ------------------ | -------- | ---------------------------------------------------------------- |
| `SNAPDIFF_API_KEY` | yes      | Get one at https://snapdiff.ai/dashboard                         |
| `SNAPDIFF_API_URL` | no       | Override the API base. Defaults to `https://api.snapdiff.ai/v1`. |

CLI flags (HTTP mode only):

| Flag         | Default     | Notes                                             |
| ------------ | ----------- | ------------------------------------------------- |
| `--http`     | off         | Run as a streamable HTTP server instead of stdio. |
| `--port <n>` | `8787`      | Port for `--http` mode.                           |
| `--host <h>` | `127.0.0.1` | Bind address for `--http` mode.                   |

---

## License

MIT — see [LICENSE](./LICENSE).
