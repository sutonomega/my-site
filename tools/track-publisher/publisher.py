"""Publish one Echo Note track using SSH and the authenticated GitHub CLI."""

import base64
from dataclasses import dataclass
from datetime import date
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

REPOSITORY = "sutonomega/my-site"
BRANCH = "main"
AUDIO_ROOT = "/srv/echo-note/audio"
SITE_ORIGIN = "https://www.galpachi.com"
AUDIO_ORIGIN = "https://audio.galpachi.com"
SLUG = re.compile(r"[a-z0-9][a-z0-9_-]{0,79}")
SSH_TARGET = re.compile(r"(?:[A-Za-z0-9_][A-Za-z0-9_.-]*@)?[A-Za-z0-9][A-Za-z0-9_.-]*")
VIDEO_HOSTS = {
    "youtube": {"youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"},
    "tiktok": {"tiktok.com", "www.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"},
}


@dataclass(frozen=True)
class Track:
    work: dict
    lyrics: str
    audio: Path
    target: str

    @property
    def slug(self):
        return self.work["slug"]


def make_track(fields):
    title = fields["title"].strip()
    slug = fields["slug"].strip()
    target = fields["target"].strip()
    audio = Path(fields["audio"].strip())
    if not title:
        raise ValueError("曲名を入力してね。")
    if not SLUG.fullmatch(slug):
        raise ValueError("曲IDは80文字以内の半角小文字・数字・ハイフン・アンダースコアで、先頭は英数字にしてね。")
    if not SSH_TARGET.fullmatch(target):
        raise ValueError("SSH接続先を user@host またはSSH設定の別名で入力してね。")
    if audio.suffix.lower() != ".mp3" or not audio.is_file() or audio.stat().st_size < 2:
        raise ValueError("有効なMP3ファイルを選んでね。")
    with audio.open("rb") as source:
        header = source.read(3)
    if header != b"ID3" and (len(header) < 2 or header[0] != 0xFF or header[1] & 0xE0 != 0xE0):
        raise ValueError("MP3として認識できないファイルだよ。Sunoなどから出力したMP3を確認してね。")
    try:
        raw_date = fields["date"].strip().replace(".", "-")
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw_date):
            raise ValueError
        release_date = date.fromisoformat(raw_date).strftime("%Y.%m.%d")
    except ValueError:
        raise ValueError("公開日は YYYY-MM-DD 形式の実在する日付を入力してね。") from None
    urls = {}
    for service, hosts in VIDEO_HOSTS.items():
        value = fields[service].strip()
        parts = urlsplit(value)
        if value and (parts.scheme != "https" or parts.hostname not in hosts or parts.netloc.lower() not in hosts):
            raise ValueError(f"{service} のHTTPSリンクを確認してね。")
        urls[service] = value
    tags = list(dict.fromkeys(part.strip() for part in re.split(r"[,、\n]", fields["tags"]) if part.strip()))
    work = {
        "title": title,
        "slug": slug,
        "text": fields["text"].strip(),
        **urls,
        "date": release_date,
        "tags": tags,
    }
    return Track(work, fields["lyrics"].strip(), audio, target)


def gh(endpoint, payload=None):
    args = ["gh", "api", f"repos/{REPOSITORY}/{endpoint}"]
    if payload is not None:
        method = "PATCH" if endpoint.startswith("git/refs/") else "POST"
        args += ["--method", method, "--input", "-"]
    try:
        result = subprocess.run(
            args,
            input=None if payload is None else json.dumps(payload).encode("utf-8"),
            stdin=subprocess.DEVNULL if payload is None else None,
            capture_output=True,
            timeout=45,
            check=False,
        )
    except FileNotFoundError:
        raise RuntimeError("GitHub CLI (gh) が見つからないよ。インストール後に gh auth login を実行してね。") from None
    if result.returncode:
        raise RuntimeError(result.stderr.decode("utf-8", errors="replace").strip() or "GitHubへの接続に失敗したよ。")
    return json.loads(result.stdout)


def read_snapshot():
    head = gh(f"git/ref/heads/{BRANCH}")["object"]["sha"]
    tree_sha = gh(f"git/commits/{head}")["tree"]["sha"]
    tree = gh(f"git/trees/{tree_sha}?recursive=1")
    if tree.get("truncated"):
        raise RuntimeError("GitHubのファイル一覧をすべて取得できなかったよ。")
    entries = {entry["path"]: entry["sha"] for entry in tree["tree"]}
    blob = gh(f"git/blobs/{entries['json/works.json']}")
    return head, tree_sha, entries, json.loads(base64.b64decode(blob["content"]))


