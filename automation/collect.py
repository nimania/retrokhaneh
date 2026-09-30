#!/usr/bin/env python3
import os, re, json, html, hashlib, time
from pathlib import Path
from datetime import datetime, timezone, timedelta
from urllib.parse import quote, urlparse, urljoin
from difflib import SequenceMatcher
from concurrent.futures import ThreadPoolExecutor, as_completed
from email.utils import parsedate_to_datetime

import requests
import xml.etree.ElementTree as ET
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

def _child_text(node, names):
    for name in names:
        child = node.find(name)
        if child is not None and child.text:
            return child.text.strip()
    return ""

def fetch_feed(url):
    try:
        r = SESSION.get(url, timeout=18)
        r.raise_for_status()
        root = ET.fromstring(r.content)
        channel = root.find("channel")
        if channel is not None:
            feed_title = _child_text(channel, ["title"])
            entries = []
            for node in channel.findall("item"):
                source_node = node.find("source")
                entries.append({
                    "title": _child_text(node, ["title"]),
                    "link": _child_text(node, ["link"]),
                    "published": _child_text(node, ["pubDate", "published", "date"]),
                    "summary": _child_text(node, ["description", "summary"]),
                    "source": (source_node.text or "").strip() if source_node is not None else "",
                })
            return {"title": feed_title, "entries": entries}

        # Atom fallback.
        ns = {"a": "http://www.w3.org/2005/Atom"}
        feed_title = _child_text(root, ["{http://www.w3.org/2005/Atom}title", "title"])
        entries = []
        for node in root.findall("a:entry", ns) + root.findall("entry"):
            link = ""
            link_node = node.find("a:link", ns) or node.find("link")
            if link_node is not None:
                link = link_node.get("href") or (link_node.text or "")
            entries.append({
                "title": _child_text(node, ["{http://www.w3.org/2005/Atom}title", "title"]),
                "link": link.strip(),
                "published": _child_text(node, ["{http://www.w3.org/2005/Atom}published", "{http://www.w3.org/2005/Atom}updated", "published", "updated"]),
                "summary": _child_text(node, ["{http://www.w3.org/2005/Atom}summary", "{http://www.w3.org/2005/Atom}content", "summary", "content"]),
                "source": "",
            })
        return {"title": feed_title, "entries": entries}
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
    for entry in feed["entries"][:7]:
        out.append({
            "title": clean(entry.get("title", "")),
            "url": urljoin(feed_cfg["url"], entry.get("link", "")),
            "published": iso_date(entry.get("published", "")),
            "excerpt": clean(entry.get("summary", ""))[:700],
            "source": entry.get("source") or "Google News",
            "category": category,
            "country": loc["country"],
            "lang": loc["lang"],
            "direct": False,
        })
    return out

GDELT_QUERIES = {
    "gaming": '("retro gaming" OR "classic gaming" OR "retro console")',
    "tech": '("retro technology" OR "vintage technology" OR "cassette player")',
    "music": '("vinyl reissue" OR "cassette reissue" OR "classic album remaster")',
    "cinema": '("4K restoration" OR "film restoration" OR "classic film rerelease")',
    "cars": '("classic car" OR "vintage car" OR "car restoration")',
    "design": '("retro design" OR "mid-century design" OR "vintage furniture")',
    "fashion": '("vintage fashion" OR "fashion archive" OR "retro fashion")',
    "collecting": '("vintage auction" OR "collectible archive" OR memorabilia)',
    "products": '("retro product" OR "retro-inspired" OR "vintage-inspired gadget")',
    "diners": '("retro diner" OR "classic diner" OR "vintage cafe")',
    "iran": '("vintage Iran" OR "Iran nostalgia" OR "Iran archive")',
}

