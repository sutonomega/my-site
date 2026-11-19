const fs = require("fs");
const path = require("path");
const { randomBytes } = require("node:crypto");
const site = require("../config/site.json");
const tracks = require("../config/tracks.json");
const { lyricsPath } = require("../shared/tracks.cjs");

const worksPath = path.join(__dirname, "..", site.worksPath);
const listPath = path.join(__dirname, "song-list.txt");

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
      id = `${tracks.idPrefix}${randomBytes(tracks.idBytes).toString("hex")}`;
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

    const filename = path.join(__dirname, "..", lyricsPath(id));

    if (!fs.existsSync(filename)) {
      fs.writeFileSync(filename, "", "utf8");
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
