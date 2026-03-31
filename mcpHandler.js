/**
 * MCP Handler for MockFlow WireframePro
 *
 * Handles:
 * - render_wireframe: HTML → Puppeteer + imageGenerator → paintObjects → save project
 * - render_flowchart: Proxy to Java backend
 * - render_cloudarchitecture: Proxy to Java backend
 *
 * Tool definitions are loaded from wireframepro-mcp-component-registry.js
 */

const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const WP_REGISTRY = require('./wireframepro-mcp-component-registry');

const PROTOCOL_VERSION = '2025-03-26';
const SERVER_NAME = 'MockFlow WireframePro';
const SERVER_VERSION = '1.0.0';
const BACKEND_URL = 'https://app.mockflow.com';

class WireframeProMCPHandler {
	constructor(isDev) {
		this.sessions = new Map();
		this.isDev = isDev;

		this.renderBackendUrl = isDev
			? 'http://localhost:8080/MockFlow-WireframePro'
			: BACKEND_URL;

		this.log = (typeof global !== 'undefined' && typeof global.logMessage === 'function')
			? global.logMessage : console.log;

		// Load imageGenerator.min.js for Puppeteer injection
		this.imageGeneratorPath = null;
		var paths = [
			path.join(__dirname, 'imageGenerator.min.js'),
			path.join(__dirname, '..', 'imageGenerator.min.js')
		];
		for (var i = 0; i < paths.length; i++) {
			if (fs.existsSync(paths[i])) {
				this.imageGeneratorPath = paths[i];
				break;
			}
		}

		this.log('WireframePro MCP Handler initialized');
		this.log('Backend: ' + this.renderBackendUrl);
		this.log('imageGenerator.min.js: ' + (this.imageGeneratorPath ? 'found' : 'NOT FOUND'));
	}

