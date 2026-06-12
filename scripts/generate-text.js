const fs = require("fs");
const path = require("path");

const worksPath = path.join(__dirname, "../json/works.json");
const lyricsDir = path.join(__dirname, "../lyrics");

const OLLAMA_MODEL = "qwen2.5:3b";

const TAG_CANDIDATES = [
  "夜",
  "朝",
  "恋",
  "片思い",
  "未練",
  "別れ",
  "再会",
  "記憶",
  "孤独",
  "希望",
  "日常",
  "友情",
  "家族",
  "勇気",
  "後悔",
  "約束",
  "未来",
  "青春",
  "成長",
  "喪失",
  "不安",
  "迷い",
  "沈黙",
  "余韻",
  "ぬくもり",
];

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);

  if (!match) {
    throw new Error(`JSONが見つかりません: ${text}`);
  }

  return JSON.parse(match[0]);
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .map((tag) => String(tag).trim())
    .filter((tag) => TAG_CANDIDATES.includes(tag))
    .slice(0, 3);
}

async function generateMetadata(title, lyrics) {
  const prompt = `
あなたは楽曲アーカイブサイトの編集者です。

次の歌詞を読んで、ホームページ用の短い紹介文とタグを作ってください。

条件:

【紹介文】
- 日本語
- 15〜35文字程度
- 一文のみ
- 説明しすぎない
- 歌詞の雰囲気を残す
- タイトルをそのまま繰り返さない

【タグ】
- 2〜3個
- 必ず候補から選ぶ
- 曲の感情やテーマに合うものを選ぶ

タグ候補:
${TAG_CANDIDATES.join("、")}

出力はJSONのみ。
説明文やコードブロックは不要です。

形式:
{
  "text": "紹介文",
  "tags": ["タグ1", "タグ2"]
}

タイトル:
${title}

歌詞:
${lyrics}
`;

  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      format: "json",
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama error: ${res.status}`);
  }

  const data = await res.json();

  const parsed = extractJson(data.response);

  return {
    text: String(parsed.text || "").trim(),
    tags: normalizeTags(parsed.tags),
  };
}

async function main() {
  if (!fs.existsSync(worksPath)) {
    throw new Error(`works.json が見つかりません: ${worksPath}`);
  }

  const works = JSON.parse(fs.readFileSync(worksPath, "utf8"));

  let updatedCount = 0;

  for (const work of works) {
    const hasText = work.text && work.text.trim() !== "";
    const hasTags = Array.isArray(work.tags) && work.tags.length > 0;

    if (hasText && hasTags) {
      console.log(`skip: ${work.title}`);
      continue;
    }

    const lyricsPath = path.join(lyricsDir, `${work.slug}.md`);

    if (!fs.existsSync(lyricsPath)) {
      console.log(`lyrics not found: ${work.title}`);
      continue;
    }

    const lyrics = fs.readFileSync(lyricsPath, "utf8").trim();

    if (!lyrics) {
      console.log(`lyrics empty: ${work.title}`);
      continue;
    }

    const metadata = await generateMetadata(work.title, lyrics);

    if (!hasText) {
      work.text = metadata.text;
    }

    if (!hasTags) {
      work.tags = metadata.tags;
    }

    updatedCount += 1;

    console.log(`updated: ${work.title}`);
    console.log(`  text: ${work.text}`);
    console.log(`  tags: ${work.tags.join(", ")}`);
  }

  fs.writeFileSync(worksPath, JSON.stringify(works, null, 2), "utf8");

  console.log(`done: ${updatedCount}件更新しました`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
