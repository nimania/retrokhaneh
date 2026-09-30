#!/usr/bin/env python3
import json,re
from pathlib import Path
from urllib.parse import urljoin,urlparse
import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/"data"/"characters.json"
UA="Mozilla/5.0 (compatible; RetrokhanehBot/1.0; +https://nimania.github.io/retrokhaneh/)"
S=requests.Session();S.headers.update({"User-Agent":UA,"Accept-Language":"en-US,en;q=0.7"})

def add_unique(seq,val,limit=8):
    if val and val.startswith("http") and val not in seq and len(seq)<limit: seq.append(val)

def video_from(url):
    m=re.search(r"(?:youtube(?:-nocookie)?\.com/(?:embed/|watch\?v=)|youtu\.be/)([\w-]{11})",url or "")
    if m:return {"provider":"youtube","id":m.group(1),"url":"https://www.youtube.com/watch?v="+m.group(1)}
    m=re.search(r"(?:player\.)?vimeo\.com/(?:video/)?(\d+)",url or "")
    if m:return {"provider":"vimeo","id":m.group(1),"url":"https://vimeo.com/"+m.group(1)}
    return None

data=json.loads(PATH.read_text("utf-8"))
changed=False
for char in data.get("items",[]):
    media=char.setdefault("media",{})
    url=media.get("officialUrl")
    if not url: continue
    try:
        r=S.get(url,timeout=25,allow_redirects=True);r.raise_for_status()
        if "html" not in r.headers.get("content-type",""): continue
        soup=BeautifulSoup(r.text,"html.parser")
        images=list(media.get("images") or [])
        for selector in ('meta[property="og:image"]','meta[name="twitter:image"]'):
            n=soup.select_one(selector);v=n.get("content") if n else ""
            if v:add_unique(images,urljoin(r.url,v))
        for n in soup.select("main img[src], article img[src], img[src]")[:30]:
            v=n.get("src","")
            if v and not v.startswith("data:"): add_unique(images,urljoin(r.url,v))
        if images:
            media["images"]=images[:8]
            media["image"]=images[0]

        videos=list(media.get("videos") or [])
        seen={(v.get("provider"),v.get("id")) for v in videos if isinstance(v,dict)}
        urls=[]
        for n in soup.select("iframe[src], a[href]"):
            v=n.get("src") or n.get("href") or ""
            if any(h in v for h in ("youtube.com","youtu.be","vimeo.com")): urls.append(urljoin(r.url,v))
        for selector in ('meta[property="og:video"]','meta[property="og:video:url"]','meta[name="twitter:player"]'):
            n=soup.select_one(selector)
            if n and n.get("content"): urls.append(n.get("content"))
        for u in urls:
            v=video_from(u)
            if v and (v["provider"],v["id"]) not in seen and len(videos)<4:
                videos.append(v);seen.add((v["provider"],v["id"]))
        if videos: media["videos"]=videos
        media["mediaSource"]=r.url
        changed=True
        print("character-media",char.get("id"),len(media.get("images") or []),len(media.get("videos") or []))
    except Exception as exc:
        print("character-media-fail",char.get("id"),type(exc).__name__)

if changed:
    PATH.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n","utf-8")
