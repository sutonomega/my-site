import { audioUrl, savedAudioKey } from '../shared/tracks.cjs';
import { requireElement } from './dom';
import type { SavedPlayerState } from './types';

export const audio = requireElement('#global-audio', HTMLAudioElement);
const miniPlayer = requireElement('#mini-player', HTMLElement);
const miniPlay = requireElement('#mini-play', HTMLButtonElement);
const miniTitle = requireElement('#mini-title', HTMLElement);
const progress = requireElement('#mini-progress', HTMLInputElement);
const volumeSlider = requireElement('#volume-slider', HTMLInputElement);
const currentTimeText = requireElement('#current-time', HTMLElement);
const durationText = requireElement('#duration', HTMLElement);
const playerMessage = requireElement('#player-message', HTMLElement);

const playerKey = 'echo-note-player';
let pendingRestore: SavedPlayerState | undefined;

function selectTrack(slug: string, title: string) {
  const source = audioUrl(slug);
  if (audio.src !== source) {
    pendingRestore = undefined;
    progress.disabled = true;
    progress.value = '0';
    currentTimeText.textContent = '0:00';
    durationText.textContent = '-:--';
    audio.src = source;
  }

  audio.dataset.slug = slug;
  audio.dataset.title = title;
  miniTitle.textContent = title || '-';
  miniPlayer.classList.add('show');
  miniPlay.disabled = false;
}

async function startPlayback() {
  const source = audio.src;
  playerMessage.textContent = '';
  try {
    if (audio.error) audio.load();
    await audio.play();
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (audio.src !== source || name === 'AbortError') return;
    playerMessage.textContent = name === 'NotAllowedError'
      ? '再生ボタンを押すと続きから再生できます。'
      : '音源を再生できませんでした。時間をおいて再度お試しください。';
  }
}

export function playCurrentWork(slug: string, title: string) {
  selectTrack(slug, title);
  startPlayback();
}

function savePlayerState() {
  if (!audio.dataset.slug || audio.readyState < HTMLMediaElement.HAVE_METADATA || audio.error) return;
  try {
    const state: SavedPlayerState = {
      src: audio.src,
      title: audio.dataset.title,
      time: audio.currentTime,
      paused: audio.paused || audio.ended
    };
    localStorage.setItem(playerKey, JSON.stringify(state));
  } catch {
    // Playback remains available when storage is blocked or full.
  }
}

function loadPlayerState() {
  try {
    const raw = localStorage.getItem(playerKey);
    if (!raw) return;
    const saved: Partial<SavedPlayerState> | null = JSON.parse(raw);
    if (typeof saved?.src !== 'string' || !saved.src) return;
    const slug = savedAudioKey(saved.src, document.baseURI);
    if (!slug) return;
    selectTrack(slug, typeof saved.title === 'string' ? saved.title : '');
    pendingRestore = {
      src: saved.src,
      title: audio.dataset.title,
      time: typeof saved.time === 'number' ? saved.time : 0,
      paused: Boolean(saved.paused),
    };
  } catch {
    // An invalid saved record does not affect fresh playback.
  }
}

function formatTime(time: number) {
  const minutes = Math.floor(time / 60);
  const seconds = String(Math.floor(time % 60)).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function updateProgress() {
  const canSeek = Number.isFinite(audio.duration) && audio.duration > 0 && !audio.error;
  progress.disabled = !canSeek;
  progress.max = String(canSeek ? audio.duration : 0);
  progress.value = String(canSeek ? audio.currentTime : 0);
  currentTimeText.textContent = formatTime(audio.currentTime);
  durationText.textContent = canSeek ? formatTime(audio.duration) : '-:--';
}

function updatePlaybackState() {
  const playing = !audio.paused && !audio.ended && !audio.error;
  miniPlay.textContent = playing ? '❚❚' : '▶';
  miniPlay.setAttribute('aria-label', playing ? '一時停止' : '再生');
  savePlayerState();
}

miniPlay.addEventListener('click', () => {
  if (audio.paused || audio.ended || audio.error) startPlayback();
  else audio.pause();
});

audio.addEventListener('loadedmetadata', () => {
  const saved = pendingRestore;
  pendingRestore = undefined;
  if (saved && Number.isFinite(saved.time) && saved.time > 0 && Number.isFinite(audio.duration)) {
    audio.currentTime = Math.min(saved.time, audio.duration);
  }
  updateProgress();
  if (saved && !saved.paused) startPlayback();
});

for (const event of ['play', 'playing', 'pause', 'ended', 'emptied']) {
  audio.addEventListener(event, updatePlaybackState);
}

audio.addEventListener('error', () => {
  pendingRestore = undefined;
  updatePlaybackState();
  updateProgress();
  playerMessage.textContent = '音源を読み込めませんでした。再生ボタンで再試行できます。';
});

audio.addEventListener('durationchange', updateProgress);
audio.addEventListener('timeupdate', () => {
  updateProgress();
  savePlayerState();
});
audio.addEventListener('seeked', savePlayerState);
window.addEventListener('pagehide', savePlayerState);

progress.addEventListener('input', () => {
  if (!progress.disabled) audio.currentTime = Number(progress.value);
});

volumeSlider.addEventListener('input', () => {
  audio.volume = Number(volumeSlider.value);
});
audio.volume = Number(volumeSlider.value);

loadPlayerState();
