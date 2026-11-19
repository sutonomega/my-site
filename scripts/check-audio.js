const site = require('../config/site.json');
const tracks = require('../config/tracks.json');
const rules = require('../config/audio-check.json');
const works = require('../' + site.worksPath);
const { audioUrl, findTrack } = require('../shared/tracks.cjs');
const { range, validAudioResponse } = require('../shared/audio-check.cjs');

async function main(ids) {
  if (!ids.length) throw new Error('使い方: node scripts/check-audio.js <曲ID> [<曲ID> ...]');
  const validKey = new RegExp(tracks.assetKeyPattern);
  const selected = ids.map(id => {
    const work = validKey.test(id) ? findTrack(works, id) : undefined;
    if (!work) throw new Error(`works.json に有効な曲IDがありません: ${id}`);
    return [id, work];
  });

  for (const [id, work] of selected) {
    const response = await fetch(audioUrl(work.slug), {
      headers: { Range: range, Origin: site.siteOrigin },
      redirect: 'error',
      signal: AbortSignal.timeout(rules.timeoutSeconds * 1000)
    });
    const headers = Object.fromEntries(response.headers);
    if (!validAudioResponse(response.status, headers, rules.rangeEnd - rules.rangeStart + 1)) {
      await response.body?.cancel();
      throw new Error(`${id}: 音源の応答を確認できません (HTTP ${response.status}, ${headers['content-type'] || 'Content-Typeなし'}, ${headers['content-range'] || 'Content-Rangeなし'}, CORS ${headers['access-control-allow-origin'] || 'なし'})`);
    }
    const bytes = await response.arrayBuffer();
    if (!validAudioResponse(response.status, headers, bytes.byteLength)) {
      throw new Error(`${id}: 部分取得のサイズが不正です`);
    }
    console.log(`確認OK: ${id} (HTTP ${response.status})`);
  }
}

main(process.argv.slice(2)).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
