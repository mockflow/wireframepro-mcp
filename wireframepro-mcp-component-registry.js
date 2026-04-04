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

Provide a complete HTML document using Tailwind CSS v3 utility classes. The HTML will be rendered in a browser and automatically converted to editable wireframe components on the canvas.

IMPORTANT RULES:
- Always return a complete HTML document with proper <html>, <head>, and <body> tags
- Include Tailwind: <script src="https://d20hhedk3h2l88.cloudfront.net/genai/tailwind.min.js"></script> in <head>
- Use standard HTML elements: div, h1-h6, p, input, button, select, textarea, img, ul, li, table, form
- Include realistic placeholder text and content
- Set explicit widths and heights where possible
- Use a clean, structured layout with proper nesting
- The HTML should represent a single page/screen design
- Do not use inline SVG code — use <img> tags with SVG URLs instead
- Minimize HTML comments and hidden DOM elements to keep output concise
- Size sections appropriately for their content — avoid excessively tall empty sections

PAGE BACKGROUND: Determine the appropriate page background color based on the design context. For dark themes, set it on <body> (e.g. <body style="background-color:#141414">). For light/white UIs, omit the body background. Do NOT add background styling to an outermost wrapper div.

IMAGE PLACEHOLDERS: Do NOT use real image URLs or stock photos. For image placeholders (product photos, avatars, thumbnails, gallery images), use <img> tags with src='placeholder' and a visible border with appropriate color (e.g. <img src='placeholder' style='width:300px;height:200px;border:1px solid #ccc;'>). For full-width background sections (hero backgrounds, banners), use colored div elements instead.

ICONS: Use FontAwesome 5 SVG URLs from their CDN directly in <img> tags. Use the FULL CDN URL so icons render correctly. ALWAYS append a hex color code using a hash key — choose colors that contrast with the icon's background. Examples:
<img src="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@5.15.4/svgs/solid/home.svg#ffffff" style="width:20px;height:20px"> (white icon on dark bg)
<img src="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@5.15.4/svgs/solid/chart-bar.svg#333333" style="width:20px;height:20px"> (dark icon on light bg)
NEVER omit the color hash. Do not use inline SVG code or icon font classes.

CHARTS: If the design includes charts or data visualizations, use Chart.js v3:
- Add: <script src="https://d20hhedk3h2l88.cloudfront.net/genai/chart.min.js"></script> in <head>
- Wrap each <canvas> in a container div with explicit height and overflow:hidden
- Add data-chart-component="true" attribute to each chart <canvas>
- Set maintainAspectRatio: false in chart options
- Initialize charts in a <script> block at the end of <body>

MOBILE APPS: For mobile app designs, constrain the layout width to 375px and use a single-column layout appropriate for phone screens. Set the outermost container to width:375px. The wireframe tool will automatically wrap it in a phone device frame, so ensure the content has adequate top padding.

NO DEVICE FRAMES: Generate only the UI content. Do NOT include phone frames, laptop frames, browser chrome, or device mockup containers. The tool adds device frames automatically for mobile.

NO FIXED/STICKY POSITIONING: Do NOT use position:fixed or position:sticky. All elements must use static or relative positioning.`,
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
		clientTransform: null
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
		clientTransform: null
	},

	// ========================================================================
	// render_cloudarchitecture
	// ========================================================================
	{
		mcpToolName: 'render_cloudarchitecture',
		mcpDescription: `Create cloud architecture diagrams (AWS, Azure, GCP, Cisco) in MockFlow WireframePro.

NODE PROPERTIES:
- key: Unique string ID
- text: Service name (use \\n for multiline)
- type: Service type string
- color: Hex color
- fillColor: Background color (for groups)
- loc: Position as "x y" string
- width/height: Dimensions
- isGroup: true for container groups (VPC, subnet)
- group: Parent group key

LINK PROPERTIES:
- from/to: Node keys
- fromSpot/toSpot: "Top", "Bottom", "Left", "Right"
- text: Connection label ("HTTPS", "SQL")`,
		mcpInputSchema: {
			type: 'object',
			properties: {
				diagramType: {
					type: 'string',
					enum: ['aws', 'azure', 'gcloud', 'cisco'],
					description: 'Cloud provider type'
				},
				nodeDataArray: {
					type: 'array',
					items: { type: 'object' },
					description: 'Array of node/service objects'
				},
				linkDataArray: {
					type: 'array',
					items: { type: 'object' },
					description: 'Array of connection objects'
				}
			},
			required: ['diagramType', 'nodeDataArray', 'linkDataArray']
		},

		clientAitype: 'gencloudarchitecture',
		clientComp: null,
		clientDataField: 'generatedcloudarchitecture',
		clientPrompt: 'aws',
		clientPromptField: 'diagramType',
		clientIsHtmlConversion: false,
		clientTransform: null
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

module.exports = WIREFRAMEPRO_MCP_REGISTRY;
