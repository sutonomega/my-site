# Echo Note

ガルパチの楽曲、歌詞、関連動画をまとめた音楽アーカイブ。サイトは [GitHub Pages](https://www.galpachi.com/) で公開し、MP3は Cloudflare Tunnel 経由で自宅UbuntuのNginxから配信する。

## 新曲を公開する

作業用スクリプトには Node.js 18 以上が必要。リポジトリのルートから実行する。

1. `npm ci` で作業用の依存パッケージを入れる。
2. `scripts/song-list.txt` に追加する曲名を1行ずつ記入し、`node scripts/add-work.js` を実行する。出力された `slug` を控え、`json/works.json` のメタデータと `lyrics/<slug>.md` の歌詞を編集する。
3. 元のMP3を作業用フォルダーで `<slug>.mp3` にリネームし、Ubuntuの `/srv/echo-note/audio/` に配置する。MP3はUbuntu上のNginxが読み込める権限にする。
4. 曲一覧の変更をGitHubへ公開する前に、`node scripts/check-audio.js <slug>` を実行する。`<slug>` は実際の曲IDに置き換える。複数曲なら曲IDを空白で区切る。このコマンドは正式URLのHTTP 206応答、MP3形式、部分取得範囲、サイト向けCORSを確認する。
5. 確認が通ったら曲一覧・歌詞の変更を公開し、GitHub Pagesで曲詳細と再生を確認する。確認に失敗した場合は、曲IDとUbuntu上のファイル名・配置先を照合して手順4を再実行する。

`scripts/rename-audio.js` を使う場合は、リポジトリ内のローカル作業用 `audio/` に `<曲名>.mp3` を置いて実行する。ここは名前変更用の一時作業場所で、公開先はUbuntu。MP3と `node_modules/` はGitの管理対象から外してある。

## 主な構成

- `index.html`、`css/`、`js/` は公開ページとプレーヤー。
- `json/works.json` と `lyrics/` は曲のメタデータと歌詞。
- `scripts/` は楽曲の追加・整形・配信確認に使う作業用スクリプト。
