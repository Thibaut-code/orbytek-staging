/* AUTOPRIME – CATALOGUE SUPABASE */
let allVoitures = [];
let activeCategory = 'all';
let stockPage = 0;
let stockCount = 0;
let stockLoading = false;
let stockRequest = 0;
const PAGE_SIZE = 12;

async function loadVoitures(append = false) {
    const request = ++stockRequest;
    const loading = document.getElementById('carsLoading');
    const error = document.getElementById('carsError');
    const grid = document.getElementById('carsGrid');
    const empty = document.getElementById('carsEmpty');
    const more = document.getElementById('stockMore');
    const next = document.getElementById('loadMoreCars');
    stockLoading = true;
    next.disabled = true;
    error.style.display = 'none';
    if (!append) {
        stockPage = 0;
        allVoitures = [];
        loading.style.display = 'block';
        grid.style.display = 'none';
        empty.style.display = 'none';
        more.style.display = 'none';
    }
    const page = append ? stockPage + 1 : 0;
    try {
        const db = VehicleData.getClient();
        let query = db.from('voitures').select('*', { count: 'exact' });
        const marque = document.getElementById('filterMarque').value;
        const carburant = document.getElementById('filterCarburant').value;
        const budget = document.getElementById('filterBudget').value;
        const annee = document.getElementById('filterAnnee').value;
        if (marque) query = query.eq('marque', marque);
        if (carburant) query = query.eq('carburant', carburant);
        if (budget) query = query.lte('prix', Number(budget));
        if (annee) query = query.gte('annee', Number(annee));
        if (activeCategory !== 'all') query = query.eq('categorie', activeCategory);
        const result = await query.order('created_at', { ascending: false }).order('id')
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (result.error) throw result.error;
        if (request !== stockRequest) return;
        stockCount = result.count;
        stockPage = page;
        allVoitures = append ? [...allVoitures, ...result.data] : result.data;
        renderVoitures(allVoitures);
    } catch (err) {
        if (request !== stockRequest) return;
        console.error('Erreur chargement du stock:', err);
        error.style.display = 'block';
        document.getElementById('stockErrorText').textContent = 'Le stock est temporairement indisponible. Réessayez dans un instant.';
    } finally {
        if (request === stockRequest) {
            loading.style.display = 'none';
            stockLoading = false;
            next.disabled = false;
        }
    }
}

/* ============================================
   RENDU DES CARTES VOITURES
   ============================================ */
function renderVoitures(voitures) {
    const grid = document.getElementById('carsGrid');
    const empty = document.getElementById('carsEmpty');
    const more = document.getElementById('stockMore');

    if (voitures.length === 0) {
        grid.style.display = 'none';
        empty.style.display = 'block';
        more.style.display = 'none';
        return;
    }

    grid.innerHTML = voitures.map(v => createCarCard(v)).join('');
    grid.style.display = 'grid';
    empty.style.display = 'none';
    more.style.display = 'block';
    document.getElementById('loadMoreCars').hidden = voitures.length >= stockCount;

    // Animer les cartes
    grid.querySelectorAll('.car-card').forEach((card, i) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `opacity 0.4s ease ${i * 60}ms, transform 0.4s ease ${i * 60}ms`;
        requestAnimationFrame(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        });
    });

    // Réattacher les événements favoris
    grid.querySelectorAll('.car-fav').forEach(fav => {
        fav.addEventListener('click', () => {
            fav.classList.toggle('liked');
            const icon = fav.querySelector('i');
            if (fav.classList.contains('liked')) {
                icon.classList.replace('far', 'fas');
                fav.style.color = '#EF4444';
            } else {
                icon.classList.replace('fas', 'far');
                fav.style.color = '';
            }
        });
    });
}

