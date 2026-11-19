const fs = require('node:fs');
const path = require('node:path');
const site = require('../config/site.json');
const { lyricsPath } = require('../shared/tracks.cjs');
const works = require('../' + site.worksPath);

for (const work of works) {
  const filename = path.join(__dirname, '..', lyricsPath(work.slug));
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  try {
    fs.writeFileSync(filename, '', { encoding: 'utf8', flag: 'wx' });
    console.log(`created: ${path.basename(filename)}`);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    console.log(`skip: ${path.basename(filename)}`);
  }
}
