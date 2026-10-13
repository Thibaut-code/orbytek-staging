/* ============================================
   CHAUFFAGE COURTOIS – JAVASCRIPT
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    /* ---- NAVBAR SCROLL ---- */
    const navbar = document.getElementById('navbar');
    const floatingCta = document.getElementById('floatingCta');
    const backToTop = document.getElementById('backToTop');

    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        navbar.classList.toggle('scrolled', scrolled > 80);
        floatingCta.classList.toggle('visible', scrolled > 400);
        backToTop.classList.toggle('visible', scrolled > 500);
    });

    /* ---- HAMBURGER ---- */
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('open');
        hamburger.classList.toggle('active');
    });
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('open');
            hamburger.classList.remove('active');
        });
    });

    /* ---- HERO REVEAL ---- */
    setTimeout(() => {
        document.querySelectorAll('.hero .reveal').forEach((el, i) => {
            setTimeout(() => el.classList.add('visible'), i * 180);
        });
    }, 300);

    /* ---- SCROLL REVEAL ---- */
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.12 });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    /* ---- ANIMATE CARDS ON SCROLL ---- */
    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const cards = entry.target.querySelectorAll(
                    '.service-card, .real-card, .avis-card, .contact-card, .avantage-item, .certif-item, .mini-card, .commune-item'
                );
                cards.forEach((card, i) => {
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, i * 80);
                });
                cardObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08 });

    document.querySelectorAll('section').forEach(section => {
        section.querySelectorAll('.service-card, .real-card, .contact-card, .avantage-item, .certif-item, .mini-card').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(24px)';
            el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        });
        cardObserver.observe(section);
    });

    /* ---- COUNTER ANIMATION ---- */
    function animateCounter(el, target, suffix = '') {
        let start = 0;
        const duration = 2000;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= target) {
                el.textContent = target + suffix;
                clearInterval(timer);
            } else {
                el.textContent = Math.floor(start) + suffix;
            }
        }, 16);
    }

    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.querySelectorAll('.stat-num').forEach(num => {
                    const text = num.textContent;
                    const value = parseInt(text.replace(/\D/g, ''));
                    const suffix = text.replace(/[0-9]/g, '');
                    animateCounter(num, value, suffix);
                });
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    const heroStats = document.querySelector('.hero-stats');
    if (heroStats) statsObserver.observe(heroStats);

    /* ---- SMOOTH SCROLL ---- */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                const offset = 80;
                const top = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });

    /* ---- ACTIVE NAV ---- */
    const sections = document.querySelectorAll('section[id]');
    const navAnchors = document.querySelectorAll('.nav-links a:not(.nav-cta)');
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            if (window.scrollY >= section.offsetTop - 120) current = section.getAttribute('id');
        });
        navAnchors.forEach(a => {
            a.style.color = '';
            if (a.getAttribute('href') === '#' + current) a.style.color = 'var(--orange-light)';
        });
    });

    /* ---- AVIS SLIDER ---- */
    const track = document.getElementById('avisTrack');
    const dotsContainer = document.getElementById('avisDots');
    const cards = document.querySelectorAll('.avis-card');
    let currentSlide = 0;
    let slidesPerView = window.innerWidth < 768 ? 1 : 3;
    const totalSlides = Math.ceil(cards.length / slidesPerView);

    for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('div');
        dot.className = 'avis-dot' + (i === 0 ? ' active' : '');
        dot.addEventListener('click', () => goToSlide(i));
        dotsContainer.appendChild(dot);
    }

    function goToSlide(index) {
        currentSlide = Math.max(0, Math.min(index, totalSlides - 1));
        const cardWidth = cards[0].offsetWidth + 24;
        track.style.transform = `translateX(-${currentSlide * cardWidth * slidesPerView}px)`;
        document.querySelectorAll('.avis-dot').forEach((d, i) => d.classList.toggle('active', i === currentSlide));
    }

    document.getElementById('avisNext').addEventListener('click', () => goToSlide(currentSlide < totalSlides - 1 ? currentSlide + 1 : 0));
    document.getElementById('avisPrev').addEventListener('click', () => goToSlide(currentSlide > 0 ? currentSlide - 1 : totalSlides - 1));

    let autoSlide = setInterval(() => goToSlide(currentSlide < totalSlides - 1 ? currentSlide + 1 : 0), 5500);
    track.addEventListener('mouseenter', () => clearInterval(autoSlide));
    track.addEventListener('mouseleave', () => {
        autoSlide = setInterval(() => goToSlide(currentSlide < totalSlides - 1 ? currentSlide + 1 : 0), 5500);
    });

    window.addEventListener('resize', () => {
        slidesPerView = window.innerWidth < 768 ? 1 : 3;
        goToSlide(0);
    });

    /* ---- PARALLAX HERO ---- */
    window.addEventListener('scroll', () => {
        const hero = document.querySelector('.hero');
        if (hero) hero.style.backgroundPositionY = `${50 + window.scrollY * 0.25}%`;
    });

    /* ---- PHONE PULSE ANIMATION ---- */
    const urgenceBtn = document.querySelector('.urgence-btn');
    if (urgenceBtn) {
        setInterval(() => {
            urgenceBtn.style.transform = 'scale(1.04)';
            setTimeout(() => urgenceBtn.style.transform = '', 200);
        }, 3000);
    }

    /* ---- HIGHLIGHT PHONE ON SCROLL ---- */
    const floatUrgence = document.querySelector('.urgence-float');
    if (floatUrgence) {
        setInterval(() => {
            floatUrgence.style.boxShadow = '0 0 0 6px rgba(232,80,10,0.3)';
            setTimeout(() => floatUrgence.style.boxShadow = '', 600);
        }, 4000);
    }

});

/* ============================================
   DEVIS FORM
   ============================================ */
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

/* ============================================
   REAL CARDS – ALWAYS SHOW OVERLAY ON MOBILE
   ============================================ */
if (window.innerWidth <= 768) {
    document.querySelectorAll('.real-overlay').forEach(overlay => {
        overlay.style.opacity = '1';
    });
}