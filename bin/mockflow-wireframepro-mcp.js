#!/usr/bin/env node

/**
 * MockFlow WireframePro MCP - CLI Entry Point
 *
 * Commands:
 *   mockflow-wireframepro-mcp                  Start local MCP server (default port 21194)
 *   mockflow-wireframepro-mcp --port=8888      Start on custom port
 *   mockflow-wireframepro-mcp login            Set up API key credentials
 *   mockflow-wireframepro-mcp --help           Show usage
 */

var args = process.argv.slice(2);
var command = args[0];

if (command === 'login') {
	// Reuse IdeaBoard auth module (same credentials)
	var authPath;
	try { authPath = require.resolve('../../ideaboard-mcp-local/lib/auth'); } catch(e) {}
	if (!authPath) {
		try { authPath = require.resolve('@mockflow/ideaboard-mcp/lib/auth'); } catch(e) {}
	}
	if (authPath) {
		require(authPath).login();
	} else {
		console.log('');
		console.log('Run "mockflow-mcp login" from @mockflow/ideaboard-mcp to set up credentials.');
		console.log('WireframePro MCP uses the same credentials as IdeaBoard MCP.');
		console.log('');
	}
} else if (command === '--help' || command === '-h' || command === 'help') {
	console.log('');
	console.log('MockFlow WireframePro MCP - Local MCP Server');
	console.log('');
	console.log('Usage:');
	console.log('  mockflow-wireframepro-mcp                  Start local MCP server');
	console.log('  mockflow-wireframepro-mcp --port=<number>  Start on custom port (default: 21194)');
	console.log('  mockflow-wireframepro-mcp login            Set up credentials');
	console.log('  mockflow-wireframepro-mcp --help           Show this help');
	console.log('');
	console.log('Setup:');
	console.log('  1. Run "mockflow-wireframepro-mcp login" (or "mockflow-mcp login")');
	console.log('  2. Run "mockflow-wireframepro-mcp" to start the server');
	console.log('  3. Add to your AI client:');
	console.log('');
	console.log('     Claude Code:');
	console.log('       claude mcp add --transport http -s user mockflow-wireframepro http://localhost:21194/mcp');
	console.log('');
	console.log('     Cursor (Settings > MCP):');
	console.log('       { "mcpServers": { "mockflow-wireframepro": { "url": "http://localhost:21194/mcp" } } }');
	console.log('');
	console.log('     VS Code Copilot (.vscode/mcp.json):');
	console.log('       { "servers": { "mockflow-wireframepro": { "type": "http", "url": "http://localhost:21194/mcp" } } }');
	console.log('');
} else {
	var port = 21194;
	for (var i = 0; i < args.length; i++) {
		if (args[i].indexOf('--port=') === 0) {
			port = parseInt(args[i].split('=')[1], 10);
			if (isNaN(port) || port < 1 || port > 65535) {
				console.error('Invalid port number.');
				process.exit(1);
			}
		}
	}
	require('../lib/server').start(port);
}