def discover_gdelt(category):
    query_text = GDELT_QUERIES.get(category)
    if not query_text:
        return []
    params = {
        "query": query_text,
        "mode": "artlist",
        "maxrecords": 12,
        "timespan": "2d",
        "sort": "datedesc",
        "format": "json",
    }
    try:
        # GDELT DOC API is rate-limited. This function is called sequentially.
        r = SESSION.get("https://api.gdeltproject.org/api/v2/doc/doc", params=params, timeout=30)
        if r.status_code == 429:
            time.sleep(6)
            r = SESSION.get("https://api.gdeltproject.org/api/v2/doc/doc", params=params, timeout=30)
        r.raise_for_status()
        payload = r.json()
        out = []
        for row in payload.get("articles", []):
            title = clean(row.get("title", ""))
            url = row.get("url", "")
            if not title or not url:
                continue
            image = row.get("socialimage", "")
            item = {
                "title": title,
                "url": url,
                "published": iso_date(row.get("seendate", "")),
                "excerpt": "",
                "source": row.get("domain") or urlparse(url).netloc,
                "category": category,
                "country": row.get("sourcecountry") or "",
                "lang": row.get("language") or "",
                "direct": True,
            }
            if image and image.startswith("http"):
                item["image"] = image
                item["images"] = [image]
            out.append(item)
        return out
    except Exception as exc:
        print("gdelt-fail", category, exc)
        return []

def discover_direct(feed_cfg):
    feed = fetch_feed(feed_cfg["url"])
    if not feed:
        return []
    title = feed.get("title") or urlparse(feed_cfg["url"]).netloc
    out = []
    for entry in feed["entries"][:12]:
        out.append({
            "title": clean(entry.get("title", "")),
            "url": entry.get("link", ""),
            "published": iso_date(entry.get("published", "")),
            "excerpt": clean(entry.get("summary", ""))[:700],
            "source": title,
            "category": feed_cfg["category"],
            "country": feed_cfg.get("country", ""),
            "lang": feed_cfg.get("lang", "en"),
            "direct": True,
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
        video_urls = []
        for iframe in soup.select("iframe[src]"):
            if iframe.get("src"):
                video_urls.append(iframe.get("src"))
        for node in soup.select('a[href*="youtube.com/watch"], a[href*="youtu.be/"], a[href*="vimeo.com/"], a[href*="dailymotion.com/video/"]'):
            if node.get("href"):
                video_urls.append(node.get("href"))
        for selector in ('meta[property="og:video"]', 'meta[property="og:video:url"]', 'meta[name="twitter:player"]'):
            node = soup.select_one(selector)
            if node and node.get("content"):
                video_urls.append(node.get("content"))
        for script in soup.select('script[type="application/ld+json"]'):
            raw = script.string or script.get_text()
            if not raw or "VideoObject" not in raw:
                continue
            for match in re.findall(r'https?://[^"\\s]+', raw):
                if any(host in match for host in ("youtube.com", "youtu.be", "vimeo.com", "dailymotion.com")):
                    video_urls.append(match.replace("\\/", "/"))

        seen_video = set()
        for src in video_urls:
            provider = vid = url = ""
            m = re.search(r"(?:youtube(?:-nocookie)?\.com/(?:embed/|watch\?v=)|youtu\.be/)([\w-]{11})", src)
            if m:
                provider, vid = "youtube", m.group(1)
                url = "https://www.youtube.com/watch?v=" + vid
            if not provider:
                m = re.search(r"(?:player\.)?vimeo\.com/(?:video/)?(\d+)", src)
                if m:
                    provider, vid = "vimeo", m.group(1)
                    url = "https://vimeo.com/" + vid
            if not provider:
                m = re.search(r"dailymotion\.com/(?:embed/)?video/([\w-]+)", src)
                if m:
                    provider, vid = "dailymotion", m.group(1)
                    url = "https://www.dailymotion.com/video/" + vid
            key = (provider, vid)
            if provider and key not in seen_video:
                seen_video.add(key)
                videos.append({"provider": provider, "id": vid, "url": url})

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

    def score_model(name):
        n = name.lower()
        score = 0
        if "flash" in n:
            score += 100
        if "2.5" in n:
            score += 30
        elif "2.0" in n:
            score += 20
        if "lite" in n:
            score += 5
        if "preview" in n or "exp" in n:
            score -= 40
        if any(x in n for x in ("vision", "image", "tts", "embedding", "aqa", "gemma")):
            score -= 200
        return score

    def list_models(api_key):
        response = requests.get(
            base + "/models",
            headers={"x-goog-api-key": api_key},
            timeout=25,
        )
        response.raise_for_status()
        out = []
        for row in response.json().get("models", []):
            if "generateContent" not in row.get("supportedGenerationMethods", []):
                continue
            name = row.get("name", "").rsplit("/", 1)[-1]
            if name:
                out.append(name)
        return sorted(out, key=score_model, reverse=True)

    def call(api_key, chosen):
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.2,
            },
        }
        return requests.post(
            f"{base}/models/{chosen}:generateContent",
            headers={"x-goog-api-key": api_key, "content-type": "application/json"},
            json=payload,
            timeout=90,
        )

    for key_index, api_key in enumerate(keys):
        try:
            available = list_models(api_key)
        except Exception as exc:
            print("gemini-model-list-fail", type(exc).__name__)
            available = []

        models = []
        if preferred:
            models.append(preferred)
        for name in available:
            if name not in models:
                models.append(name)
        if not models:
            models = ["gemini-2.5-flash", "gemini-2.5-flash-lite"]

        # Limit the fallback chain to sensible text models.
        models = models[:5]
        last_status = None

        for chosen in models:
            for attempt in range(4):
                try:
                    response = call(api_key, chosen)
                    last_status = response.status_code
                    if response.status_code == 200:
                        parts = response.json().get("candidates", [{}])[0].get("content", {}).get("parts", [])
                        raw = "".join(p.get("text", "") for p in parts)
                        parsed = _parse_ai_json(raw)
                        if parsed:
                            print("gemini-ok", chosen)
                            return parsed
                        print("gemini-empty-json", chosen)
                        break

                    if response.status_code == 404:
                        print("gemini-model-unavailable", chosen)
                        break

                    if response.status_code == 429:
                        wait = min(2 * (attempt + 1), 8)
                        print("gemini-rate-limited", chosen, "retry-in", wait, "s")
                        time.sleep(wait)
                        continue

                    print("gemini-http-error", response.status_code, chosen)
                    break
                except Exception as exc:
                    print("gemini-request-fail", chosen, type(exc).__name__)
                    break

        print("gemini-key-exhausted", key_index + 1, "last-status", last_status)

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

    if provider in ("", "gemini", "google", "google-gemini"):
        return _gemini_generate(prompt, key, model or "gemini-2.5-flash")
    if provider in ("openai", "openai-compatible", "compatible") and model:
        return _openai_compatible_generate(prompt, key, model)
    print("unknown-ai-provider", provider or "(empty)", "— trying Gemini")
    return _gemini_generate(prompt, key, model or "gemini-2.5-flash")

