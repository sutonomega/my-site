const fs = require("fs");
const path = require("path");
const Kuroshiro = require("kuroshiro").default;
const KuromojiAnalyzer = require("kuroshiro-analyzer-kuromoji");

const worksPath = path.join(__dirname, "../json/works.json");
const listPath = path.join(__dirname, "song-list.txt");
const lyricsDir = path.join(__dirname, "../lyrics");

function formatDate(date) {
  return (
    `${date.getFullYear()}.` +
    `${String(date.getMonth() + 1).padStart(2, "0")}.` +
    `${String(date.getDate()).padStart(2, "0")}`
  );
}

function cleanSlug(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function titleToSlug(kuroshiro, title) {
  const romaji = await kuroshiro.convert(title, {
    to: "romaji",
    mode: "spaced",
    romajiSystem: "hepburn",
  });

  return cleanSlug(romaji);
}

async function main() {
  const kuroshiro = new Kuroshiro();
  await kuroshiro.init(new KuromojiAnalyzer());

  const works = JSON.parse(fs.readFileSync(worksPath, "utf8"));

  const titles = fs
    .readFileSync(listPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const existingTitles = new Set(works.map((work) => work.title));
  const existingSlugs = new Set(works.map((work) => work.slug));

  const today = formatDate(new Date());

  const newWorks = [];

  for (const title of titles) {
    if (existingTitles.has(title)) {
      console.log(`skip: ${title}`);
      continue;
    }

    let slug = await titleToSlug(kuroshiro, title);
    const baseSlug = slug;

    let count = 2;
    while (existingSlugs.has(slug)) {
      slug = `${baseSlug}-${count}`;
      count += 1;
    }

    existingSlugs.add(slug);

    newWorks.push({
      title,
      slug,
      text: "",
      youtube: "",
      tiktok: "",
      date: "",
      tags: [],
    });

    const lyricsPath = path.join(lyricsDir, `${slug}.md`);

    if (!fs.existsSync(lyricsPath)) {
      fs.writeFileSync(lyricsPath, "", "utf8");
    }

    console.log(`added: ${title} / ${slug}`);
  }

  works.unshift(...newWorks);

  fs.writeFileSync(worksPath, JSON.stringify(works, null, 2), "utf8");

  console.log(`${newWorks.length}件追加しました`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
