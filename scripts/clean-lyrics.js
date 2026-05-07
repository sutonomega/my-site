const fs = require('fs');

const path = require('path');

const lyricsDir = '../lyrics';

const files =
  fs.readdirSync(lyricsDir);

files.forEach(file => {

  if (!file.endsWith('.md')) {
    return;
  }

  const filePath =
    path.join(lyricsDir, file);

  let content =
    fs.readFileSync(
      filePath,
      'utf8'
    );

  /* 改行統一 */

  content =
    content.replace(
      /\r\n/g,
      '\n'
    );

  /* --- を削除 */

  content =
    content.replace(
      /^---$/gm,
      ''
    );

  /* [Bridge] など削除 */

  content =
    content.replace(
      /^\[.*?\]$/gm,
      ''
    );

  /* 空行を1個に */

  content =
    content.replace(
      /\n{3,}/g,
      '\n\n'
    );

  /* 前後空白削除 */

  content =
    content.trim();

  fs.writeFileSync(
    filePath,
    content,
    'utf8'
  );

  console.log(
    `cleaned: ${file}`
  );

});