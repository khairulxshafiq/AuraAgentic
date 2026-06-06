"""
GoogleCalendarConnector — Phase 2 STUB.
Read/create/update Google Calendar events

This connector is a placeholder. It will be implemented in Phase 2.
Calling execute() will raise NotImplementedError.
"""

import logging
from typing import Any, Dict

from ..tool_base import AuraTool

logger = logging.getLogger("hermes.connectors.google_calendar")


class GoogleCalendarConnector(AuraTool):
    """Read/create/update Google Calendar events — Phase 2 stub."""

    tool_name = "google-calendar"
    tool_version = "0.1.0"
    tool_description = "Read/create/update Google Calendar events (Phase 2 — not yet implemented)"
    phase = 2
    status = "placeholder"

    async def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Not implemented in Phase 1.

        Raises:
            NotImplementedError: Always — this is a Phase 2 stub.
        """
        raise NotImplementedError(
            f"Tool '{self.tool_name}' is a Phase 2 placeholder. "
            f"It will be implemented in a future phase."
        )

    async def health_check(self) -> Dict[str, Any]:
        """Return placeholder health status."""
        return {
            "name": self.tool_name,
            "version": self.tool_version,
            "status": "placeholder",
            "phase": self.phase,
            "healthy": False,
            "note": "Phase 2 stub — not yet implemented"
        }
