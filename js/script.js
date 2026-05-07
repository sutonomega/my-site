const homeHTML =
  document.getElementById(
    'page-container'
  ).innerHTML;

let allWorks = [];

let activeTag = null;

async function loadWorks() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  const slug =
    params.get('slug');

  const response =
    await fetch('./json/works.json');

  const works =
    await response.json();

  allWorks = works;

  renderTags(works);

  renderWorks(works);

  if (slug) {

    renderWorkPage(slug);

  }
}

loadWorks();

async function loadLyrics(slug) {

  try {

    const response =
      await fetch(
        `./lyrics/${slug}.md`
      );

    if (!response.ok) {

      return '';

    }

    return await response.text();

  } catch {

    return '';

  }

}
function renderWorks(works) {

  const worksContainer =
    document.getElementById(
      'works-grid'
    );

  worksContainer.innerHTML =
    works.map(createCard).join('');

  initObserver();

}

function renderTags(works) {

  const tagsContainer =
    document.getElementById('filter-tags');

  const tags = [
    ...new Set(
      works.flatMap(work => work.tags)
    )
  ].sort();

  tagsContainer.innerHTML = tags
    .map(tag => `
      <button
        class="filter-tag"
        data-tag="${tag}">
        #${tag}
      </button>
    `)
    .join('');
}

function createCard(work) {

  let thumbnailUrl = '';

  if (work.youtube) {

    try {

      const videoId =
        work.youtube
          .split('v=')[1]
          ?.split('&')[0];

      thumbnailUrl =
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    } catch {

      thumbnailUrl = '';

    }

  }

  const isPlaying =
    audio.dataset.slug === work.slug;

  return `
  <div
    class="work-card-link"
    onclick="openWork('${work.slug}')">

    <div class="work-card">

      ${thumbnailUrl
      ? `
        <div class="work-thumbnail">

          <img
            src="${thumbnailUrl}"
            alt="${work.title}"
          >

        </div>
        `
      : ''
    }

      ${isPlaying
      ? `
        <span class="playing-badge">
          NOW PLAYING
        </span>
        `
      : ''
    }

      <h3>${work.title}</h3>

      <div class="work-meta">

        <span>${work.date}</span>

        <div class="tags">
          ${work.tags
      .map(tag =>
        `<span class="tag">${tag}</span>`
      )
      .join('')}
        </div>

      </div>

      <p>
        ${work.text}
      </p>

      <div class="work-links">

        <span class="work-detail">
          詳細を見る
        </span>

      </div>

    </div>

  </div>
  `;
}

function initObserver() {

  const cards =
    document.querySelectorAll('.work-card');

  const observer =
    new IntersectionObserver((entries) => {

      entries.forEach((entry, index) => {

        if (entry.isIntersecting) {

          setTimeout(() => {
            entry.target.classList.add('show');
          }, index * 180);

        }

      });

    }, {
      threshold: 0.15
    });

  cards.forEach(card =>
    observer.observe(card)
  );
}

document.addEventListener('click', (e) => {

  const filterTag =
    e.target.closest('.filter-tag');

  if (!filterTag) return;

  const tag =
    filterTag.dataset.tag;

  if (activeTag === tag) {

    activeTag = null;

  } else {

    activeTag = tag;
  }

  document
    .querySelectorAll('.filter-tag')
    .forEach(button => {

      button.classList.toggle(
        'active',
        button.dataset.tag === activeTag
      );

    });

  const activeFilter =
    document.getElementById('active-filter');

  activeFilter.textContent =
    activeTag
      ? `#${activeTag}`
      : '';

  const filteredWorks =
    activeTag
      ? allWorks.filter(work =>
        work.tags.includes(activeTag))
      : allWorks;

  renderWorks(filteredWorks);
});

document.addEventListener('click', (e) => {

  const link =
    e.target.closest('.work-link');

  if (!link) return;

  e.preventDefault();

  e.stopPropagation();

  window.open(
    link.dataset.link,
    '_blank'
  );

});

window.addEventListener('load', () => {

  const loading =
    document.getElementById(
      'loading-screen'
    );

  setTimeout(() => {

    loading.classList.add('hide');

  }, 900);

});

window.addEventListener(
  'load',
  () => {

    document.body.style.opacity =
      '1';

  }
);

function openWork(slug) {

  history.pushState(
    {},
    '',
    `?slug=${slug}`
  );

  renderWorkPage(slug);

  window.scrollTo({
    top: 0,
    behavior: 'auto'
  });
}
async function renderWorkPage(slug) {

  const response =
    await fetch('./json/works.json');

  const works =
    await response.json();

  const work =
    works.find(
      item => item.slug === slug
    );
  const lyrics =
    (
      await loadLyrics(work.slug)
    ).trim();

  const pageContainer =
    document.getElementById(
      'page-container'
    );

  pageContainer.innerHTML = `

  <section class="work-page">

  <div class="container">

    <button
      class="back-link"
      onclick="renderHome()">

      ← 一覧へ戻る

    </button>

    <p class="detail-date">
      ${work.date}
    </p>

    <h1 class="detail-title">
      ${work.title}
    </h1>

    <div class="tags detail-tags">

      ${work.tags.map(tag => `

        <span class="tag">
          #${tag}
        </span>

      `).join('')}

    </div>

    <p class="detail-text">
      ${work.text}
    </p>

    <button
      class="play-work-button"
      onclick="playCurrentWork(
        '${work.slug}',
        '${work.title}'
      )">

      ▶ この曲を再生

    </button>

    <div class="detail-links">

      <a
        class="hero-button"
        href="${work.youtube}"
        target="_blank"
        rel="noopener noreferrer">

        YouTubeで見る

      </a>

      <a
        class="hero-button secondary"
        href="${work.tiktok}"
        target="_blank"
        rel="noopener noreferrer">

        TikTokで見る

      </a>

    </div>
    <div class="lyrics-block">
          
      <h2>
        Lyrics
      </h2>
          
      <div class="lyrics-content">${lyrics ? lyrics.replace(/\n/g, '<br>') : '歌詞はまだ公開されていません。'}</div>
      
    </div>
  </div>

</section>
`;
}

function renderHome() {

  history.pushState(
    {},
    '',
    './'
  );

  document.getElementById(
    'page-container'
  ).innerHTML = homeHTML;

  loadWorks();

}

window.addEventListener(
  'popstate',
  () => {

    const params =
      new URLSearchParams(
        window.location.search
      );

    const slug =
      params.get('slug');

    if (slug) {

      renderWorkPage(slug);

    } else {

      renderHome();

    }

  }
);

function playCurrentWork(
  slug,
  title
) {

  const audioUrl =
    `./audio/${slug}.mp3`;
  audio.dataset.slug =
    slug;
  if (
    !audio.src.includes(
      `${slug}.mp3`
    )
  ) {

    audio.src = audioUrl;

  }

  audio.dataset.title =
    title;

  audio.play();

  const miniPlayer =
    document.querySelector(
      '.mini-player'
    );

  miniPlayer.classList.add(
    'show'
  );

  const miniPlay =
    document.getElementById(
      'mini-play'
    );

  miniPlay.textContent =
    '❚❚';

}