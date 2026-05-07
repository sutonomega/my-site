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
        time: audio.currentTime,
        paused: audio.paused
      })
    );

  }

  function loadPlayerState() {

    const saved =
      JSON.parse(
        localStorage.getItem(
          'echo-note-player'
        )
      );

    if (!saved) return;

    audio.src = saved.src;

    audio.addEventListener(
      'loadedmetadata',
      () => {

        audio.currentTime =
          saved.time || 0;

        if (!saved.paused) {

          audio.play().catch(console.log);

          miniPlay.textContent =
            '❚❚';

        }

      },
      { once: true }
    );

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

}