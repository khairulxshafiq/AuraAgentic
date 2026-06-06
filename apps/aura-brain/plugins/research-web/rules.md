# Research Website Plugin — Rules

## Plugin Identity
- **Name**: research-website
- **Domain**: Web research, scraping, summarization, report generation
- **Phase**: 1

## Guardrails

### no_personal_data_extraction
- Do NOT extract personal information (emails, phone numbers, addresses) from scraped pages
- Do NOT store personal data in research reports
- If personal data is encountered, redact or exclude it from output

### respect_robots_txt
- Respect robots.txt directives when scraping
- Do NOT scrape pages explicitly disallowed by robots.txt
- Honor rate limits and crawl delays specified by the target site
- If scraping is restricted, note this in the metadata and proceed with available content

## Behavior Rules
1. Always include source citations in research output
2. If a URL is unreachable, return a clear error — do not fabricate content
3. If scraping returns very little content, flag it as "minimal content" in metadata
4. Summarize content objectively — do not inject opinions
5. Report word count and content quality metrics in metadata
6. When multiple sources are available, cross-reference for accuracy
7. Respect copyright — extract for analysis purposes only, do not reproduce full articles
8. If the website is in a non-English language, note the language in metadata

## Output Quality
- Summaries should be concise but comprehensive
- Key findings should be actionable bullet points
- Sources should include URL, title, access time
- Reports should have a clear structure: title, summary, key findings, extracted data
