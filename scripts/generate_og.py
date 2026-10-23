#!/usr/bin/env python3
"""Generates og-image.png from the live Firebase leaderboard when the Top 10 changes."""

import html
import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.request

FIREBASE_URL = (
    "https://math-leaderboard-122f4-default-rtdb.europe-west1.firebasedatabase.app"
    "/leaderboards/cfg_add-sub_0_10_0_10_0_20.json"
)

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE_PATH = os.path.join(REPO_ROOT, "scripts", "og-state.json")
OUT_PNG_PATH = os.path.join(REPO_ROOT, "og-image.png")


def fetch_top10():
    with urllib.request.urlopen(FIREBASE_URL, timeout=15) as resp:
        raw = json.loads(resp.read().decode("utf-8")) or {}

    entries = [v for v in raw.values() if isinstance(v, dict) and isinstance(v.get("score"), (int, float))]
    entries.sort(key=lambda e: (-e.get("score", 0), e.get("updatedAt", 0)))

    ranked = []
    current_rank = 1
    for idx, e in enumerate(entries):
        if idx > 0 and e.get("score", 0) < entries[idx - 1].get("score", 0):
            current_rank = idx + 1
        ranked.append({
            "rank": current_rank,
            "username": str(e.get("username", "Player")),
            "score": int(e.get("score", 0)),
        })
    return ranked[:10]


def build_html(top10):
    rows_html = ""
    for idx, item in enumerate(top10):
        row_cls = "lb-row top-row" if idx == 0 else "lb-row"
        safe_name = html.escape(item["username"])
        rows_html += f"""
      <div class="{row_cls}">
        <span class="lb-rank">#{item['rank']}</span>
        <span class="lb-name">{safe_name}</span>
        <span class="lb-right">
          <span class="lb-pill">▶ Replay</span>
          <span class="lb-score">{item['score']}</span>
        </span>
      </div>
    """

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }}
  html, body {{
    width: 1200px;
    height: 630px;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: linear-gradient(135deg, hsl(212, 35%, 96%) 0%, hsl(215, 45%, 92%) 100%);
    color: hsl(220, 25%, 14%);
  }}
  .canvas {{
    width: 1200px;
    height: 630px;
    padding: 34px 44px;
    display: grid;
    grid-template-columns: 540px 1fr;
    gap: 34px;
    align-items: stretch;
  }}
  .left-col {{
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 14px;
  }}
  .brand-header {{
    display: flex;
    align-items: center;
    justify-content: space-between;
  }}
  .brand-title {{
    font-size: 36px;
    font-weight: 900;
    letter-spacing: -0.03em;
    color: hsl(220, 25%, 12%);
    display: flex;
    align-items: center;
    gap: 12px;
  }}
  .config-pill {{
    background: hsl(215, 85%, 48%);
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    padding: 7px 15px;
    border-radius: 999px;
    box-shadow: 0 4px 12px rgba(18, 100, 225, 0.22);
  }}
  .hud-card {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    background: #fff;
    border: 1px solid hsl(214, 20%, 88%);
    border-radius: 16px;
    padding: 14px 16px;
    text-align: center;
    box-shadow: 0 6px 20px rgba(15, 23, 42, 0.06);
  }}
  .hud-label {{
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: hsl(215, 15%, 45%);
    margin-bottom: 4px;
  }}
  .hud-val {{
    font-size: 28px;
    font-weight: 800;
  }}
  .hud-val.primary {{ color: hsl(215, 85%, 48%); }}
  .text-right {{ color: hsl(145, 65%, 35%); }}
  .text-wrong {{ color: hsl(355, 78%, 52%); }}

  .eq-card {{
    background: #fff;
    border: 1px solid hsl(214, 20%, 88%);
    border-radius: 18px;
    padding: 26px 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    font-size: 48px;
    font-weight: 800;
    box-shadow: 0 6px 20px rgba(15, 23, 42, 0.06);
  }}
  .eq-slot {{
    min-width: 78px;
    height: 78px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
    padding: 0 14px;
  }}
  .eq-slot.q {{
    background: hsl(210, 20%, 95%);
    border: 3px solid hsl(215, 85%, 48%);
    color: hsl(215, 85%, 48%);
  }}
  .eq-op {{
    color: hsl(215, 15%, 45%);
  }}

  .keypad {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    flex: 1;
  }}
  .key {{
    background: #fff;
    border: 1px solid hsl(214, 20%, 88%);
    border-radius: 14px;
    font-size: 26px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.05);
  }}
  .key.zero {{
    grid-column: 2;
  }}

  .right-col {{
    background: #fff;
    border: 1px solid hsl(214, 20%, 88%);
    border-radius: 20px;
    padding: 22px 26px;
    box-shadow: 0 8px 26px rgba(15, 23, 42, 0.07);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}
  .lb-header {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }}
  .lb-title {{
    font-size: 24px;
    font-weight: 800;
  }}
  .lb-badge {{
    font-size: 14px;
    font-weight: 700;
    color: hsl(215, 85%, 48%);
    background: hsl(215, 85%, 94%);
    padding: 5px 12px;
    border-radius: 999px;
  }}
  .lb-list {{
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    justify-content: space-between;
  }}
  .lb-row {{
    display: grid;
    grid-template-columns: 48px 1fr auto;
    align-items: center;
    padding: 8px 14px;
    border-radius: 10px;
    font-size: 18px;
    font-weight: 600;
    background: hsl(210, 25%, 98%);
  }}
  .lb-row.top-row {{
    background: hsl(215, 90%, 95%);
    color: hsl(215, 85%, 44%);
    font-weight: 800;
  }}
  .lb-rank {{
    font-weight: 800;
    color: hsl(215, 15%, 45%);
  }}
  .lb-row.top-row .lb-rank {{
    color: hsl(215, 85%, 48%);
  }}
  .lb-name {{
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }}
  .lb-right {{
    display: inline-flex;
    align-items: center;
    gap: 12px;
  }}
  .lb-pill {{
    font-size: 12px;
    font-weight: 700;
    color: hsl(215, 85%, 48%);
    background: #fff;
    border: 1px solid hsl(214, 20%, 86%);
    border-radius: 999px;
    padding: 3px 9px;
  }}
  .lb-score {{
    font-size: 19px;
    font-weight: 800;
    min-width: 30px;
    text-align: right;
  }}
