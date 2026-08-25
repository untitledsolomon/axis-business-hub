# PostHog MCP Analytics — Instrumentation Report

**Status: Skipped — no MCP server found**

## What was attempted

The `mcp-analytics` skill was run to instrument this project's MCP server with PostHog analytics (`$mcp_*` events).

## What was found

After an exhaustive search, this repository contains no MCP server. It is a **Next.js 15 frontend application** (Axis Business Hub) with:

- PostHog browser analytics (`posthog-js`) already wired in
- Supabase for backend/database
- Supabase Edge Functions for PDF generation and email sending

No MCP protocol signals were found anywhere:
- `package.json` — no `@modelcontextprotocol/sdk`, `mcp-handler`, `@rekog/mcp-nest`, or `fastmcp`
- TypeScript source files — no `McpServer`, `tools/call`, `Mcp-Session-Id`, or JSON-RPC MCP dispatch
- Supabase Edge Functions — standard HTTP handlers, not MCP servers

## Files modified

None. No changes were made to the project.

## Next steps

If you have a separate MCP server project (e.g. a TypeScript or Python server that exposes tools to AI agents), run the `mcp-analytics` skill from inside that project's directory. Once instrumented, every tool call, agent intent, and failure will be captured as `$mcp_*` events in PostHog.

See the [PostHog MCP Analytics docs](https://posthog.com/docs/mcp-analytics) for the dashboard and event reference.
