import json
import os
import re
import time
from bs4 import BeautifulSoup
import requests

BASE_URL = "https://fitgirl-repacks.site/wp-json/wp/v2/posts"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
OUTPUT_PATH = os.path.join("data", "games.json")


def parse_metadata(html_content):
  soup = BeautifulSoup(html_content, "html.parser")

  img = soup.find("img")
  cover = img["src"] if img and img.get("src") else ""

  text = soup.get_text("\n")

  genres_match = re.search(r"Genres/Tags:\s*(.+)", text)
  orig_size_match = re.search(r"Original Size:\s*(.+)", text)
  repack_size_match = re.search(r"Repack Size:\s*(.+)", text)

  genres = (
      [g.strip() for g in genres_match.group(1).split(",")]
      if genres_match
      else []
  )
  orig_size = orig_size_match.group(1).strip() if orig_size_match else "N/A"
  repack_size = (
      repack_size_match.group(1).strip() if repack_size_match else "N/A"
  )

  return {
      "cover": cover,
      "genres": genres[:5],
      "originalSize": orig_size,
      "repackSize": repack_size,
  }


def main():
  os.makedirs("data", exist_ok=True)
  catalog = []
  page = 1

  while True:
    try:
      res = requests.get(
          f"{BASE_URL}?per_page=100&page={page}", headers=HEADERS, timeout=15
      )
      if res.status_code != 200:
        break

      posts = res.json()
      if not posts:
        break

      for post in posts:
        content_html = post["content"]["rendered"]
        if "Repack Size" not in content_html:
          continue

        meta = parse_metadata(content_html)
        title = BeautifulSoup(post["title"]["rendered"], "html.parser").text

        catalog.append({
            "id": post["id"],
            "title": title,
            "slug": post["slug"],
            "url": post["link"],
            "date": post["date"][:10],
            **meta,
        })

      print(f"Scraped page {page} ({len(catalog)} games total)...")
      page += 1
      time.sleep(1.2)
    except Exception as e:
      print(f"Stopped at page {page}: {e}")
      break

  with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(catalog, f, ensure_ascii=False, indent=2)
  print(f"Saved {len(catalog)} games to {OUTPUT_PATH}")


if __name__ == "__main__":
  main()