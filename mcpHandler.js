/**
 * MCP Handler for MockFlow WireframePro
 *
 * Handles MCP protocol methods (initialize, tools/list, ping).
 * Tool calls (render_*) are intercepted in server.js and proxied directly.
 *
 * Tool definitions are loaded from wireframepro-mcp-component-registry.js
 */

const { v4: uuidv4 } = require('uuid');
const WP_REGISTRY = require('./wireframepro-mcp-component-registry');

const PROTOCOL_VERSION = '2025-03-26';
const SERVER_NAME = 'MockFlow WireframePro';
const SERVER_VERSION = '1.0.0';

class WireframeProMCPHandler {
	constructor(isDev) {
		this.sessions = new Map();
		this.isDev = isDev;

		this.log = (typeof global !== 'undefined' && typeof global.logMessage === 'function')
			? global.logMessage : console.log;

		this.log('WireframePro MCP Handler initialized');
	}

	async handleRequest(method, params, req) {
		if (method.startsWith('notifications/')) return {};

		switch (method) {
			case 'initialize':
				return this.handleInitialize(params);
			case 'initialized':
				return {};
			case 'tools/list':
				return this.handleToolsList();
			case 'ping':
				return {};
			case 'resources/list':
				return { resources: [] };
			case 'prompts/list':
				return { prompts: [] };
			default:
				throw new Error('Method not found: ' + method);
		}
	}

	handleInitialize(params) {
		var sessionId = uuidv4().replace(/-/g, '');
		this.sessions.set(sessionId, { createdAt: new Date(), clientInfo: params.clientInfo || {} });

		return {
			protocolVersion: PROTOCOL_VERSION,
			capabilities: {
				tools: { listChanged: false }
			},
			serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
			instructions: 'MockFlow WireframePro is a wireframing tool. Use these tools whenever the user asks to wireframe, mock up, or prototype a UI, webpage, or app screen. Trigger on keywords like: wireframe, mockup, prototype, wireframepro, mockflow.\n\nIMPORTANT — projectUrl parameter: When the user provides a MockFlow wireframe URL (any URL matching app.mockflow.com/wire/...), you MUST pass the FULL URL (including any #/page/... hash fragment) as the "projectUrl" parameter in the tool call. This adds the wireframe to their existing project. If the URL contains a #/page/{pageId} fragment, the wireframe will be created on that specific page. ALWAYS scan the user message for MockFlow wireframe URLs and pass them as projectUrl — include the complete URL with hash fragment. Do NOT ignore wireframe URLs in the user message. Do NOT strip the hash/fragment from the URL.\n\nExamples:\n- "wireframe a login page at https://app.mockflow.com/wire/M1461a84..." → pass full URL as projectUrl\n- "wireframe at https://app.mockflow.com/wire/M5b8a...#/page/M9fc0.../mode/design" → pass full URL including #/page/... as projectUrl\n\nWhen the user does NOT provide a wireframe URL, briefly mention that they can pass an existing wireframe URL to add screens to an existing project instead of creating a new one.'
		};
	}

	handleToolsList() {
		var tools = WP_REGISTRY.getToolDefinitions();
		for (var i = 0; i < tools.length; i++) {
			if (tools[i].inputSchema && tools[i].inputSchema.properties) {
				if (!tools[i].inputSchema.properties.title) {
					tools[i].inputSchema.properties.title = {
						type: 'string',
						description: 'Short descriptive project title (e.g. "Signup Form", "Dashboard Layout")'
					};
				}
				if (!tools[i].inputSchema.properties.projectUrl) {
					tools[i].inputSchema.properties.projectUrl = {
						type: 'string',
						description: 'Full MockFlow wireframe URL to add the screen to an existing project. MUST be passed when the user provides any app.mockflow.com/wire/ URL. Pass the COMPLETE URL including any #/page/... hash fragment — this determines which page to add the wireframe to. If not provided, a new project is created. Example: "https://app.mockflow.com/wire/M5b8aa11c...#/page/M9fc002b8.../mode/design"'
					};
				}
			}
		}
		return { tools: tools };
	}

	getToolDefinitions() {
		return WP_REGISTRY.getToolDefinitions();
	}
}

module.exports = WireframeProMCPHandler;
