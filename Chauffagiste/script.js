/* Theme preferences are restored in the document head to avoid a light flash. */
document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const themeToggle = document.getElementById('themeToggle');
    function updateThemeButton() {
        const dark = root.dataset.theme !== 'light';
        themeToggle.setAttribute('aria-label', `Activer le thème ${dark ? 'clair' : 'sombre'}`);
        themeToggle.querySelector('span').textContent = dark ? 'Clair' : 'Sombre';
        themeToggle.querySelector('i').className = `fas fa-${dark ? 'sun' : 'moon'}`;
    }
    updateThemeButton();
    themeToggle.addEventListener('click', () => {
        root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
        try { localStorage.setItem('dupuis-theme', root.dataset.theme); } catch {}
        updateThemeButton();
    });
    window.addEventListener('storage', event => {
        if (event.key === 'dupuis-theme') {
            root.dataset.theme = event.newValue === 'light' ? 'light' : 'dark';
            updateThemeButton();
        }
    });

    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    function closeMenu() {
        hamburger.classList.remove('active');
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.setAttribute('aria-label', 'Ouvrir le menu');
    }
    hamburger.addEventListener('click', () => {
        const open = navLinks.classList.toggle('open');
        hamburger.classList.toggle('active', open);
        hamburger.setAttribute('aria-expanded', String(open));
        hamburger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    });
    navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && navLinks.classList.contains('open')) {
            closeMenu();
            hamburger.focus();
        }
    });
    const desktop = window.matchMedia('(min-width: 801px)');
    desktop.addEventListener('change', () => { if (desktop.matches) closeMenu(); });
    const navbar = document.getElementById('navbar');
    const floating = document.getElementById('floatingCta');
    const back = document.getElementById('backToTop');
    function onScroll() {
        navbar.classList.toggle('scrolled', window.scrollY > 20);
        floating.classList.toggle('visible', window.scrollY > 700);
        back.classList.toggle('visible', window.scrollY > 900);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Each title, image and card is revealed only once, in its own viewport.
    const revealTargets = document.querySelectorAll('.reveal, .image-reveal, .section-title, .section-tag, .about-img-main, .about-img-float, .pourquoi-img, .service-card, .real-card, .contact-card, .avantage-item');
    revealTargets.forEach((element, index) => {
        element.classList.add(element.matches('.about-img-main, .about-img-float, .pourquoi-img, .real-card') ? 'image-reveal' : 'reveal');
        element.style.setProperty('--reveal-delay', `${(index % 3) * 75}ms`);
    });
    if (!reducedMotion.matches && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08 });
        revealTargets.forEach(element => observer.observe(element));
        root.classList.add('motion-ready');
        reducedMotion.addEventListener('change', event => {
            if (event.matches) {
                observer.disconnect();
                revealTargets.forEach(element => element.classList.add('visible'));
            }
        });
    }

    function count(element) {
        if (element.dataset.counted) return;
        element.dataset.counted = 'true';
        const target = Number(element.dataset.count);
        const suffix = element.dataset.suffix || '';
        if (reducedMotion.matches) return;
        const start = performance.now();
        function frame(now) {
            if (reducedMotion.matches) {
                element.textContent = `${target}${suffix}`;
                return;
            }
            const progress = Math.min((now - start) / 1600, 1);
            element.textContent = `${Math.round(target * (1 - (1 - progress) ** 3))}${suffix}`;
            if (progress < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }
    if ('IntersectionObserver' in window) {
        const counters = new IntersectionObserver(entries => entries.forEach(entry => {
            if (entry.isIntersecting) { count(entry.target); counters.unobserve(entry.target); }
        }), { threshold: 0.6 });
        document.querySelectorAll('[data-count]').forEach(element => counters.observe(element));
    }

    // Manual reviews carousel: no distracting automatic movement.
    const track = document.getElementById('avisTrack');
    const cards = Array.from(track.querySelectorAll('.avis-card'));
    const dots = document.getElementById('avisDots');
    let currentSlide = 0;
    function pageSize() { return innerWidth <= 480 ? 1 : innerWidth <= 800 ? 2 : 3; }
    function renderCarousel() {
        const size = pageSize();
        const pages = Math.ceil(cards.length / size);
        currentSlide = Math.min(currentSlide, pages - 1);
        const cardWidth = cards[0].getBoundingClientRect().width + 24;
        const first = Math.min(currentSlide * size, Math.max(0, cards.length - size));
        track.style.transform = `translateX(-${first * cardWidth}px)`;
        cards.forEach((card, index) => {
            card.setAttribute('aria-hidden', String(index < first || index >= first + size));
        });
        if (dots.children.length !== pages) {
            dots.replaceChildren();
            for (let i = 0; i < pages; i++) {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'avis-dot';
                dot.setAttribute('aria-label', `Afficher la page ${i + 1} des avis`);
                dot.addEventListener('click', () => { currentSlide = i; renderCarousel(); });
                dots.append(dot);
            }
        }
        Array.from(dots.children).forEach((dot, index) => {
            dot.classList.toggle('active', index === currentSlide);
            dot.setAttribute('aria-pressed', String(index === currentSlide));
        });
    }
    document.getElementById('avisNext').addEventListener('click', () => {
        currentSlide = (currentSlide + 1) % Math.ceil(cards.length / pageSize()); renderCarousel();
    });
    document.getElementById('avisPrev').addEventListener('click', () => {
        const pages = Math.ceil(cards.length / pageSize());
        currentSlide = (currentSlide - 1 + pages) % pages; renderCarousel();
    });
    window.addEventListener('resize', renderCarousel);
    renderCarousel();
});

document.getElementById('devisForm')?.addEventListener('submit', function (e) {
    e.preventDefault();

    const prenom = this.querySelector('input[name="prenom"]').value.trim();
    const nom = this.querySelector('input[name="nom"]').value.trim();
    const tel = this.querySelector('input[name="tel"]').value.trim();
    const prestation = this.querySelector('select[name="prestation"]').value;
    const checkbox = this.querySelector('input[type="checkbox"]');

    // Validation
    if (!prenom || !nom || !tel || !prestation) {
        showError('Veuillez remplir tous les champs obligatoires (*).');
        return;
    }
    if (!checkbox.checked) {
        showError('Veuillez accepter la politique de confidentialité.');
        return;
    }

    // Success
    document.getElementById('modalOverlay').classList.add('active');

    // Reset
    setTimeout(() => {
        this.reset();
        // Reset radio buttons
        const firstRadio = this.querySelector('input[type="radio"]');
        if (firstRadio) firstRadio.checked = true;
    }, 500);
});

function showError(msg) {
    let err = document.querySelector('.form-error-msg');
    if (!err) {
        err = document.createElement('div');
        err.className = 'form-error-msg';
        err.style.cssText = 'background:#FEF2F2;border-left:4px solid #EF4444;padding:12px 16px;margin-bottom:16px;font-size:0.85rem;color:#DC2626;border-radius:4px;';
    }
    err.textContent = msg;
    const form = document.getElementById('devisForm');
    const existing = form.querySelector('.form-error-msg');
    if (existing) existing.remove();
    form.insertBefore(err, form.querySelector('button[type="submit"]'));
    err.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => err.remove(), 5000);
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

document.getElementById('modalOverlay')?.addEventListener('click', function (e) {
    if (e.target === this) closeModal();
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
});

