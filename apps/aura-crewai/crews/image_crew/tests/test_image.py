"""
Basic tests for Image Crew.
"""

import pytest
from shared.schemas import CrewRequest, CrewResponse


def test_crew_request_creation():
    """Test CrewRequest model creation for image crew."""
    req = CrewRequest(
        trace_id="test-trace-002",
        user_id="test-user",
        intent="build_image",
        task="generate_image_prompt",
        input="Create a product image for Sakluma hijab"
    )
    assert req.trace_id == "test-trace-002"
    assert req.intent == "build_image"


def test_crew_response_creation():
    """Test CrewResponse model creation."""
    resp = CrewResponse(
        trace_id="test-trace-002",
        agent="image_crew",
        result={"prompt": "Test prompt", "style": "photorealistic"},
        summary="Image prompt generated"
    )
    assert resp.agent == "image_crew"
    assert resp.result["style"] == "photorealistic"
