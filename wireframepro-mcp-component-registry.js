/**
 * WireframePro MCP Component Registry
 *
 * Single source of truth for all WireframePro MCP tool definitions and client-side rendering mappings.
 *
 * To add a new component:
 *   1. Add an entry to this array
 *   2. Copy this file to: MockFlow-Desktop2/wireframepro-mcp/, wireframepro-mcp-local/
 *   3. Done — all MCP servers auto-derive tool definitions and client mapping
 *
 * Note: render_wireframe has a special flow (HTML → paintObjects → genui.js)
 * that is handled by the MCP server itself, not by the generic mapToolToGdata.
 * Its clientTransform returns null to signal "use custom HTML conversion".
 */

var WIREFRAMEPRO_MCP_REGISTRY = [

	// ========================================================================
	// render_wireframe — HTML to wireframe conversion
	// ========================================================================
	{
		mcpToolName: 'render_wireframe',
		mcpDescription: `Convert HTML to a wireframe design in MockFlow WireframePro.

Provide a complete HTML document with inline CSS styles. The HTML will be rendered and automatically converted to editable wireframe components on the canvas.

IMPORTANT RULES:
- Always return a complete HTML document with proper <html>, <head>, and <body> tags
- Use inline styles (style attribute) for all styling — no external stylesheets or CDN scripts
- Use standard HTML elements: div, h1-h6, p, input, button, select, textarea, img, ul, li, table, form
- Include realistic placeholder text and content
- Set explicit widths and heights where possible
- Use a clean, structured layout with proper nesting
- The HTML should represent a single page/screen design
- Do not use inline SVG code — use <img> tags instead
- Minimize HTML comments and hidden DOM elements to keep output concise
- Size sections appropriately for their content — avoid excessively tall empty sections

PAGE BACKGROUND: Determine the appropriate page background color based on the design context. For dark themes, set it on <body> (e.g. <body style="background-color:#141414">). For light/white UIs, omit the body background. Do NOT add background styling to an outermost wrapper div.

IMAGE PLACEHOLDERS: Do NOT use real image URLs or stock photos. For image placeholders (product photos, avatars, thumbnails, gallery images), use <img> tags with src='placeholder' and a visible border with appropriate color (e.g. <img src='placeholder' style='width:300px;height:200px;border:1px solid #ccc;'>). For full-width background sections (hero backgrounds, banners), use colored div elements instead.

MOBILE APPS: For mobile app designs, constrain the layout width to 375px and use a single-column layout appropriate for phone screens. Set the outermost container to width:375px. The wireframe tool will automatically wrap it in a phone device frame, so ensure the content has adequate top padding.

MATCHING AN EXISTING DESIGN (create-similar): When the user asks for a NEW screen that belongs to an app/design already in the editor ("another screen for this app", "a profile page matching this one"), FIRST call read_wireframe, then reproduce its design system exactly so the two screens are unmistakably the same product: the SAME brand/app name used VERBATIM (never invent a new one), the SAME icon files for the same purposes (including the brand logo mark next to the app name — never replace it with a generic circle or initial), the SAME colors, fonts, header/nav/footer chrome, and the SAME content width. ONLY the main content is new. If the existing screens are mobile phone screens, build at mobile width so the device frame matches.

NO DEVICE FRAMES: Generate only the UI content. Do NOT include phone frames, laptop frames, browser chrome, or device mockup containers. The tool adds device frames automatically for mobile.

NO FIXED/STICKY POSITIONING: Do NOT use position:fixed or position:sticky. All elements must use static or relative positioning.

STYLE: If the user asks for a sketchy, hand-drawn, rough, or low-fidelity wireframe, set "style" to "sketchy". The tool will substitute hand-drawn components automatically. Otherwise use "default".`,
		mcpInputSchema: {
			type: 'object',
			properties: {
				title: {
					type: 'string',
					description: 'Short descriptive project title (e.g. "Signup Form", "Dashboard Layout")'
				},
				html: {
					type: 'string',
					description: 'Complete HTML document with inline CSS to convert to wireframe'
				},
				apptype: {
					type: 'string',
					enum: ['web', 'mobile'],
					description: 'Target platform. Use "mobile" for phone app screens (adds device frame, constrains to mobile viewport). Defaults to "web".'
				},
				style: {
					type: 'string',
					enum: ['default', 'sketchy'],
					description: 'Visual style. Use "sketchy" when the user asks for a sketchy / hand-drawn / rough / low-fidelity wireframe. Defaults to "default".'
				}
			},
			required: ['html']
		},

		// Special: HTML → paintObjects flow handled by MCP server, not generic mapToolToGdata
		clientAitype: 'genui',
		clientComp: null,
		clientDataField: null,
		clientPrompt: 'wireframe from HTML',
		clientPromptField: null,
		clientIsHtmlConversion: true,  // signals MCP server to use htmlToPaintObjects flow
		clientTransform: null,
		recipeOutputKeys: ['wireframe', 'mockup', 'prototype', 'ui', 'screen', 'layout']
	},

	// ========================================================================
	// render_flowchart
	// ========================================================================
	{
		mcpToolName: 'render_flowchart',
		mcpDescription: `Create a flowchart diagram in MockFlow WireframePro.

CATEGORY: Use "default" for general flowcharts. Other categories: "sketchy", "3d", "bio", "circuit", "pandid", "uml", "uml-sketchy", "cloud-isometric", "weblayout", "mobilelayout".

NODE PROPERTIES:
- key: Unique integer ID
- text: Label text
- color: Pastel hex (#bae6fd, #bbf7d0, #fbcfe8, #fde68a, #ddd6fe, #a7f3d0)
- loc: Position as "x y" string (e.g., "300 100")
- width: 140, height: 60
- shape: "Circle" (start/end), "Diamond" (decision), "RoundedRectangle" (process)
- matchKey: (only for specialized categories) keyword for icon matching

LINK PROPERTIES:
- from/to: Node keys
- fromSpot/toSpot: "Bottom", "Top", "Left", "Right"
- text: Labels for decision branches ("Yes", "No")
- segmentFraction: 0.1-0.9

STRUCTURE: diagramType="flowchart", class="GraphLinksModel", category required.`,
		mcpInputSchema: {
			type: 'object',
			properties: {
				diagramType: {
					type: 'string',
					enum: ['flowchart'],
					description: "Must be 'flowchart'"
				},
				class: {
					type: 'string',
					description: "Must be 'GraphLinksModel'"
				},
				category: {
					type: 'string',
					enum: ['default', 'sketchy', '3d', 'bio', 'circuit', 'pandid', 'uml', 'uml-sketchy', 'cloud-isometric', 'weblayout', 'mobilelayout'],
					description: 'Diagram category'
				},
				nodeDataArray: {
					type: 'array',
					items: { type: 'object' },
					description: 'Array of node objects with key, text, color, loc, shape'
				},
				linkDataArray: {
					type: 'array',
					items: { type: 'object' },
					description: 'Array of link objects with from, to, fromSpot, toSpot, text'
				}
			},
			required: ['diagramType', 'class', 'category', 'nodeDataArray', 'linkDataArray']
		},

		clientAitype: 'genflow',
		clientComp: null,
		clientDataField: 'generatedflow',
		clientPrompt: 'default',
		clientPromptField: 'category',
		clientIsHtmlConversion: false,
		clientTransform: null,
		recipeOutputKeys: ['flowchart', 'sequencediagram', 'diagram']
	},

	// ========================================================================
	// render_cloudarchitecture
	// ========================================================================
	{
		mcpToolName: 'render_cloudarchitecture',
		mcpDescription: `Create cloud/software system architecture diagrams — backend, microservices, deployment, infrastructure, integration or network architecture — for AWS, Azure, GCP, Kubernetes, SAP, or generic systems (use "aws" icons when no provider is named).

CRITICAL FORMAT RULES (topology only — a deterministic layout engine computes ALL geometry):
- diagramType picks the icon set: "aws", "azure", "gcloud", "kubernetes", "sap", "sapbtp", "oracle", or "cisco"
- Service nodes: key, text (short display label), matchKey, type, and group when inside a section. NO loc/width/height/shape/colors on service nodes — positions, sizes and routes are computed.
- matchKey resolves the provider icon: the official service name in lowercase alphanumeric with NO vendor prefix — "route53", "s3", "ec2", "elasticloadbalancing" (ALB/ELB), "elasticcontainerservice", "lambda", "cloudfront", "aurora", "users", "internetgateway". When unsure, join the full official service name words. For Kubernetes diagrams, matchKey uses the standard k8s resource short names ("pod", "svc", "ing", "deploy", "sts", "ds", "cm", "ns", "pv", "pvc", "hpa", "sa", "netpol", "secret", "node", "etcd", "kubelet").
- Groups: key, isGroup: true, text, color, fillColor, fontColor, and group when nested. NO loc/width/height — groups are sized around their children.
- Links: from, to, optional short text label ("Failover", "HTTPS"). NO fromSpot/toSpot — routing is computed.
- Declare nodes in reading order (entry points first, data stores last); the engine follows declaration order for left-to-right flow.

RESTRAINT (this is what makes the diagram good):
- Draw ONLY what the user's description calls for. No padding with extra services, VPC/subnet wrappers, availability zones, or monitoring add-ons unless asked; NEVER add a legend group.
- Prefer roughly 6-14 nodes and at most 2 levels of group nesting; group by the boundaries the user talks about (regions, tiers, clusters), not by a template.

GROUP COLORS (CRITICAL): ALL group/section backgrounds MUST be white ("fillColor": "#FFFFFF") — no tinted section fills; this is the same look the in-app generator ships. The section's brand color goes on "color" (border) and "fontColor" (title), e.g. AWS Cloud #FF9900, VPC #232F3E, Public Subnet #3F8624, Private Subnet #D13212, Data Subnet #3B48CC; Azure Cloud #0078D4, VNet #004578; GCP Cloud #4285F4, VPC #34A853; Kubernetes Cluster #326CE5, Control Plane #1A3A6B; SAP BTP #0070F2.
`,
		mcpInputSchema: {
			type: 'object',
			properties: {
				title: {
					type: 'string',
					description: 'A short title for the diagram, shown as the frame header (e.g. "AWS Web App Architecture").'
				},
				diagramType: {
					type: 'string',
					enum: ['aws', 'azure', 'gcloud', 'kubernetes', 'sap', 'sapbtp', 'oracle', 'cisco'],
					description: 'Cloud provider / platform — picks the icon set the client renders with. Default "aws" when the request names no provider.'
				},
				class: {
					type: 'string',
					description: "GoJS model class, typically 'GraphLinksModel'"
				},
				nodeDataArray: {
					type: 'array',
					items: { type: 'object' },
					description: 'Cloud components and groups. Each node: key (string), text, type, color, fillColor (for groups), loc ("x y"), width, height, shape, isGroup (true for containers), group (parent group key)'
				},
				linkDataArray: {
					type: 'array',
					items: { type: 'object' },
					description: 'Connections: from, to (node keys), fromSpot/toSpot ("Top"/"Bottom"/"Left"/"Right"), text (label like "HTTPS", "SQL")'
				}
			},
			required: ['diagramType', 'nodeDataArray']
		},

		clientAitype: 'gencloudarchitecture',
		clientComp: null,
		clientDataField: 'generatedcloudarchitecture',
		clientPrompt: 'aws',
		clientPromptField: 'diagramType',
		clientIsHtmlConversion: false,
		clientTransform: null,
		recipeOutputKeys: ['cloudarchitecture', 'aws', 'azure', 'gcloud', 'cisco']
	},

	// ========================================================================
	// read_wireframe — Analyze/extract data from existing wireframe
	// ========================================================================
	{
		mcpToolName: 'read_wireframe',
		mcpDescription: `Analyze an existing wireframe in MockFlow WireframePro and extract structured information.

Use this tool to read, analyze, or extract data from a wireframe design. This enables skills like:
- Generating PRD (Product Requirements Document) from a wireframe
- Performing accessibility audits
- Extracting color palettes and design tokens
- Converting wireframe to user stories
- Analyzing UI patterns and component usage

The tool reads the currently selected wireframe page and returns structured component data including layout positions, text content, colors, fonts, component types, and hierarchy.

INPUT: Provide a natural language description of what you want to analyze or extract from the wireframe.

OUTPUT: Returns JSON with wireframe component data that can be analyzed according to the analysis instructions.

Also call this BEFORE render_wireframe whenever a new screen must match a design already in the editor (create-similar): the returned components tell you the existing brand name, icon files, colors, fonts and content width to reproduce.`,
		mcpInputSchema: {
			type: 'object',
			properties: {
				prompt: {
					type: 'string',
					description: 'Description of what to analyze or extract from the wireframe (e.g., "Generate a PRD", "Audit accessibility", "Extract color palette")'
				},
				analysisType: {
					type: 'string',
					enum: ['prd', 'accessibility', 'designtokens', 'userstories', 'general'],
					description: 'Type of analysis to perform. Defaults to "general".'
				}
			},
			required: ['prompt']
		},

		clientAitype: 'readwireframe',
		clientComp: null,
		clientDataField: null,
		clientPrompt: 'analyze wireframe',
		clientPromptField: null,
		clientIsHtmlConversion: false,
		clientTransform: null,
		recipeOutputKeys: ['read_wireframe', 'prd', 'audit', 'analysis', 'userstories', 'designtokens']
	}

];

