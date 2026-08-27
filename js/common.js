const menuButton = document.querySelector('.menu-toggle');
const mainMenu = document.querySelector('.main-nav');

if (menuButton && mainMenu) {
  const closeMenu = () => {
    menuButton.setAttribute('aria-expanded', 'false');
    mainMenu.classList.remove('open');
  };

  menuButton.addEventListener('click', () => {
    const willOpen = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(willOpen));
    mainMenu.classList.toggle('open', willOpen);
  });

  mainMenu.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 820) closeMenu();
  });
}

document.querySelectorAll('[data-current-year]').forEach((element) => {
  element.textContent = new Date().getFullYear();
});
