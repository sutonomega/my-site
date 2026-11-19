const audio = document.getElementById('global-audio');
const miniPlayer = document.getElementById('mini-player');
const miniPlay = document.getElementById('mini-play');
const miniTitle = document.getElementById('mini-title');
const progress = document.getElementById('mini-progress');
const volumeSlider = document.getElementById('volume-slider');
const currentTimeText = document.getElementById('current-time');
const durationText = document.getElementById('duration');
const playerMessage = document.getElementById('player-message');
const playerKey = 'echo-note-player';
let pendingRestore;

function getAudioUrl(slug) {
  return `https://audio.galpachi.com/audio/${slug}.mp3`;
}

function selectTrack(slug, title) {
  const source = getAudioUrl(slug);
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
    if (audio.src !== source || error.name === 'AbortError') return;
    playerMessage.textContent = error.name === 'NotAllowedError'
      ? '再生ボタンを押すと続きから再生できます。'
      : '音源を再生できませんでした。時間をおいて再度お試しください。';
  }
}

function playCurrentWork(slug, title) {
  selectTrack(slug, title);
  startPlayback();
}

function savePlayerState() {
  if (!audio.dataset.slug || audio.readyState < HTMLMediaElement.HAVE_METADATA || audio.error) return;
  try {
    localStorage.setItem(playerKey, JSON.stringify({
      src: audio.src,
      title: audio.dataset.title,
      time: audio.currentTime,
      paused: audio.paused || audio.ended
    }));
  } catch {
    // Playback remains available when storage is blocked or full.
  }
}

function loadPlayerState() {
  try {
    const saved = JSON.parse(localStorage.getItem(playerKey));
    if (typeof saved?.src !== 'string' || !saved.src) return;
    const source = new URL(saved.src, document.baseURI);
    const track = source.pathname.match(/\/audio\/([A-Za-z0-9_-]+)[.]mp3$/);
    if (!track) return;
    selectTrack(track[1], typeof saved.title === 'string' ? saved.title : '');
    pendingRestore = saved;
  } catch {
    // An invalid saved record does not affect fresh playback.
  }
}

function formatTime(time) {
  const minutes = Math.floor(time / 60);
  const seconds = String(Math.floor(time % 60)).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function updateProgress() {
  const canSeek = Number.isFinite(audio.duration) && audio.duration > 0 && !audio.error;
  progress.disabled = !canSeek;
  progress.max = canSeek ? audio.duration : 0;
  progress.value = canSeek ? audio.currentTime : 0;
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
