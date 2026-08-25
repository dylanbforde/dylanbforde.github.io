#!/usr/bin/env python3

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET


USER_ID = "195775990"
PROFILE_SLUG = "dylan-forde"
PROFILE_URL = f"https://www.goodreads.com/user/show/{USER_ID}-{PROFILE_SLUG}"
RSS_BASE_URL = f"https://www.goodreads.com/review/list_rss/{USER_ID}"
FEATURED_SHELF = "7-star"
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "data" / "goodreads.json"
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
SUMMARY_TAG_RE = re.compile(r"<[^>]+>")
SHELF_LINK_RE = re.compile(rf"review/list/{USER_ID}(?:-[^?\"'>]+)?\?shelf=([a-z0-9-]+)")


def fetch_text(url: str) -> str:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", errors="replace")


def text_or_empty(parent: ET.Element, path: str) -> str:
    node = parent.find(path)
    if node is None or node.text is None:
        return ""
    return node.text.strip()


def strip_html(value: str) -> str:
    if not value:
        return ""
    without_tags = SUMMARY_TAG_RE.sub(" ", value)
    return re.sub(r"\s+", " ", unescape(without_tags)).strip()


def extract_shelves(profile_html: str) -> list[str]:
    decoded = unescape(profile_html)
    shelves = sorted(set(SHELF_LINK_RE.findall(decoded)))
    return shelves


def find_featured_shelf(shelves: list[str]) -> str | None:
    if FEATURED_SHELF in shelves:
        return FEATURED_SHELF

    for shelf in shelves:
        if "7" in shelf and "star" in shelf:
            return shelf

    # Goodreads does not consistently expose custom shelves in profile HTML,
    # while their public RSS endpoints remain available. Keep the deliberately
    # curated shelf stable instead of dropping it from the generated snapshot.
    return FEATURED_SHELF


def feed_url(shelf: str, per_page: int) -> str:
    params = urlencode({
        "shelf": shelf,
        "sort": "date_added",
        "per_page": str(per_page),
    })
    return f"{RSS_BASE_URL}?{params}"


def parse_feed(xml_text: str) -> dict[str, Any]:
    root = ET.fromstring(xml_text)
    channel = root.find("./channel")
    if channel is None:
        raise RuntimeError("Goodreads RSS response did not include a <channel> element.")

    items: list[dict[str, Any]] = []
    for item in channel.findall("./item"):
        book_id = text_or_empty(item, "book_id")
        review_url = text_or_empty(item, "link")
        shelves = [part.strip() for part in text_or_empty(item, "user_shelves").split(",") if part.strip()]
        summary = strip_html(text_or_empty(item, "book_description"))
        pages = text_or_empty(item, "book/num_pages")

        items.append({
            "bookId": book_id,
            "title": text_or_empty(item, "title"),
            "author": text_or_empty(item, "author_name"),
            "url": f"https://www.goodreads.com/book/show/{book_id}" if book_id else review_url,
            "reviewUrl": review_url,
            "cover": (
                text_or_empty(item, "book_large_image_url")
                or text_or_empty(item, "book_medium_image_url")
                or text_or_empty(item, "book_small_image_url")
                or text_or_empty(item, "book_image_url")
            ),
            "summary": summary,
            "averageRating": text_or_empty(item, "average_rating"),
            "userRating": text_or_empty(item, "user_rating"),
            "publishedYear": text_or_empty(item, "book_published"),
            "dateAdded": text_or_empty(item, "user_date_added") or text_or_empty(item, "pubDate"),
            "dateCreated": text_or_empty(item, "user_date_created"),
            "pages": int(pages) if pages.isdigit() else None,
            "shelves": shelves,
        })

    return {
        "title": text_or_empty(channel, "title"),
        "lastBuildDate": text_or_empty(channel, "lastBuildDate"),
        "items": items,
    }


def main() -> None:
    profile_html = fetch_text(PROFILE_URL)
    shelves = extract_shelves(profile_html)
    featured_shelf = find_featured_shelf(shelves)

    current_feed = parse_feed(fetch_text(feed_url("currently-reading", 5)))
    featured_feed = parse_feed(fetch_text(feed_url(featured_shelf, 5))) if featured_shelf else {"items": []}

    payload = {
        "userId": USER_ID,
        "profileSlug": PROFILE_SLUG,
        "profileUrl": PROFILE_URL,
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "detectedShelves": shelves,
        "currentlyReading": current_feed["items"],
        "featuredShelf": {
            "slug": featured_shelf,
            "label": "7-Star Shelf" if featured_shelf == "7-star" else featured_shelf,
            "items": featured_feed["items"],
        } if featured_shelf else None,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    print(f"Wrote Goodreads snapshot to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
