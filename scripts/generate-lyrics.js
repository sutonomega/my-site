const fs = require('fs');
const path = require('path');

const works =
  require('../json/works.json');

const lyricsDir =
  path.join(__dirname, '../lyrics');

if (!fs.existsSync(lyricsDir)) {
  fs.mkdirSync(lyricsDir);
}

works.forEach(work => {

  const filePath = path.join(
    lyricsDir,
    `${work.slug}.md`
  );

  if (!fs.existsSync(filePath)) {

    fs.writeFileSync(
      filePath,
      '',
      'utf8'
    );

    console.log(
      `created: ${work.slug}.md`
    );

  } else {

    console.log(
      `skip: ${work.slug}.md`
    );

  }

});