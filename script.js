async function loadWorks() {

  const response =
    await fetch('works.json');

  const works =
    await response.json();

  const worksContainer =
    document.getElementById('works-grid');

  worksContainer.innerHTML =
    works.map(createCard).join('');

  initObserver();
}

loadWorks();

function createCard(work) {
  return `
    <div class="work-card">

      <h3>${work.title}</h3>

    <div class="work-meta">
    
      <span>${work.date}</span>
    
      <div class="tags">
        ${work.tags.map(tag =>
          `<span class="tag">${tag}</span>`
        ).join('')}
      </div>
    
    </div>

      <p>
        ${work.text}
      </p>

      <div class="work-video">
        <iframe
          src="${work.youtube}"
          allowfullscreen>
        </iframe>
      </div>

      <a
        class="work-link"
        href="${work.tiktok}">
        ショートを見る
      </a>

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