// Helper: build tool definitions array for MCP servers
WIREFRAMEPRO_MCP_REGISTRY.getToolDefinitions = function() {
	return this.map(function(entry) {
		return {
			name: entry.mcpToolName,
			description: entry.mcpDescription,
			inputSchema: entry.mcpInputSchema
		};
	});
};

// Helper: map MCP tool call to showResults gdata (for non-HTML tools)
WIREFRAMEPRO_MCP_REGISTRY.mapToolToGdata = function(toolName, args) {
	var entry = null;
	for (var i = 0; i < this.length; i++) {
		if (this[i].mcpToolName === toolName) { entry = this[i]; break; }
	}
	if (!entry) return null;

	// HTML conversion tools are handled separately by the MCP server
	if (entry.clientIsHtmlConversion) return null;

	var gdata = { aitype: entry.clientAitype, data: {} };
	if (entry.clientComp) gdata.comp = entry.clientComp;

	if (entry.clientPromptField) {
		gdata.data.prompt = (args && args[entry.clientPromptField]) || entry.clientPrompt;
	} else {
		gdata.data.prompt = entry.clientPrompt;
	}

	if (entry.clientTransform) {
		var result = entry.clientTransform(args);
		if (typeof result === 'string') {
			gdata.data[entry.clientDataField] = result;
		} else {
			if (result.comp) gdata.comp = result.comp;
			if (result.charts) gdata.charts = true;
			gdata.data[entry.clientDataField] = result.dataValue !== undefined ? result.dataValue : result.data;
			if (result.extraFields) {
				for (var k in result.extraFields) gdata[k] = result.extraFields[k];
			}
			if (result.extraDataFields) {
				for (var k in result.extraDataFields) gdata.data[k] = result.extraDataFields[k];
			}
		}
	} else {
		gdata.data[entry.clientDataField] = JSON.stringify(args);
	}

	return gdata;
};

