"""
Tool Registry — Discovers and registers all tool connectors.
Scans the connectors/ directory and builds a name -> connector mapping.
"""

import logging
from typing import Dict, Optional, List, Any

from .tool_base import AuraTool

logger = logging.getLogger("hermes.tool_registry")


class ToolRegistry:
    """Registry of available tool connectors."""

    def __init__(self):
        self._connectors: Dict[str, AuraTool] = {}

    def register(self, connector: AuraTool) -> None:
        """
        Register a tool connector.

        Args:
            connector: An instance of AuraTool subclass
        """
        if not connector.tool_name:
            logger.warning("Attempted to register connector without tool_name")
            return

        self._connectors[connector.tool_name] = connector
        logger.info(
            f"Registered tool: {connector.tool_name} "
            f"(v{connector.tool_version}, phase={connector.phase}, status={connector.status})"
        )

    def get_connector(self, tool_name: str) -> Optional[AuraTool]:
        """
        Get a connector by tool name.

        Args:
            tool_name: Name of the tool

        Returns:
            AuraTool instance or None
        """
        return self._connectors.get(tool_name)

    def list_connectors(self) -> List[Dict[str, Any]]:
        """List all registered connectors with their metadata."""
        return [
            {
                "name": c.tool_name,
                "version": c.tool_version,
                "description": c.tool_description,
                "phase": c.phase,
                "status": c.status
            }
            for c in self._connectors.values()
        ]

    async def get_health_status(self) -> List[Dict[str, Any]]:
        """Get health status of all registered connectors."""
        statuses = []
        for connector in self._connectors.values():
            try:
                health = await connector.health_check()
                statuses.append(health)
            except Exception as e:
                statuses.append({
                    "name": connector.tool_name,
                    "status": "error",
                    "phase": connector.phase,
                    "healthy": False,
                    "error": str(e)
                })
        return statuses

    @property
    def count(self) -> int:
        """Number of registered connectors."""
        return len(self._connectors)


def build_registry() -> ToolRegistry:
    """
    Build the tool registry by importing and instantiating all connectors.

    Returns:
        Populated ToolRegistry
    """
    registry = ToolRegistry()

    # Phase 1 Active Connectors
    try:
        from .connectors.web_scraper import WebScraperConnector
        registry.register(WebScraperConnector())
    except Exception as e:
        logger.error(f"Failed to load web_scraper connector: {e}")

    try:
        from .connectors.search_engine import SearchEngineConnector
        registry.register(SearchEngineConnector())
    except Exception as e:
        logger.error(f"Failed to load search_engine connector: {e}")

    try:
        from .connectors.image_generator import ImageGeneratorConnector
        registry.register(ImageGeneratorConnector())
    except Exception as e:
        logger.error(f"Failed to load image_generator connector: {e}")

    # Phase 2 Stub Connectors
    try:
        from .connectors.airtable_connector import AirtableConnector
        registry.register(AirtableConnector())
    except Exception as e:
        logger.error(f"Failed to load airtable connector: {e}")

    try:
        from .connectors.google_drive import GoogleDriveConnector
        registry.register(GoogleDriveConnector())
    except Exception as e:
        logger.error(f"Failed to load google_drive connector: {e}")

    try:
        from .connectors.google_calendar import GoogleCalendarConnector
        registry.register(GoogleCalendarConnector())
    except Exception as e:
        logger.error(f"Failed to load google_calendar connector: {e}")

    try:
        from .connectors.gmail_connector import GmailConnector
        registry.register(GmailConnector())
    except Exception as e:
        logger.error(f"Failed to load gmail connector: {e}")

    try:
        from .connectors.slack_connector import SlackConnector
        registry.register(SlackConnector())
    except Exception as e:
        logger.error(f"Failed to load slack connector: {e}")

    try:
        from .connectors.facebook_connector import FacebookConnector
        registry.register(FacebookConnector())
    except Exception as e:
        logger.error(f"Failed to load facebook connector: {e}")

    try:
        from .connectors.instagram_connector import InstagramConnector
        registry.register(InstagramConnector())
    except Exception as e:
        logger.error(f"Failed to load instagram connector: {e}")

    try:
        from .connectors.github_connector import GitHubConnector
        registry.register(GitHubConnector())
    except Exception as e:
        logger.error(f"Failed to load github connector: {e}")

    logger.info(f"Tool registry built: {registry.count} connectors registered")
    return registry
