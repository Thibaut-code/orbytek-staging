// Apparence de l'application, indépendante du métier et des modèles de documents.
const UI_THEMES = {
  bleu: { label: 'Bleu et blanc', font: 'Inter', layout: 'sidebar', icon: 'line', colors: ['#f5f8ff','#ffffff','#142449','#1260ff','#ffffff','#142449'] },
  violet: { label: 'Sombre et violet', font: 'Space Grotesk', layout: 'top', icon: 'line', colors: ['#10141d','#1a202c','#f1f3fa','#b18aff','#141923','#f1f3fa'] },
  corail: { label: 'Corail et prune', font: 'Nunito Sans', layout: 'rail', icon: 'solid', colors: ['#fff8fa','#ffffff','#321743','#e13747','#321743','#ffffff'] },
  citron: { label: 'Graphite et vert terminal', font: 'IBM Plex Mono', layout: 'minimal', icon: 'square', colors: ['#101814','#17221b','#d7f8df','#66ff88','#0b120e','#d7f8df'] },
  turquoise: { label: 'Bleu pétrole et turquoise', font: 'Source Sans 3', layout: 'top-left', icon: 'line', colors: ['#f1f7fa','#ffffff','#103a4e','#008ca5','#103a4e','#ffffff'] },
  peche: { label: 'Indigo et pêche', font: 'Nunito Sans', layout: 'bento', icon: 'solid', colors: ['#fcfaff','#ffffff','#26205c','#e87952','#ffffff','#26205c'] },
  orange: { label: 'Noir et orange', font: 'IBM Plex Sans', layout: 'compact', icon: 'square', colors: ['#101518','#192024','#f4f6f8','#ff8617','#0c1114','#f4f6f8'] },
  bordeaux: { label: 'Blanc et bordeaux', font: 'Source Sans 3', heading: 'Georgia', layout: 'top-right', icon: 'line', colors: ['#faf9fb','#ffffff','#26212a','#831a3c','#ffffff','#26212a'] },
  cyan: { label: 'Ardoise et cyan', font: 'Manrope', layout: 'analytics', icon: 'solid', colors: ['#f1f7fd','#ffffff','#192d4b','#007fcb','#192d4b','#ffffff'] },
  sable: { label: 'Sable et chocolat', font: 'DM Sans', layout: 'warm', icon: 'soft', colors: ['#f7f2eb','#fffdfa','#35271e','#986325','#35271e','#ffffff'] },
  classique: { label: 'Original · Vert et terracotta', font: 'DM Sans', heading: '"Fraunces", Georgia, serif', layout: 'classic', icon: 'line', colors: ['#fffdfa','#fffdfa','#123b2f','#bd5537','#12382d','#fffdfa'] },
  orbytek: { label: 'Orbytek · Horizon bleu', font: 'Inter', layout: 'orbit', icon: 'line', colors: ['#060f17','#0c1a25','#f2f7ff','#29bdf2','#050f18','#e6f1ff'] }
};
let uiChoice = 'orbytek';
let uiColumnReady = false;
function uiStorageKey() { return `facture-facile-interface:${account?.id || 'guest'}`; }
function localInterface() { try { return localStorage.getItem(uiStorageKey()); } catch { return null; } }
const ICON_PATHS = {
  peppol: '<path d="m12 3 8 5v8l-8 5-8-5V8zM4 8l16 8M20 8 4 16M12 3v18"/><circle cx="12" cy="3" r="2"/><circle cx="4" cy="16" r="2"/><circle cx="20" cy="16" r="2"/>',
  search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
  home: '<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z"/>',
  docs: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7"/>',
  clients: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 6"/>',
  recurring: '<path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5"/>',
  payments: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  dashboard: '<path d="M4 21V12h4v9M10 21V7h4v14M16 21V3h4v18"/>',
  settings: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="18" r="2"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>'
};
function uiIcon(name) { return `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] || ICON_PATHS.docs}</svg>`; }
function applyInterface(key) {
  uiChoice = Object.hasOwn(UI_THEMES, key) ? key : 'orbytek';
  const t = UI_THEMES[uiChoice], root = document.documentElement;
  root.dataset.interface = uiChoice; root.dataset.layout = t.layout; root.dataset.icons = t.icon;
  ['--ui-canvas','--ui-surface','--ui-ink','--ui-accent','--ui-nav','--ui-nav-ink'].forEach((name,i) => root.style.setProperty(name,t.colors[i]));
  root.style.setProperty('--ui-font', `"${t.font}", Arial, sans-serif`);
  root.style.setProperty('--ui-heading', t.heading || `"${t.font}", Arial, sans-serif`);
  root.style.setProperty('--ui-action-ink', ['citron','violet','orange','orbytek'].includes(uiChoice) ? '#151515' : '#ffffff');
  const marks={bleu:'<path d="M8 24 20 8l12 10-12 16z"/><path d="m22 14 18 12-14 16-10-10z" opacity=".6"/>',violet:'<path d="M8 5h30v10H19v9h15v9H19v10H8z"/>',corail:'<circle cx="14" cy="14" r="9"/><circle cx="34" cy="14" r="9"/><circle cx="14" cy="34" r="9"/><circle cx="34" cy="34" r="9" opacity=".6"/>',citron:'<path d="M18 4h13L14 26H2zM32 18h13L28 40H15z"/>',turquoise:'<path d="M2 23Q13 4 26 16T46 14Q36 35 23 25T2 23ZM2 35Q13 18 26 29T46 26Q36 47 23 37T2 35Z"/>',peche:'<path d="M5 36V18a15 15 0 0 1 30 0L19 36z"/><rect x="19" y="23" width="23" height="22" rx="6" opacity=".5"/>',orange:'<path d="M6 16 40 2v12L6 28zM6 33l25-11v12L6 45z"/>',bordeaux:'<path d="M4 5h39Q39 20 25 20H4zM4 25h26Q27 38 15 38H4zM4 39h11v8H4z"/>',cyan:'<path d="m24 2 20 11v23L24 47 4 36V13l10 6v11l10 6 10-6V19l-10-6-10 6-10-6z"/>',classique:'<path d="M4 22 24 4l20 18v22H4zM14 44V25h12v19M26 18h8v12h-8" fill="none" stroke="currentColor" stroke-width="2"/>',sable:'<path d="M6 43V17Q6 4 18 4h5v12h-5v27zM25 43V28q0-12 13-12h6v12h-7v15z"/>'};
  const mark=document.querySelector('.brand-symbol');if(mark)mark.innerHTML=`<svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">${marks[uiChoice === 'orbytek' ? 'classique' : uiChoice]}</svg>`;
  const fontLink = document.getElementById('interface-font');
  if (fontLink) fontLink.href = `https://fonts.googleapis.com/css2?family=${t.font.replaceAll(' ','+')}:wght@400;500;600;700&display=swap`;
  $('#themelabel').textContent = t.label;
  $('#brandtagline').textContent = uiChoice === 'orbytek' ? 'par ORBYTEK' : uiChoice === 'classique' ? 'Des factures qui coulent de source' : 'Votre facturation, simplement';
  $('#sidefoottrades').textContent = 'Clients · Documents · Paiements';
  document.querySelectorAll('[data-nav]').forEach(a => { const span = a.querySelector('.nav-icon'); if(span) span.innerHTML = uiIcon(a.dataset.nav); });
  document.querySelectorAll('.theme-option').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.theme === uiChoice)));
}
async function chooseTheme(key) {
  if (!account || !Object.hasOwn(UI_THEMES,key)) return;
  applyInterface(key);
  try { localStorage.setItem(uiStorageKey(),key); } catch { /* Session courante conservée. */ }
  $('#themedialog').close(); render();
  if (teamContext) {
    const {error}=await db.rpc('set_interface_preference',{interface_key:key});
    if(error) return showError(error);
    teamContext.ui_theme=key;
  } else if (uiColumnReady) {
    const owner = companyOwner();
    const {error} = await db.from('companies').update({ui_theme:key}).eq('user_id',owner);
    if(error) { showError(error); return; }
    company.ui_theme = key;
  }
  toast(`Apparence « ${UI_THEMES[key].label} » sélectionnée.`);
}
function interfaceOptions() {
  $('#themedialog .theme-options').innerHTML = Object.entries(UI_THEMES).map(([key,t],i) => `<button type="button" class="theme-option" data-theme="${key}" aria-pressed="${key === uiChoice}" onclick="chooseTheme('${key}')"><span class="theme-preview" style="--preview-bg:${t.colors[0]};--preview-nav:${t.colors[4]};--preview-accent:${t.colors[3]}"><i></i><b></b><em></em></span><strong>${i+1}. ${t.label}</strong><small>${['top','top-left','top-right'].includes(t.layout)?'Navigation horizontale':'Navigation latérale'} · ${t.font}</small></button>`).join('');
}
function professionSettings() {
  return `<fieldset class="profession-settings"><legend>Métier et prestations</legend><p class="muted">Votre métier détermine les prestations proposées. Il est indépendant de l’apparence.</p><label class="field">Mon métier<select id="profession-choice" onchange="chooseProfession(this.value)">${Object.entries(PROFESSIONS).map(([key,p]) => `<option value="${key}" ${themeChoice===key?'selected':''}>${esc(p.label)}</option>`).join('')}</select></label><button type="button" onclick="manageCatalog()">${uiIcon('settings')} Gérer mes prestations</button><button type="button" onclick="$('#themedialog').showModal()">Changer l’apparence</button></fieldset>`;
}
async function chooseProfession(key) {
  if(!account || !Object.hasOwn(PROFESSIONS,key)) return;
  const previous = themeChoice;
  if(themeColumnReady) {
    const {error} = await db.from('companies').update({theme:key}).eq('user_id',companyOwner());
    if(error) { $('#profession-choice').value=previous; showError(error); return; }
  }
  themeChoice=key; company.theme=key;
  try { localStorage.setItem(themeStorageKey(),key); } catch {}
  toast(`Métier « ${PROFESSIONS[key].label} » sélectionné.`);
}
function interfaceHome() {
  if (uiChoice === 'classique') return classicHome();
  if (uiChoice === 'orbytek') return orbytekHome();
  const invoices = docs.filter(d=>d.type==='facture'), unpaid=invoices.filter(d=>!d.paid), paid=invoices.filter(d=>d.paid), quotes=docs.filter(d=>d.type==='devis');
  const metric=(title,list,icon,route,cls)=>`<button class="ui-metric ${cls}" onclick="${route}">${uiIcon(icon)}<span>${title}<strong>${euro(list.reduce((sum,d)=>sum+totals(d).total,0))}</strong><small>${list.length} ${title==='Devis en attente'?'devis':'facture(s)'}</small></span></button>`;
  const actions=`<section class="ui-actions"><h2>Actions rapides</h2><button class="primary" onclick="start('facture')">${uiIcon('plus')} Nouvelle facture</button><button onclick="start('devis')">${uiIcon('docs')} Nouveau devis</button></section>`;
  const months=Array.from({length:6},(_,i)=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-5+i);return {key:d.toLocaleDateString('sv-SE').slice(0,7),label:d.toLocaleDateString('fr-BE',{month:'short'})};});
  const amounts=months.map(m=>invoices.filter(d=>d.date?.startsWith(m.key)).reduce((s,d)=>s+totals(d).net,0)), max=Math.max(1,...amounts);
  const points=amounts.map((amount,i)=>`${20+i*92},${145-amount/max*120}`).join(' ');
  const curve=`<div class="ui-curve"><svg viewBox="0 0 500 170" role="img" aria-label="Montants facturés hors TVA sur six mois"><path d="M20 25H480M20 85H480M20 145H480" stroke="currentColor" opacity=".1"/><polygon points="20,145 ${points} 480,145" fill="currentColor" opacity=".14"/><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="3"/>${amounts.map((a,i)=>`<circle cx="${20+i*92}" cy="${145-a/max*120}" r="4" fill="currentColor"><title>${months[i].label} : ${euro(a)}</title></circle>`).join('')}</svg><div>${months.map(m=>`<small>${m.label}</small>`).join('')}</div></div>`;
  const activity=`<section class="ui-activity"><div class="section-head"><h2>${uiChoice==='violet'?'Encaissements et activité':'Évolution du chiffre d’affaires'}</h2><a class="link" href="#dashboard">Rapports →</a></div>${uiChoice==='violet'?`<strong class="activity-amount">${euro(unpaid.reduce((s,d)=>s+totals(d).total,0))}</strong>`:''}<p class="muted">Montants facturés hors TVA · six derniers mois</p>${['violet','turquoise','sable'].includes(uiChoice)?curve:`<div class="ui-chart">${months.map((m,i)=>`<div><span>${euro(amounts[i])}</span><i style="height:${Math.max(2,amounts[i]/max*100)}px" aria-hidden="true"></i><small>${m.label}</small></div>`).join('')}</div>`}</section>`;
  const late=unpaid.filter(d=>d.due && d.due<today());
  const follow=uiChoice==='bleu'?`<section class="ui-follow"><h2>Derniers paiements</h2>${paid.slice(0,4).map(d=>`<a href="#view/${esc(d.id)}">${uiIcon('check')}<span>${esc(client(d).name)}<small>${esc(d.id)}</small><strong>${euro(totals(d).total)}</strong></span></a>`).join('')||'<p class="muted">Aucun paiement enregistré.</p>'}</section>`:`<section class="ui-follow"><h2>À suivre</h2><a href="#payments">${uiIcon('clock')}<span>Factures en retard<strong>${late.length} · ${euro(late.reduce((s,d)=>s+totals(d).total,0))}</strong></span></a><a href="#docs" onclick="event.preventDefault();openDocuments('devis')">${uiIcon('docs')}<span>Devis enregistrés<strong>${quotes.length}</strong></span></a><a href="#recurring">${uiIcon('recurring')}<span>Abonnements<strong>${invoices.filter(d=>d.recurrence).length}</strong></span></a></section>`;
  const title=uiChoice==='bleu'?'Vue d’ensemble':uiChoice==='corail'?'Votre activité en un coup d’œil':uiChoice==='citron'?'Bienvenue sur Facture Facile':uiChoice==='bordeaux'?'Accueil':`Bonjour${company.name?.trim()?' '+esc(company.name.trim()):''} !`;
  return `<div class="interface-home"><section class="ui-greeting"><div><p class="eyebrow">Votre espace de travail</p><h1>${title}</h1><p class="muted">Créez, suivez et gérez vos factures et devis.</p></div></section>${draft?'<div class="notice ui-draft">Un document est en cours. <a href="#wizard">Reprendre mon brouillon →</a></div>':''}${actions}<section class="ui-metrics">${metric('À encaisser',unpaid,'clock',"go('payments')",'unpaid')}${metric('Factures payées',paid,'check',"go('payments')",'paid')}${metric('Devis en attente',quotes,'docs',"openDocuments('devis')",'quotes')}</section>${activity}<section class="recent-panel ui-invoices" data-search-scope><div class="section-head"><h2>Dernières factures</h2><a class="link" href="#docs" onclick="event.preventDefault();openDocuments('facture')">Voir toutes les factures →</a></div>${searchField()}${homeTable(invoices.slice(0,8))}</section>${follow}</div>`;
}

