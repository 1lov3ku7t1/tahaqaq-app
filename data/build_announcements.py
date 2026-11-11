# python3 -I data/build_announcements.py — builds announcements.json from saved RSS files in data/feeds/.
import json, sys, os, email.utils, xml.etree.ElementTree as ET
here = os.path.dirname(os.path.abspath(__file__)); items = []; feeds = []
for fn in sorted(os.listdir(os.path.join(here, "feeds"))):
    try: root = ET.parse(os.path.join(here, "feeds", fn)).getroot()
    except ET.ParseError: print("skip (not RSS):", fn); continue
    lang, cat = fn[:-4].split("_", 1)
    url = f"https://www.mediaoffice.abudhabi/{lang}/{cat}/rss/"
    feeds.append({"file": "feeds/" + fn, "url": url, "lang": lang, "category": cat})
    for it in root.iter("item"):
        d = it.findtext("pubDate") or ""
        try: d = email.utils.parsedate_to_datetime(d).date().isoformat()
        except Exception: pass
        items.append({"title": (it.findtext("title") or "").strip(), "link": (it.findtext("link") or "").strip(),
                      "published": d, "lang": lang, "category": cat})
snap = sys.argv[1] if len(sys.argv) > 1 else None
json.dump({"_note": "Dated snapshot of Abu Dhabi Media Office RSS feeds. Covers Abu Dhabi government only. Feed-specific terms not stated.",
  "publisher": "Abu Dhabi Media Office", "index_url": "https://www.mediaoffice.abudhabi/en/rss-news-feeds-abu-dhabi-media-office/",
  "snapshot_date": snap, "feeds": feeds, "items": items}, open(os.path.join(here, "announcements.json"), "w"), ensure_ascii=False, indent=1)
print(len(feeds), "feeds,", len(items), "items")
