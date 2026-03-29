/**
 * MCP Handler for MockFlow WireframePro
 *
 * Handles:
 * - render_wireframe: HTML → Puppeteer + imageGenerator → paintObjects
 * - render_flowchart: Returns structured data for flowchart rendering
 * - render_cloudarchitecture: Returns structured data for cloud diagram rendering
 *
 * Tool definitions are loaded from wireframepro-mcp-component-registry.js
 */

const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
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
			serverInfo: { name: SERVER_NAME, version: SERVER_VERSION }
		};
	}

	async handleToolsCall(params, req) {
		var name = params.name;
		var args = params.arguments || {};

		if (!name) throw new Error('Tool name is required');

		try {
			if (name === 'render_wireframe') {
				return await this.handleRenderWireframe(args);
			}

			// Flowchart and cloud architecture — return structured data
			var actionType = name.replace('render_', '');
			return {
				content: [{ type: 'text', text: actionType + ' data generated with ' + (args.nodeDataArray ? args.nodeDataArray.length : 0) + ' nodes' }],
				isError: false
			};
		} catch (error) {
			this.log('Tool call error: ' + error.message);
			return {
				content: [{ type: 'text', text: 'Error: ' + error.message }],
				isError: true
			};
		}
	}

	/**
	 * Convert HTML to wireframe paintObjects using Puppeteer + imageGenerator.
	 * Same pattern as aitoolsManager.js:getElementPaintFromURL()
	 */
	async handleRenderWireframe(args) {
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
			await page.setContent(html, { waitUntil: 'networkidle2', timeout: 10000 });

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

			return {
				content: [
					{ type: 'text', text: 'Wireframe created with ' + paintObjects.length + ' components' }
				],
				isError: false
			};
		} finally {
			await browser.close();
		}
	}

	/**
	 * Get tool definitions from registry
	 */
	getToolDefinitions() {
		return WP_REGISTRY.getToolDefinitions();
	}
}

module.exports = WireframeProMCPHandler;
