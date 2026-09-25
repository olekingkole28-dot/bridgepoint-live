# BridgePoint MCP server

A small stdio MCP server exposing only BridgePoint's public-safe property interfaces.

## Tools
- \`search_property\`
- \`property_detail\`
- \`building_detail\`
- \`parcel_cutout\`
- \`integrity_index\`
- \`live_context\`
- \`bridgepoint_status\`

## Run
\`\`\`bash
npm install
npm start
\`\`\`

Optional environment variables:
- \`BRIDGEPOINT_SUPABASE_URL\`
- \`BRIDGEPOINT_PUBLISHABLE_KEY\`

The default key in this source is the same public/publishable client key used by BridgePoint's web application. No service-role key is included.

## Example MCP client config
\`\`\`json
{
  "mcpServers": {
    "bridgepoint": {
      "command": "node",
      "args": ["/absolute/path/to/distribution/mcp/index.mjs"]
    }
  }
}
\`\`\`

This server intentionally excludes account-gated timelines, imagery history, saved workspaces, claims actions and paid package entitlements.
