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
			instructions: 'MockFlow WireframePro is a wireframing tool. Use these tools whenever the user asks to wireframe, mock up, or prototype a UI, webpage, or app screen. Trigger on keywords like: wireframe, mockup, prototype, wireframepro, mockflow.'
		};
	}

	handleToolsList() {
		var tools = WP_REGISTRY.getToolDefinitions();
		for (var i = 0; i < tools.length; i++) {
			if (tools[i].inputSchema && tools[i].inputSchema.properties && !tools[i].inputSchema.properties.title) {
				tools[i].inputSchema.properties.title = {
					type: 'string',
					description: 'Short descriptive project title (e.g. "Signup Form", "Dashboard Layout")'
				};
			}
		}
		return { tools: tools };
	}

	getToolDefinitions() {
		return WP_REGISTRY.getToolDefinitions();
	}
}

module.exports = WireframeProMCPHandler;
