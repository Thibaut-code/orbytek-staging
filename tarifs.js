// Explications des options : survol, clavier et activation tactile.
(() => {
  const items = [...document.querySelectorAll('.price-option')];
  const dropdowns = [...document.querySelectorAll('.price-dropdown')];
  let active = null;
  let pinned = false;
  const close = () => {
    if (!active) return;
    active.querySelector('.option-tooltip').hidden = true;
    active.querySelector('.option-help').setAttribute('aria-expanded', 'false');
    active = null;
    pinned = false;
  };
  const open = (item) => {
    if (active !== item) close();
    active = item;
    item.querySelector('.option-tooltip').hidden = false;
    item.querySelector('.option-help').setAttribute('aria-expanded', 'true');
  };
  items.forEach(item => {
    const button = item.querySelector('.option-help');
    button.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') open(item);
    });
    item.addEventListener('pointerleave', () => {
      if (active === item && !pinned && !item.contains(document.activeElement)) close();
    });
    button.addEventListener('focus', () => {
      if (button.matches(':focus-visible')) open(item);
    });
    item.addEventListener('focusout', event => {
      if (active === item && !item.contains(event.relatedTarget)) close();
    });
    button.addEventListener('click', () => {
      if (active === item && pinned) close();
      else { open(item); pinned = true; }
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      close();
      dropdowns.forEach(dropdown => {
        if (!dropdown.open) return;
        const focusInside = dropdown.contains(document.activeElement);
        dropdown.open = false;
        if (focusInside) dropdown.querySelector('summary').focus();
      });
    }
  });
  document.addEventListener('click', event => {
    if (active && !active.contains(event.target)) close();
    dropdowns.forEach(dropdown => {
      if (!dropdown.open || dropdown.contains(event.target)) return;
      dropdown.open = false;
      close();
    });
  });
  dropdowns.forEach(dropdown => dropdown.addEventListener('toggle', () => {
    if (!dropdown.open && active && dropdown.contains(active)) close();
  }));
})();
