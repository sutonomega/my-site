import site from '../config/site.json';
import { findTrack, lyricsPath, publicTrackId } from '../shared/tracks.cjs';
import { requireElement } from './dom';
import { audio, playCurrentWork } from './player';
import type { Work } from './types';
import { escapeHtml, workCard, workDetail } from './views';

const pageContainer = requireElement('#page-container', HTMLElement);
const homeHTML = pageContainer.innerHTML;
let allWorks: Work[] = [];
let activeTag: string | null = null;
let worksRequest: Promise<Work[]> | undefined;
let navigationId = 0;
let cardObserver: IntersectionObserver | undefined;

function loadWorks(): Promise<Work[]> {
  worksRequest ??= fetch(`./${site.worksPath}`).then(response => {
    if (!response.ok) throw new Error('作品一覧を取得できませんでした。');
    return response.json();
  }).catch(error => {
    worksRequest = undefined;
    throw error;
  });
  return worksRequest;
}

async function loadLyrics(slug: string): Promise<string> {
  try {
    const response = await fetch(`./${lyricsPath(slug)}`);
    return response.ok ? (await response.text()).trim() : '';
  } catch {
    return '';
  }
}

function showPageMessage(message: string) {
  const section = document.createElement('section');
  section.className = 'work-page container';
  const heading = document.createElement('h1');
  heading.textContent = message;
  const link = document.createElement('a');
  link.href = './';
  link.textContent = '一覧へ戻る';
  section.append(heading, link);
  pageContainer.replaceChildren(section);
}

function observeCards(grid: HTMLElement) {
  cardObserver?.disconnect();
  const cards = grid.querySelectorAll('.work-card');
  if (!('IntersectionObserver' in window)) {
    cards.forEach(card => card.classList.add('show'));
    return;
  }
  cardObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        observer.unobserve(entry.target);
        setTimeout(() => entry.target.classList.add('show'), index * 180);
      }
    });
  }, { threshold: 0.15 });
  cards.forEach(card => cardObserver?.observe(card));
}

function renderWorks(works: Work[]) {
  const grid = requireElement('#works-grid', HTMLElement, pageContainer);
  grid.innerHTML = works.map(work => workCard(work, audio.dataset.slug === work.slug)).join('');
  observeCards(grid);
}

function renderHome(works: Work[]) {
  allWorks = works;
  activeTag = null;
  if (!pageContainer.querySelector('#works-grid')) pageContainer.innerHTML = homeHTML;
  const tags = [...new Set(works.flatMap(work => work.tags))].sort();
  const filters = requireElement('#filter-tags', HTMLElement, pageContainer);
  filters.innerHTML = tags.map(tag => `
    <button class="filter-tag" data-tag="${escapeHtml(tag)}" aria-pressed="false">#${escapeHtml(tag)}</button>
  `).join('');
  requireElement('#active-filter', HTMLElement, pageContainer).textContent = '';
  renderWorks(works);
}

function filterWorks(tag: string) {
  activeTag = activeTag === tag ? null : tag;
  pageContainer.querySelectorAll<HTMLButtonElement>('.filter-tag').forEach(button => {
    const active = button.dataset.tag === activeTag;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  requireElement('#active-filter', HTMLElement, pageContainer).textContent = activeTag ? `#${activeTag}` : '';
  renderWorks(allWorks.filter(work => activeTag === null || work.tags.includes(activeTag)));
}

function renderWorkPage(work: Work, lyrics: string) {
  pageContainer.innerHTML = workDetail(work);
  requireElement('.lyrics-content', HTMLElement, pageContainer).textContent = lyrics || '歌詞はまだ公開されていません。';
  requireElement('.play-work-button', HTMLButtonElement, pageContainer)
    .addEventListener('click', () => playCurrentWork(work.slug, work.title));
  requireElement('.back-link', HTMLButtonElement, pageContainer)
    .addEventListener('click', () => navigateTo('./'));
}

async function renderCurrentPage() {
  const requestId = ++navigationId;
  const url = new URL(location.href);
  const requestedId = url.searchParams.get(site.trackQuery);

  try {
    const works = await loadWorks();
    if (requestId !== navigationId) return;
    if (requestedId === null) {
      renderHome(works);
      return;
    }

    const work = findTrack(works, requestedId);
    if (!work) {
      showPageMessage('指定された曲が見つかりません。');
      return;
    }
    const canonicalId = publicTrackId(work);
    if (canonicalId !== requestedId) {
      url.searchParams.set(site.trackQuery, canonicalId);
      history.replaceState(history.state, '', url);
    }
    const lyrics = await loadLyrics(work.slug);
    if (requestId === navigationId) {
      cardObserver?.disconnect();
      renderWorkPage(work, lyrics);
    }
  } catch {
    if (requestId === navigationId) {
      showPageMessage('作品一覧を読み込めませんでした。時間をおいて再度お試しください。');
    }
  }
}

function navigateTo(url: string) {
  history.pushState({}, '', url);
  void renderCurrentPage();
  window.scrollTo({ top: 0, behavior: 'auto' });
}

pageContainer.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;
  const filter = event.target.closest<HTMLButtonElement>('.filter-tag');
  if (filter?.dataset.tag !== undefined) {
    filterWorks(filter.dataset.tag);
    return;
  }

  const link = event.target.closest<HTMLAnchorElement>('.work-card-link');
  if (!link || event.defaultPrevented || event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigateTo(link.href);
});

window.addEventListener('load', () => {
  document.body.style.opacity = '1';
  setTimeout(() => document.getElementById('loading-screen')?.classList.add('hide'), 900);
});

window.addEventListener('popstate', renderCurrentPage);
void renderCurrentPage();
