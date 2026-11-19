"""Local SQLite catalog and publication queue for Echo Note."""

from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
import json
import os
from pathlib import Path
import sqlite3
from settings import lyrics_path

DATA_DIR = Path(os.environ.get("LOCALAPPDATA") or Path.home() / ".config") / "EchoNote"
CATALOG_PATH = DATA_DIR / "catalog.sqlite3"


class Catalog:
    def __init__(self, path=CATALOG_PATH):
        self.path = Path(path)

    def connect(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        db = sqlite3.connect(self.path, timeout=15)
        with db:
            db.execute("""
                CREATE TABLE IF NOT EXISTS tracks (
                    id TEXT PRIMARY KEY NOT NULL,
                    slug TEXT UNIQUE NOT NULL,
                    position INTEGER UNIQUE NOT NULL,
                    metadata TEXT NOT NULL,
                    lyrics TEXT NOT NULL,
                    lyrics_sha TEXT NOT NULL
                )
            """)
            db.execute("""
                CREATE TABLE IF NOT EXISTS pending (
                    id TEXT PRIMARY KEY NOT NULL,
                    slug TEXT UNIQUE NOT NULL,
                    metadata TEXT NOT NULL,
                    lyrics TEXT NOT NULL
                )
            """)
        return db

    def sync_published(self, entries, works, load_lyrics):
        """Refresh the published catalog without changing a pending registration."""
        with closing(self.connect()) as db:
            cached = dict(db.execute("SELECT lyrics_sha, lyrics FROM tracks"))
            paths = [lyrics_path(work["slug"]) for work in works]
            for filename in paths:
                if filename not in entries:
                    raise RuntimeError(f"GitHubに既存の歌詞ファイルが見つからないよ: {filename}")
            lyric_shas = [entries[filename] for filename in paths]
            missing = list(dict.fromkeys(sha for sha in lyric_shas if sha not in cached))
            if missing:
                with ThreadPoolExecutor(max_workers=6) as pool:
                    cached.update(zip(missing, pool.map(load_lyrics, missing)))
            rows = [
                (work["id"], work["slug"], position, json.dumps(work, ensure_ascii=False),
                 cached[sha], sha)
                for position, (work, sha) in enumerate(zip(works, lyric_shas))
            ]
            with db:
                db.execute("DELETE FROM tracks")
                db.executemany("INSERT INTO tracks VALUES (?, ?, ?, ?, ?, ?)", rows)

    def stage(self, work, lyrics):
        with closing(self.connect()) as db, db:
            db.execute("""
                INSERT INTO pending VALUES (?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET metadata = excluded.metadata, lyrics = excluded.lyrics
            """, (work["id"], work["slug"], json.dumps(work, ensure_ascii=False), lyrics))

    def export(self, track_id):
        with closing(self.connect()) as db:
            row = db.execute("SELECT metadata, lyrics FROM pending WHERE id = ?", (track_id,)).fetchone()
            if not row:
                raise RuntimeError("SQLiteに公開待ちの曲情報が見つからないよ。")
            metadata, lyrics = row
            published = [json.loads(item) for item, in db.execute("SELECT metadata FROM tracks ORDER BY position")]
        return [json.loads(metadata), *published], lyrics

    def complete(self, track_id):
        with closing(self.connect()) as db, db:
            db.execute("DELETE FROM pending WHERE id = ?", (track_id,))

    def backup(self, destination):
        destination = Path(destination)
        with destination.open("xb"):
            pass
        with closing(self.connect()) as source, closing(sqlite3.connect(destination)) as backup:
            source.backup(backup)
