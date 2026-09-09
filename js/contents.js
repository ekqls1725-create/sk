const contentTabs = [...document.querySelectorAll('[data-content-tab]')];
const contentPanels = [...document.querySelectorAll('[data-content-panel]')];

if (contentTabs.length && contentPanels.length) {
  const showPanel = (panelId, updateHash = true) => {
    contentTabs.forEach((tab) => {
      const isActive = tab.dataset.contentTab === panelId;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });

    contentPanels.forEach((panel) => {
      panel.hidden = panel.id !== panelId;
    });

    if (updateHash) history.replaceState(null, '', `#${panelId}`);
  };

  contentTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => showPanel(tab.dataset.contentTab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const nextTab = contentTabs[(index + direction + contentTabs.length) % contentTabs.length];
      nextTab.focus();
      showPanel(nextTab.dataset.contentTab);
    });
  });

  const requestedPanel = window.location.hash.slice(1);
  const initialPanel = contentPanels.some((panel) => panel.id === requestedPanel)
    ? requestedPanel
    : contentTabs[0].dataset.contentTab;
  showPanel(initialPanel, false);
}