function orbytekHome() {
  const invoices = docs.filter(d => d.type === 'facture');
  const unpaid = invoices.filter(d => !d.paid), paid = invoices.filter(d => d.paid);
  const quotes = docs.filter(d => d.type === 'devis');
  const name = teamContext?.display_name || account?.user_metadata?.full_name || company.name?.trim();
  const metric = (title, list, icon, route, count) => `<button class="orbit-metric" onclick="${route}">${uiIcon(icon)}<span><span>${title}</span><strong>${euro(list.reduce((sum, d) => sum + totals(d).total, 0))}</strong><small>${list.length} ${count}</small></span><span class="orbit-chevron" aria-hidden="true">›</span></button>`;
  return `<div class="orbit-home">
    <section class="orbit-hero"><h1>Bonjour${name ? ' ' + esc(name) : ''},</h1><p>Prêt pour une nouvelle journée ?</p><span class="orbit-rule" aria-hidden="true"></span>
      <div class="orbit-actions"><button class="primary" onclick="start('facture')">${uiIcon('docs')} Créer une facture <span aria-hidden="true">→</span></button><button onclick="start('devis')">${uiIcon('docs')} Créer un devis <span aria-hidden="true">→</span></button></div>
    </section>
    ${draft ? '<div class="notice">Un document est en cours. <a class="link" href="#wizard">Reprendre mon brouillon →</a></div>' : ''}
    <section class="orbit-metrics" aria-label="Suivi de vos documents">
      ${metric('À encaisser', unpaid, 'docs', "go('payments')", 'facture(s) en attente')}
      ${metric('Factures payées', paid, 'check', "go('payments')", 'facture(s) encaissée(s)')}
      ${metric('Devis en attente', quotes, 'docs', "openDocuments('devis')", 'devis en attente')}
    </section>
    <section class="orbit-invoices" data-search-scope><div class="section-head"><h2>Dernières factures</h2><a class="link" href="#docs" onclick="event.preventDefault();openDocuments('facture')">Voir toutes les factures →</a></div>
      ${invoices.length ? searchField() + homeTable(invoices.slice(0, 8)) : `<div class="orbit-empty">${uiIcon('docs')}<p>Aucune facture pour le moment.</p></div>`}
    </section>
    <p class="orbit-note">${uiIcon('clock')}<span>Vos documents sont enregistrés dans votre compte. Vérifiez les mentions et les taux de TVA avant une utilisation professionnelle.</span></p>
  </div>`;
}

