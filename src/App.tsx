import { useEffect, useRef, useState } from 'react';
import site from '../config/site.json';
import { findTrack, lyricsPath, publicTrackId } from '../shared/tracks.mjs';
import { Home } from './Home';
import { MiniPlayer, type PlayerHandle } from './MiniPlayer';
import type { Work } from './types';
import { followLocalLink, WorkDetail } from './WorkViews';

function Message({ children, navigate }: { children: string; navigate: (url: string) => void }) {
  return (
    <section className="work-page container">
      <h1>{children}</h1>
      <a href="./" onClick={event => followLocalLink(event, navigate)}>一覧へ戻る</a>
    </section>
  );
}

export function App() {
  const player = useRef<PlayerHandle>(null);
  const [url, setUrl] = useState(() => location.href);
  const [works, setWorks] = useState<Work[]>();
  const [catalogError, setCatalogError] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string>();
  const [loadedLyrics, setLoadedLyrics] = useState<{ slug: string; text: string }>();

  const requestedId = new URL(url).searchParams.get(site.trackQuery);
  const work = works && requestedId !== null ? findTrack(works, requestedId) : undefined;
  const slug = work?.slug;

  useEffect(() => {
    document.body.style.opacity = '1';
    const controller = new AbortController();
    fetch(`./${site.worksPath}`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('作品一覧を取得できませんでした。');
        return response.json();
      })
      .then(setWorks)
      .catch(() => {
        if (!controller.signal.aborted) setCatalogError(true);
      });
    const onPopState = () => setUrl(location.href);
    window.addEventListener('popstate', onPopState);
    return () => {
      controller.abort();
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  useEffect(() => {
    if (!work || !requestedId || publicTrackId(work) === requestedId) return;
    const canonical = new URL(url);
    canonical.searchParams.set(site.trackQuery, publicTrackId(work));
    history.replaceState(history.state, '', canonical);
    setUrl(canonical.href);
  }, [work, requestedId, url]);

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    fetch(`./${lyricsPath(slug)}`, { signal: controller.signal })
      .then(response => response.ok ? response.text() : '')
      .then(text => {
        if (!controller.signal.aborted) setLoadedLyrics({ slug, text: text.trim() });
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadedLyrics({ slug, text: '' });
      });
    return () => controller.abort();
  }, [slug]);

  function navigate(destination: string) {
    if (catalogError) {
      location.assign(destination);
      return;
    }
    history.pushState({}, '', destination);
    setUrl(location.href);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  const ready = Boolean(works) || catalogError;
  const lyrics = loadedLyrics && loadedLyrics.slug === slug ? loadedLyrics.text : '';

  let page;
  if (catalogError) {
    page = <Message navigate={navigate}>作品一覧を読み込めませんでした。時間をおいて再度お試しください。</Message>;
  } else if (works && requestedId === null) {
    page = <Home works={works} selectedSlug={selectedSlug} navigate={navigate} />;
  } else if (work) {
    page = <WorkDetail work={work} lyrics={lyrics} onBack={() => navigate('./')}
      onPlay={() => player.current?.play(work)} />;
  } else if (works) {
    page = <Message navigate={navigate}>指定された曲が見つかりません。</Message>;
  }

  return (
    <>
      <div id="loading-screen" className={ready ? 'hide' : ''} aria-hidden={ready}><h1>Echo Note</h1></div>
      <div className="particles" aria-hidden="true" />
      <MiniPlayer onSelect={setSelectedSlug} ref={player} />
      <main id="page-container">{page}</main>
    </>
  );
}
