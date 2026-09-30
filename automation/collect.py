#!/usr/bin/env python3
import os, re, json, html, hashlib
from pathlib import Path
from datetime import datetime, timezone, timedelta
from urllib.parse import quote, urlparse
from difflib import SequenceMatcher
from concurrent.futures import ThreadPoolExecutor, as_completed
from email.utils import parsedate_to_datetime

import requests
import feedparser
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "news.json"
CFG = json.loads((ROOT / "automation" / "sources.json").read_text("utf-8"))
UA = "Mozilla/5.0 (compatible; RetrokhanehBot/1.0; +https://nimania.github.io/retrokhaneh/)"
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": UA, "Accept-Language": "en-US,en;q=0.7"})
PERSIAN = re.compile(r"[\u0600-\u06ff]")

def clean(value):
    value = html.unescape(value or "")
    return re.sub(r"\s+", " ", BeautifulSoup(value, "html.parser").get_text(" ", strip=True)).strip()

def norm(value):
    return re.sub(r"[^a-z0-9\u0600-\u06ff]+", " ", (value or "").lower()).strip()

def similarity(a, b):
    return SequenceMatcher(None, norm(a), norm(b)).ratio()

def iso_date(value):
    if not value:
        return datetime.now(timezone.utc).date().isoformat()
    try:
        return parsedate_to_datetime(value).date().isoformat()
    except Exception:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).date().isoformat()
        except Exception:
            return datetime.now(timezone.utc).date().isoformat()

def make_id(title, url):
    base = re.sub(r"[^a-z0-9]+", "-", title.lower())[:55].strip("-") or "story"
    return base + "-" + hashlib.sha1(url.encode("utf-8")).hexdigest()[:7]

def fetch_feed(url):
    try:
        r = SESSION.get(url, timeout=18)
        r.raise_for_status()
        return feedparser.loads(r.content)
    except Exception as exc:
        print("feed-fail", url, exc)
        return None

def discover_google(job):
    category, loc, query_text = job
    url = (
        "https://news.google.com/rss/search?q=" + quote(query_text)
        + "&hl=" + loc["hl"] + "&gl=" + loc["gl"] + "&ceid=" + loc["ceid"]
    )
    feed = fetch_feed(url)
    if not feed:
        return []
    out = []
    for entry in feed.entries[:7]:
        source = ""
        src = getattr(entry, "source", None)
        if isinstance(src, dict):
            source = src.get("title", "")
        out.append({
            "title": clean(getattr(entry, "title", "")),
            "url": getattr(entry, "link", ""),
            "published": iso_date(getattr(entry, "published", "")),
            "excerpt": clean(getattr(entry, "summary", ""))[:700],
            "source": source or "Google News",
            "category": category,
            "country": loc["country"],
            "lang": loc["lang"],
        })
    return out

def discover_direct(feed_cfg):
    feed = fetch_feed(feed_cfg["url"])
    if not feed:
        return []
    title = getattr(feed.feed, "title", "") or urlparse(feed_cfg["url"]).netloc
    out = []
    for entry in feed.entries[:12]:
        out.append({
            "title": clean(getattr(entry, "title", "")),
            "url": getattr(entry, "link", ""),
            "published": iso_date(getattr(entry, "published", "")),
            "excerpt": clean(getattr(entry, "summary", ""))[:700],
            "source": title,
            "category": feed_cfg["category"],
            "country": feed_cfg.get("country", ""),
            "lang": feed_cfg.get("lang", "en"),
        })
    return out

