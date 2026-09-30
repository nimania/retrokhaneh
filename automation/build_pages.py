#!/usr/bin/env python3
import json, html
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "data" / "news.json").read_text("utf-8"))
CHARACTERS_FILE = ROOT / "data" / "characters.json"
CHARACTERS = json.loads(CHARACTERS_FILE.read_text("utf-8")).get("items", []) if CHARACTERS_FILE.exists() else []
FRANCHISES_FILE = ROOT / "data" / "franchises.json"
FRANCHISES = json.loads(FRANCHISES_FILE.read_text("utf-8")).get("items", []) if FRANCHISES_FILE.exists() else []
BASE = "https://nimania.github.io/retrokhaneh"

def e(value):
    return html.escape(str(value or ""), quote=True)

def character_page(char):
    title = char.get("nameFa") or char.get("name") or "شخصیت رترو"
    desc = (char.get("summaryFa") or "")[:180]
    cid = char.get("id") or ""
    return f"""<!doctype html>
<html lang="fa" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)} | رتروپدیا | رتروخانه</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{BASE}/characters/{e(cid)}/">
<link rel="stylesheet" href="../../style.css?v=20260930portal4">
<link rel="stylesheet" href="../characters.css?v=20260930chars2">
<meta property="og:type" content="profile"><meta property="og:site_name" content="رتروخانه">
<meta property="og:title" content="{e(title)} | رتروپدیا"><meta property="og:description" content="{e(desc)}">
</head><body>
<header class="app-header">
<a class="brand" href="../../"><span class="retro-sign"><span class="retro-sign-word">رتروخانه</span><span class="retro-sign-star">✦</span></span><span class="brand-copy"><small>RETROPEDIA · CHARACTER</small></span></a>
<div class="header-actions"><a class="icon-button" href="../">◫</a><a class="icon-button" href="../../">⌂</a></div>
</header>
<main id="character-page" class="character-page"><div class="character-loading">در حال بارگذاری شخصیت…</div></main>
<script src="../../character.js?v=20260930chars2" defer></script>
</body></html>"""

def franchise_page(franchise):
    title = franchise.get("nameFa") or franchise.get("name") or "فرنچایز رترو"
    desc = (franchise.get("summaryFa") or "")[:180]
    fid = franchise.get("id") or ""
    return f"""<!doctype html>
<html lang="fa" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)} | فرنچایزها | رتروخانه</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{BASE}/franchises/{e(fid)}/">
<link rel="stylesheet" href="../../style.css?v=20260930portal4">
<link rel="stylesheet" href="../../characters/characters.css?v=20260930chars2">
</head><body>
<header class="app-header">
<a class="brand" href="../../"><span class="retro-sign"><span class="retro-sign-word">رتروخانه</span><span class="retro-sign-star">✦</span></span><span class="brand-copy"><small>RETROPEDIA · FRANCHISE</small></span></a>
<div class="header-actions"><a class="icon-button" href="../">◫</a><a class="icon-button" href="../../">⌂</a></div>
</header>
<main id="franchise-page" class="character-page"><div class="character-loading">در حال بارگذاری فرنچایز…</div></main>
<script src="../../franchise.js?v=20260930fr1" defer></script>
</body></html>"""