function createCarCard(v) {
    const esc = VehicleData.escapeHtml;
    v = { ...v, marque: esc(v.marque), modele: esc(v.modele), categorie: esc(v.categorie), badge: esc(v.badge), carburant: esc(v.carburant), boite: esc(v.boite) };
    const badgeColors = {
        'Nouveau': 'new', 'Promo': 'promo', 'Hybride': 'eco',
        'Électrique': 'eco', 'Vendu': 'promo'
    };
    const badgeClass = badgeColors[v.badge] || 'new';
    const badgeHtml = v.badge ? `<div class="car-badge ${badgeClass}">${v.badge}</div>` : '';
    const photoUrl = v.photos?.[0] ? esc(VehicleData.imageUrl(v.photos[0].thumb)) : 'placeholder.svg';
    const prix = Number(v.prix).toLocaleString('fr-FR') + ' €';
    const km = Number(v.km).toLocaleString('fr-FR') + ' km';
    const dispo = v.dispo !== false;

    return `
    <div class="car-card" data-cat="${v.categorie || ''}">
        <div class="car-img-wrap">
            <img width="600" height="400" src="${photoUrl}" alt="${v.marque} ${v.modele}" loading="lazy" onerror="this.onerror=null;this.src='placeholder.svg'">
            ${badgeHtml}
            <div class="car-fav"><i class="far fa-heart"></i></div>
            <div class="car-overlay"><button type="button" class="car-overlay-btn" data-gallery="${esc(v.id)}">Voir les photos (${v.photos?.length || 0})</button></div>
        </div>
        <div class="car-info">
            <div class="car-top">
                <div>
                    <p class="car-brand">${v.marque}</p>
                    <h3 class="car-name">${v.modele}</h3>
                </div>
                <div class="car-price">${prix}</div>
            </div>
            <div class="car-specs">
                <span><i class="fas fa-calendar-alt"></i> ${v.annee || '–'}</span>
                <span><i class="fas fa-tachometer-alt"></i> ${km}</span>
                <span><i class="fas fa-gas-pump"></i> ${v.carburant || '–'}</span>
                <span><i class="fas fa-cog"></i> ${v.boite || '–'}</span>
            </div>
            <div class="car-footer">
                <span class="car-dispo" style="${dispo ? '' : 'color:#EF4444'}">
                    <i class="fas fa-circle"></i> ${dispo ? 'Disponible' : 'Vendu'}
                </span>
                <a href="#contact" class="car-btn">Contacter</a>
            </div>
        </div>
    </div>`;
}

/* ============================================
   FILTRES
   ============================================ */
async function populateMarqueFilter() {
    try {
        const { data, error } = await VehicleData.getClient().rpc('vehicle_brands');
        if (error) throw error;
        const select = document.getElementById('filterMarque');
        for (const row of data) {
            const opt = document.createElement('option');
            opt.value = row.marque;
            opt.textContent = row.marque;
            select.appendChild(opt);
        }
    } catch (err) { console.error('Erreur chargement des marques:', err); }
}
function applyFilters() { loadVoitures(); }
function resetFilters() {
    for (const id of ['filterMarque', 'filterCarburant', 'filterBudget', 'filterAnnee']) {
        document.getElementById(id).value = '';
    }
    activeCategory = 'all';
    document.querySelectorAll('.sf-tag').forEach(b => b.classList.toggle('active', b.dataset.f === 'all'));
    loadVoitures();
}