// Helper: build recipe outputType → MCP tool name map (for Agent Skill download)
WIREFRAMEPRO_MCP_REGISTRY.buildRecipeToToolMap = function() {
	var map = {};
	for (var i = 0; i < this.length; i++) {
		var entry = this[i];
		if (entry.recipeOutputKeys) {
			for (var j = 0; j < entry.recipeOutputKeys.length; j++) {
				map[entry.recipeOutputKeys[j]] = entry.mcpToolName;
			}
		}
	}
	return map;
};

/**
 * Sanitize GoJS flowchart data: round coordinates, fix dimensions, remove orphan links.
 */
WIREFRAMEPRO_MCP_REGISTRY.sanitizeFlowData = function(args) {
	try {
		if (!args || !Array.isArray(args.nodeDataArray) || !Array.isArray(args.linkDataArray)) return args;

		var nodeKeys = {};
		for (var i = 0; i < args.nodeDataArray.length; i++) {
			var node = args.nodeDataArray[i];
			if (node.key != null) nodeKeys[node.key] = true;

			if (node.loc && typeof node.loc === 'string') {
				var parts = node.loc.split(' ');
				node.loc = (Math.round(parseFloat(parts[0])) || 0) + ' ' + (Math.round(parseFloat(parts[1])) || 0);
			}
			if (node.width) node.width = Math.round(parseFloat(node.width)) || 140;
			if (node.height) node.height = Math.round(parseFloat(node.height)) || 60;
		}

		args.linkDataArray = args.linkDataArray.filter(function(link) {
			return link && nodeKeys[link.from] && nodeKeys[link.to];
		});
	} catch (e) {}
	return args;
};

module.exports = WIREFRAMEPRO_MCP_REGISTRY;
