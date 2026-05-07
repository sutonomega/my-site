const fs = require('fs');

const path = require('path');

const works =
  require('../json/works.json');

const audioDir = './audio';

works.forEach(work => {

  const oldPath =
    path.join(
      audioDir,
      `${work.title}.mp3`
    );

  const newPath =
    path.join(
      audioDir,
      `${work.slug}.mp3`
    );

  if (!fs.existsSync(oldPath)) {

    console.log(
      `missing: ${work.title}.mp3`
    );

    return;
  }

  if (fs.existsSync(newPath)) {

    console.log(
      `skip: ${work.slug}.mp3`
    );

    return;
  }

  fs.renameSync(
    oldPath,
    newPath
  );

  console.log(
    `renamed:
${work.title}.mp3
→
${work.slug}.mp3`
  );

});