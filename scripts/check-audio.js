const works = require('../json/works.json');

async function main(slugs) {
  if (!slugs.length) throw new Error('使い方: node scripts/check-audio.js <slug> [<slug> ...]');
  const knownSlugs = new Set(works.map(work => work.slug));
  for (const slug of slugs) {
    if (!/^[a-zA-Z0-9_-]+$/.test(slug) || !knownSlugs.has(slug)) {
      throw new Error(`works.json に有効な曲IDがありません: ${slug}`);
    }
  }

  for (const slug of slugs) {
    const url = `https://audio.galpachi.com/audio/${slug}.mp3`;
    const response = await fetch(url, {
      headers: { Range: 'bytes=0-1', Origin: 'https://www.galpachi.com' },
      redirect: 'error',
      signal: AbortSignal.timeout(15000)
    });
    const contentType = response.headers.get('content-type')?.split(';')[0];
    const range = response.headers.get('content-range') || '';
    const origin = response.headers.get('access-control-allow-origin');
    if (response.status !== 206 || contentType !== 'audio/mpeg' ||
        !/^bytes 0-1\/[1-9][0-9]*$/.test(range) ||
        !['*', 'https://www.galpachi.com'].includes(origin)) {
      await response.body?.cancel();
      throw new Error(`${slug}: 音源の応答を確認できません (HTTP ${response.status}, ${contentType || 'Content-Typeなし'}, ${range || 'Content-Rangeなし'}, CORS ${origin || 'なし'})`);
    }
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength !== 2) throw new Error(`${slug}: 部分取得のサイズが不正です`);
    console.log(`確認OK: ${slug} (HTTP 206)`);
  }
}

main(process.argv.slice(2)).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