def stage_audio(track):
    """Install the file atomically without replacing an existing track."""
    remote = """
set -eu
cd "$1"
destination=$2
expected=$3
temp=$(mktemp .echo-note-upload.XXXXXXXX)
trap 'rm -f -- "$temp"' EXIT
cat > "$temp"
actual=$(sha256sum -- "$temp")
test "${actual%% *}" = "$expected"
chmod 644 "$temp"
if ln -T -- "$temp" "$destination" 2>/dev/null; then
    printf '%s\\n' 'MP3を配置しました。'
elif [ -f "$destination" ] && [ ! -L "$destination" ] &&
     cmp -s -- "$temp" "$destination"; then
    printf '%s\\n' '同じMP3が配置済みです。'
else
    printf '%s\\n' '異なる既存ファイルがあるか、音源フォルダーに書き込みできません。' >&2
    exit 1
fi
"""
    with track.audio.open("rb", buffering=0) as source:
        checksum = hashlib.file_digest(source, "sha256").hexdigest()
        size = os.fstat(source.fileno()).st_size
        source.seek(0)
        prefix = source.read(2)
        source.seek(0)
        command = shlex.join(["bash", "-c", remote, "echo-note-upload", AUDIO_ROOT, f"{track.slug}.mp3", checksum])
        result = subprocess.run(
            ["ssh", "-T", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes", "-o", "ConnectTimeout=10", track.target, command],
            stdin=source,
            capture_output=True,
            timeout=300,
            check=False,
        )
    if result.returncode != 0:
        detail = result.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"UbuntuにMP3を配置できなかったよ。\n{detail}")
    return size, prefix


def verify_audio(track, size, prefix):
    url = f"{AUDIO_ORIGIN}/audio/{track.slug}.mp3"
    request = Request(url, headers={"Range": "bytes=0-1", "Origin": SITE_ORIGIN, "Cache-Control": "no-cache"})
    with urlopen(request, timeout=20) as response:
        if (
            response.geturl() != url
            or response.status != 206
            or response.headers.get_content_type() != "audio/mpeg"
            or response.headers.get("Content-Range") != f"bytes 0-1/{size}"
            or response.headers.get("Access-Control-Allow-Origin") not in {SITE_ORIGIN, "*"}
            or response.read(3) != prefix
        ):
            raise RuntimeError("公開URLの部分取得結果が、配置したMP3・配信条件と一致しなかったよ。")


def blob_sha(content):
    data = content.encode("utf-8")
    return hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()


def inspect_track(track, snapshot):
    _, _, entries, works = snapshot
    lyrics_path = f"lyrics/{track.slug}.md"
    lyric_sha = entries.get(lyrics_path)
    existing = next((work for work in works if work["slug"] == track.slug), None)
    if existing == track.work and lyric_sha == blob_sha(track.lyrics):
        return True
    if existing or lyric_sha:
        raise ValueError("その曲IDはGitHubで使われているよ。別の曲IDにしてね。")
    if any(work.get("title", "").casefold() == track.work["title"].casefold() for work in works):
        raise ValueError("同じ曲名がすでにあるよ。別の曲として出す場合は曲名を区別してね。")
    return False


def publish(track, report):
    report("GitHubで曲の重複を確認中…")
    snapshot = read_snapshot()
    if inspect_track(track, snapshot):
        report("同じ曲情報がすでに登録済みだよ。音源の配置と応答を確認するね。")
    report("自宅UbuntuへMP3を配置中…")
    size, prefix = stage_audio(track)
    report("公開URLでMP3の部分取得を確認中…")
    verify_audio(track, size, prefix)
    report("GitHubの最新状態を確認して、曲一覧と歌詞を登録中…")
    snapshot = read_snapshot()
    if inspect_track(track, snapshot):
        return snapshot[0]
    head, base_tree, _, works = snapshot
    files = {
        "json/works.json": json.dumps([track.work, *works], ensure_ascii=False, indent=2) + "\n",
        f"lyrics/{track.slug}.md": track.lyrics,
    }
    tree = gh("git/trees", {
        "base_tree": base_tree,
        "tree": [{"path": path, "mode": "100644", "type": "blob", "content": content} for path, content in files.items()],
    })["sha"]
    commit = gh("git/commits", {
        "message": f"Add Echo Note track: {track.slug}",
        "tree": tree,
        "parents": [head],
    })["sha"]
    gh(f"git/refs/heads/{BRANCH}", {"sha": commit, "force": False})
    return commit