function classicHome() {
  const unpaid = docs.filter((d) => d.type === "facture" && !d.paid);
  const paid = docs.filter((d) => d.type === "facture" && d.paid);
  const quotes = docs.filter((d) => d.type === "devis");
  const name = company.name?.trim();
  return `
        <section class="home-hero">
            <div class="hero-copy">
                <h1>Bonjour${name ? " " + esc(name) : ""},</h1>
                <p>Prêt pour une nouvelle journée ?</p>
                <span class="hero-underline" aria-hidden="true"></span>
            </div>
            <div class="hero-art" aria-hidden="true">
                <img src="radiateur.png" alt="">
            </div>
        </section>
        <div class="actions">
            <button class="action-card main" onclick="start('facture')"><span class="action-icon" aria-hidden="true">▤</span>
                <span><strong>Créer une facture</strong></span><span class="arrow" aria-hidden="true">→</span></button>
            <button class="action-card" onclick="start('devis')"><span class="action-icon" aria-hidden="true">▤</span>
                <span><strong>Créer un devis</strong></span><span class="arrow" aria-hidden="true">→</span></button>
        </div>
        ${draft ? '<div class="notice">Vous avez un document en cours. <button class="link" onclick="go(\'wizard\')">Reprendre mon brouillon</button></div>' : ""}
        <div class="stats">
            <button class="stat stat-unpaid" onclick="go('payments')">
                <span class="stat-icon" aria-hidden="true">▢</span>
                <span class="stat-content"><span>À encaisser</span><strong>${euro(unpaid.reduce((sum, d) => sum + totals(d).total, 0))}</strong><small>${unpaid.length} facture(s) en attente</small></span>
                <span class="stat-arrow" aria-hidden="true">›</span>
            </button>
            <button class="stat stat-paid" onclick="go('payments')">
                <span class="stat-icon" aria-hidden="true">✓</span>
                <span class="stat-content"><span>Factures payées</span><strong>${euro(paid.reduce((sum, d) => sum + totals(d).total, 0))}</strong><small>${paid.length} facture(s) encaissée(s)</small></span>
                <span class="stat-arrow" aria-hidden="true">›</span>
            </button>
            <button class="stat stat-quotes" onclick="openDocuments('devis')">
                <span class="stat-icon" aria-hidden="true">▤</span>
                <span class="stat-content"><span>Devis en attente</span><strong>${euro(quotes.reduce((sum, d) => sum + totals(d).total, 0))}</strong><small>${quotes.length} devis en attente</small></span>
                <span class="stat-arrow" aria-hidden="true">›</span>
            </button>
        </div>
        <section class="recent-panel">
            <div class="section-head"><h2>Dernières factures</h2><a class="link" href="#docs" onclick="event.preventDefault();openDocuments('facture')">Voir toutes les factures →</a></div>
            ${homeTable(docs.filter((d) => d.type === "facture").slice(0, 5))}
        </section>
        <div class="bottom-note"><b>ⓘ</b><span>Vos documents sont enregistrés dans votre compte. Vérifiez les mentions et les taux de TVA avant une utilisation professionnelle.</span></div>`;
}
