/* ============================================
   MAISON ÉLÉGANCE – JAVASCRIPT PREMIUM
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    /* ---- NAVBAR SCROLL ---- */
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 60);
        document.getElementById('backToTop').classList.toggle('visible', window.scrollY > 400);
    });

    /* ---- HAMBURGER MENU ---- */
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

    /* ---- REVEAL ON SCROLL ---- */
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // Animate sections on scroll
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.querySelectorAll('.service-card, .team-card, .gallery-item, .avis-card, .contact-item').forEach((el, i) => {
                    setTimeout(() => {
                        el.style.opacity = '1';
                        el.style.transform = 'translateY(0)';
                    }, i * 100);
                });
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('section').forEach(section => {
        section.querySelectorAll('.service-card, .team-card, .gallery-item, .contact-item').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        });
        sectionObserver.observe(section);
    });

    /* ---- HERO REVEAL ---- */
    setTimeout(() => {
        document.querySelectorAll('.hero .reveal').forEach((el, i) => {
            setTimeout(() => el.classList.add('visible'), i * 150);
        });
    }, 300);

    /* ---- DATE MIN ---- */
    const dateInput = document.getElementById('dateInput');
    if (dateInput) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.min = tomorrow.toISOString().split('T')[0];
    }

    /* ---- GALLERY FILTER ---- */
    const filterBtns = document.querySelectorAll('.filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-item');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            galleryItems.forEach(item => {
                if (filter === 'all' || item.dataset.cat === filter) {
                    item.style.display = 'block';
                    setTimeout(() => { item.style.opacity = '1'; item.style.transform = 'scale(1)'; }, 10);
                } else {
                    item.style.opacity = '0';
                    item.style.transform = 'scale(0.95)';
                    setTimeout(() => { item.style.display = 'none'; }, 400);
                }
            });
        });
    });

    /* ---- AVIS SLIDER ---- */
    const track = document.getElementById('avisTrack');
    const dotsContainer = document.getElementById('avisDots');
    const cards = document.querySelectorAll('.avis-card');
    let currentSlide = 0;
    let slidesPerView = window.innerWidth < 768 ? 1 : 3;
    const totalSlides = Math.ceil(cards.length / slidesPerView);

    // Create dots
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
        document.querySelectorAll('.avis-dot').forEach((d, i) => {
            d.classList.toggle('active', i === currentSlide);
        });
    }

    document.getElementById('avisNext').addEventListener('click', () => {
        goToSlide(currentSlide < totalSlides - 1 ? currentSlide + 1 : 0);
    });

    document.getElementById('avisPrev').addEventListener('click', () => {
        goToSlide(currentSlide > 0 ? currentSlide - 1 : totalSlides - 1);
    });

    // Auto-slide
    let autoSlide = setInterval(() => goToSlide(currentSlide < totalSlides - 1 ? currentSlide + 1 : 0), 5000);
    track.addEventListener('mouseenter', () => clearInterval(autoSlide));
    track.addEventListener('mouseleave', () => {
        autoSlide = setInterval(() => goToSlide(currentSlide < totalSlides - 1 ? currentSlide + 1 : 0), 5000);
    });

    window.addEventListener('resize', () => {
        slidesPerView = window.innerWidth < 768 ? 1 : 3;
        goToSlide(0);
    });

    /* ---- SMOOTH SCROLL ---- */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                const offset = 80;
                const top = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });

    /* ---- ACTIVE NAV LINK ---- */
    const sections = document.querySelectorAll('section[id]');
    const navAnchors = document.querySelectorAll('.nav-links a');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            if (window.scrollY >= section.offsetTop - 120) {
                current = section.getAttribute('id');
            }
        });
        navAnchors.forEach(a => {
            a.style.color = '';
            if (a.getAttribute('href') === '#' + current) {
                a.style.color = 'var(--gold)';
            }
        });
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
                const nums = entry.target.querySelectorAll('.stat-num');
                nums.forEach(num => {
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

    /* ---- NEWSLETTER ---- */
    document.querySelector('.newsletter-form')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const input = this.querySelector('input');
        if (input.value && input.value.includes('@')) {
            const btn = this.querySelector('button');
            btn.innerHTML = '<i class="fas fa-check"></i>';
            btn.style.background = '#2ecc71';
            input.value = '';
            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-paper-plane"></i>';
                btn.style.background = '';
            }, 3000);
        }
    });

});

/* ============================================
   MULTI-STEP FORM
   ============================================ */
const serviceLabels = {
    'coupe-femme': 'Coupe Femme – 65€',
    'balayage': 'Balayage & Mèches – 120€',
    'soin': 'Soin Kérastase – 55€',
    'coupe-homme': 'Coupe Homme – 45€',
    'coloration': 'Coloration Complète – 85€',
    'mariee': 'Forfait Mariée – 250€'
};

