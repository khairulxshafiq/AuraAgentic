"""
Prompt Optimizer Tool — Enhances and optimizes image generation prompts.
"""

from typing import Dict, Any


def optimize_prompt(
    base_prompt: str,
    style: str = "photorealistic",
    platform: str = "instagram",
    brand_colors: list = None
) -> Dict[str, Any]:
    """
    Optimize an image generation prompt.
    
    Args:
        base_prompt: Original prompt text
        style: Desired style
        platform: Target platform
        brand_colors: Brand color palette
    
    Returns:
        Optimized prompt with metadata
    """
    # Add style modifiers
    style_modifiers = {
        "photorealistic": "professional photography, studio lighting, sharp focus, 8k resolution",
        "illustration": "digital illustration, clean lines, vibrant colors, detailed artwork",
        "minimalist": "clean design, minimal elements, negative space, modern aesthetic",
        "watercolor": "watercolor painting, soft edges, blended colors, artistic texture"
    }

    modifier = style_modifiers.get(style, style_modifiers["photorealistic"])
    
    optimized = f"{base_prompt}, {modifier}"
    
    if brand_colors:
        color_str = " and ".join(brand_colors[:3])
        optimized += f", color scheme featuring {color_str}"

    return {
        "optimized_prompt": optimized,
        "style": style,
        "platform": platform,
        "prompt_length": len(optimized.split())
    }
