"""Check the Python publisher against the same public contract used by Node.js."""

import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools" / "track-publisher"))
from audio_check import response_size
import publisher
from settings import audio_url, lyrics_path

FIXTURES = json.loads((ROOT / "tests" / "catalog-fixtures.json").read_text(encoding="utf-8"))


class CatalogContractTest(unittest.TestCase):
    def test_track_identifiers(self):
        for work in FIXTURES["tracks"]:
            with self.subTest(track=work["id"]):
                self.assertEqual(publisher.track_id_for_slug(work["slug"]), work["id"])
                self.assertTrue(audio_url(work["slug"]).endswith(f"/audio/{work['slug']}.mp3"))
                self.assertEqual(lyrics_path(work["slug"]), f"lyrics/{work['slug']}.md")

    def test_audio_response_cases(self):
        for case in FIXTURES["audio"]:
            with self.subTest(case=case["name"]):
                size = response_size(case["status"], case["headers"], case["length"])
                self.assertEqual(size is not None, case["valid"])

    def test_failed_audio_verification_cannot_publish(self):
        track = publisher.Track({"id": "track-test", "slug": "track-test", "title": "テスト"}, "", None, "host")
        with patch.object(publisher, "read_snapshot", return_value=("head", "tree", {}, [])), \
             patch.object(publisher, "stage_audio", return_value=(10, b"ID")), \
             patch.object(publisher, "verify_audio", side_effect=RuntimeError("404")), \
             patch.object(publisher, "gh") as git, patch.object(publisher.Catalog, "stage"):
            with self.assertRaisesRegex(RuntimeError, "404"):
                publisher.publish(track, lambda _: None)
            git.assert_not_called()