/* ============================================
   INIT
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {

    // Charger les voitures
    loadVoitures();
    populateMarqueFilter();
    document.getElementById('loadMoreCars').addEventListener('click', () => {
        if (!stockLoading) loadVoitures(true);
    });
    document.getElementById('retryStock').addEventListener('click', () => loadVoitures());
    document.getElementById('carsGrid').addEventListener('click', e => {
        const button = e.target.closest('[data-gallery]');
        if (button) openGallery(button.dataset.gallery);
    });

    /* ---- NAV SCROLL ---- */
    const nav = document.getElementById('nav');
    const btt = document.getElementById('btt');
    window.addEventListener('scroll', () => {
        nav.classList.toggle('solid', window.scrollY > 60);
        btt.classList.toggle('show', window.scrollY > 500);
    });

    /* ---- BURGER ---- */
    const burger = document.getElementById('burger');
    const navMenu = document.getElementById('navMenu');
    burger.addEventListener('click', () => {
        navMenu.classList.toggle('open');
        burger.classList.toggle('active');
    });
    navMenu.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
            navMenu.classList.remove('open');
            burger.classList.remove('active');
        });
    });

    /* ---- HERO ZOOM ---- */
    setTimeout(() => {
        const heroBg = document.getElementById('heroBg');
        if (heroBg) heroBg.classList.add('zoomed');
    }, 100);

    /* ---- HERO COUNTERS ---- */
    const counters = document.querySelectorAll('.hn-val[data-target]');
    let countersStarted = false;
    function startCounters() {
        if (countersStarted) return;
        countersStarted = true;
        counters.forEach(el => {
            const target = parseInt(el.dataset.target);
            const suffix = el.closest('.hn-item')?.querySelector('.hn-label')?.textContent.includes('%') ? '%' : '+';
            let current = 0;
            const increment = target / (2000 / 16);
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    el.textContent = target.toLocaleString('fr-FR') + suffix;
                    clearInterval(timer);
                } else {
                    el.textContent = Math.floor(current).toLocaleString('fr-FR') + suffix;
                }
            }, 16);
        });
    }
    const heroObs = new IntersectionObserver(e => { if (e[0].isIntersecting) startCounters(); }, { threshold: 0.3 });
    const heroSection = document.querySelector('.hero');
    if (heroSection) heroObs.observe(heroSection);

    /* ---- CATEGORY FILTERS ---- */
    document.querySelectorAll('.sf-tag').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sf-tag').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = btn.dataset.f;
            applyFilters();
        });
    });

    /* ---- SEARCH BUTTON ---- */
    document.getElementById('searchBtn')?.addEventListener('click', () => {
        applyFilters();
        document.getElementById('stock')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    /* ---- RATING BARS ---- */
    const barsObs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.querySelectorAll('.asb-fill').forEach(fill => {
                    const w = fill.style.width;
                    fill.style.width = '0';
                    setTimeout(() => fill.style.width = w, 100);
                });
                barsObs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });
    const scoreBar = document.querySelector('.avis-score-bar');
    if (scoreBar) barsObs.observe(scoreBar);

    /* ---- SMOOTH SCROLL ---- */
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') { e.preventDefault(); return; }
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
            }
        });
    });

    /* ---- ÉTAT BUTTONS ---- */
    document.querySelectorAll('.etat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.etat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    /* ---- CONTACT TABS ---- */
    document.querySelectorAll('.cf-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.cf-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const vf = document.getElementById('vehiculeField');
            if (vf) {
                const type = tab.dataset.tab;
                vf.querySelector('input').placeholder =
                    type === 'achat' ? 'Ex: BMW Série 3, 2020, diesel...' :
                    type === 'vente' ? 'Ex: Peugeot 308, 2019, 65 000 km...' :
                    'Précisez votre demande...';
            }
        });
    });

    /* ---- PARALLAX ---- */
    window.addEventListener('scroll', () => {
        const hero = document.querySelector('.hero-bg');
        if (hero && window.scrollY < window.innerHeight) {
            hero.style.transform = `translateY(${window.scrollY * 0.3}px)`;
        }
    });

    /* ---- SCROLL REVEAL (sections) ---- */
    const revealObs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.querySelectorAll('.why-card, .avis-card, .rs-step, .ci-item').forEach((el, i) => {
                    setTimeout(() => {
                        el.style.opacity = '1';
                        el.style.transform = 'translateY(0)';
                    }, i * 80);
                });
                revealObs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08 });

    document.querySelectorAll('.pourquoi, .avis, .racheter, .contact').forEach(section => {
        section.querySelectorAll('.why-card, .avis-card, .rs-step, .ci-item').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        });
        revealObs.observe(section);
    });

    /* ---- CLOSE MOBILE NAV ON OUTSIDE CLICK ---- */
    document.addEventListener('click', e => {
        const navMenu = document.getElementById('navMenu');
        const burger = document.getElementById('burger');
        if (navMenu?.classList.contains('open') && !navMenu.contains(e.target) && !burger.contains(e.target)) {
            navMenu.classList.remove('open');
            burger.classList.remove('active');
        }
    });
});

/* ============================================
   FORMS
   ============================================ */
document.getElementById('estimForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = this.querySelector('.ef-submit');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';
    btn.disabled = true;
    setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Recevoir mon estimation gratuite';
        btn.disabled = false;
        showModal('Demande reçue !', 'Merci ! Notre équipe analysera votre véhicule et vous enverra une estimation sous 24h.');
        this.reset();
        document.querySelectorAll('.etat-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
    }, 1500);
});

document.getElementById('contactForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = this.querySelector('.cf-submit');
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...';
    btn.disabled = true;
    setTimeout(() => {
        btn.innerHTML = orig;
        btn.disabled = false;
        showModal('Message envoyé !', 'Merci pour votre message ! Notre équipe vous recontactera dans les plus brefs délais.');
        this.reset();
    }, 1200);
});

function showModal(title, text) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalText').textContent = text;
    document.getElementById('modalBg').classList.add('show');
}
function closeModal() { document.getElementById('modalBg').classList.remove('show'); }
document.getElementById('modalBg')?.addEventListener('click', function(e) { if (e.target === this) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });