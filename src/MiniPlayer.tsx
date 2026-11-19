import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { audioUrl, savedAudioKey } from '../shared/tracks.mjs';
import type { SavedPlayerState, Work } from './types';

const storageKey = 'echo-note-player';

interface Track {
  slug: string;
  title: string;
}

export interface PlayerHandle {
  play(work: Work): void;
}

function formatTime(time: number) {
  const minutes = Math.floor(time / 60);
  return `${minutes}:${String(Math.floor(time % 60)).padStart(2, '0')}`;
}

function readSavedState(): SavedPlayerState | undefined {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    const saved: Partial<SavedPlayerState> | null = JSON.parse(raw);
    if (typeof saved?.src !== 'string' || !saved.src) return;
    return {
      src: saved.src,
      title: typeof saved.title === 'string' ? saved.title : '',
      time: typeof saved.time === 'number' && Number.isFinite(saved.time) ? saved.time : 0,
      paused: Boolean(saved.paused),
    };
  } catch {
    // Invalid or unavailable storage does not affect fresh playback.
  }
}

export const MiniPlayer = forwardRef<PlayerHandle, { onSelect(slug: string): void }>(function MiniPlayer(
  { onSelect }, handle,
) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const selected = useRef<Track>();
  const restore = useRef<SavedPlayerState>();
  const [track, setTrack] = useState<Track>();
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState<number>();
  const [message, setMessage] = useState('');

  function save() {
    const audio = audioRef.current;
    if (!audio || !selected.current || audio.readyState < HTMLMediaElement.HAVE_METADATA || audio.error) return;
    try {
      const state: SavedPlayerState = {
        src: audio.src,
        title: selected.current.title,
        time: audio.currentTime,
        paused: audio.paused || audio.ended,
      };
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Playback remains available when storage is blocked or full.
    }
  }

  function select(next: Track) {
    const audio = audioRef.current!;
    const source = audioUrl(next.slug);
    selected.current = next;
    setTrack(next);
    onSelect(next.slug);
    if (audio.src === source) return;
    restore.current = undefined;
    setTime(0);
    setDuration(undefined);
    audio.src = source;
  }

  async function start() {
    const audio = audioRef.current!;
    const source = audio.src;
    setMessage('');
    try {
      if (audio.error) audio.load();
      await audio.play();
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      if (audio.src !== source || name === 'AbortError') return;
      setMessage(name === 'NotAllowedError'
        ? '再生ボタンを押すと続きから再生できます。'
        : '音源を再生できませんでした。時間をおいて再度お試しください。');
    }
  }

  useImperativeHandle(handle, () => ({
    play(work) {
      setExpanded(true);
      select(work);
      void start();
    },
  }));

  useLayoutEffect(() => {
    const audio = audioRef.current!;
    audio.volume = 0.7;
    const saved = readSavedState();
    if (saved) {
      try {
        const slug = savedAudioKey(saved.src, document.baseURI);
        if (slug) {
          select({ slug, title: saved.title || '' });
          restore.current = saved;
        }
      } catch {
        // A malformed legacy URL does not affect fresh playback.
      }
    }
    window.addEventListener('pagehide', save);
    return () => window.removeEventListener('pagehide', save);
  }, []);

  function syncProgress() {
    const audio = audioRef.current!;
    const canSeek = Number.isFinite(audio.duration) && audio.duration > 0 && !audio.error;
    setDuration(canSeek ? audio.duration : undefined);
    setTime(audio.currentTime);
  }

  function syncPlayback() {
    const audio = audioRef.current!;
    setPlaying(!audio.paused && !audio.ended && !audio.error);
    save();
  }

  function metadataLoaded() {
    const audio = audioRef.current!;
    const saved = restore.current;
    restore.current = undefined;
    if (saved && saved.time > 0 && Number.isFinite(audio.duration)) {
      audio.currentTime = Math.min(saved.time, audio.duration);
    }
    syncProgress();
  }

  function failed() {
    restore.current = undefined;
    syncPlayback();
    syncProgress();
    setMessage('音源を読み込めませんでした。再生ボタンで再試行できます。');
  }

  function toggle() {
    const audio = audioRef.current!;
    if (audio.paused || audio.ended || audio.error) void start();
    else audio.pause();
  }

  return (
    <>
      <audio id="global-audio" ref={audioRef}
        onLoadedMetadata={metadataLoaded} onDurationChange={syncProgress}
        onPlay={syncPlayback} onPlaying={syncPlayback} onPause={syncPlayback}
        onEnded={syncPlayback} onEmptied={syncPlayback} onError={failed}
        onTimeUpdate={() => { syncProgress(); save(); }} onSeeked={save} />
      <div className="player-dock">
        <div className="mini-player" id="mini-player" hidden={!expanded}>
          <button className="mini-play" id="mini-play" aria-label={playing ? '一時停止' : '再生'}
            disabled={!track} onClick={toggle}>{playing ? '❚❚' : '▶'}</button>
          <div className="mini-info">
            <span id="mini-title">{track?.title || '-'}</span>
            <div className="mini-time">
              <span id="current-time">{formatTime(time)}</span><span>/</span>
              <span id="duration">{duration === undefined ? '-:--' : formatTime(duration)}</span>
            </div>
            <input className="mini-progress" id="mini-progress" type="range" min="0" max={duration ?? 0}
              step="any" value={duration === undefined ? 0 : time} aria-label="再生位置" disabled={duration === undefined}
              onChange={event => {
                if (duration !== undefined) {
                  const audio = audioRef.current!;
                  audio.currentTime = Number(event.currentTarget.value);
                  setTime(audio.currentTime);
                }
              }} />
            <p className="player-message" id="player-message" role="status">{message}</p>
            <div className="volume-control"><span className="volume-icon">♪</span>
              <input type="range" id="volume-slider" aria-label="音量" min="0" max="1" step="0.01" defaultValue="0.7"
                onChange={event => { audioRef.current!.volume = Number(event.currentTarget.value); }} />
            </div>
          </div>
        </div>
        <button type="button" className="player-visibility" aria-controls="mini-player" aria-expanded={expanded}
          onClick={() => setExpanded(value => !value)}>
          {expanded ? 'プレーヤーを隠す' : 'プレーヤーを表示'}
        </button>
      </div>
    </>
  );
});
