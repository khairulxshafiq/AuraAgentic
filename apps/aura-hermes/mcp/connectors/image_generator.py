"""
Image Generator Connector — Phase 1 ACTIVE (prompt-only mode).
Generates images via API. In Phase 1, returns prompt-only if API unavailable.
"""

import os
import time
import logging
from typing import Any, Dict

import httpx

from ..tool_base import AuraTool

logger = logging.getLogger("hermes.connectors.image_generator")


class ImageGeneratorConnector(AuraTool):
    """Generate images via API using text prompts."""

    tool_name = "image-generator"
    tool_version = "1.0.0"
    tool_description = "Generate images via API. Returns prompt-only if API unavailable."
    phase = 1
    status = "active"

    def validate_params(self, params: Dict[str, Any]) -> bool:
        """Validate that prompt is provided."""
        super().validate_params(params)
        prompt = params.get("prompt")
        if not prompt or not prompt.strip():
            raise ValueError("Parameter 'prompt' is required and must not be empty")
        return True

    async def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate an image from a text prompt.

        Args:
            params: {prompt, negative_prompt, width, height, style, model, steps, cfg_scale}

        Returns:
            {image_url, prompt_used, model_used, dimensions, generation_time_ms}
        """
        prompt = params["prompt"]
        negative_prompt = params.get("negative_prompt", "")
        width = params.get("width", 1024)
        height = params.get("height", 1024)
        style = params.get("style", "photorealistic")
        model = params.get("model", "flux-pro")
        steps = params.get("steps", 30)
        cfg_scale = params.get("cfg_scale", 7.5)

        api_key = os.environ.get("IMAGE_API_KEY", "")
        image_api_url = os.environ.get("IMAGE_API_URL", "")

        start_time = time.time()

        # Attempt actual image generation if API is configured
        if api_key and image_api_url:
            try:
                logger.info(f"Generating image: model={model}, style={style}, {width}x{height}")

                payload = {
                    "prompt": prompt,
                    "negative_prompt": negative_prompt,
                    "width": width,
                    "height": height,
                    "steps": steps,
                    "cfg_scale": cfg_scale,
                    "model": model
                }

                async with httpx.AsyncClient(timeout=60) as client:
                    response = await client.post(
                        image_api_url,
                        json=payload,
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "Content-Type": "application/json"
                        }
                    )
                    response.raise_for_status()
                    data = response.json()

                generation_time_ms = int((time.time() - start_time) * 1000)

                image_url = data.get("image_url") or data.get("url") or data.get("output", {}).get("url")

                return {
                    "image_url": image_url,
                    "prompt_used": prompt,
                    "model_used": model,
                    "dimensions": {"width": width, "height": height},
                    "generation_time_ms": generation_time_ms
                }

            except Exception as e:
                logger.warning(f"Image generation API failed, returning prompt-only: {e}")

        # Prompt-only fallback (Phase 1 default behavior)
        generation_time_ms = int((time.time() - start_time) * 1000)
        logger.info("Returning prompt-only result (no IMAGE_API_KEY or API unavailable)")

        return {
            "image_url": None,
            "prompt_used": prompt,
            "model_used": model,
            "dimensions": {"width": width, "height": height},
            "generation_time_ms": generation_time_ms,
            "prompt_only": True,
            "note": "Image API not configured or unavailable. Returning prompt for manual generation."
        }
