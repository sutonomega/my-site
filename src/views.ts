import { trackPagePath } from '../shared/tracks.cjs';
import type { Work } from './types';

const htmlEntities: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => htmlEntities[character]);
}

function externalUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

function tagList(tags: string[], detail = false) {
  const prefix = detail ? '#' : '';
  return `<div class="tags${detail ? ' detail-tags' : ''}">
    ${tags.map(tag => `<span class="tag">${prefix}${escapeHtml(tag)}</span>`).join('')}
  </div>`;
}

function externalLink(value: string, label: string, secondary = false) {
  const url = externalUrl(value);
  if (!url) return '';
  return `<a class="hero-button${secondary ? ' secondary' : ''}" href="${escapeHtml(url.href)}"
    target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

function thumbnailUrl(work: Work) {
  const id = externalUrl(work.youtube)?.searchParams.get('v') ?? '';
  return /^[A-Za-z0-9_-]{11}$/.test(id)
    ? `https://img.youtube.com/vi/${id}/hqdefault.jpg`
    : './images/placeholder.png';
}

export function workCard(work: Work, selected: boolean) {
  return `
    <a class="work-card-link" href="${escapeHtml(trackPagePath(work))}">
      <div class="work-card">
        <div class="work-thumbnail">
          <img src="${escapeHtml(thumbnailUrl(work))}" alt="${escapeHtml(work.title)}" loading="lazy" decoding="async">
        </div>
        ${selected ? '<span class="playing-badge">NOW PLAYING</span>' : ''}
        <h3>${escapeHtml(work.title)}</h3>
        <div class="work-meta">
          <span>${escapeHtml(work.date)}</span>
          ${tagList(work.tags)}
        </div>
        <p>${escapeHtml(work.text)}</p>
        <div class="work-links"><span class="work-detail">詳細を見る</span></div>
      </div>
    </a>`;
}

export function workDetail(work: Work) {
  return `
    <section class="work-page">
      <div class="container">
        <button class="back-link">← 一覧へ戻る</button>
        <p class="detail-date">${escapeHtml(work.date)}</p>
        <h1 class="detail-title">${escapeHtml(work.title)}</h1>
        ${tagList(work.tags, true)}
        <p class="detail-text">${escapeHtml(work.text)}</p>
        <button class="play-work-button">▶ この曲を再生</button>
        <div class="detail-links">
          ${externalLink(work.youtube, 'YouTubeで見る')}
          ${externalLink(work.tiktok, 'TikTokで見る', true)}
        </div>
        <div class="lyrics-block">
          <h2>Lyrics</h2>
          <div class="lyrics-content"></div>
        </div>
      </div>
    </section>`;
}
