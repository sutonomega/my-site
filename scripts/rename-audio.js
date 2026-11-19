const fs = require('fs');

const path = require('path');

const site = require('../config/site.json');
const { audioFilename } = require('../shared/tracks.cjs');
const works = require('../' + site.worksPath);

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
      audioFilename(work.slug)
    );

  if (!fs.existsSync(oldPath)) {

    console.log(
      `missing: ${work.title}.mp3`
    );

    return;
  }

  if (fs.existsSync(newPath)) {

    console.log(
      `skip: ${audioFilename(work.slug)}`
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
${audioFilename(work.slug)}`
  );

});