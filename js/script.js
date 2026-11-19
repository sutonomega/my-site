const pageContainer = document.getElementById('page-container');
const homeHTML = pageContainer.innerHTML;

let allWorks = [];

let activeTag = null;

let worksRequest;
let navigationId = 0;

function loadWorks() {
  if (!worksRequest) {
    worksRequest = fetch('./json/works.json').then(response => {
      if (!response.ok) throw new Error('作品一覧を取得できませんでした。');
      return response.json();
    }).catch(error => {
      worksRequest = undefined;
      throw error;
    });
  }
  return worksRequest;
}

async function renderCurrentPage() {
  const id = ++navigationId;
  const slug = new URLSearchParams(location.search).get('slug');
  try {
    const works = await loadWorks();
    if (id !== navigationId) return;

    if (slug === null) {
      allWorks = works;
      activeTag = null;
      pageContainer.innerHTML = homeHTML;
      renderTags(works);
      renderWorks(works);
      return;
    }

    const work = works.find(item => item.slug === slug);
    if (!work) {
      showPageMessage('指定された曲が見つかりません。');
      return;
    }

    const lyrics = (await loadLyrics(work.slug)).trim();
    if (id === navigationId) renderWorkPage(work, lyrics);
  } catch {
    if (id === navigationId) {
      showPageMessage('作品一覧を読み込めませんでした。時間をおいて再度お試しください。');
    }
  }
}

function showPageMessage(message) {
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

  let thumbnailUrl =
    './images/placeholder.png';

  if (work.youtube) {

    try {

      const videoId =
        work.youtube
          .split('v=')[1]
          ?.split('&')[0];

      thumbnailUrl =
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    } catch {
      
      thumbnailUrl =
        './images/placeholder.png';

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
  navigateTo(`?slug=${encodeURIComponent(slug)}`);
}

function navigateTo(url) {
  history.pushState({}, '', url);
  renderCurrentPage();
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function renderWorkPage(work, lyrics) {
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

      ${work.youtube ? `
        <a
          class="hero-button"
          href="${work.youtube}"
          target="_blank"
          rel="noopener noreferrer">
      
          YouTubeで見る
      
        </a>
      ` : ''}
      
      ${work.tiktok ? `
        <a
          class="hero-button secondary"
          href="${work.tiktok}"
          target="_blank"
          rel="noopener noreferrer">
      
          TikTokで見る
      
        </a>
      ` : ''}
      
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
  navigateTo('./');
}

window.addEventListener('popstate', renderCurrentPage);
renderCurrentPage();

