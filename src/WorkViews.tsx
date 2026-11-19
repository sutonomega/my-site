import type { MouseEvent, ReactNode } from 'react';
import { trackPagePath } from '../shared/tracks.mjs';
import type { Work } from './types';

export function safeExternalUrl(value: string): URL | undefined {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' || url.protocol === 'http:') return url;
  } catch {
    // Invalid links are omitted from the public page.
  }
}

function ExternalLink({ url, className, children }: {
  url: string;
  className: string;
  children: ReactNode;
}) {
  const destination = safeExternalUrl(url);
  if (!destination) return null;
  return <a href={destination.href} className={className} target="_blank" rel="noopener noreferrer">{children}</a>;
}

function Tags({ tags, detail = false }: { tags: string[]; detail?: boolean }) {
  return (
    <div className={detail ? 'tags detail-tags' : 'tags'}>
      {tags.map((tag, index) => <span className="tag" key={`${tag}-${index}`}>{detail ? '#' : ''}{tag}</span>)}
    </div>
  );
}

export function followLocalLink(event: MouseEvent<HTMLAnchorElement>, navigate: (url: string) => void) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
      event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigate(event.currentTarget.href);
}

export function WorkCard({ work, selected, navigate }: {
  work: Work;
  selected: boolean;
  navigate: (url: string) => void;
}) {
  const videoId = safeExternalUrl(work.youtube)?.searchParams.get('v') ?? '';
  const thumbnail = /^[A-Za-z0-9_-]{11}$/.test(videoId)
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : './images/placeholder.png';

  return (
    <a className="work-card-link" href={trackPagePath(work)} onClick={event => followLocalLink(event, navigate)}>
      <div className="work-card">
        <div className="work-thumbnail"><img src={thumbnail} alt={work.title} loading="lazy" decoding="async" /></div>
        {selected && <span className="playing-badge">NOW PLAYING</span>}
        <h3>{work.title}</h3>
        <div className="work-meta"><span>{work.date}</span><Tags tags={work.tags} /></div>
        <p>{work.text}</p>
        <div className="work-links"><span className="work-detail">詳細を見る</span></div>
      </div>
    </a>
  );
}

export function WorkDetail({ work, lyrics, onBack, onPlay }: {
  work: Work;
  lyrics: string;
  onBack: () => void;
  onPlay: () => void;
}) {
  return (
    <section className="work-page">
      <div className="container">
        <button className="back-link" onClick={onBack}>← 一覧へ戻る</button>
        <p className="detail-date">{work.date}</p>
        <h1 className="detail-title">{work.title}</h1>
        <Tags tags={work.tags} detail />
        <p className="detail-text">{work.text}</p>
        <button className="play-work-button" onClick={onPlay}>▶ この曲を再生</button>
        <div className="detail-links">
          <ExternalLink url={work.youtube} className="hero-button">YouTubeで見る</ExternalLink>
          <ExternalLink url={work.tiktok} className="hero-button secondary">TikTokで見る</ExternalLink>
        </div>
        <div className="lyrics-block">
          <h2>Lyrics</h2>
          <div className="lyrics-content">{lyrics || '歌詞はまだ公開されていません。'}</div>
        </div>
      </div>
    </section>
  );
}
