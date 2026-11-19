"""Read the configuration shared with the site and Node.js tools."""

import json
from functools import cache
from pathlib import Path
from urllib.parse import quote

CONFIG_DIR = Path(__file__).resolve().parents[2] / "config"


@cache
def config(name):
    return json.loads((CONFIG_DIR / f"{name}.json").read_text(encoding="utf-8"))


SITE = config("site")
TRACKS = config("tracks")


def audio_filename(slug):
    return f"{slug}.mp3"


def audio_url(slug):
    return f"{SITE['audioOrigin']}{SITE['audioPath']}{quote(audio_filename(slug), safe='')}"


def lyrics_path(slug):
    return f"{SITE['lyricsPath']}{quote(slug, safe='')}.md"
