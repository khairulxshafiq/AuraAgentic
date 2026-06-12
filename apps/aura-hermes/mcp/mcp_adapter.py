"""
MCP Adapter — Exposes existing Hermes tools via MCP protocol.
Bridges MCP tool discovery/calling to the existing ToolRegistry and ToolExecutor.
Zero impact on existing Brain ↔ Hermes communication.
"""

import logging
from typing import Dict, Any, List

logger = logging.getLogger("hermes.mcp_adapter")


class MCPAdapter:
    """
    MCP Protocol Adapter that wraps the existing Hermes ToolRegistry.
    Exposes tools in MCP-compliant format for Cline discovery.
    """

    def __init__(self, registry):
        """
        Args:
            registry: ToolRegistry instance with registered connectors
        """
        self.registry = registry

    def list_tools(self) -> List[Dict[str, Any]]:
        """
        List all tools in MCP-compliant format.
        Returns the tools/list response expected by MCP clients (Cline).

        Returns:
            List of tool definitions with name, description, and inputSchema
        """
        tools = []
        for connector in self.registry._connectors.values():
            tool_def = {
                "name": connector.tool_name,
                "description": connector.tool_description,
                "inputSchema": connector.input_schema if hasattr(connector, 'input_schema') else {},
            }
            tools.append(tool_def)
            logger.debug(f"MCP Adapter: listed tool '{connector.tool_name}'")
        return tools

    async def call_tool(self, tool_name: str, arguments: Dict[str, Any], trace_id: str) -> Dict[str, Any]:
        """
        Execute a tool via the existing ToolExecutor.
        Returns MCP-compliant tool call result.

        Args:
            tool_name: Name of the tool to execute
            arguments: Tool parameters from MCP client
            trace_id: Request trace ID

        Returns:
            MCP-compliant result object with content array
        """
        from mcp.schemas import ToolRequest

        connector = self.registry.get_connector(tool_name)
        if not connector:
            logger.warning(f"MCP Adapter: unknown tool '{tool_name}'")
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: Unknown tool '{tool_name}'"
                }],
                "isError": True
            }

        # Build a ToolRequest compatible with existing executor
        request = ToolRequest(
            trace_id=trace_id,
            workflow_run_id=None,
            tool_name=tool_name,
            params=arguments,
            caller="mcp_client",
            timeout_ms=30000
        )

        from mcp.tool_executor import ToolExecutor
        executor = ToolExecutor(self.registry)
        result = await executor.execute(request)

        if result.status == "error":
            error_msg = result.error.get("message", "Unknown error") if result.error else "Unknown error"
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: {error_msg}"
                }],
                "isError": True
            }

        return {
            "content": [{
                "type": "text",
                "text": str(result.result) if result.result else "Tool executed successfully"
            }],
            "isError": False
        }