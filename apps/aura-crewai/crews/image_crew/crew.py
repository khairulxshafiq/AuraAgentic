"""
Image Crew — CrewAI crew definition.
Agent: Visual Designer / Prompt Engineer.
"""

import os
import logging
from typing import Any, Dict

from shared.schemas import CrewRequest, CrewResponse
from shared.schemas.response import MetadataSchema

logger = logging.getLogger("image_crew.crew")


async def run_image_crew(request: CrewRequest) -> CrewResponse:
    """
    Execute the image crew workflow.
    
    Visual Designer generates optimized image prompts with brand consistency.
    """
    trace_id = request.trace_id
    workflow_run_id = request.workflow_run_id
    user_input = request.input

    logger.info(f"Starting image workflow | trace_id={trace_id}")

    # Extract context
    brand = request.context.brand
    style_guide = request.context.custom.get("style_guide", "")
    target_platform = request.context.platform or "instagram"
    research_context = request.context.research_context
    user_prefs = request.memory.user_preferences or {}

    # Determine dimensions based on platform
    platform_dims = {
        "instagram": {"width": 1024, "height": 1024, "aspect_ratio": "1:1"},
        "facebook": {"width": 1200, "height": 630, "aspect_ratio": "1.91:1"},
        "twitter": {"width": 1200, "height": 675, "aspect_ratio": "16:9"},
        "linkedin": {"width": 1200, "height": 627, "aspect_ratio": "1.91:1"}
    }
    dimensions = platform_dims.get(target_platform, platform_dims["instagram"])

    # Build image prompt from user input and context
    prompt_parts = []
    if user_input:
        prompt_parts.append(user_input.strip())
    else:
        prompt_parts.append("Generate a visually compelling image")

    if brand:
        prompt_parts.append(f"for {brand} brand")

    if style_guide:
        prompt_parts.append(f"style: {style_guide}")

    if research_context:
        summary = research_context.get("summary", "")
        if summary:
            prompt_parts.append(f"context: {summary[:200]}")

    # Add quality modifiers
    style = user_prefs.get("preferred_style", "photorealistic")
    brand_colors = user_prefs.get("brand_colors", [])

    quality_modifiers = [
        "high quality", "professional", "detailed",
        "studio lighting" if style == "photorealistic" else "artistic lighting",
        "sharp focus", "high resolution"
    ]

    if brand_colors:
        color_str = ", ".join(brand_colors[:3])
        quality_modifiers.append(f"color palette: {color_str}")

    full_prompt = ", ".join(prompt_parts + quality_modifiers)

    # Negative prompt
    negative_prompt = (
        "blurry, low quality, distorted face, extra limbs, watermark, "
        "text overlay, cartoon, anime, oversaturated, deformed, "
        "bad anatomy, ugly, disfigured, noisy, grainy"
    )

    # Brand consistency score (simple heuristic)
    brand_score = 0.8
    if brand:
        brand_score += 0.1
    if brand_colors:
        brand_score += 0.05
    if style_guide:
        brand_score += 0.05
    brand_score = min(brand_score, 1.0)

    result = {
        "prompt": full_prompt,
        "style": style,
        "dimensions": f"{dimensions['width']}x{dimensions['height']}",
        "negative_prompt": negative_prompt
    }

    summary = (
        f"Image prompt generated from the request "
        f"'{user_input}'"
        f" with style {style} for {target_platform} "
        f"({dimensions['aspect_ratio']}, {dimensions['width']}x{dimensions['height']})."
    )

    return CrewResponse(
        trace_id=trace_id,
        workflow_run_id=workflow_run_id,
        status="success",
        agent="image_crew",
        result=result,
        summary=summary,
        metadata=MetadataSchema(
            agent_version="1.0.0",
            model_used="google/gemini-flash-1.5"
        )
    )