function nextStep(current) {
    const currentStep = document.getElementById('step' + current);
    const nextStepEl = document.getElementById('step' + (current + 1));

    // Validation
    if (current === 1) {
        const selected = document.querySelector('input[name="service"]:checked');
        if (!selected) {
            showFormError('Veuillez sélectionner un service pour continuer.');
            return;
        }
    }

    if (current === 2) {
        const date = document.querySelector('input[name="date"]').value;
        const heure = document.querySelector('select[name="heure"]').value;
        if (!date || !heure) {
            showFormError('Veuillez choisir une date et une heure.');
            return;
        }
        // Build recap
        buildRecap();
    }

    currentStep.classList.remove('active');
    nextStepEl.classList.add('active');
    document.querySelector('.reservation-form-wrapper').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function prevStep(current) {
    document.getElementById('step' + current).classList.remove('active');
    document.getElementById('step' + (current - 1)).classList.add('active');
}

function buildRecap() {
    const service = document.querySelector('input[name="service"]:checked')?.value;
    const coiffeur = document.querySelector('select[name="coiffeur"]')?.value;
    const date = document.querySelector('input[name="date"]')?.value;
    const heure = document.querySelector('select[name="heure"]')?.value;

    const coiffeurLabels = {
        '': 'Pas de préférence',
        'sophie': 'Sophie Martin',
        'lucas': 'Lucas Dubois',
        'camille': 'Camille Rousseau'
    };

    const dateFormatted = date ? new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';

    const recap = document.getElementById('recapBox');
    recap.innerHTML = `
        <strong style="display:block;margin-bottom:8px;color:var(--gold)">Récapitulatif de votre réservation</strong>
        <div style="display:grid;gap:4px">
            <span>🎯 Service : <strong>${serviceLabels[service] || service}</strong></span>
            <span>👤 Coiffeur : <strong>${coiffeurLabels[coiffeur] || 'Pas de préférence'}</strong></span>
            <span>📅 Date : <strong>${dateFormatted}</strong></span>
            <span>🕐 Heure : <strong>${heure}</strong></span>
        </div>
    `;
    recap.classList.add('visible');
}

function showFormError(msg) {
    let err = document.querySelector('.form-error');
    if (!err) {
        err = document.createElement('div');
        err.className = 'form-error';
        err.style.cssText = 'background:#fee;border-left:3px solid #e74c3c;padding:12px 16px;margin-bottom:16px;font-size:0.85rem;color:#c0392b;';
    }
    err.textContent = msg;
    const activeStep = document.querySelector('.form-step.active');
    const existing = activeStep.querySelector('.form-error');
    if (existing) existing.remove();
    activeStep.insertBefore(err, activeStep.querySelector('.btn-next') || activeStep.querySelector('.form-btns'));
    setTimeout(() => err.remove(), 4000);
}

/* ---- FORM SUBMIT ---- */
document.getElementById('reservationForm')?.addEventListener('submit', function(e) {
    e.preventDefault();

    const prenom = this.querySelector('input[name="prenom"]').value.trim();
    const nom = this.querySelector('input[name="nom"]').value.trim();
    const email = this.querySelector('input[name="email"]').value.trim();
    const tel = this.querySelector('input[name="tel"]').value.trim();

    if (!prenom || !nom || !email || !tel) {
        showFormError('Veuillez remplir tous les champs obligatoires.');
        return;
    }

    if (!email.includes('@') || !email.includes('.')) {
        showFormError('Veuillez entrer une adresse email valide.');
        return;
    }

    // Build modal recap
    const service = document.querySelector('input[name="service"]:checked')?.value;
    const date = document.querySelector('input[name="date"]')?.value;
    const heure = document.querySelector('select[name="heure"]')?.value;
    const dateFormatted = date ? new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';

    document.getElementById('modalRecap').innerHTML = `
        <strong>${prenom} ${nom}</strong><br>
        ${serviceLabels[service] || service}<br>
        ${dateFormatted} à ${heure}<br>
        <small style="color:#888">${email} · ${tel}</small>
    `;

    // Show modal
    document.getElementById('modalOverlay').classList.add('active');

    // Reset form
    setTimeout(() => {
        this.reset();
        document.querySelectorAll('.form-step').forEach((s, i) => {
            s.classList.toggle('active', i === 0);
        });
        document.getElementById('recapBox').classList.remove('visible');
    }, 500);
});

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

// Close modal on overlay click
document.getElementById('modalOverlay')?.addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

// Close modal on Escape
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
});

/* ---- PARALLAX HERO ---- */
window.addEventListener('scroll', () => {
    const hero = document.querySelector('.hero');
    if (hero) {
        const scrolled = window.scrollY;
        hero.style.backgroundPositionY = `${50 + scrolled * 0.3}%`;
    }
});