# Echo Note 曲の登録ツール

Windows上で自分の曲を1曲ずつ公開するローカルツール。MP3を選び、曲情報と歌詞を入力すると、Ubuntuへの配置とGitHubへの登録を順に実行できる。

## 初回だけ行う準備

1. Windowsに Python 3.11 以上（Tkinter付き）、OpenSSHクライアント、[GitHub CLI](https://cli.github.com/) を用意する。
2. PowerShellで `gh auth login --hostname github.com --web` を実行し、`sutonomega/my-site` の `main` に書き込めるGitHubアカウントでログインする。
3. WindowsからUbuntuへSSH鍵で接続できるようにする。フォームの初期値は `galpachi@ubuntu-server`。Windowsからその名前を解決できない場合は、普段使うLAN内のホスト名・IPアドレス、または `%USERPROFILE%\.ssh\config` のSSH別名を設定する。
4. 初めて接続するUbuntuのホスト鍵はサーバー側で確認してからWindowsのSSHクライアントに登録する。ツールは登録済みのホスト鍵を検証して接続する。秘密鍵にパスフレーズがある場合は、先にWindowsのSSHエージェントへ鍵を読み込ませる。
5. PowerShellで以下を実行する。接続先は実際にフォームで使う値に置き換える。終了コードが `0` なら書き込み可能。

   ```powershell
   ssh -o BatchMode=yes -o StrictHostKeyChecking=yes galpachi@ubuntu-server "test -w /srv/echo-note/audio"
   $LASTEXITCODE
   ```

Ubuntuのログインユーザーに音源フォルダーの書き込み権限が必要。書き込めない場合は管理者が対象フォルダーの権限を確認する。ツールは権限やSSH設定を変更しない。

## 曲を公開する

1. リポジトリをWindowsに取得し、`tools/track-publisher/start.cmd` をダブルクリックする。
2. MP3を選び、曲名・公開日・タグ・紹介文・歌詞などを入力する。曲IDは自動付与される。新曲では同じIDを公開URLとMP3名に使う。次の曲を登録するときは **新しい曲** を押す。
3. 入力を続けたい場合は **下書き保存** を押す。下書きにはMP3のパスとフォームの入力を保存する。音源ファイルと認証情報は保存しない。
4. **プレビュー・公開** で曲情報と接続先を確認し、**公開する** を押す。
5. ツールは重複確認、UbuntuへのMP3配置、公開URLの部分取得確認、GitHubへの登録を順に行う。音源の確認を通過すると、`works.json` と歌詞が同じコミットに入り、GitHub Pagesの再公開が始まる。登録完了画面に出るURLは、Pagesの反映後に開ける。

## 途中で止まった場合

画面のエラーを確認して、同じ曲ID・音源で再試行する。途中まで進んで配置された同一のMP3は再利用する。異なるMP3が同じ名で存在する場合、ツールは上書きせずに止まる。公開URLの確認に失敗した場合は、曲一覧を更新しない。公開中に別のコミットが入りGitHubへの登録が競合した場合も、上書きせずに止まる。

このツールは1曲ずつの新規登録に対応する。公開済みの曲データや音源の編集は従来の手順で行う。

## SQLite曲カタログ

登録ツールは `%LOCALAPPDATA%\EchoNote\catalog.sqlite3` に曲情報と歌詞を保存する。公開処理では入力した曲を先にSQLiteへ記録し、音源確認後にGitHubの公開済みデータを取り込んで、SQLiteから公開用の曲一覧と歌詞を生成する。初回は既存の歌詞も取り込むため、少し時間がかかる。

曲を追加せずにカタログを作成・更新するには、リポジトリのルートで次を実行する。GitHubで手動更新した曲情報も取り込める。公開待ちの曲は保持される。

```powershell
py -3 tools/track-publisher/publisher.py --sync-catalog
```

バックアップは、存在しない保存先を指定して実行する。

```powershell
py -3 tools/track-publisher/publisher.py --backup-catalog "$HOME\Documents\echo-note-catalog-backup.sqlite3"
```

データベースは登録ツールを使う端末ごとに保存される。公開済みの曲はGitHubから再取得できる。公開待ちの情報を別の端末に引き継ぐ場合は、SQLiteのバックアップに加えて、下書きファイル `track-draft.json` と元のMP3も手元に保管する。