	async handleRequest(method, params, req) {
		if (method.startsWith('notifications/')) return {};

		switch (method) {
			case 'initialize':
				return this.handleInitialize(params);
			case 'initialized':
				return {};
			case 'tools/list':
				return { tools: this.getToolDefinitions() };
			case 'tools/call':
				return this.handleToolsCall(params, req);
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

	async handleToolsCall(params, req) {
		var name = params.name;
		var args = params.arguments || {};

		if (!name) throw new Error('Tool name is required');

		try {
			if (name === 'render_wireframe') {
				return await this.handleRenderWireframe(args, req);
			}

			// Flowchart and cloud architecture — proxy to backend
			var actionType = name.replace('render_', '');
			return await this.callRenderBackend(actionType, args, req);
		} catch (error) {
			this.log('Tool call error: ' + error.message);
			return {
				content: [{ type: 'text', text: 'Error: ' + error.message }],
				isError: true
			};
		}
	}

	/**
	 * Convert HTML to wireframe paintObjects using Puppeteer + imageGenerator,
	 * then save to backend as a WireframePro project.
	 */
	async handleRenderWireframe(args, req) {
		var html = args.html;
		if (!html) throw new Error('HTML content is required');
		if (!this.imageGeneratorPath) throw new Error('imageGenerator.min.js not found');

		var swidth = 1280;

		var browser = await puppeteer.launch({
			headless: true,
			args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security',
				'--disable-features=IsolateOrigins,site-per-process']
		});

		try {
			var page = await browser.newPage();
			await page.setViewport({ width: swidth, height: 1080, deviceScaleFactor: 1 });

			// Load HTML content
			await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });

			// Get full page height and resize
			var bodyHeight = await page.evaluate(function() {
				return Math.min(10000, Math.max(
					document.body.scrollHeight || 0,
					document.body.offsetHeight || 0,
					document.documentElement.clientHeight || 0,
					document.documentElement.scrollHeight || 0,
					document.documentElement.offsetHeight || 0
				));
			});
			await page.setViewport({ width: swidth, height: Math.max(1080, bodyHeight), deviceScaleFactor: 1 });

			// Inject imageGenerator.min.js
			await page.addScriptTag({ path: this.imageGeneratorPath });

			// Wait for script initialization
			await new Promise(function(r) { setTimeout(r, 3000); });

			// Run imageGenerator and extract paintObjects
			var paintObjects = await page.evaluate(async function() {
				window.elementPaintObjects = [];

				function clearParentObjects(obj) {
					if (obj.parent && obj.parent !== null) {
						obj.container.parent = { container: { bounds: obj.parent.container.bounds } };
						if (obj.parent.parent) {
							obj.container.parent.parent = {};
							clearParentObjects(obj.parent);
							obj.container.parent.parent = obj.parent.container.parent;
						}
					}
				}

				await imageGenerator(document.body, { logging: false });

				var bodyCS = window.getComputedStyle(document.body);
				var pageBackgroundColor = bodyCS.backgroundColor;
				var filteredObjs = window.elementPaintObjects;

				for (var k = 0; k < filteredObjs.length; k++) {
					var obj = filteredObjs[k];
					if (obj.container) obj.container.pageBackgroundColor = pageBackgroundColor;
					clearParentObjects(obj);
				}

				for (var k = 0; k < filteredObjs.length; k++) {
					var obj = filteredObjs[k];
					obj.elements = null;
					obj.parent = null;
					if (obj.container) obj.container.context = null;
					obj.curves = null;
				}

				var narr = [];
				for (var k = 0; k < filteredObjs.length; k++) {
					var obj = filteredObjs[k];
					try {
						var sx = parseInt(obj.container.bounds.left);
						var sy = parseInt(obj.container.bounds.top);
						if (sx >= 0 && sx <= 1600 && sy >= 0 && sy <= 15100) {
							narr.push(obj);
						}
					} catch (e) {}
				}

				return narr;
			});

			this.log('HTML converted to ' + paintObjects.length + ' paintObjects');

			// Save paintObjects to backend as a WireframePro project
			var user = (req && req.user) || null;
			var result = await this.savePaintObjectsToProject(paintObjects, user);

			return {
				content: [
					{ type: 'text', text: 'URL: ' + result.url },
					{ type: 'text', text: 'Wireframe created with ' + paintObjects.length + ' components' }
				],
				isError: false
			};
		} finally {
			await browser.close();
		}
	}

	/**
	 * Save paintObjects to a WireframePro project via backend.
	 */
	async savePaintObjectsToProject(paintObjects, user) {
		var endpoint = this.renderBackendUrl + '/mcp/render_wireframe';

		var payload = { paintObjects: paintObjects };
		if (user) {
			payload._oauth = { userid: user.userid, clientid: user.clientid, scope: user.scope };
			if (user.spaceId) payload._spaceId = user.spaceId;
		}

		try {
			var response = await axios.post(endpoint, payload, {
				headers: { 'Content-Type': 'application/json; charset=utf-8' },
				timeout: 60000
			});

			if (response.data && response.data.success) {
				return { url: response.data.url, thumbnailUrl: response.data.thumbnailUrl };
			}
			throw new Error(response.data.error || 'Backend returned failure');
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

	/**
	 * Proxy flowchart/cloudarchitecture to Java backend.
	 */
	async callRenderBackend(actionType, args, req) {
		var endpoint = this.renderBackendUrl + '/mcp/render_' + actionType;
		var payload = { ...args };

		if (req && req.user) {
			payload._oauth = { userid: req.user.userid, clientid: req.user.clientid, scope: req.user.scope };
			if (req.user.spaceId) payload._spaceId = req.user.spaceId;
		}

		var response = await axios.post(endpoint, payload, {
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
			timeout: 60000
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
	}

	/**
	 * Get tool definitions from registry
	 */
	getToolDefinitions() {
		return WP_REGISTRY.getToolDefinitions();
	}
}

module.exports = WireframeProMCPHandler;
