const site = require('../config/site.json');
const tracks = require('../config/tracks.json');
const validKey = new RegExp(tracks.assetKeyPattern);

function publicTrackId(work) {
  return work.id ?? work.slug;
}

function findTrack(works, id) {
  return works.find(work => publicTrackId(work) === id || work.slug === id);
}

function trackPagePath(work) {
  return `?${new URLSearchParams({ [site.trackQuery]: publicTrackId(work) })}`;
}

function lyricsPath(slug) {
  return `${site.lyricsPath}${encodeURIComponent(slug)}.md`;
}

function audioFilename(slug) {
  return `${slug}.mp3`;
}

function audioUrl(slug) {
  return new URL(`${site.audioPath}${encodeURIComponent(audioFilename(slug))}`, site.audioOrigin).href;
}

function savedAudioKey(value, base) {
  const path = new URL(value, base).pathname;
  // Older GitHub Pages URLs may have a repository prefix before /audio/.
  const start = path.lastIndexOf(site.audioPath);
  if (start < 0 || !path.endsWith('.mp3')) return undefined;
  const key = decodeURIComponent(path.slice(start + site.audioPath.length, -4));
  return validKey.test(key) ? key : undefined;
}

module.exports = { publicTrackId, findTrack, trackPagePath, lyricsPath, audioFilename, audioUrl, savedAudioKey };
