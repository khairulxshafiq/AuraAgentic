# SKILL: Prompt Engineering
## Workflow Template for Visual Designer

### Objective
Create optimized image generation prompts that produce high-quality, brand-consistent visuals.

### Steps
1. **Input Analysis**: Parse user request for subject, mood, style, and brand references
2. **Brand Lookup**: Check user preferences for brand colors, style guide, preferred aesthetic
3. **Platform Optimization**: Adjust dimensions and composition for target platform
4. **Prompt Construction**: Build detailed positive prompt with quality modifiers
5. **Negative Prompt**: Add comprehensive negative prompt to exclude AI artifacts
6. **Parameter Selection**: Choose appropriate model, steps, CFG scale

### Prompt Template
```
[Subject description], [style direction], [lighting], [composition], 
[color palette], [quality modifiers], [technical specs]
```

### Quality Checks
- Prompt is 50-150 words (optimal for most models)
- Negative prompt excludes common artifacts
- Dimensions match target platform
- Brand elements included if available
- Style is specific (not vague like "good" or "nice")

### Platform Dimensions
- Instagram: 1024x1024 (1:1)
- Facebook: 1200x630 (1.91:1)
- Twitter: 1200x675 (16:9)
- LinkedIn: 1200x627 (1.91:1)
