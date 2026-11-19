# Echo Note

ガルパチの楽曲、歌詞、関連動画をまとめた音楽アーカイブ。サイトは [GitHub Pages](https://www.galpachi.com/) で公開し、MP3は Cloudflare Tunnel 経由で自宅UbuntuのNginxから配信する。

## 登録画面から新曲を公開する

Windowsで `tools/track-publisher/start.cmd` を開き、曲の登録画面から公開する。SSHやGitHub認証の準備は[曲の登録ツールの手順](tools/track-publisher/README.md)を参照。

公開済みの音源を確認するときは、リポジトリのルートで `node scripts/check-audio.js <曲ID>` を実行する。複数曲なら曲IDを空白で区切る。

## サイトを変更する

```sh
npm ci
npm run typecheck
npm test
npm run build
```

公開画面のTypeScriptは `src/`、共通の曲情報処理は `shared/` にある。`npm test` は Node.js と Python 3.11 以上を使い、曲IDと音源取得の共通テストを実行する。GitHub Pagesはコミット済みの `js/site.js` を配信するので、画面コードや共通設定を変更したら、ビルド結果も同じコミットに入れる。

## 主な構成

- `index.html`、`css/`、`src/` は公開ページとプレーヤー。`js/site.js` はビルド出力。
- `config/` は公開URL・曲ID・音声確認の共通設定。Ubuntuの接続先と認証情報は含めない。
- `json/works.json` と `lyrics/` は曲のメタデータと歌詞。
- `scripts/` はサイトのビルドと音源の配信確認に使うスクリプト。

## 仕様と設計

- [サイト仕様](docs/specification.md)
- [サイト設計](docs/design.md)
