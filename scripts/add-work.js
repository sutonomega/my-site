const fs = require('fs');

const readline =
  require('readline');

const rl =
  readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

const ask = (q) =>
  new Promise(resolve =>
    rl.question(q, resolve)
  );

async function main() {

  const title =
    await ask('title: ');

  const slug =
    await ask('slug: ');

  const text =
    await ask('text: ');

  const youtube =
    await ask('youtube: ');

  const tiktok =
    await ask('tiktok: ');

  const tagsInput =
    await ask(
      'tags (comma): '
    );

  const tags =
    tagsInput
      .split(',')
      .map(tag => tag.trim());

  const worksPath =
    '../json/works.json';

  const works =
    JSON.parse(
      fs.readFileSync(
        worksPath,
        'utf8'
      )
    );

  const today =
    new Date();

  const date =
    `${today.getFullYear()}.`
    + `${String(today.getMonth() + 1).padStart(2, '0')}.`
    + `${String(today.getDate()).padStart(2, '0')}`;

  const newWork = {

    title,
    slug,
    text,
    youtube,
    tiktok,
    date,
    tags
  };

  works.unshift(newWork);

  fs.writeFileSync(
    worksPath,
    JSON.stringify(
      works,
      null,
      2
    ),
    'utf8'
  );

  const lyricsPath =
    `../lyrics/${slug}.md`;

  if (!fs.existsSync(lyricsPath)) {

    fs.writeFileSync(
      lyricsPath,
      '',
      'utf8'
    );

  }

  console.log(
    `added: ${title}`
  );

  rl.close();
}

main();