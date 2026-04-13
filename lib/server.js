/**
 * MockFlow WireframePro - Local MCP Server (Standalone CLI)
 *
 * Runs locally and proxies tool calls to app.mockflow.com.
 * Uses Puppeteer for HTML → paintObjects conversion.
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const os = require('os');
const createRateLimiter = require('./rateLimiter');

var WireframeProMCPHandler;
try {
	WireframeProMCPHandler = require('../mcpHandler');
} catch (e) {
	WireframeProMCPHandler = require('../../wireframepro-mcp/mcpHandler');
}

var DEFAULT_PORT = 21194;

/**
 * Check npm registry for a newer version. Fire-and-forget — never blocks startup.
 */
function checkForUpdate() {
	var pkg = require('../package.json');
	axios.get('https://registry.npmjs.org/' + encodeURIComponent(pkg.name) + '/latest', { timeout: 3000 })
		.then(function(res) {
			var latest = res.data && res.data.version;
			if (latest && latest !== pkg.version) {
				console.log('');
				console.log('  Update available: ' + pkg.version + ' \u2192 ' + latest);
				console.log('  Run: npm install -g ' + pkg.name);
				console.log('');
			}
		})
		.catch(function() { /* ignore — offline or registry unreachable */ });
}

/**
 * Validate user and get rate limits from backend.
 * Returns { limit, windowMs }. Exits if verification fails.
 *
 * Expected backend response:
 *   { valid: true, rateLimit: number, rateWindowMs: number, ... }
 */
async function getServerRateLimits(creds) {
	if (!creds.access_token) {
		console.error('[WP-MCP] No access token. Run "mockflow-wireframepro-mcp login" to authenticate.');
		process.exit(1);
	}

	try {
		var validateUrl = process.env.MOCKFLOW_VALIDATE_URL || 'https://mockflow.com/ideaboard_oauth_validate';
		var response = await axios.post(validateUrl, {
			access_token: creds.access_token
		}, { timeout: 5000 });

		if (!response.data || !response.data.valid) {
			throw new Error('Invalid or expired token. Run "mockflow-wireframepro-mcp login" to re-authenticate.');
		}

		var data = response.data;

		if (data.rateLimit == null || data.rateWindowMs == null) {
			throw new Error('Rate limit info unavailable. Please update your MockFlow account or try again later.');
		}

		return { limit: data.rateLimit, windowMs: data.rateWindowMs };
	} catch (e) {
		console.error('[WP-MCP] Authentication failed:', e.message);
		process.exit(1);
	}
}

