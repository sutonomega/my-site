const assert = require('node:assert/strict');
const { test } = require('node:test');
const { tracks, unknownId, audio } = require('./catalog-fixtures.json');
const { audioUrl, findTrack, lyricsPath, publicTrackId, savedAudioKey, trackPagePath } = require('../shared/tracks.cjs');
const { validAudioResponse } = require('../shared/audio-check.cjs');

test('published and retired track IDs resolve to the same files', () => {
  for (const track of tracks) {
    for (const id of track.lookup) assert.equal(findTrack(tracks, id), track);
    assert.equal(publicTrackId(track), track.id);
    assert.equal(trackPagePath(track), `?slug=${track.id}`);
    assert.equal(lyricsPath(track.slug), `lyrics/${track.slug}.md`);
    assert.equal(savedAudioKey(audioUrl(track.slug)), track.slug);
    assert.equal(savedAudioKey(`./audio/${track.slug}.mp3`, 'https://sutonomega.github.io/my-site/'), track.slug);
  }
  assert.equal(findTrack(tracks, unknownId), undefined);
  assert.equal(savedAudioKey('https://www.galpachi.com/audio/invalid%2Ftrack.mp3'), undefined);
});

for (const scenario of audio) {
  test(scenario.name, () => {
    assert.equal(validAudioResponse(scenario.status, scenario.headers, scenario.length), scenario.valid);
  });
}
