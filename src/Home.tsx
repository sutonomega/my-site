import { useEffect, useMemo, useRef, useState } from 'react';
import { publicTrackId } from '../shared/tracks.mjs';
import { WorkCard } from './WorkViews';
import type { Work } from './types';

interface HomeProps {
  works: Work[];
  selectedSlug?: string;
  navigate: (url: string) => void;
}

function WorksList({ works, selectedSlug, navigate }: HomeProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const tags = useMemo(() => [...new Set(works.flatMap(work => work.tags))].sort(), [works]);
  const visibleWorks = useMemo(() => activeTag
    ? works.filter(work => work.tags.includes(activeTag))
    : works, [works, activeTag]);

  useEffect(() => {
    const cards = grid.current?.querySelectorAll('.work-card');
    if (!cards) return;
    if (!('IntersectionObserver' in window)) {
      cards.forEach(card => card.classList.add('show'));
      return;
    }
    const observer = new IntersectionObserver((entries, control) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('show');
          control.unobserve(entry.target);
        }
      }
    }, { threshold: 0.15 });
    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [visibleWorks]);

  return (
    <section className="section" id="works">
      <div className="container">
        <div className="section-title"><p>ARCHIVE</p><h2>作品一覧</h2></div>
        <p className="active-filter" id="active-filter">{activeTag ? `#${activeTag}` : ''}</p>
        <div className="filter-tags" id="filter-tags">
          {tags.map(tag => <button key={tag} className={activeTag === tag ? 'filter-tag active' : 'filter-tag'}
            aria-pressed={activeTag === tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)}>#{tag}</button>)}
        </div>
        <div className="works-grid" id="works-grid" ref={grid}>
          {visibleWorks.map(work => <WorkCard key={publicTrackId(work)} work={work}
            selected={selectedSlug === work.slug} navigate={navigate} />)}
        </div>
      </div>
    </section>
  );
}

export function Home(props: HomeProps) {
  return (
    <>
    <section className="hero">
      <div className="hero-inner">

        <p className="hero-sub">
          MUSIC / VISUAL / ARCHIVE
        </p>

        <h1>Echo Note</h1>

        <p className="hero-copy">
          音楽をつくる、<br />
          気持ちを残す。
        </p>

        <p className="hero-text">
          言えなかった気持ち、
          消えていくはずだった夜、
          送れなかった言葉。
          <br /><br />
          Echo Note は、
          そんな感情を音に残すための場所です。
        </p>

        <a href="#playlist" className="hero-button">

          作品を見る

        </a>

      </div>
    </section>
    <section className="playlist-section" id="playlist">

      <div className="container">

        <h2 className="section-title">
          Playlist
        </h2>

        <div className="playlist-embed">

          <iframe src="https://www.youtube.com/embed/videoseries?list=PLwV_3kCRB7k-2k4Q9q3BDauvxdcEkA0f6"
            title="YouTube playlist" loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen>
          </iframe>

        </div>

      </div>

    </section>
    <WorksList {...props} />

    <section className="section">

      <div className="container">

        <div className="section-title">
          <p>ABOUT</p>
          <h2>この場所について</h2>
        </div>

        <div className="about">
          <p>
            Echo Note は、
            感情の余韻を音に残すための音楽プロジェクトです。
            <br /><br />
            静かな夜や、
            誰にも言えなかった気持ちに寄り添うような音楽を、
            少しずつ記録しています。
          </p>
        </div>

      </div>

    </section>

    <section className="section">

      <div className="container">

        <div className="section-title">
          <p>LINKS</p>
          <h2>活動場所</h2>
        </div>

        <div className="links-grid">

          <a className="social-card" href="https://www.youtube.com/@galpachi_music" target="_blank"
            rel="noopener noreferrer">

            <h3>YouTube</h3>

            <p>
              フル尺の楽曲と映像作品を公開しています。
              更新はゆっくりです。
            </p>

          </a>

          <a className="social-card" href="https://www.tiktok.com/@nearly_galpachi" target="_blank"
            rel="noopener noreferrer">

            <h3>TikTok</h3>

            <p>
              毎日1曲、
              ショート動画として感情の断片を投稿しています。
            </p>

          </a>

          <a className="social-card" href="https://suno.com/@nearly_galpachi" target="_blank" rel="noopener noreferrer">

            <h3>Suno</h3>

            <p>
              制作した楽曲をリアルタイムで記録しています。
              一番更新頻度が高い場所です。
            </p>

          </a>

          <a className="social-card" href="https://www.pixiv.net/users/4297870" target="_blank" rel="noopener noreferrer">

            <h3>pixiv</h3>

            <p>
              曲にならなかった感情を、
              小説として記録しています。
            </p>

          </a>

          <a className="social-card" href="https://galpachi.booth.pm/" target="_blank" rel="noopener noreferrer">

            <h3>BOOTH</h3>

            <p>
              音楽から生まれた小さな作品を、
              静かに置いています。
            </p>

          </a>

        </div>
      </div>
    </section>

    <footer>
      © Echo Note
    </footer>
    </>
  );
}
