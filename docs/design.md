# Echo Note サイト設計

## 公開構成

| リクエスト | 通信経路 | 配信内容 |
| --- | --- | --- |
| サイト本体 | ブラウザー → `www.galpachi.com` → GitHub Pages | HTML、CSS、JavaScript、画像、曲のメタデータ、歌詞 |
| 音源 | ブラウザー → `audio.galpachi.com` → Cloudflare Tunnel → UbuntuのNginx | `/srv/echo-note/audio/<slug>.mp3` |
| 動画 | ブラウザー → YouTube | プレイリスト埋め込み、曲カード用サムネイル |

Cloudflare Tunnelは音声用ホストの `/audio/<slug>.mp3` をUbuntuの `http://127.0.0.1:18080` へ転送する。ブラウザーは公開URLをHTTPSで取得する。シークにはHTTP Rangeによる部分取得を使い、正常な範囲リクエストには `206 Partial Content` と `Content-Range` が返る。音源の形式は `audio/mpeg` で、サイトのオリジン `https://www.galpachi.com` に対するCORSが設定されている。

## 主なファイル

| パス | 役割 |
| --- | --- |
| `index.html` | ホームの基本構造、共通の音声要素とミニプレーヤー |
| `js/script.js` | 曲データの取得、タグ絞り込み、URLに応じた画面描画 |
| `js/player.js` | 音源URLの組み立て、再生・シーク・復元、エラー表示 |
| `css/style.css` | 共通レイアウト、レスポンシブ表示、プレーヤーのスタイル |
| `json/works.json` | 曲メタデータの配列 |
| `lyrics/<slug>.md` | 曲ごとの歌詞。ブラウザーには改行付きのプレーンテキストとして表示する。 |
| `scripts/` | 曲の登録、テキスト整形、音源の名前変更と公開確認 |
| `CNAME` | GitHub Pagesのカスタムドメイン |

## 曲データ

| 項目 | 意味 |
| --- | --- |
| `slug` | URLとファイル名に共通で使う一意の曲ID。英数字・ハイフン・アンダースコアで構成する。 |
| `title` / `text` | 曲名と紹介文 |
| `date` / `tags` | 公開日（既存データは `YYYY.MM.DD`）とタグ文字列の配列 |
| `youtube` / `tiktok` | 外部リンク。空欄ならリンクを表示しない。サムネイルはYouTubeの `v` パラメーターから取得する。 |

`slug` は曲詳細の `?slug=`、歌詞のファイル名、UbuntuのMP3名で共有する。公開後に変更すると既存リンクと保存済みの再生状態に影響する。新曲は [公開手順](../README.md#新曲を公開する) に沿って、音源の公開を先に確認する。

## 画面とプレーヤーの状態

曲一覧はページ内で共有し、画面切り替え時の歌詞取得が古い画面を後から上書きしないようにする。曲詳細への移動ではブラウザー履歴を更新し、戻る・進むでは既存のURLから画面を描画する。共通の音声要素は画面描画の対象外に置く。

プレーヤーは再生URL、曲名、再生位置、一時停止状態を `localStorage` の `echo-note-player` に保存する。復元時は保存URLから曲IDを取り出し、現行の配信先を組み立てる。これにより旧GitHub Pages配信時のURLも読み替えられる。
