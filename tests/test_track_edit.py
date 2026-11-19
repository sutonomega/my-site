"""Protect the track identity, other tracks, and the latest published revision."""

from pathlib import Path
import json
import sys
import unittest
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools" / "track-publisher"))
import publisher


class TrackEditTest(unittest.TestCase):
    def setUp(self):
        self.works = json.loads((ROOT / "json" / "works.json").read_text(encoding="utf-8"))
        self.work = self.works[1]
        self.filename = publisher.lyrics_path(self.work["slug"])
        self.original = publisher.TrackRevision(self.work, "元の歌詞\r\n", "original")
        self.updated = publisher.make_track_edit(self.original, {
            **publisher.edit_fields(self.original), "title": "編集後のテスト曲名", "lyrics": "新しい歌詞\n",
        })
        self.entries = {self.filename: "original"}
        self.catalog = Mock()

    def test_metadata_and_lyrics_use_one_commit_without_ssh(self):
        snapshot = ("head", "tree", self.entries, self.works)
        with patch.object(publisher, "read_snapshot", return_value=snapshot), \
             patch.object(publisher, "commit_files", return_value="next") as commit, \
             patch.object(publisher, "stage_audio") as upload:
            self.assertEqual(publisher.publish_edit(self.original, self.updated, lambda _: None, self.catalog), "next")
        upload.assert_not_called()
        files = commit.call_args.args[2]
        self.assertEqual(set(files), {publisher.WORKS_PATH, self.filename})
        exported = json.loads(files[publisher.WORKS_PATH])
        self.assertEqual(exported[:1] + exported[2:], self.works[:1] + self.works[2:])
        self.assertEqual(exported[1]["id"], self.work["id"])
        self.assertEqual(exported[1]["slug"], self.work["slug"])
        self.assertEqual(files[self.filename], "新しい歌詞\n")
        self.catalog.sync_published.assert_called_once()

    def test_concurrent_lyrics_change_is_rejected(self):
        snapshot = ("head", "tree", {self.filename: "someone-else"}, self.works)
        with patch.object(publisher, "read_snapshot", return_value=snapshot), patch.object(publisher, "commit_files") as commit:
            with self.assertRaisesRegex(RuntimeError, "編集中"):
                publisher.publish_edit(self.original, self.updated, lambda _: None, self.catalog)
        commit.assert_not_called()

    def test_untouched_values_preserve_original(self):
        self.assertEqual(publisher.make_track_edit(self.original, publisher.edit_fields(self.original)), self.original)

    def test_retry_after_a_success_does_not_create_another_commit(self):
        works = [self.updated.work if work["id"] == self.work["id"] else work for work in self.works]
        snapshot = ("head", "tree", {self.filename: publisher.blob_sha(self.updated.lyrics)}, works)
        with patch.object(publisher, "read_snapshot", return_value=snapshot), patch.object(publisher, "commit_files") as commit:
            self.assertEqual(publisher.publish_edit(self.original, self.updated, lambda _: None, self.catalog), "head")
        commit.assert_not_called()