</style>
</head>
<body>
  <div class="canvas">
    <div class="left-col">
      <div class="brand-header">
        <div class="brand-title">1-Min Math</div>
        <div class="config-pill">+ − (0..10, 0..10, 0..20)</div>
      </div>

      <div class="hud-card">
        <div>
          <div class="hud-label">Time</div>
          <div class="hud-val">42s</div>
        </div>
        <div>
          <div class="hud-label">Score</div>
          <div class="hud-val primary">28</div>
        </div>
        <div>
          <div class="hud-label">Right / Wrong</div>
          <div class="hud-val"><span class="text-right">29</span> / <span class="text-wrong">1</span></div>
        </div>
      </div>

      <div class="eq-card">
        <span class="eq-slot">8</span>
        <span class="eq-op">+</span>
        <span class="eq-slot q">?</span>
        <span class="eq-op">=</span>
        <span class="eq-slot">15</span>
      </div>

      <div class="keypad">
        <div class="key">1</div>
        <div class="key">2</div>
        <div class="key">3</div>
        <div class="key">4</div>
        <div class="key">5</div>
        <div class="key">6</div>
        <div class="key">7</div>
        <div class="key">8</div>
        <div class="key">9</div>
        <div class="key zero">0</div>
      </div>
    </div>

    <div class="right-col">
      <div class="lb-header">
        <div class="lb-title">Leaderboard</div>
        <div class="lb-badge">+ − (0..10, 0..10, 0..20) · Top 10</div>
      </div>
      <div class="lb-list">
        {rows_html}
      </div>
    </div>
  </div>
</body>
</html>
"""


def find_browser():
    for candidate in ("google-chrome", "google-chrome-stable", "chromium-browser", "chromium"):
        path = shutil.which(candidate)
        if path:
            return path
    raise RuntimeError("No headless Chrome/Chromium binary found.")


def main():
    force = "--force" in sys.argv
    top10 = fetch_top10()

    if not force and os.path.exists(STATE_PATH) and os.path.exists(OUT_PNG_PATH):
        try:
            with open(STATE_PATH, "r", encoding="utf-8") as f:
                prev_top10 = json.load(f)
            if prev_top10 == top10:
                print("Top 10 unchanged; skipping og-image.png regeneration.")
                return
        except Exception:
            pass

    browser = find_browser()
    html_content = build_html(top10)

    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as tmp:
        tmp.write(html_content)
        tmp_html_path = tmp.name

    try:
        subprocess.run(
            [
                browser,
                "--headless",
                "--disable-gpu",
                "--no-sandbox",
                "--hide-scrollbars",
                "--window-size=1200,630",
                f"--screenshot={OUT_PNG_PATH}",
                f"file://{tmp_html_path}",
            ],
            check=True,
        )
    finally:
        if os.path.exists(tmp_html_path):
            os.remove(tmp_html_path)

    with open(STATE_PATH, "w", encoding="utf-8") as f:
        json.dump(top10, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"Updated {OUT_PNG_PATH} and {STATE_PATH}")


if __name__ == "__main__":
    main()
