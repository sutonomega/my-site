# Echo Note

感情の余韻を音に残す音楽アーカイブサイト。

静かな夜、
言えなかった気持ち、
送れなかった言葉をテーマに、
音楽・映像・歌詞を記録しています。

---

# Site

- Hero Section
- Playlist Section
- Works Archive
- Dynamic Detail Page
- Lyrics View
- Mini Player
- About Section

---

# Features

- SPAライクなページ遷移
- 楽曲再生維持
- Mini Audio Player
- Markdown歌詞表示
- JSONベース管理
- タグフィルター
- IntersectionObserverによるフェード表示
- YouTube Playlist埋め込み
- YouTubeサムネイル自動取得
- 動的カード生成
- レスポンシブ対応

---

# Structure

```plaintext
project/

├ pages/
│  └ index.html
│
├ js/
│  ├ script.js
│  ├ player.js
│  └ template.js
│
├ css/
│  └ style.css
│
├ json/
│  └ works.json
│
├ lyrics/
│  └ *.md
│
├ audio/
│  └ *.mp3
│
├ images/
│
└ thumbnail/
```

---

# Data Flow

作品データは works.json に保存し、
JavaScriptで動的に読み込んでいます。

```plaintext
works.json
↓
fetch()
↓
renderWorks()
↓
createCard()
↓
HTML生成
```

歌詞データは Markdown で管理しています。

```plaintext
lyrics/slug.md
↓
fetch()
↓
renderWorkPage()
↓
Lyrics表示
```

---

# works.json

```json
[
  {
    "slug": "yakusoku",
    "title": "約束",
    "text": "ただのやり取りが、ちゃんと残る約束になってた。",
    "youtube": "https://youtube.com/xxxxx",
    "tiktok": "https://tiktok.com/xxxxx",
    "date": "2026.05.04",
    "tags": ["夜", "約束"]
  }
]
```

---

# Tech

- HTML
- CSS
- JavaScript
- JSON
- Markdown
- Google Fonts
- YouTube Embed API

---

# Future

- Related Works
- 歌詞フェード表示
- OGP自動化
- Dynamic Theme
- Search
- PWA対応

---

# Author

Echo Note / GALPACHI