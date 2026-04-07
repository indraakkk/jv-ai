Research a company using the Jackson Ventures AI agent pipeline.

Usage: /research-company <company_name>

This command takes the company name provided as $ARGUMENTS and uses the jackson-ventures MCP server to:
1. Look up or collect data about the company
2. Enrich sparse data via the research agent
3. Analyze the company via the analysis agent (industry, business model, summary, use case)
4. Store the structured results in PostgreSQL

Use the mcp__jackson-ventures__research-company tool with the company name "$ARGUMENTS".

After the research completes, display the structured analysis results to the user.
