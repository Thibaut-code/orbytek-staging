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
  });
  window.addEventListener('storage', event => { if (event.key === key) apply(event.newValue === 'dark' ? 'dark' : 'light'); });
})();
