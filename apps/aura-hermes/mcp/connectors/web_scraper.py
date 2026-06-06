"""
Web Scraper Connector — Phase 1 ACTIVE.
Scrapes web page content and extracts structured data.
Uses httpx for HTTP requests and BeautifulSoup for HTML parsing.
"""

import os
import logging
from typing import Any, Dict
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from ..tool_base import AuraTool

logger = logging.getLogger("hermes.connectors.web_scraper")


class WebScraperConnector(AuraTool):
    """Scrapes web page content and extracts structured data."""

    tool_name = "web-scraper"
    tool_version = "1.0.0"
    tool_description = "Scrapes web page content and extracts structured data"
    phase = 1
    status = "active"

    DEFAULT_MAX_CONTENT_LENGTH = 50000
    DEFAULT_TIMEOUT = 15
    USER_AGENT = "AURA-Bot/1.0 (Agentic AI Research Agent)"

    def validate_params(self, params: Dict[str, Any]) -> bool:
        """Validate that url is provided and is a valid URL."""
        super().validate_params(params)
        url = params.get("url")
        if not url:
            raise ValueError("Parameter 'url' is required")
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            raise ValueError(f"Invalid URL: {url}. Must include scheme (http/https) and domain.")
        return True

    async def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Scrape a web page and extract structured content.

        Args:
            params: {url, depth (default 1), extract_images (default false), max_content_length (default 50000)}

        Returns:
            {content, title, links, images, metadata}
        """
        url = params["url"]
        depth = params.get("depth", 1)
        extract_images = params.get("extract_images", False)
        max_content_length = params.get("max_content_length", self.DEFAULT_MAX_CONTENT_LENGTH)

        logger.info(f"Scraping URL: {url} (depth={depth}, extract_images={extract_images})")

        headers = {
            "User-Agent": self.USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5"
        }

        async with httpx.AsyncClient(
            timeout=self.DEFAULT_TIMEOUT,
            follow_redirects=True,
            verify=True
        ) as client:
            response = await client.get(url, headers=headers)

            # Check for blocked/forbidden
            if response.status_code == 403:
                return {
                    "content": "",
                    "title": "",
                    "links": [],
                    "images": [],
                    "metadata": {
                        "content_length": 0,
                        "status_code": 403,
                        "content_type": response.headers.get("content-type", ""),
                        "blocked": True,
                        "reason": "Access forbidden (403)"
                    }
                }

            if response.status_code == 429:
                return {
                    "content": "",
                    "title": "",
                    "links": [],
                    "images": [],
                    "metadata": {
                        "content_length": 0,
                        "status_code": 429,
                        "content_type": "",
                        "blocked": True,
                        "reason": "Rate limited (429)"
                    }
                }

            response.raise_for_status()

            html = response.text
            content_type = response.headers.get("content-type", "")

            soup = BeautifulSoup(html, "html.parser")

            # Remove script and style elements
            for element in soup(["script", "style", "nav", "footer", "header"]):
                element.decompose()

            # Extract title
            title = ""
            title_tag = soup.find("title")
            if title_tag:
                title = title_tag.get_text(strip=True)

            # Extract meta description
            meta_desc = ""
            meta_tag = soup.find("meta", attrs={"name": "description"})
            if meta_tag:
                meta_desc = meta_tag.get("content", "")

            # Extract text content
            text_content = soup.get_text(separator="\n", strip=True)
            # Clean up multiple newlines
            lines = [line.strip() for line in text_content.splitlines() if line.strip()]
            text_content = "\n".join(lines)

            # Truncate if needed
            if len(text_content) > max_content_length:
                text_content = text_content[:max_content_length] + "\n... [truncated]"

            # Extract links
            links = []
            for a_tag in soup.find_all("a", href=True):
                href = a_tag["href"]
                absolute_url = urljoin(url, href)
                if absolute_url.startswith(("http://", "https://")):
                    link_text = a_tag.get_text(strip=True)
                    links.append({"url": absolute_url, "text": link_text[:100]})

            # Deduplicate links
            seen_urls = set()
            unique_links = []
            for link in links:
                if link["url"] not in seen_urls:
                    seen_urls.add(link["url"])
                    unique_links.append(link["url"])
            links = unique_links[:50]  # Cap at 50 links

            # Extract images if requested
            images = []
            if extract_images:
                for img_tag in soup.find_all("img", src=True):
                    src = img_tag["src"]
                    absolute_src = urljoin(url, src)
                    if absolute_src.startswith(("http://", "https://")):
                        alt_text = img_tag.get("alt", "")
                        images.append({"url": absolute_src, "alt": alt_text[:100]})
                images = [img["url"] for img in images[:30]]  # Cap at 30

            return {
                "content": text_content,
                "title": title,
                "links": links,
                "images": images,
                "metadata": {
                    "content_length": len(text_content),
                    "status_code": response.status_code,
                    "content_type": content_type,
                    "meta_description": meta_desc,
                    "links_found": len(links),
                    "images_found": len(images)
                }
            }