def article_page(item):
    title = item.get("titleFa") or item.get("title") or "خبر"
    desc = (item.get("excerptFa") or item.get("excerpt") or "")[:180]
    image = item.get("image") or ((item.get("images") or [""])[0])
    og_image = f'<meta property="og:image" content="{e(image)}">' if image else ""
    body = "".join(f"<p>{e(p)}</p>" for p in (item.get("bodyFa") or []))
    jsonld = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": title,
        "datePublished": item.get("published") or "",
        "inLanguage": "fa",
        "url": f"{BASE}/news/{item['id']}/",
        "isBasedOn": item.get("url") or "",
        "author": {"@type": "Organization", "name": "رتروخانه"},
        "publisher": {"@type": "Organization", "name": "رتروخانه"},
    }
    if image:
        jsonld["image"] = image

    return f"""<!doctype html>
<html lang="fa" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)} | رتروخانه</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{BASE}/news/{e(item['id'])}/">
<link rel="stylesheet" href="../../style.css?v=20260930article4">
<meta property="og:type" content="article"><meta property="og:site_name" content="رتروخانه">
<meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}">
{og_image}
<script type="application/ld+json">{json.dumps(jsonld, ensure_ascii=False).replace("</", "<\\/")}</script>
</head><body>
<header class="app-header">
<a class="brand" href="../../"><span class="retro-sign"><span class="retro-sign-word">رتروخانه</span><span class="retro-sign-star">✦</span></span><span class="brand-copy"><small>RETROKHANEH · خبر و فرهنگ رترو</small></span></a>
<div class="header-actions"><button id="theme-toggle" class="icon-button" type="button" aria-label="روشن یا تیره">◐</button></div>
</header>
<main class="article-shell">
<div class="article-crumbs"><a href="../../">خانه</a><span>/</span><a href="../../#latest">اخبار</a><span>/</span><span>خبر</span></div>
<article>
<header class="article-head"><div id="article-meta" class="story-meta"></div><h1 id="article-title">{e(title)}</h1><p id="article-lead" class="article-lead">{e(desc)}</p></header>
<div id="article-media"></div>
<div id="article-body" class="article-text">{body}</div>
<div id="article-videos"></div>
<p class="article-note">رتروخانه متن منبع را بازنشر نمی‌کند؛ این صفحه توضیح و جمع‌بندی مستقلی از اطلاعات منبع است. برای جزئیات کامل و رسانهٔ اصلی به منبع مراجعه کنید.</p>
</article>
<section id="gallery-section" class="article-section" hidden><h2>تصاویر بیشتر</h2><div id="article-gallery" class="article-gallery"></div></section>
<section class="article-section"><h2>منبع خبر</h2><div class="article-source"><div><strong id="source-name">{e(item.get('source'))}</strong><small id="source-url">{e(item.get('url'))}</small></div><a id="source-link" href="{e(item.get('url'))}" target="_blank" rel="noopener noreferrer nofollow">باز کردن منبع ↗</a></div></section>
<section id="related-section" class="article-section" hidden><h2>خبرهای مرتبط</h2><div id="related-grid" class="related-grid"></div></section>
</main>
<script src="../../article.js?v=20260930article4" defer></script>
</body></html>"""

urls = [
    (BASE + "/", "1.0"),
    (BASE + "/play/", "0.8"),
    (BASE + "/characters/", "0.9"),
    (BASE + "/franchises/", "0.85"),
]
for char in CHARACTERS:
    if char.get("id"):
        urls.append((f"{BASE}/characters/{char['id']}/", "0.7"))
for franchise in FRANCHISES:
    if franchise.get("id"):
        urls.append((f"{BASE}/franchises/{franchise['id']}/", "0.7"))
        target = ROOT / "franchises" / franchise["id"]
        target.mkdir(parents=True, exist_ok=True)
        (target / "index.html").write_text(franchise_page(franchise), "utf-8")

for char in CHARACTERS:
    if not char.get("id"):
        continue
    target = ROOT / "characters" / char["id"]
    target.mkdir(parents=True, exist_ok=True)
    (target / "index.html").write_text(character_page(char), "utf-8")

for item in DATA.get("items", []):
    if not item.get("id"):
        continue
    target = ROOT / "news" / item["id"]
    target.mkdir(parents=True, exist_ok=True)
    (target / "index.html").write_text(article_page(item), "utf-8")
    urls.append((f"{BASE}/news/{item['id']}/", "0.7"))

sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
sitemap += "\n".join(f"<url><loc>{e(url)}</loc><priority>{pri}</priority></url>" for url, pri in urls)
sitemap += "\n</urlset>\n"
(ROOT / "sitemap.xml").write_text(sitemap, "utf-8")
(ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {BASE}/sitemap.xml\n", "utf-8")
print("built", len(urls) - 1, "article pages")