async function start(port, options) {
	port = port || DEFAULT_PORT;
	options = options || {};
	var spaceId = options.spaceId || null;

	// Load credentials (shared with IdeaBoard)
	var creds = null;
	var credFile = path.join(os.homedir(), '.mockflow', 'credentials.json');
	try {
		if (fs.existsSync(credFile)) {
			creds = JSON.parse(fs.readFileSync(credFile, 'utf8'));
		}
	} catch (e) {}

	if (!creds || (!creds.access_token && !creds.apiKey)) {
		console.log('');
		console.log('No credentials found. Run "mockflow-wireframepro-mcp login" first.');
		console.log('');
		process.exit(1);
	}

	// Set up globals for mcpHandler
	global.DEBUG = !!process.env.MCP_DEBUG;
	global.logMessage = function() {
		if (global.DEBUG) console.log.apply(console, ['[WP-MCP]'].concat(Array.prototype.slice.call(arguments)));
	};

	var handler = new WireframeProMCPHandler(!!process.env.MCP_DEV);

	// Validate user and get rate limits from backend
	var rateLimit = await getServerRateLimits(creds);
	var windowSec = Math.round(rateLimit.windowMs / 1000);
	var windowLabel = windowSec >= 60 ? Math.round(windowSec / 60) + 'm' : windowSec + 's';

	console.log('');
	console.log('MockFlow WireframePro - Local MCP Server');
	console.log('========================================');
	console.log('User: ' + creds.userid);
	if (spaceId) console.log('Space: ' + spaceId);
	console.log('Rate limit: ' + rateLimit.limit + ' tool calls per ' + windowLabel);
	console.log('');
	console.log('What it does:');
	console.log('  Connects your AI coding assistant (Claude Code, Cursor, Copilot)');
	console.log('  to MockFlow WireframePro for creating UI wireframes and mockups.');
	console.log('');
	console.log('Usage:');
	console.log('  Just ask your AI assistant to wireframe any UI screen.');
	console.log('  Example: "Wireframe a login page with email and password fields"');
	console.log('');
	console.log('  Add to an existing project by passing a wireframe URL:');
	console.log('  Example: "Wireframe a dashboard at https://app.mockflow.com/wire/M1461a..."');
	console.log('  This adds the new screen to your existing project');
	console.log('  instead of creating a new one.');
	console.log('');
	console.log('Skills:');
	console.log('  Extend your AI assistant with pre-built WireframePro skills for designing.');
	console.log('  Examples: Apple Liquid Glass, Material 3, Tailwind CSS, Cyberpunk Retro UI');
	console.log('  Browse and install: https://mockflow.com/skills/wireframepro');

	// Check for npm updates (non-blocking)
	checkForUpdate();

	var rateLimiter = createRateLimiter(rateLimit);

	var mcpApp = express();
	mcpApp.use(cors({
		origin: '*',
		methods: ['GET', 'POST', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Accept', 'Mcp-Session-Id', 'MCP-Protocol-Version'],
		exposedHeaders: ['Mcp-Session-Id']
	}));
	mcpApp.use(bodyParser.json({ limit: '10mb' }));

	// Health
	mcpApp.get('/mcp', function(req, res) {
		var accept = req.headers['accept'] || '';
		if (accept.indexOf('text/event-stream') !== -1) {
			res.setHeader('Content-Type', 'text/event-stream');
			res.setHeader('Cache-Control', 'no-cache');
			res.setHeader('Connection', 'keep-alive');
			res.write('event: open\n');
			res.write('data: {"status": "connected", "source": "cli-wireframepro"}\n\n');
			var keepAlive = setInterval(function() { res.write('event: ping\ndata: {}\n\n'); }, 30000);
			req.on('close', function() { clearInterval(keepAlive); });
		} else {
			res.json({
				status: 'ok',
				server: 'MockFlow WireframePro Local MCP Server',
				version: '1.0.0',
				source: 'cli',
				user: creds.userid,
				rateLimit: rateLimiter.getLimitsInfo()
			});
		}
	});

	// MCP Registry endpoint (for client-side skill-to-tool mapping)
	mcpApp.get('/wireframepro/mcp-registry.json', function(req, res) {
		var WP_REGISTRY = require('../wireframepro-mcp-component-registry');
		res.setHeader('Cache-Control', 'public, max-age=3600');
		res.json({
			registry: WP_REGISTRY.getToolDefinitions(),
			recipeToToolMap: WP_REGISTRY.buildRecipeToToolMap()
		});
	});

	// Inject user credentials before rate limiter
	mcpApp.use('/mcp', function(req, res, next) {
		req.user = { userid: creds.userid, clientid: creds.clientid || '', scope: 'read write' };
		if (spaceId) req.user.spaceId = spaceId;
		next();
	});

	// MCP JSON-RPC
	mcpApp.post('/mcp', rateLimiter.middleware, async function(req, res) {
		try {
			var jsonRpcRequest = req.body;
			if (!jsonRpcRequest || typeof jsonRpcRequest !== 'object') {
				res.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
				return;
			}

			var id = jsonRpcRequest.id;
			var method = jsonRpcRequest.method;
			var params = jsonRpcRequest.params || {};

			// Intercept tools/call — proxy to MockFlow backend
			if (method === 'tools/call' && params.name && params.name.startsWith('render_')) {
				// Sanitize flowchart data (remove orphan links, round coordinates)
				if (params.name === 'render_flowchart' || params.name === 'render_cloudarchitecture') {
					try { var WP_REG = require('../wireframepro-mcp-component-registry'); WP_REG.sanitizeFlowData(params.arguments || {}); } catch(e) {}
				}
				try {
					var result = await proxyToBackend(params.name, params.arguments || {}, creds, spaceId);
					res.json({ jsonrpc: '2.0', id: id, result: result });
				} catch (error) {
					res.json({
						jsonrpc: '2.0', id: id,
						result: {
							content: [{ type: 'text', text: 'Error: ' + error.message }],
							isError: true
						}
					});
				}
				return;
			}

			// Protocol methods (initialize, tools/list, ping) — handled by mcpHandler
			var result;
			try {
				result = await handler.handleRequest(method, params, req);
			} catch (error) {
				res.json({ jsonrpc: '2.0', id: id, error: { code: -32603, message: error.message } });
				return;
			}
			res.json({ jsonrpc: '2.0', id: id, result: result });
		} catch (error) {
			console.error('[WP-MCP] Server error:', error);
			res.json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Internal server error' } });
		}
	});

	var server = mcpApp.listen(port, '127.0.0.1', function() {
		var actualPort = server.address().port;
		console.log('');
		console.log('MCP server running on http://localhost:' + actualPort + '/mcp');
		console.log('');
		console.log('Add to your AI client:');
		console.log('');
		console.log('  Claude Code:');
		console.log('    claude mcp add --transport http -s user mockflow-wireframepro http://localhost:' + actualPort + '/mcp');
		console.log('');
		console.log('  Cursor (Settings > MCP):');
		console.log('    { "mcpServers": { "mockflow-wireframepro": { "url": "http://localhost:' + actualPort + '/mcp" } } }');
		console.log('');
		console.log('Press Ctrl+C to stop.');
	});

	server.on('error', function(err) {
		if (err.code === 'EADDRINUSE') {
			console.error('Port ' + port + ' is already in use. Use --port=<number> for a different port.');
			process.exit(1);
		} else {
			console.error('Failed to start:', err.message);
			process.exit(1);
		}
	});

	process.on('SIGINT', function() { console.log('\nStopping...'); server.close(); process.exit(0); });
	process.on('SIGTERM', function() { server.close(); process.exit(0); });
}

/**
 * Proxy a tool call to the MockFlow backend.
 * Sends the OAuth access_token as Authorization header.
 */
async function proxyToBackend(toolName, args, creds, spaceId) {
	var actionType = toolName.replace('render_', '');
	var BACKEND_URL = process.env.MCP_DEV
		? 'http://localhost:8080/MockFlow-WireframePro'
		: 'https://app.mockflow.com';
	var endpoint = BACKEND_URL + '/mcp/render_' + actionType;

	var headers = {
		'Content-Type': 'application/json; charset=utf-8'
	};

	// Send OAuth token if available
	if (creds.access_token) {
		headers['Authorization'] = 'Bearer ' + creds.access_token;
	}

	var payload = { ...args };

	// Extract project ID and optional page ID from projectUrl if provided
	// URL format: https://app.mockflow.com/wire/{projectId}#/page/{pageId}/mode/design
	if (payload.projectUrl) {
		var urlMatch = payload.projectUrl.match(/\/wire\/([A-Za-z0-9]+)/);
		if (urlMatch && urlMatch[1]) {
			payload._projectId = urlMatch[1];
		}
		var pageMatch = payload.projectUrl.match(/#\/page\/([A-Za-z0-9]+)/);
		if (pageMatch && pageMatch[1]) {
			payload._pageId = pageMatch[1];
		}
		delete payload.projectUrl;
	}

	// Include target space if specified
	if (spaceId) {
		payload._spaceId = spaceId;
	}

	try {
		var response = await axios.post(endpoint, payload, {
			headers: headers,
			timeout: 120000
		});

		var data = response.data;

		if (data.success) {
			var content = [
				{ type: 'text', text: 'URL: ' + data.url }
			];
			if (data.thumbnailUrl) {
				content.push({ type: 'text', text: 'Thumbnail: ' + data.thumbnailUrl });
			}
			return { content: content, isError: false };
		}
		throw new Error(data.error || 'Backend returned failure');
	} catch (error) {
		if (error.code === 'ECONNREFUSED') {
			throw new Error('Cannot reach app.mockflow.com. Check your internet connection.');
		}
		if (error.response) {
			throw new Error('Backend error: ' + error.response.status);
		}
		throw error;
	}
}

module.exports = { start: start };
