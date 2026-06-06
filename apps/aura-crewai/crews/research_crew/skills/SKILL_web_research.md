# SKILL: Web Research
## Workflow Template for Research Analyst

### Objective
Research a website or topic thoroughly and extract structured, actionable data.

### Steps
1. **URL Analysis**: If a URL is provided, scrape the target page using the web-scraper tool
2. **Content Extraction**: Parse HTML to extract title, text content, links, images, and metadata
3. **Supplementary Search**: Search the web for related information using the search-engine tool
4. **Cross-Reference**: Compare scraped data with search results for accuracy
5. **Data Structuring**: Organize findings into structured format (title, summary, key_findings)

### Quality Checks
- Verify URLs are accessible before scraping
- Check for robots.txt compliance
- Validate extracted data is meaningful (not just navigation/footer text)
- Ensure sources are properly cited with URL, title, and access timestamp

### Output Format
```json
{
  "title": "Analysis title",
  "summary": "Concise executive summary",
  "key_findings": ["Finding 1", "Finding 2"],
  "extracted_data": {"metric": "value"},
  "sources": [{"url": "", "title": "", "type": "web"}]
}
```
