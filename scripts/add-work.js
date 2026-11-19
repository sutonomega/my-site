const fs = require("fs");
const path = require("path");
const { randomBytes } = require("node:crypto");

const worksPath = path.join(__dirname, "../json/works.json");
const listPath = path.join(__dirname, "song-list.txt");
const lyricsDir = path.join(__dirname, "../lyrics");

function main() {
  const works = JSON.parse(fs.readFileSync(worksPath, "utf8"));

  const titles = fs
    .readFileSync(listPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const existingTitles = new Set(works.map((work) => work.title));
  const existingIds = new Set(works.flatMap(work => [work.id, work.slug]));

  const newWorks = [];

  for (const title of titles) {
    if (existingTitles.has(title)) {
      console.log(`skip: ${title}`);
      continue;
    }

    let id;
    do {
      id = `track-${randomBytes(8).toString("hex")}`;
    } while (existingIds.has(id));

    existingIds.add(id);
    existingTitles.add(title);

    newWorks.push({
      title,
      id,
      slug: id,
      text: "",
      youtube: "",
      tiktok: "",
      date: "",
      tags: [],
    });

    const lyricsPath = path.join(lyricsDir, `${id}.md`);

    if (!fs.existsSync(lyricsPath)) {
      fs.writeFileSync(lyricsPath, "", "utf8");
    }

    console.log(`added: ${title} / ${id}`);
  }

  works.unshift(...newWorks);

  fs.writeFileSync(worksPath, JSON.stringify(works, null, 2), "utf8");

  console.log(`${newWorks.length}件追加しました`);
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
