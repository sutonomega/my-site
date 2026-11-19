const rules = require('../config/audio-check.json');
const { siteOrigin } = require('../config/site.json');

const range = `bytes=${rules.rangeStart}-${rules.rangeEnd}`;
const expectedLength = rules.rangeEnd - rules.rangeStart + 1;
const contentRange = new RegExp(`^bytes ${rules.rangeStart}-${rules.rangeEnd}/([1-9][0-9]*)$`);

function validAudioResponse(status, headers, byteLength) {
  const matched = contentRange.exec(headers['content-range'] ?? '');
  return status === rules.status &&
    headers['content-type']?.split(';')[0].trim().toLowerCase() === rules.contentType &&
    matched !== null && Number(matched[1]) > rules.rangeEnd &&
    [siteOrigin, '*'].includes(headers['access-control-allow-origin']) &&
    byteLength === expectedLength;
}

module.exports = { range, validAudioResponse };
