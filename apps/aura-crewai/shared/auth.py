"""
Authentication middleware for CrewAI services.
Phase 1: Basic validation (placeholder for future API key auth).
"""

from fastapi import Request, HTTPException


async def validate_request(request: Request):
    """Basic request validation. Phase 1 is permissive."""
    content_type = request.headers.get("content-type", "")
    if request.method == "POST" and "json" not in content_type:
        raise HTTPException(status_code=400, detail="Content-Type must be application/json")
    return True
