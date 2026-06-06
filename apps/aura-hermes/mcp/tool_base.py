"""
AuraTool — Abstract base class for all Hermes tool connectors.
Every connector must inherit from this class and implement the execute() method.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
import time
import logging

logger = logging.getLogger("hermes.tool_base")


class AuraTool(ABC):
    """Abstract base class for AURA tool connectors."""

    # Each connector must define these class attributes
    tool_name: str = ""
    tool_version: str = "1.0.0"
    tool_description: str = ""
    phase: int = 1
    status: str = "active"

    @abstractmethod
    async def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the tool with given parameters.

        Args:
            params: Tool-specific parameters (matches input_schema from .tool.json)

        Returns:
            Dict containing tool execution result (matches output_schema from .tool.json)

        Raises:
            NotImplementedError: If the tool is a Phase 2 stub.
            Exception: On execution failure.
        """
        raise NotImplementedError(f"Tool '{self.tool_name}' execute() not implemented")

    def validate_params(self, params: Dict[str, Any]) -> bool:
        """
        Validate input parameters before execution.
        Override in subclass for custom validation.

        Args:
            params: Parameters to validate

        Returns:
            True if valid, raises ValueError if not
        """
        if not isinstance(params, dict):
            raise ValueError("Parameters must be a dictionary")
        return True

    async def health_check(self) -> Dict[str, Any]:
        """
        Check if this tool connector is healthy and ready.

        Returns:
            Dict with health status
        """
        return {
            "name": self.tool_name,
            "version": self.tool_version,
            "status": self.status,
            "phase": self.phase,
            "healthy": self.status == "active"
        }

    async def safe_execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute with timing, validation, and error handling.

        Args:
            params: Tool parameters

        Returns:
            Dict with result, duration, and status info
        """
        start_time = time.time()
        try:
            self.validate_params(params)
            result = await self.execute(params)
            duration_ms = int((time.time() - start_time) * 1000)
            return {
                "status": "success",
                "result": result,
                "duration_ms": duration_ms,
                "error": None
            }
        except NotImplementedError as e:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.warning(f"Tool '{self.tool_name}' not implemented: {e}")
            return {
                "status": "error",
                "result": None,
                "duration_ms": duration_ms,
                "error": {
                    "code": "TOOL_NOT_IMPLEMENTED",
                    "message": str(e)
                }
            }
        except ValueError as e:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.warning(f"Tool '{self.tool_name}' validation error: {e}")
            return {
                "status": "error",
                "result": None,
                "duration_ms": duration_ms,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": str(e)
                }
            }
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Tool '{self.tool_name}' execution error: {e}")
            return {
                "status": "error",
                "result": None,
                "duration_ms": duration_ms,
                "error": {
                    "code": "TOOL_EXECUTION_FAILED",
                    "message": str(e)
                }
            }
