const fs = require('fs');

const works =
  require('../json/works.json');

const lyricsDir = '../lyrics';

if (!fs.existsSync(lyricsDir)) {

  fs.mkdirSync(lyricsDir);

}

works.forEach(work => {

  const filePath =
    `${lyricsDir}/${work.slug}.md`;

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