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
| `src/main.tsx` / `src/App.tsx` | Reactの起点、曲データの取得、URLに応じた画面切り替え |
| `src/Home.tsx` / `src/WorkViews.tsx` | 作品一覧・タグ絞り込み、曲カード・曲詳細の表示部品 |
| `src/MiniPlayer.tsx` / `src/types.ts` | 画面遷移をまたぐ音源の再生・シーク・復元と、曲データ・再生状態の型 |
| `config/` / `shared/` | 公開設定と、曲ID・ファイル名・音源応答の共通処理 |
| `vite.config.ts` / `dist/` | Viteのビルド設定とGitHub Pagesへアップロードする配信ファイル |
| `.github/workflows/deploy.yml` | 検証ビルドと、`main` からのGitHub Pages公開 |
| `css/style.css` | 共通レイアウト、レスポンシブ表示、プレーヤーのスタイル |
| `json/works.json` | 曲メタデータの配列 |
| `lyrics/<slug>.md` | 曲ごとの歌詞。ブラウザーには改行付きのプレーンテキストとして表示する。 |
| `scripts/` | サイトのビルドと音源の配信確認 |
| `CNAME` | GitHub Pagesのカスタムドメイン |

## 曲データ

| 項目 | 意味 |
| --- | --- |
| `id` | 自動生成する公開用の曲ID。 `track-` に16桁の16進数を続ける。 |
| `slug` | 歌詞と音源のファイル名に使うキー。新曲では `id` と同じ。既存曲では移行前のファイル名と旧URLを解決するために保持する。 |
| `title` / `text` | 曲名と紹介文 |
| `date` / `tags` | 公開日（既存データは `YYYY.MM.DD`）とタグ文字列の配列 |
| `youtube` / `tiktok` | 外部リンク。空欄ならリンクを表示しない。サムネイルはYouTubeの `v` パラメーターから取得する。 |

曲詳細の `?slug=` には公開用の `id` を使う。旧リンクを開くと、対応する曲を表示してURLを公開用IDに置き換える。歌詞とMP3は `slug` で取得し、既存ファイルを利用する。新曲は [公開手順](../README.md#登録画面から新曲を公開する) に沿って、音源の公開を先に確認する。

## 画面とプレーヤーの状態

曲一覧はページ内で共有し、画面切り替え時の歌詞取得が古い画面を後から上書きしないようにする。曲詳細への移動ではブラウザー履歴を更新し、戻る・進むでは既存のURLから画面を描画する。ミニプレーヤーを一覧・曲詳細と同じ階層の独立したReact部品として常時マウントし、画面切り替えで音声要素が作り直されないようにする。

プレーヤーは再生URL、曲名、再生位置、一時停止状態を `localStorage` の `echo-note-player` に保存する。復元時は保存URLから音源のファイル名を取り出し、現行の配信先を組み立てる。これにより旧GitHub Pages配信時のURLも読み替えられる。

## 登録ツールのSQLite

Windowsの登録ツールは、利用者の端末にSQLiteの曲カタログを置く。公開済みの曲と歌詞を `tracks`、公開処理中の曲情報を `pending` に保存する。両方で公開用の自動IDを主キーにし、ファイル名のキーは一意にする。公開済みの並び順と歌詞のGitオブジェクトIDも保存し、変更のない歌詞を再取得せずに使えるようにする。

公開時はGitHubの最新データを取り込んだあと、SQLiteから曲一覧と追加曲の歌詞を生成する。音源の部分取得が成功してから2ファイルを同じコミットに入れ、GitHub Pagesへ反映する。データベースは端末内で使うため、ブラウザーは引き続き静的なJSONと歌詞ファイルを取得する。初期化・バックアップは[登録ツールの手順](../tools/track-publisher/README.md#sqlite曲カタログ)を参照。


## 共通設定と検証

`config/site.json` は公開URLとファイルの配置、`config/tracks.json` は公開IDと旧IDの対応規則、`config/audio-check.json` は部分取得の条件を定義する。公開サイトの設定はビルド時に組み込む。Node.jsとPythonのツールは同じ設定を参照する。

`tests/catalog-fixtures.json` は新旧の曲IDと音源応答の共通テストデータ。登録ツールは共通のHTTP応答条件に加え、公開応答とUbuntuへ転送したファイルのサイズ・取得バイトの一致を確認する。
