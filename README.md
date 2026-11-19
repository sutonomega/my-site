# Echo Note

ガルパチの楽曲、歌詞、関連動画をまとめた音楽アーカイブ。サイトは [GitHub Pages](https://www.galpachi.com/) で公開し、MP3は Cloudflare Tunnel 経由で自宅UbuntuのNginxから配信する。

## 登録画面から新曲を公開する

Windowsで `tools/track-publisher/start.cmd` を開き、曲の登録画面から公開する。SSHやGitHub認証の準備は[曲の登録ツールの手順](tools/track-publisher/README.md)を参照。

公開済みの音源を確認するときは、リポジトリのルートで `node scripts/check-audio.js <曲ID>` を実行する。複数曲なら曲IDを空白で区切る。

## サイトを開発する

Node.js 22.12 以上を用意する。自動テストには Python 3.11 以上も必要。

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

公開画面はReactとTypeScriptで構成し、Viteが `dist/` にビルドする。ビルドには型チェックが含まれる。`dist/` にはHTML・CSS・JavaScriptと、公開に必要な曲データ・歌詞・画像・`CNAME` が入る。

## GitHub Pagesへ公開する

GitHub Actionsのワークフローは、作業ブランチとプルリクエストでテストとビルドを行う。本番への公開は `main` の実行に限る。React版へ切り替える際は、リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に変更する。カスタムドメインは `www.galpachi.com`。新曲を登録すると、`main` へのコミットをきっかけに公開データが再ビルドされる。

## 主な構成

- `index.html`、`css/`、`src/` は公開ページとプレーヤー。`dist/` はビルド出力。
- `config/` は公開URL・曲ID・音声確認の共通設定。Ubuntuの接続先と認証情報は含めない。
- `json/works.json` と `lyrics/` は曲のメタデータと歌詞。
- `scripts/` はサイトのビルドと音源の配信確認に使うスクリプト。

## 仕様と設計

- [サイト仕様](docs/specification.md)
- [サイト設計](docs/design.md)
