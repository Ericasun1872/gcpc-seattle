#!/usr/bin/env python3
"""Refresh data/sermons.json from YouTube @gcpc.seattle. No API key.

Primary source: public Atom RSS of the uploads playlist (and channel feed).
YouTube's RSS endpoint often returns 404/500 for valid channels, so this
falls back to the public Videos tab HTML (ytInitialData). Titles stay as
published. Dates come from RSS, a previous JSON file, the watch page, or a
date already written in the title. The script does not invent sermons.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

CHANNEL_ID = "UCjffs0ZHxlv9bitLbmEolVQ"
UPLOADS_PLAYLIST_ID = "UUjffs0ZHxlv9bitLbmEolVQ"
CHANNEL_URL = "https://www.youtube.com/@gcpc.seattle"
VIDEOS_URL = "https://www.youtube.com/@gcpc.seattle/videos"
USER_AGENT = (
    "Mozilla/5.0 (compatible; GCPC-Seattle-sermons/1.0; "
    "+https://github.com/Ericasun1872/gcpc-seattle)"
)
ATOM = "http://www.w3.org/2005/Atom"
YT = "http://www.youtube.com/xml/schemas/2015"
VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
MAX_VIDEOS = 15
REQUEST_TIMEOUT = 25

RSS_URLS = (
    f"https://www.youtube.com/feeds/videos.xml?playlist_id={UPLOADS_PLAYLIST_ID}",
    f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}",
)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def http_get(url: str) -> tuple[int, bytes]:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept-Language": "ko,en;q=0.8",
            "Accept": "*/*",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
            return resp.getcode() or 200, resp.read()
    except urllib.error.HTTPError as exc:
        body = exc.read() if exc.fp else b""
        return exc.code, body
    except (urllib.error.URLError, TimeoutError, OSError):
        return 0, b""


def looks_like_atom(body: bytes) -> bool:
    head = body.lstrip()[:200].lower()
    return head.startswith(b"<?xml") or b"<feed" in head


def parse_iso_date(value: str) -> str:
    if not value:
        return ""
    text = value.strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", text):
        return text
    match = re.match(r"(\d{4}-\d{2}-\d{2})[T\s]", text)
    if match:
        return match.group(1)
    return ""


def parse_watch_date(text: str) -> str:
    text = (text or "").strip()
    iso = parse_iso_date(text)
    if iso:
        return iso
    dotted = re.fullmatch(r"(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?", text)
    if dotted:
        try:
            return datetime(
                int(dotted.group(1)), int(dotted.group(2)), int(dotted.group(3))
            ).strftime("%Y-%m-%d")
        except ValueError:
            return ""
    korean = re.fullmatch(r"(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\.?", text)
    if korean:
        try:
            return datetime(
                int(korean.group(1)), int(korean.group(2)), int(korean.group(3))
            ).strftime("%Y-%m-%d")
        except ValueError:
            return ""
    try:
        return datetime.strptime(text, "%b %d, %Y").strftime("%Y-%m-%d")
    except ValueError:
        pass
    try:
        return datetime.strptime(text, "%B %d, %Y").strftime("%Y-%m-%d")
    except ValueError:
        pass
    return ""


def parse_title_date(title: str) -> str:
    match = re.search(r"\((\d{1,2})/(\d{1,2})/(\d{2,4})\b", title or "")
    if not match:
        return ""
    month, day, year = (int(match.group(1)), int(match.group(2)), int(match.group(3)))
    if year < 100:
        year += 2000
    try:
        return datetime(year, month, day).strftime("%Y-%m-%d")
    except ValueError:
        return ""


def valid_video(item: dict) -> bool:
    return bool(
        VIDEO_ID_RE.fullmatch(str(item.get("id") or ""))
        and str(item.get("title") or "").strip()
    )


def normalize_video(item: dict) -> dict:
    video_id = str(item.get("id") or "").strip()
    title = re.sub(r"\s+", " ", str(item.get("title") or "").strip())
    date = parse_iso_date(str(item.get("date") or "")) or parse_title_date(title)
    return {
        "id": video_id,
        "title": title,
        "date": date,
        "url": f"https://www.youtube.com/watch?v={video_id}",
    }


def dedupe(videos: list[dict]) -> list[dict]:
    seen: set[str] = set()
    out: list[dict] = []
    for raw in videos:
        item = normalize_video(raw)
        if not valid_video(item) or item["id"] in seen:
            continue
        seen.add(item["id"])
        out.append(item)
    return out


def parse_rss(body: bytes) -> list[dict]:
    root = ET.fromstring(body)
    videos: list[dict] = []
    for entry in root.findall(f"{{{ATOM}}}entry"):
        video_id = (entry.findtext(f"{{{YT}}}videoId") or "").strip()
        if not video_id:
            atom_id = entry.findtext(f"{{{ATOM}}}id") or ""
            video_id = atom_id.rsplit(":", 1)[-1].strip()
        title = (entry.findtext(f"{{{ATOM}}}title") or "").strip()
        published = (entry.findtext(f"{{{ATOM}}}published") or "").strip()
        videos.append({"id": video_id, "title": title, "date": published})
    return dedupe(videos)


def fetch_rss() -> tuple[list[dict], str]:
    last_status = "rss-empty"
    for url in RSS_URLS:
        for attempt in range(3):
            status, body = http_get(url)
            if status == 200 and looks_like_atom(body):
                videos = parse_rss(body)
                if videos:
                    source = "youtube-rss-playlist" if "playlist_id=" in url else "youtube-rss-channel"
                    return videos, source
                last_status = f"rss-no-entries:{status}"
            else:
                last_status = f"rss-http-{status}"
            if attempt < 2:
                time.sleep(2 * (attempt + 1))
    return [], last_status


def extract_yt_initial_data(html: str) -> dict | None:
    match = re.search(r"var ytInitialData = (\{.*?\});</script>", html, re.S)
    if not match:
        return None
    try:
        data = json.loads(match.group(1))
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def videos_from_lockups(data: dict) -> list[dict]:
    videos: list[dict] = []

    def walk(obj: object) -> None:
        if isinstance(obj, dict):
            lockup = obj.get("lockupViewModel")
            if isinstance(lockup, dict) and lockup.get("contentType") == "LOCKUP_CONTENT_TYPE_VIDEO":
                video_id = str(lockup.get("contentId") or "")
                title_obj = (
                    (lockup.get("metadata") or {}).get("lockupMetadataViewModel") or {}
                ).get("title")
                title = ""
                if isinstance(title_obj, dict):
                    title = str(title_obj.get("content") or "")
                    if not title:
                        runs = title_obj.get("runs") or []
                        title = "".join(
                            str(run.get("text") or "") for run in runs if isinstance(run, dict)
                        )
                videos.append({"id": video_id, "title": title, "date": ""})
            for value in obj.values():
                walk(value)
        elif isinstance(obj, list):
            for value in obj:
                walk(value)

    walk(data)
    return dedupe(videos)


def fetch_videos_page() -> list[dict]:
    status, body = http_get(VIDEOS_URL)
    if status != 200 or not body:
        return []
    data = extract_yt_initial_data(body.decode("utf-8", "replace"))
    if not data:
        return []
    return videos_from_lockups(data)


def date_from_watch_page(video_id: str) -> str:
    status, body = http_get(f"https://www.youtube.com/watch?v={video_id}")
    if status != 200 or not body:
        return ""
    html = body.decode("utf-8", "replace")
    match = re.search(r'"dateText"\s*:\s*\{\s*"simpleText"\s*:\s*"([^"]+)"', html)
    if match:
        parsed = parse_watch_date(match.group(1))
        if parsed:
            return parsed
    match = re.search(r'"publishDate"\s*:\s*\{\s*"simpleText"\s*:\s*"([^"]+)"', html)
    if match:
        parsed = parse_watch_date(match.group(1))
        if parsed:
            return parsed
    data = extract_yt_initial_data(html)
    if not data:
        return ""

    found: list[str] = []

    def walk(obj: object) -> None:
        if found:
            return
        if isinstance(obj, dict):
            if "dateText" in obj and isinstance(obj["dateText"], dict):
                parsed = parse_watch_date(str(obj["dateText"].get("simpleText") or ""))
                if parsed:
                    found.append(parsed)
                    return
            for value in obj.values():
                walk(value)
        elif isinstance(obj, list):
            for value in obj:
                walk(value)

    walk(data)
    return found[0] if found else ""


def load_known_dates(path: Path) -> dict[str, str]:
    dates: dict[str, str] = {}
    church = Path("js/church.js")
    if church.exists():
        text = church.read_text(encoding="utf-8")
        for match in re.finditer(
            r'id:\s*"([A-Za-z0-9_-]{11})"\s*,\s*date:\s*"(\d{4}-\d{2}-\d{2})"',
            text,
        ):
            dates[match.group(1)] = match.group(2)
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            data = {}
        for item in data.get("videos") or []:
            if not isinstance(item, dict):
                continue
            video_id = str(item.get("id") or "")
            date = parse_iso_date(str(item.get("date") or ""))
            if VIDEO_ID_RE.fullmatch(video_id) and date:
                dates[video_id] = date
    return dates


def fill_dates(videos: list[dict], previous_dates: dict[str, str]) -> list[dict]:
    filled: list[dict] = []
    fetched = 0
    for item in videos:
        date = parse_iso_date(item.get("date") or "") or previous_dates.get(item["id"]) or parse_title_date(
            item["title"]
        )
        if not date and fetched < MAX_VIDEOS:
            date = date_from_watch_page(item["id"])
            fetched += 1
            time.sleep(0.4)
        item = dict(item)
        item["date"] = date
        filled.append(item)
    return filled


def identity(videos: list[dict]) -> list[tuple[str, str, str]]:
    return [(v["id"], v["title"], v.get("date") or "") for v in videos]


def write_json(path: Path, videos: list[dict], source: str) -> bool:
    previous_dates = load_known_dates(path)
    videos = fill_dates(videos[:MAX_VIDEOS], previous_dates)
    payload = {
        "_readme": (
            "Auto-refreshed from YouTube @gcpc.seattle. Titles stay as published. "
            "Do not invent videos. A GitHub Action runs scripts/refresh-sermons.py."
        ),
        "channelId": CHANNEL_ID,
        "playlistId": UPLOADS_PLAYLIST_ID,
        "channel": CHANNEL_URL,
        "source": source,
        "fetchedAt": utc_now_iso(),
        "videos": videos,
    }
    if path.exists():
        try:
            old = json.loads(path.read_text(encoding="utf-8"))
            if identity(old.get("videos") or []) == identity(videos):
                return False
        except (OSError, json.JSONDecodeError, TypeError):
            pass
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Refresh sermons JSON from YouTube @gcpc.seattle")
    parser.add_argument("--out", default="data/sermons.json")
    args = parser.parse_args()
    out = Path(args.out)

    videos, source = fetch_rss()
    if not videos:
        page_videos = fetch_videos_page()
        if page_videos:
            videos = page_videos
            source = "youtube-videos-page"
        else:
            if out.exists():
                print(f"YouTube fetch failed ({source}); keeping {out}", file=sys.stderr)
                return 0
            print(f"YouTube fetch failed ({source}) and {out} is missing", file=sys.stderr)
            return 1

    changed = write_json(out, videos, source)
    print(f"{'Wrote' if changed else 'Unchanged'} {out} ({len(videos[:MAX_VIDEOS])} videos, {source})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
