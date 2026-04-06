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

function start(port, options) {
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

	console.log('');
	console.log('MockFlow WireframePro - Local MCP Server');
	console.log('========================================');
	console.log('User: ' + creds.userid);
	if (spaceId) console.log('Space: ' + spaceId);

	// Set up globals for mcpHandler
	global.DEBUG = !!process.env.MCP_DEBUG;
	global.logMessage = function() {
		if (global.DEBUG) console.log.apply(console, ['[WP-MCP]'].concat(Array.prototype.slice.call(arguments)));
	};

	var handler = new WireframeProMCPHandler(!!process.env.MCP_DEV);

	// Rate limiter — 20 visualizations per minute per user
	var rateLimiter = createRateLimiter({ limit: 10, windowMs: 60 * 1000 });

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
			return {
				content: [
					{ type: 'text', text: 'URL: ' + data.url },
					{ type: 'text', text: 'Thumbnail: ' + data.thumbnailUrl }
				],
				isError: false
			};
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