def extract_media_and_text(url):
    try:
        r = SESSION.get(url, timeout=22, allow_redirects=True)
        r.raise_for_status()
        if "html" not in r.headers.get("content-type", ""):
            return {}, "", r.url
        soup = BeautifulSoup(r.text, "html.parser")

        images = []
        selectors = [
            ('meta[property="og:image"]', "content"),
            ('meta[name="twitter:image"]', "content"),
        ]
        for selector, attr in selectors:
            node = soup.select_one(selector)
            val = node.get(attr) if node else ""
            if val and val.startswith("http") and val not in images:
                images.append(val)
        for node in soup.select("article img[src]")[:8]:
            val = node.get("src", "")
            if val.startswith("http") and val not in images:
                images.append(val)

        videos = []
        for iframe in soup.select("iframe[src]"):
            src = iframe.get("src", "")
            m = re.search(r"(?:youtube(?:-nocookie)?\.com/embed/|youtu\.be/)([\w-]{11})", src)
            if m:
                videos.append({
                    "provider": "youtube",
                    "id": m.group(1),
                    "url": "https://www.youtube.com/watch?v=" + m.group(1),
                })
                continue
            m = re.search(r"player\.vimeo\.com/video/(\d+)", src)
            if m:
                videos.append({"provider": "vimeo", "id": m.group(1), "url": "https://vimeo.com/" + m.group(1)})
                continue
            m = re.search(r"dailymotion\.com/embed/video/([\w-]+)", src)
            if m:
                videos.append({
                    "provider": "dailymotion",
                    "id": m.group(1),
                    "url": "https://www.dailymotion.com/video/" + m.group(1),
                })

        paragraphs = [clean(p.get_text(" ", strip=True)) for p in soup.select("article p")]
        if len(" ".join(paragraphs)) < 500:
            paragraphs = [clean(p.get_text(" ", strip=True)) for p in soup.select("p")]
        text = " ".join(p for p in paragraphs if len(p) > 45)[:12000]

        media = {}
        if images:
            media["image"] = images[0]
            media["images"] = images[:6]
        if videos:
            media["videos"] = videos[:3]
        return media, text, r.url
    except Exception as exc:
        print("page-fail", url, exc)
        return {}, "", url

def _parse_ai_json(raw):
    raw = (raw or "").strip()
    fence = chr(96) * 3
    if raw.startswith(fence):
        raw = re.sub(r"^" + re.escape(fence) + r"(?:json)?\s*|\s*" + re.escape(fence) + r"$", "", raw, flags=re.I | re.S).strip()
    match = re.search(r"\{.*\}", raw, re.S)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
        return data if isinstance(data.get("bodyFa"), list) else None
    except Exception:
        return None

def _gemini_generate(prompt, key, model):
    base = "https://generativelanguage.googleapis.com/v1beta"
    keys = [x.strip() for x in re.split(r"[,\s]+", key) if x.strip()]
    if not keys:
        return None
    preferred = (model or "gemini-2.5-flash").rsplit("/", 1)[-1]

    def call(api_key, chosen):
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0.2},
        }
        return requests.post(
            f"{base}/models/{chosen}:generateContent",
            headers={"x-goog-api-key": api_key, "content-type": "application/json"},
            json=payload,
            timeout=90,
        )

    for api_key in keys:
        chosen = preferred
        response = call(api_key, chosen)
        if response.status_code == 404:
            try:
                listing = requests.get(base + "/models", headers={"x-goog-api-key": api_key}, timeout=25)
                listing.raise_for_status()
                available = []
                for row in listing.json().get("models", []):
                    methods = row.get("supportedGenerationMethods", [])
                    name = row.get("name", "").rsplit("/", 1)[-1]
                    if "generateContent" in methods and name and not any(x in name.lower() for x in ("image", "vision", "embedding", "tts")):
                        available.append(name)
                available.sort(key=lambda n: (("flash" in n.lower()), ("preview" not in n.lower()), n), reverse=True)
                if available:
                    chosen = available[0]
                    response = call(api_key, chosen)
            except Exception as exc:
                print("gemini-list-fail", exc)
        if response.status_code == 429:
            continue
        try:
            response.raise_for_status()
            parts = response.json()["candidates"][0]["content"]["parts"]
            raw = "".join(p.get("text", "") for p in parts)
            return _parse_ai_json(raw)
        except Exception as exc:
            print("gemini-fail", exc)
    return None

def _openai_compatible_generate(prompt, key, model):
    base = (os.getenv("AI_API_BASE") or "https://api.openai.com/v1").rstrip("/")
    try:
        response = requests.post(
            base + "/chat/completions",
            headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
            },
            timeout=90,
        )
        response.raise_for_status()
        return _parse_ai_json(response.json()["choices"][0]["message"]["content"])
    except Exception as exc:
        print("openai-compatible-fail", exc)
        return None

