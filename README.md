# MockFlow WireframePro MCP

Convert HTML to editable wireframes, create flowcharts, and design cloud architecture diagrams — all from AI-powered IDE clients (Claude Code, Cursor, VS Code Copilot).

## Three Ways to Use

### Option 1: MockFlow Desktop App (Recommended)

Built-in local MCP server. Wireframes render **directly on your open canvas** — no server, no URL.

```
Claude Code → generates HTML → MCP converts to wireframe → appears on your canvas
```

**Setup:**
1. Open MockFlow Desktop App → open a WireframePro project
2. Add to Claude Code:
   ```bash
   claude mcp add --transport http -s user mockflow-wireframepro http://localhost:21194/mcp
   ```
3. Ask: *"Create a wireframe for a login page"*

### Option 2: Standalone CLI (No Desktop App)

Runs locally with Puppeteer for HTML→wireframe conversion. Creates projects via MockFlow cloud.

```bash
npm install -g @mockflow/wireframepro-mcp
mockflow-wireframepro-mcp login    # One-time (shares credentials with IdeaBoard)
mockflow-wireframepro-mcp          # Start server on port 21194
```

### Option 3: Remote MCP (Claude.ai / ChatGPT)

Cloud-hosted at `app.mockflow.com/wireframepro/mcp`. Add as a connector in Claude.ai Settings.

### Comparison

| | Desktop App | Standalone CLI | Remote |
|---|---|---|---|
| **Rendering** | Direct on canvas | Puppeteer → cloud save | Puppeteer → cloud save |
| **Output** | Components on page | URL to open | URL + thumbnail |
| **Auth** | Auto (logged in) | API key | OAuth |
| **Speed** | ~4s | ~5s + network | ~5s + network |
| **Backend** | None | app.mockflow.com | app.mockflow.com |

## Client Setup

### Claude Code
```bash
claude mcp add --transport http -s user mockflow-wireframepro http://localhost:21194/mcp
```

### Cursor
```json
{ "mcpServers": { "mockflow-wireframepro": { "url": "http://localhost:21194/mcp" } } }
```

### VS Code Copilot (`.vscode/mcp.json`)
```json
{ "servers": { "mockflow-wireframepro": { "type": "http", "url": "http://localhost:21194/mcp" } } }
```

## Available Tools

| Tool | Input | Description |
|------|-------|-------------|
| `render_wireframe` | HTML with inline CSS | Converts HTML to editable wireframe components |
| `render_flowchart` | GoJS node/link data | Creates flowcharts (11 categories: UML, circuit, bio, etc.) |
| `render_cloudarchitecture` | Cloud service nodes | AWS, Azure, GCP, Cisco network diagrams |

## How `render_wireframe` Works

1. Claude Code generates a complete HTML page with inline styles
2. MCP server loads the HTML in a headless browser (Puppeteer or Electron)
3. `imageGenerator.min.js` (html2canvas fork) walks the DOM and extracts paint objects
4. Paint objects are converted to WireframePro components (buttons, inputs, text, containers, etc.)
5. Components appear on the canvas (desktop) or are saved as a project (CLI/remote)

**Tips for best results:**
- Use inline `style` attributes (no external CSS)
- Use standard HTML elements (`div`, `h1-h6`, `p`, `input`, `button`, `table`, etc.)
- Set explicit `width` on the outer container (e.g. `1280px`)
- Include realistic placeholder text
- Keep layouts clean and well-structured

## Example Prompts

- *"Create a wireframe for a login page with email, password, remember me, and social login"*
- *"Design a dashboard wireframe with sidebar nav, stats cards, and a data table"*
- *"Create a flowchart showing the user registration process"*
- *"Draw an AWS architecture diagram with API Gateway, Lambda, DynamoDB, and S3"*
- *"Wireframe an e-commerce product page with image gallery, price, and add to cart"*

## CLI Options

```bash
mockflow-wireframepro-mcp                    # Default port 21194
mockflow-wireframepro-mcp --port=8888        # Custom port
mockflow-wireframepro-mcp login              # Set up credentials
mockflow-wireframepro-mcp --help             # Show help
```

## Debug Mode

```bash
MCP_DEBUG=1 mockflow-wireframepro-mcp
```
