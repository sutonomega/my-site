# Echo Note

感情の余韻を音に残す音楽アーカイブサイト。

静かな夜、
言えなかった気持ち、
送れなかった言葉をテーマに、
音楽と映像を記録しています。

---

# Site

- Hero Section
- Works Archive
- About Section
- Footer

---

# Structure

```plaintext
project/

├ index.html
├ style.css
├ script.js
├ works.json
└ thumbnail/
```

---

# Data Flow

works.json に作品データを保存し、
script.js で読み込んでカードを自動生成しています。

```plaintext
works.json
↓
fetch()
↓
createCard()
↓
HTML生成
```

---

# works.json

```json
[
  {
    "title": "約束",
    "text": "ただのやり取りが、ちゃんと残る約束になってた。",
    "youtube": "https://www.youtube.com/embed/xxxxx",
    "tiktok": "https://www.tiktok.com/xxxxx",
    "date": "2025.07",
    "tags": ["夜", "未送信"]
  }
]
```

---

# Features

- レスポンシブ対応
- JSONベース管理
- IntersectionObserver によるフェード表示
- 動的カード生成
- YouTube埋め込み
- TikTokリンク

---

# Future

- タグ絞り込み
- モーダル再生
- サムネイル管理
- 検索機能
- 個別ページ生成

---

# Tech

- HTML
- CSS
- JavaScript
- JSON
- Google Fonts

---

# Author

Echo Note / GALPACHI