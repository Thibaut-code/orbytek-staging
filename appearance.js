/* Apply the saved choice before the first paint; no account or tracking required. */
(() => {
  const root = document.documentElement;
  const key = 'orbytek-appearance';
  let mode = 'light';
  try { if (localStorage.getItem(key) === 'dark') mode = 'dark'; } catch { /* Private browsing keeps a session choice. */ }
  function apply(value) {
    mode = value;
    root.dataset.appearance = mode;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mode === 'light' ? '#f6f9ff' : '#090c0d');
    document.querySelectorAll('[data-appearance-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.appearanceChoice === mode)));
    document.querySelectorAll('.brand img').forEach(image => { image.src = mode === 'light' ? 'orbytek-logo-light.webp' : 'orbytek-logo-dark.webp'; });
    document.querySelectorAll('img[data-appearance-light][data-appearance-dark]').forEach(image => {
      image.src = mode === 'light' ? image.dataset.appearanceLight : image.dataset.appearanceDark;
    });
    document.querySelector('.planet-scene')?.setAttribute('aria-label', `Planète technologique ${mode === 'light' ? 'bleue' : 'cuivrée'}, avec trois points pour explorer nos solutions`);
    document.dispatchEvent(new Event('appearancechange'));
  }
  apply(mode);
  document.addEventListener('DOMContentLoaded', () => {
    const control = document.querySelector('header .appearance-control');
    if (!control) return;
    control.addEventListener('click', event => {
      const button = event.target.closest('[data-appearance-choice]');
      if (!button) return;
      apply(button.dataset.appearanceChoice);
      try { localStorage.setItem(key, mode); } catch { /* Current page remains usable. */ }
    });
    apply(mode);
    const navigation = document.querySelector('header .main-navigation');
    const links = navigation?.querySelector('.navlinks');
    if (!navigation || !links) return;
    const header = navigation.closest('header');
    const mobile = matchMedia('(max-width: 800px)');
    const actions = document.createElement('div');
    actions.className = 'mobile-navigation-actions';
    const theme = document.createElement('button');
    theme.type = 'button';
    theme.className = 'mobile-theme-toggle';
    const updateTheme = () => {
      theme.textContent = mode === 'light' ? '☀' : '☾';
      theme.setAttribute('aria-label', mode === 'light' ? 'Activer le thème sombre' : 'Activer le thème clair');
    };
    theme.addEventListener('click', () => control.querySelector(`[data-appearance-choice="${mode === 'light' ? 'dark' : 'light'}"]`)?.click());
    document.addEventListener('appearancechange', updateTheme);
    updateTheme();
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'mobile-menu-toggle';
    toggle.innerHTML = '<span aria-hidden="true">☰</span> <span>Menu</span>';
    links.id ||= 'orbytek-navigation-links';
    toggle.setAttribute('aria-controls', links.id);
    toggle.setAttribute('aria-expanded', 'false');
    actions.append(theme, toggle);
    navigation.append(actions);
    const contact = navigation.querySelector('.header-actions .navcta')?.cloneNode(true);
    if (contact) {
      contact.classList.add('mobile-menu-contact');
      links.append(contact);
    }
    function setOpen(open, restoreFocus = false) {
      header.classList.toggle('mobile-menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.firstElementChild.textContent = open ? '×' : '☰';
      toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      if (restoreFocus) toggle.focus();
    }
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    links.addEventListener('click', event => {
      if (!mobile.matches || !event.target.closest('a')) return;
      // Let the browser activate the link before hiding its focused element.
      // Do not preventDefault, change location, or move focus here.
      setTimeout(() => setOpen(false), 0);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, true);
    });
    document.addEventListener('click', event => {
      if (!header.contains(event.target)) setOpen(false);
    });
    mobile.addEventListener('change', () => setOpen(false));
    header.classList.add('mobile-navigation-ready');
  });
  window.addEventListener('storage', event => { if (event.key === key) apply(event.newValue === 'dark' ? 'dark' : 'light'); });
})();
