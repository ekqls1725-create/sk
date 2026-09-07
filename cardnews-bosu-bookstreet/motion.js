const params = new URLSearchParams(window.location.search);
const requestedCard = Math.min(5, Math.max(1, Number(params.get('card')) || 1));
const cards = [...document.querySelectorAll('.card')];
const links = [...document.querySelectorAll('.card-nav a')];
const count = document.querySelector('#card-count');

cards.find((card) => Number(card.dataset.card) === requestedCard)?.classList.add('active');
links.find((link) => link.href.includes(`card=${requestedCard}`))?.classList.add('active');
count.textContent = `${String(requestedCard).padStart(2, '0')} / 05`;