def main():
    data = json.loads(DATA.read_text("utf-8"))
    items = data.get("items", [])
    before_items = json.dumps(items, ensure_ascii=False, sort_keys=True)
    cutoff = datetime.now(timezone.utc).date() - timedelta(days=CFG.get("maxAgeDays", 21))

    jobs = []
    for category, terms in CFG["categories"].items():
        for loc in CFG["locales"]:
            query_text = terms.get(loc["lang"]) or terms.get("en")
            jobs.append((category, loc, query_text))

    discovered = []
    # GDELT is supplemental and frequently rate-limits unauthenticated clients.
    # Keep it opt-in; Google News + direct feeds remain the primary discovery path.
    if CFG.get("gdeltEnabled", False):
        for category in CFG["categories"]:
            discovered.extend(discover_gdelt(category))
            time.sleep(6.0)

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
    for item in sorted(discovered, key=lambda x: (x.get("published") or "", bool(x.get("direct"))), reverse=True):
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
        if not enriched:
            # Do not publish thin foreign-language stubs. Discovery still runs,
            # but Retrokhaneh only publishes when it can create a substantial
            # Persian article.
            print("skip-without-persian-enrichment", item["title"])
            continue

        item["titleFa"] = enriched.get("titleFa") or item["title"]
        item["excerptFa"] = enriched.get("excerptFa") or item["excerpt"]
        item["bodyFa"] = enriched.get("bodyFa") or []
        if len(item["bodyFa"]) < 3:
            print("skip-thin-enrichment", item["title"])
            continue
        item["ai"] = True
        item.pop("direct", None)
        items.insert(0, item)

    items = sorted(items, key=lambda x: x.get("published") or "", reverse=True)[: CFG.get("keepItems", 300)]
    for item in items:
        item.pop("direct", None)
    after_items = json.dumps(items, ensure_ascii=False, sort_keys=True)
    if after_items != before_items:
        data["items"] = items
        data["updatedAt"] = datetime.now(timezone.utc).isoformat()
        DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", "utf-8")
        print("updated data/news.json")
    else:
        print("no data changes")
    print("discovered=", len(discovered), "candidates=", len(candidates), "total=", len(items))

if __name__ == "__main__":
    main()
