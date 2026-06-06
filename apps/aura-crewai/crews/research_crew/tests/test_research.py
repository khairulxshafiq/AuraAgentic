"""
Basic tests for Research Crew.
"""

import pytest
from shared.schemas import CrewRequest, CrewResponse


def test_crew_request_creation():
    """Test CrewRequest model creation."""
    req = CrewRequest(
        trace_id="test-trace-001",
        user_id="test-user",
        intent="research_website",
        task="research_and_summarize",
        input="Research https://example.com"
    )
    assert req.trace_id == "test-trace-001"
    assert req.intent == "research_website"
    assert req.context.language == "en"


def test_crew_response_creation():
    """Test CrewResponse model creation."""
    resp = CrewResponse(
        trace_id="test-trace-001",
        agent="research_crew",
        result={"title": "Test", "summary": "Test summary"},
        summary="Test completed"
    )
    assert resp.status == "success"
    assert resp.agent == "research_crew"
