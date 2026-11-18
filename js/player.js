const audio =
  document.getElementById(
    'global-audio'
  );

const miniPlay =
  document.getElementById(
    'mini-play'
  );

const miniTitle =
  document.getElementById(
    'mini-title'
  );

const miniProgress =
  document.getElementById(
    'mini-progress-bar'
  );

const volumeSlider =
  document.getElementById(
    'volume-slider'
  );

const currentTimeText =
  document.getElementById(
    'current-time'
  );

const durationText =
  document.getElementById(
    'duration'
  );

const miniProgressContainer =
  document.querySelector(
    '.mini-progress'
  );

if (
  miniPlay &&
  miniTitle &&
  miniProgress &&
  volumeSlider &&
  currentTimeText &&
  durationText &&
  miniProgressContainer
) {

  function savePlayerState() {

    localStorage.setItem(
      'echo-note-player',
      JSON.stringify({
        src: audio.src,
        title: audio.dataset.title,
        time: audio.currentTime,
        paused: audio.paused
      })
    );

  }

  function loadPlayerState() {

    let saved;
    let source;
    try {
      saved = JSON.parse(localStorage.getItem('echo-note-player'));
      if (typeof saved?.src !== 'string' || !saved.src) return;
      source = new URL(saved.src, document.baseURI);
    } catch {
      return;
    }

    const track = source.pathname.match(/\/audio\/([A-Za-z0-9_-]+)[.]mp3$/);
    if (!track) return;

    const slug = track[1];
    const audioUrl = getAudioUrl(slug);
    audio.dataset.slug = slug;
    audio.dataset.title = saved.title || '';

    audio.addEventListener('loadedmetadata', () => {
      if (audio.src !== audioUrl) return;

      if (Number.isFinite(saved.time) && saved.time > 0) {
        audio.currentTime = Math.min(saved.time, audio.duration);
      }
      document.querySelector('.mini-player')?.classList.add('show');

      if (!saved.paused) {
        audio.play().then(() => {
          miniPlay.textContent = '❚❚';
        }).catch(console.log);
      }
    }, { once: true });

    audio.src = audioUrl;
  }

  function formatTime(time) {

    const minutes =
      Math.floor(time / 60);

    const seconds =
      Math.floor(time % 60)
        .toString()
        .padStart(2, '0');

    return `${minutes}:${seconds}`;

  }

  miniPlay.addEventListener(
    'click',
    async () => {
      console.log('clicked');
      if (audio.paused) {

        try {

          await audio.play();

          miniPlay.textContent =
            '❚❚';

        } catch (error) {

          console.log(error);

        }

        miniPlay.textContent =
          '❚❚';

      } else {

        audio.pause();

        miniPlay.textContent =
          '▶';

      }

    }
  );

  audio.addEventListener(
    'timeupdate',
    () => {

      const progress =
        (audio.currentTime
          / audio.duration)
        * 100;

      miniProgress.style.width =
        `${progress}%`;

      currentTimeText.textContent =
        formatTime(audio.currentTime);

      durationText.textContent =
        formatTime(audio.duration);

    }
  );

  volumeSlider.addEventListener(
    'input',
    () => {

      audio.volume =
        volumeSlider.value;

    }
  );

  audio.volume =
    volumeSlider.value;

  miniProgressContainer
    .addEventListener(
      'click',
      (e) => {

        const rect =
          miniProgressContainer
            .getBoundingClientRect();

        const clickX =
          e.clientX - rect.left;

        const ratio =
          clickX / rect.width;

        audio.currentTime =
          ratio * audio.duration;

      }
    );
  function updateMiniTitle() {

    miniTitle.textContent =
      audio.dataset.title || '-';

  }
  audio.addEventListener(
    'loadedmetadata',
    updateMiniTitle
  );

  audio.addEventListener(
    'timeupdate',
    savePlayerState
  );

  loadPlayerState();

}