const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const videoId = 'Ko8R5684fO8';
const youtubeThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
const placeholder = './images/placeholder.png';
const work = { slug: 'test-track', title: 'Test track', text: '', date: '', tags: [], tiktok: '' };

test('work card displays the thumbnail for supported YouTube links', async t => {
  const { createServer } = await import('vite');
  const server = await createServer({
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, ws: false },
  });
  t.after(() => server.close());
  const { WorkCard } = await server.ssrLoadModule('/src/WorkViews.tsx');

  const cases = [
    [`https://youtu.be/${videoId}?si=_p-F1eLUkNK3X_7D`, youtubeThumbnail],
    [`https://www.youtube.com/watch?v=${videoId}&t=12`, youtubeThumbnail],
    [`https://m.youtube.com/shorts/${videoId}`, youtubeThumbnail],
    [`https://www.youtube.com/live/${videoId}`, youtubeThumbnail],
    [`https://youtube.com/embed/${videoId}`, youtubeThumbnail],
    ['', placeholder],
    ['invalid URL', placeholder],
    ['https://youtu.be/too-short', placeholder],
    [`https://youtu.be/${videoId}/extra`, placeholder],
    [`https://www.youtube.com/playlist?list=${videoId}`, placeholder],
    [`https://youtube.com.example.org/watch?v=${videoId}`, placeholder],
  ];

  for (const [youtube, expected] of cases) {
    const markup = renderToStaticMarkup(createElement(WorkCard, { work: { ...work, youtube } }));
    assert.ok(markup.includes(`src="${expected}"`), youtube || '(empty URL)');
  }
});