def ai_enrich(item, source_text):
    key = os.getenv("AI_API_KEY", "").strip()
    model = (os.getenv("AI_MODEL_STRONG") or os.getenv("AI_MODEL") or "").strip()
    provider = (os.getenv("AI_PROVIDER") or "").strip().lower()
    if not key:
        return None

    prompt = f"""
You are the Persian-language editor of Retrokhaneh, a factual news portal about retro culture.
Return ONLY a valid JSON object with exactly these keys:
titleFa: Persian headline
excerptFa: 1-2 sentence Persian lead
bodyFa: array of 4 to 6 substantial Persian paragraphs

Rules:
- Explain what happened, concrete details, and why it matters to retro culture.
- Use ONLY facts supported by the supplied source material.
- Do not invent dates, prices, people, motives, or context.
- Do not copy source sentences. Paraphrase.
- Keep uncertainty explicit.
- Product launches, diner/restaurant news, restorations, auctions, archives and reissues are all in scope.
- Keep brand names and model names accurate.

Category: {item.get("category")}
Country: {item.get("country")}
Source: {item.get("source")}
Original title: {item.get("title")}
RSS description: {item.get("excerpt")}
Extracted source text:
{source_text[:9000]}
""".strip()

    if provider == "gemini":
        return _gemini_generate(prompt, key, model or "gemini-2.5-flash")
    if not model:
        return None
    return _openai_compatible_generate(prompt, key, model)

def main():
    data = json.loads(DATA.read_text("utf-8"))
    items = data.get("items", [])
    cutoff = datetime.now(timezone.utc).date() - timedelta(days=CFG.get("maxAgeDays", 21))

    jobs = []
    for category, terms in CFG["categories"].items():
        for loc in CFG["locales"]:
            query_text = terms.get(loc["lang"]) or terms.get("en")
            jobs.append((category, loc, query_text))

    discovered = []
    with ThreadPoolExecutor(max_workers=12) as pool:
        futures = [pool.submit(discover_google, job) for job in jobs]
        futures += [pool.submit(discover_direct, feed) for feed in CFG.get("directFeeds", [])]
        for future in as_completed(futures):
            try:
                discovered.extend(future.result())
            except Exception as exc:
                print("discover-fail", exc)

    existing_urls = {item.get("url") for item in items}
    candidates = []
    for item in sorted(discovered, key=lambda x: x.get("published", ""), reverse=True):
        if not item.get("title") or not item.get("url") or item["url"] in existing_urls:
            continue
        try:
            if datetime.fromisoformat(item["published"]).date() < cutoff:
                continue
        except Exception:
            pass
        if any(x["category"] == item["category"] and similarity(x["title"], item["title"]) > 0.90 for x in candidates):
            continue
        if any(
            x.get("category") == item["category"] and similarity(x.get("title", ""), item["title"]) > 0.92
            for x in items[:150]
        ):
            continue
        item["id"] = make_id(item["title"], item["url"])
        item["page"] = True
        candidates.append(item)
        existing_urls.add(item["url"])
        if len(candidates) >= CFG.get("maxNewPerRun", 12):
            break

    # Backfill media on a small number of existing stories every run.
    for item in [x for x in items if x.get("url", "").startswith("http") and not x.get("image")][:8]:
        media, _, final_url = extract_media_and_text(item["url"])
        item.update(media)
        if final_url and "news.google.com" not in final_url:
            item["url"] = final_url

    for item in candidates:
        media, source_text, final_url = extract_media_and_text(item["url"])
        item.update(media)
        if final_url and "news.google.com" not in final_url:
            item["url"] = final_url

        enriched = ai_enrich(item, source_text)
        if enriched:
            item["titleFa"] = enriched.get("titleFa") or item["title"]
            item["excerptFa"] = enriched.get("excerptFa") or item["excerpt"]
            item["bodyFa"] = enriched.get("bodyFa") or []
            item["ai"] = True
        else:
            item["titleFa"] = item["title"] if PERSIAN.search(item["title"]) else ""
            item["excerptFa"] = item["excerpt"] if PERSIAN.search(item["excerpt"]) else ""
            item["bodyFa"] = [item["excerptFa"]] if item["excerptFa"] else []

        items.insert(0, item)

    items = sorted(items, key=lambda x: x.get("published", ""), reverse=True)[: CFG.get("keepItems", 300)]
    data["items"] = items
    data["updatedAt"] = datetime.now(timezone.utc).isoformat()
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print("discovered=", len(discovered), "new=", len(candidates), "total=", len(items))

if __name__ == "__main__":
    main()
