# MockFlow WireframePro MCP Server

[![npm version](https://img.shields.io/npm/v/@mockflow/wireframepro-mcp.svg)](https://www.npmjs.com/package/@mockflow/wireframepro-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Local [MCP](https://modelcontextprotocol.io/) server for [MockFlow WireframePro](https://mockflow.com). Convert HTML to editable wireframes, create flowcharts, and design cloud architecture diagrams — directly from AI-powered coding tools.

Works with **Claude Code**, **Cursor**, **VS Code Copilot**, **Codex**, and any MCP-compatible client.

> **Note:** MCP servers may not provide the full experience for certain types of generation involving images, AI art, or complex designs. For the best seamless experience, use the [Mida AI agent](https://mockflow.com) inside the MockFlow editor.

## Quick Start

### 1. Install

```bash
npm install -g @mockflow/wireframepro-mcp
```

Or run without installing:

```bash
npx @mockflow/wireframepro-mcp
```

### 2. Authenticate

```bash
mockflow-wireframepro-mcp login
```

This opens your browser to MockFlow's login page. Log in with your MockFlow account and authorize access. The token is saved automatically to `~/.mockflow/credentials.json` (one-time setup).

### 3. Start the Server

```bash
mockflow-wireframepro-mcp
```

You'll see:

```
MockFlow WireframePro - Local MCP Server
========================================
User: you@example.com

MCP server running on http://localhost:21194/mcp

Add to your AI client:

  Claude Code:
    claude mcp add --transport http -s user mockflow-wireframepro http://localhost:21194/mcp
```

### 4. Connect Your AI Client

#### Claude Code

```bash
claude mcp add --transport http -s user mockflow-wireframepro http://localhost:21194/mcp
```

#### Cursor

Settings > Cursor Settings > Tools & MCP:

```json
{
  "mcpServers": {
    "mockflow-wireframepro": {
      "url": "http://localhost:21194/mcp"
    }
  }
}
```

#### VS Code Copilot

Create `.vscode/mcp.json` in your project:

```json
{
  "servers": {
    "mockflow-wireframepro": {
      "type": "http",
      "url": "http://localhost:21194/mcp"
    }
  }
}
```

#### Codex (OpenAI)

```bash
codex mcp add mockflow-wireframepro http://localhost:21194/mcp
```

### 5. Start Prompting

Ask your AI client:

```
"Create a wireframe for a login page with email, password, and social login"
"Wireframe a dashboard with sidebar navigation, stats cards, and a data table"
"Create a flowchart showing the user registration process"
"Draw an AWS architecture diagram with API Gateway, Lambda, and DynamoDB"
```

The server creates the wireframe and returns a URL. Open it in your browser to view and edit.

## Available Tools (3)

| Tool | Input | Description |
|------|-------|-------------|
| `render_wireframe` | HTML with inline CSS | Converts HTML to editable wireframe components |
| `render_flowchart` | GoJS node/link data | Creates flowcharts (11 categories: UML, circuit, bio, etc.) |
| `render_cloudarchitecture` | Cloud service nodes | AWS, Azure, GCP, Cisco network diagrams |

## How `render_wireframe` Works

```
You: "Create a wireframe for a login page"
  |
  v
AI Client (Claude Code / Cursor / VS Code)
  |  generates complete HTML with inline CSS
  v
MCP Server (localhost:21194)
  |  loads HTML in headless browser (Puppeteer)
  |  runs imageGenerator → extracts paint objects
  |  sends to MockFlow backend
  v
app.mockflow.com
  |  creates WireframePro project with wireframe components
  v
Returns project URL → open in browser to view/edit
```

### HTML Tips for Best Results

- Use inline `style` attributes (no external CSS)
- Use standard HTML elements: `div`, `h1-h6`, `p`, `input`, `button`, `select`, `textarea`, `img`, `table`, `form`
- Set explicit `width` on the outer container (e.g. `1280px`)
- Include realistic placeholder text
- Keep layouts clean with proper nesting

## CLI Reference

```bash
mockflow-wireframepro-mcp                     # Start server on default port (21194)
mockflow-wireframepro-mcp --port=8888         # Start on custom port
mockflow-wireframepro-mcp login               # Authenticate with MockFlow (one-time)
mockflow-wireframepro-mcp --help              # Show usage and setup instructions
```

## Configuration

### Credentials

Stored in `~/.mockflow/credentials.json` (created automatically by `mockflow-wireframepro-mcp login`):

```json
{
  "access_token": "...",
  "userid": "you@example.com",
  "clientid": "your-client-id"
}
```

### Custom Port

If port 21194 is in use:

```bash
mockflow-wireframepro-mcp --port=8888
```

Then update your AI client config to use the new port.

### Debug Mode

For verbose logging:

```bash
MCP_DEBUG=1 mockflow-wireframepro-mcp
```

## Verify Installation

```bash
# Check server is running
curl http://localhost:21194/mcp

# List available tools
curl -X POST http://localhost:21194/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Troubleshooting

### "No credentials found"

Run `mockflow-wireframepro-mcp login` to authenticate with your MockFlow account.

### Port already in use

Another process is using port 21194. Either:
- Use a different port: `mockflow-wireframepro-mcp --port=8888`
- Kill the process: `lsof -ti :21194 | xargs kill`

### AI client doesn't use WireframePro tools

Be explicit in your prompt: *"Using mockflow-wireframepro, create a wireframe for..."*. AI clients have many tools and may default to generating code.

### Tool call fails with backend error

Ensure you have a valid login and internet connection. The server needs to reach `app.mockflow.com`. If your token expired, run `mockflow-wireframepro-mcp login` again.

## Example Prompts

### Wireframes
```
"Create a wireframe for a login page with email, password, remember me, and social login"
"Wireframe a dashboard with sidebar nav, user avatar, stats cards, and a data table"
"Create a wireframe for an e-commerce product page with image gallery, price, and add to cart"
"Wireframe a settings page with profile photo, form fields, and save button"
```

### Flowcharts
```
"Create a flowchart showing the checkout process"
"Create a UML class diagram for a blog system"
"Create a circuit diagram with resistors and capacitors"
```

### Cloud Architecture
```
"Draw an AWS architecture with API Gateway, Lambda, DynamoDB, and S3"
"Create an Azure architecture diagram for a web app with App Service and SQL Database"
```

## Links

- **npm:** [npmjs.com/package/@mockflow/wireframepro-mcp](https://www.npmjs.com/package/@mockflow/wireframepro-mcp)
- **GitHub:** [github.com/mockflow/wireframepro-mcp](https://github.com/mockflow/wireframepro-mcp)
- **MockFlow:** [mockflow.com](https://mockflow.com)
- **IdeaBoard MCP:** [@mockflow/ideaboard-mcp](https://www.npmjs.com/package/@mockflow/ideaboard-mcp) — flowcharts, kanban, mind maps, and 12+ visualizations

## Contributing

Issues and pull requests are welcome at [github.com/mockflow/wireframepro-mcp](https://github.com/mockflow/wireframepro-mcp).

## License

[MIT](LICENSE)
