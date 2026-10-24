const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    ),
  euro = (n) =>
    new Intl.NumberFormat("fr-BE", {
      style: "currency",
      currency: "EUR",
    }).format(n),
  today = () => new Date().toLocaleDateString("sv-SE"),
  fmt = (d) => new Date(d + "T12:00:00").toLocaleDateString("fr-BE");
let clients = [];
let company = { name: "", address: "", vat: "", iban: "", email: "" };
const PROFESSIONS = {
  plombier: {
    label: "Plomberie & chauffage",



    catalog: [
      ["Entretien de chaudière", 1, 145],
      ["Main-d’œuvre (heure)", 1, 55],
      ["Déplacement", 1, 35],
      ["Réparation de fuite", 1, 85],
      ["Robinet mitigeur", 1, 95],
    ],
  },
  jardinier: {
    label: "Jardinage",



    catalog: [
      ["Entretien de jardin", 1, 120],
      ["Taille de haies", 1, 95],
      ["Élagage", 1, 180],
      ["Déplacement", 1, 35],
      ["Main-d’œuvre (heure)", 1, 55],
    ],
  },
  electricien: {
    label: "Électricité",



    catalog: [
      ["Dépannage électrique", 1, 95],
      ["Installation de prise", 1, 75],
      ["Pose de luminaire", 1, 85],
      ["Déplacement", 1, 35],
      ["Main-d’œuvre (heure)", 1, 55],
    ],
  },
  peintre: {
    label: "Peinture",



    catalog: [
      ["Préparation des surfaces", 1, 120],
      ["Peinture intérieure (m²)", 1, 25],
      ["Peinture extérieure (m²)", 1, 35],
      ["Déplacement", 1, 35],
      ["Main-d’œuvre (heure)", 1, 55],
    ],
  },
  menuisier: {
    label: "Menuiserie",



    catalog: [
      ["Fabrication sur mesure", 1, 350],
      ["Pose de menuiserie", 1, 180],
      ["Réparation de porte", 1, 95],
      ["Déplacement", 1, 35],
      ["Main-d’œuvre (heure)", 1, 55],
    ],
  },
};
Object.assign(PROFESSIONS, {
  it: {label:"Spécialiste IT", catalog:[["Support IT (heure)",1,75],["Création de site web",1,590],["Maintenance mensuelle",1,50],["Intégration API",1,250]]},
  nettoyage: {label:"Nettoyage", catalog:[["Nettoyage (heure)",1,35],["Nettoyage de vitres",1,65]]},
  mecanicien: {label:"Mécanique automobile", catalog:[["Diagnostic automobile",1,65],["Main-d’œuvre (heure)",1,65]]},
  photographe: {label:"Photographie", catalog:[["Séance photo",1,150],["Retouche photo (heure)",1,60]]},
  consultant: {label:"Conseil & formation", catalog:[["Conseil (jour)",1,800],["Formation (heure)",1,100]]}
});
let themeChoice = "plombier";
let themeColumnReady = false;
const catalogForTheme = () =>
  company.catalogs?.[themeChoice] ?? PROFESSIONS[themeChoice].catalog;

function themeStorageKey() {
  return `facture-facile-theme:${account.id}`;
}
function localTheme() {
  try {
    return window.localStorage.getItem(themeStorageKey());
  } catch {
    return null;
  }
}
function applyTheme(key) {
  themeChoice = Object.hasOwn(PROFESSIONS, key) ? key : "plombier";
  uiColumnReady = Object.hasOwn(company, 'ui_theme');
  applyInterface(teamContext?.ui_theme || localInterface() || company.ui_theme || 'orbytek');
}

let docs = [];
let account = null;
let db = null;
let busy = false;
let authMode = "login";
const authRedirectParams = new URLSearchParams(location.hash.slice(1));
const recoveryRequested = authRedirectParams.get("type") === "recovery" ||
  new URLSearchParams(location.search).get("reset") === "1";
const recoveryLinkError = authRedirectParams.has("error") ||
  new URLSearchParams(location.search).has("error");
if (recoveryRequested || recoveryLinkError) authMode = "reset";
let sessionGeneration = 0;
let dataState = "idle";
let dataLoad = null;
let draft = null,
  step = 1,
  filter = "all",
  returnToWizard = false;
const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
function totals(d) {
  let net = 0,
    tax = 0;
  d.lines.forEach((l) => {
    const v = round(l.qty * l.price);
    net += v;
    tax += round((v * l.tax) / 100);
  });
  return { net: round(net), tax: round(tax), total: round(net + tax) };
}
const client = (d) =>
  d.customer ||
  clients.find((c) => c.id === d.client) || { name: "Client", address: "" };
function toast(t) {
  $("#toast").textContent = t;
  $("#toast").style.display = "block";
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(
    () => ($("#toast").style.display = "none"),
    4200,
  );
}
function go(r) {
  if (location.hash === "#" + r) render();
  else location.hash = r;
}
function intro(title, sub, action = "") {
  return `<div class="intro"><div><div class="eyebrow">Votre atelier, bien organisé</div><h1>${title}</h1><p>${sub}</p></div>${action}</div>`;
}
function rows(list) {
  if (!list.length)
    return '<div class="empty">Aucun document ici pour le moment.</div>';
  return list
    .map(
      (d) => `
        <div class="doc-row" data-search-key="${esc(client(d).name + ' ' + d.id)}">
            <div class="doc-identity">
                <span class="doc-type-icon" aria-hidden="true">${d.type === "devis" ? "▤" : "▧"}</span>
                <div><strong>${esc(client(d).name)}</strong>
                <small>${esc(d.id)} · ${fmt(d.date)}</small>
                <small>${esc(d.job)}</small></div>
            </div>
            <div class="doc-status"><span class="badge ${d.type === "devis" ? "quote" : d.paid ? "paid" : "pending"}">${d.paid ? "Payée" : d.sentAt ? "Envoyé" : "Enregistré"}</span></div>
            <div class="amount">${euro(totals(d).total)}</div>
            <button class="row-open" onclick="go('view/${d.id}')" aria-label="Voir ${esc(d.id)}">Voir <span aria-hidden="true">↗</span></button>
        </div>`,
    )
    .join("");
}

function homeTable(list) {
  if (!list.length)
    return '<div class="empty">Aucune facture pour le moment.</div>';
  return `<div class="home-table-scroll"><table class="home-table">
        <thead><tr><th>N°</th><th>Date</th><th>Client</th><th>Description</th><th>Montant</th><th>Statut</th><th><span class="sr-only">Ouvrir</span></th></tr></thead>
        <tbody>${list
          .map(
            (d) => `<tr data-search-key="${esc(client(d).name + ' ' + d.id)}">
            <td>${esc(d.id)}</td><td>${fmt(d.date)}</td><td>${esc(client(d).name)}</td>
            <td>${esc(d.job)}</td><td>${euro(totals(d).total)}</td>
            <td><span class="badge ${d.type === "devis" ? "quote" : d.paid ? "paid" : "pending"}">${d.type === "devis" ? "Devis" : d.paid ? "Payée" : "En attente"}</span></td>
            <td><button class="table-open" onclick="go('view/${d.id}')" aria-label="Voir ${esc(d.id)}">•••</button></td>
        </tr>`,
          )
          .join("")}</tbody>
    </table></div>`;
}

function originalHome() { return interfaceHome(); }

function start(type) {
  if (draft) {
    return resolveCurrentDraft(() => start(type), type === 'devis' ? 'un nouveau devis' : 'une nouvelle facture');
  }
  draft = {
    appearance: structuredClone(company.appearance || DEFAULT_APPEARANCE),
    type,
    client: null,
    date: today(),
    due: addCalendarDays(today(), type === "devis" ? 14 : 21),
    job: "",
    lines: [],
  };
  step = 1;
  go("wizard");
}
function resolveCurrentDraft(proceed, destination) {
  document.getElementById('draft-dialog')?.remove();
  const invoice = draft.type === 'facture';
  const dialog = document.createElement('dialog');
  dialog.id = 'draft-dialog';
  dialog.setAttribute('aria-labelledby', 'draft-dialog-title');
  dialog.innerHTML = `<h2 id="draft-dialog-title">${invoice ? 'Une facture est en cours' : 'Un devis est en cours'}</h2><p>Vous avez un brouillon non enregistré. Voulez-vous le continuer ou l’abandonner pour aller vers ${destination} ?</p><div class="filter-row"><button type="button" class="primary" data-continue>Continuer ${invoice ? 'la facture' : 'le devis'}</button><button type="button" data-discard>Abandonner et poursuivre</button><button type="button" data-cancel>Annuler</button></div>`;
  dialog.querySelector('[data-continue]').onclick = () => { dialog.close(); go('wizard'); };
  dialog.querySelector('[data-discard]').onclick = () => {
    dialog.close(); draft = null; step = 1; returnToWizard = false; proceed();
  };
  dialog.querySelector('[data-cancel]').onclick = () => dialog.close();
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}
function openDocuments(type) {
  const proceed = () => { filter = type; go('docs'); };
  if (draft && type !== 'all' && draft.type !== type) resolveCurrentDraft(proceed, type === 'devis' ? 'les devis' : 'les factures');
  else proceed();
}
function wizard() {
  if (!draft) return home();
  return `${intro(draft.type === "devis" ? "Préparer mon devis" : "Créer ma facture", "Prenons les choses dans l’ordre.")}<div class="steps">${["Le client", "Les travaux", "Vérifier"].map((s, i) => `<div class="step ${step === i + 1 ? "active" : ""}" ${step === i + 1 ? 'aria-current="step"' : ""}><b>${i + 1}</b>${s}</div>`).join("")}</div><div class="panel">${
    step === 1
      ? `<h2>Pour quel client ?</h2>${searchField('Rechercher un client par nom ou référence')}<div class="client-grid">${clients.map((c) => `<button data-search-key="${esc(c.name + ' ' + c.id)}" class="client-card ${draft.client === c.id ? "selected" : ""}" aria-pressed="${draft.client === c.id}" onclick="draft.client='${c.id}';delete draft.customer;render()"><strong>${esc(c.name)}</strong><small>${esc(c.address).replace(/\n/g, "<br>")}</small></button>`).join("")}</div><button class="link" style="margin-top:20px" onclick="returnToWizard=true;go('newclient')">+ Ajouter un nouveau client</button><div class="form-footer"><a href="#home" class="link">Retour à l’accueil</a><button class="primary" onclick="next()">Continuer vers les travaux →</button></div>`
      : step === 2
        ? `<h2>Quels travaux avez-vous réalisés ?</h2><label class="field">Nom du chantier ou des travaux<input id="job" value="${esc(draft.job)}" placeholder="Ex. Entretien de chaudière" oninput="draft.job=this.value"></label><label class="field">Adresse du chantier (si différente)<input value="${esc(draft.site || "")}" placeholder="Facultatif" oninput="draft.site=this.value"></label><p class="muted">Ajoutez une prestation, puis adaptez la quantité et le prix.</p><div class="catalog">${catalogForTheme()
            .map(
              (c, i) =>
                `<button onclick="addLine(${i})">+ ${esc(c[0])}</button>`,
            )
            .join(
              "",
            )}<button onclick="addLine(-1)">+ Autre prestation</button><button onclick="manageCatalog()">⚙ Gérer mes prestations</button></div>${draft.lines.map((l, i) => `<div class="line-item"><label>Prestation<input aria-label="Prestation ${i + 1}" value="${esc(l.name)}" oninput="updateLine(${i},'name',this.value)"></label><label>Quantité<input aria-label="Quantité ${i + 1}" type="number" min="0.01" step="0.01" value="${l.qty}" oninput="updateLine(${i},'qty',this.value)"></label><label>Prix HTVA (€)<input aria-label="Prix ${i + 1}" type="number" min="0" step="0.01" value="${l.price}" oninput="updateLine(${i},'price',this.value)"></label><label>TVA<select aria-label="TVA ${i + 1}" onchange="updateLine(${i},'tax',this.value)">${[0, 6, 12, 21].map((t) => `<option ${t === l.tax ? "selected" : ""} value="${t}">${t} %</option>`).join("")}</select></label><button aria-label="Retirer la prestation ${i + 1}" onclick="draft.lines.splice(${i},1);render()">Retirer</button></div>`).join("") || '<div class="empty">Choisissez une prestation ci-dessus pour commencer.</div>'}<div id="totals">${totalBlock(draft)}</div><div class="notice">Les taux proposés sont indicatifs. Le taux applicable et les mentions nécessaires doivent être validés avant toute utilisation réelle.</div><div class="form-grid"><label class="field">Date du document<input type="date" value="${draft.date}" onchange="changeDraftDate(this.value)"></label><label class="field">${draft.type === "devis" ? "Devis valable jusqu’au" : "À payer pour le"}<input type="date" value="${draft.due}" onchange="draft.due=this.value;draft.dueManual=true"></label></div>${draft.type === "facture" ? recurrenceFields(draft.recurrence) : ""}<div class="form-footer"><button onclick="step=1;render()">← Le client</button><div class="verify-action"><button class="primary" aria-describedby="verify-error" onclick="next()">Vérifier mon document →</button><p id="verify-error" class="error" role="alert" tabindex="-1"></p></div></div>`
        : `<button type="button" onclick="customizeDocument()">Personnaliser le modèle</button><h2>Tout est correct ?</h2><p>Relisez votre document avant de l’enregistrer.</p><div class="review-actions"><button type="button" onclick="step=2;render();window.scrollTo(0,0)">✎ Modifier ${draft.type === "devis" ? "le devis" : "la facture"}</button><button type="button" onclick="step=1;render();window.scrollTo(0,0)">Changer de client</button></div>${documentHTML({ ...draft, id: draft.id || "Numéro attribué à l’enregistrement" })}<div class="form-footer"><button onclick="step=2;render()">← Modifier les travaux</button><button class="primary" onclick="saveDraft()">Enregistrer ${draft.type === "devis" ? "mon devis" : "ma facture"}</button></div>`
  }<p id="error" class="error" role="alert"></p></div><button class="link muted" style="margin-top:20px" onclick="if(confirm('Abandonner ce brouillon et revenir à l’accueil ?')){draft=null;go('home')}">Abandonner ce brouillon</button>`;
}
function totalBlock(d) {
  const t = totals(d);
  const rates = [...new Set(d.lines.map(l => l.tax))].sort((a,b)=>a-b);
  return `<div class="total"><div><span>Total HTVA</span><span>${euro(t.net)}</span></div>${rates.map(rate => `<div><span>TVA ${rate} %</span><span>${euro(round(d.lines.filter(l=>l.tax===rate).reduce((sum,l)=>sum+round(round(l.qty*l.price)*l.tax/100),0)))}</span></div>`).join('')}<div class="grand"><span>Total à payer</span><span>${euro(t.total)}</span></div></div>`;
}
function addLine(i) {
  const c = i < 0 ? ["", 1, 0] : catalogForTheme()[i];
  draft.lines.push({ name: c[0], qty: c[1], price: c[2], tax: 21 });
  render();
}
function updateLine(i, k, v) {
  draft.lines[i][k] = k === "name" ? v : v === "" ? NaN : Number(v);
  $("#totals").innerHTML = totalBlock(draft);
}
function next() {
  let msg = "";
  if (step === 1 && !draft.client) msg = "Choisissez un client pour continuer.";
  if (step === 2) {
    if (!draft.job.trim()) msg = "Indiquez le nom des travaux.";
    else if (
      !draft.lines.length ||
      draft.lines.some(
        (l) =>
          !l.name.trim() ||
          !Number.isFinite(l.qty) ||
          l.qty <= 0 ||
          !Number.isFinite(l.price) ||
          l.price < 0 || ![0,6,12,21].includes(l.tax),
      )
    )
      msg =
        "Ajoutez au moins une prestation avec un nom, une quantité positive et un prix valide.";
    else if (draft.recurrence && !validDate(draft.recurrence.next))
      msg = "Choisissez la prochaine date de facturation.";
    else if (!validDate(draft.date) || !validDate(draft.due) || draft.due < draft.date)
      msg =
        "Choisissez des dates valides : la date limite doit être égale ou postérieure à la date du document.";
  }
  if (msg) {
    const target = $("#verify-error") || $("#error");
    target.textContent = msg;
    target.focus({preventScroll:true});
    target.scrollIntoView({block:"nearest", behavior:"smooth"});
    return;
  }
  step++;
  render();
  window.scrollTo(0, 0);
}
function newId(type) {
  const p = type === "devis" ? "D" : "F",
    year = new Date().getFullYear();
  let n = 1;
  while (
    docs.some((d) => d.id === `${p}-${year}-${String(n).padStart(3, "0")}`)
  )
    n++;
  return `${p}-${year}-${String(n).padStart(3, "0")}`;
}
async function saveDraft() {
  if (!draft || busy) return;
  if (!company.name.trim() || !company.address.trim()) {
    toast("Complétez les coordonnées de votre entreprise avant d’enregistrer.");
    return;
  }
  busy = true;
  try {
    const editing = Boolean(draft.dbId);
    const d = await persistDocument({
      ...structuredClone(draft),
      id: draft.id || newId(draft.type),
      paid: false,
      issuer: structuredClone(draft.issuer || company),
      customer: publicCustomer(client(draft)),
    });
    if (editing) docs = docs.filter(item => item.dbId !== d.dbId);
    docs.unshift(d);
    draft = null;
    go("view/" + d.id);
    toast("Document enregistré.");
    if (d.type === "facture") askSend(d.id);
  } catch (error) {
    showError(error);
  } finally {
    busy = false;
  }
}
function baseDocumentHTML(d) {
  const c = d.customer || client(d),
    biz = documentBusiness(d);
  return `<article class="document">${documentHeader(d)}${d.job ? `<h3 class="invoice-job">Objet : ${esc(d.job)}</h3>` : ""}${d.site ? `<p>Chantier : ${esc(d.site)}</p>` : ""}<table><thead><tr><th>Prestation</th><th>Qté</th><th>Prix HTVA</th><th>TVA</th><th>Total HTVA</th></tr></thead><tbody>${d.lines.map((l) => `<tr><td>${esc(l.name)}</td><td>${l.qty}</td><td>${euro(l.price)}</td><td>${l.tax} %</td><td>${euro(round(l.qty * l.price))}</td></tr>`).join("")}</tbody></table>${totalBlock(d)}<p style="margin-top:25px">Compte bancaire : ${esc(biz.iban)}<br>Communication : ${esc(d.id)}</p>${paymentQR(d, biz)}<div class="demo-stamp">DOCUMENT À VÉRIFIER AVANT UTILISATION</div><p class="muted document-legal" style="font-size:.8rem;margin-top:15px">Mentions légales et traitement TVA à valider avant utilisation professionnelle. Vérifiez les mentions applicables à votre activité.</p></article>`;
}
function view(id) {
  const d = docs.find((d) => d.id === id);
  if (!d)
    return intro(
      "Document introuvable",
      "Retrouvez vos documents depuis le menu.",
    );
  return `<div class="no-print">${intro(d.type === "devis" ? "Votre devis" : "Votre facture", `${esc(client(d).name)} · ${esc(d.id)}`)}<div class="filter-row"><button onclick="go('docs')">← Mes documents</button><button class="primary" onclick="window.print()">Imprimer / PDF</button>${d.type === "devis" ? `<button onclick="convert('${d.id}')">Transformer en facture</button>` : `<button onclick="togglePaid('${d.id}')">${d.paid ? "Annuler le paiement" : "Marquer comme payée"}</button>`}</div><p class="muted">Pour télécharger un PDF, choisissez « Enregistrer au format PDF » dans la fenêtre d’impression.</p></div>${documentActions(d)}${invoiceExtras(d)}${documentHTML(d)}`;
}
async function convert(id) {
  const d = docs.find((d) => d.id === id);
  if (!d || busy) return;
  if (d.converted) {
    go("view/" + d.converted);
    return;
  }
  busy = true;
  try {
    const n = await persistDocument(
      {
        ...structuredClone(d),
        id: newId("facture"),
        dbId: null, sentAt: null, peppol: null,
        type: "facture",
        paid: false,
        date: today(),
        due: addCalendarDays(today(), 21),
      },
      d.dbId,
    );
    n.convertedFrom = d.dbId;
    d.converted = n.id;
    docs.unshift(n);
    go("view/" + n.id);
    toast("Devis transformé en facture.");
  } catch (error) {
    showError(error);
    await loadData().catch(showError);
  } finally {
    busy = false;
  }
}
async function togglePaid(id) {
  const d = docs.find((d) => d.id === id);
  if (!d || busy) return;
  busy = true;
  try {
    const paid = !d.paid;
    const paidAt = paid ? prompt("Date réelle du paiement (AAAA-MM-JJ)", today()) : null;
    if (paid && paidAt === null) return;
    if (paid && (!validDate(paidAt) || paidAt > today() || paidAt < d.date)) {
      toast("Indiquez une date valide, entre la date de facture et aujourd’hui.");
      return;
    }
    const { error } = await db
      .from("documents")
      .update({ paid, paid_at: paidAt })
      .eq("id", d.dbId)
      .eq("user_id", companyOwner());
    if (error) throw error;
    d.paid = paid;
    d.paidAt = paidAt;
    render();
    toast(paid ? "Paiement noté." : "Paiement annulé.");
  } catch (error) {
    if (["42703", "PGRST204"].includes(error.code)) toast("Exécutez dashboard.sql dans Supabase avant d’enregistrer le paiement.");
    else showError(error);
  } finally {
    busy = false;
  }
}
function clientsView() {
  return `${intro("Mes clients", "Retrouvez leurs coordonnées en un coup d’œil.", '<button class="primary" onclick="returnToWizard=false;go(\'newclient\')">+ Ajouter un client</button>')}${searchField('Rechercher un client par nom ou référence')}<div class="client-grid">${clients.map((c) => `<div class="panel" data-search-key="${esc(c.name + ' ' + c.id)}"><h2>${esc(c.name)}</h2><p class="muted">${esc(c.address).replace(/\n/g, "<br>")}<br>${esc(c.email)}</p>${c.note ? `<p class="client-note"><strong>Note interne</strong><br>${esc(c.note)}</p>` : ""}<div class="client-actions"><button onclick="startForClient('${c.id}')">Créer une facture</button><button onclick="go('editclient/${c.id}')">Modifier</button></div></div>`).join("")}</div>`;
}
function startForClient(id) {
  if (draft) {
    return resolveCurrentDraft(() => startForClient(id), 'une nouvelle facture pour ce client');
  }
  start("facture");
  draft.client = id;
  step = 2;
  render();
}
function newClient() {
  return `${intro("Ajouter un client", "Les informations utiles, tout simplement.")}<form class="panel" id="clientform"><label class="field">Nom du client<input name="name" autocomplete="name" required></label><label class="field">Adresse complète<textarea name="address" autocomplete="street-address" required></textarea></label><label class="field">Adresse e-mail (facultatif)<input name="email" type="email" autocomplete="email"></label>${clientExtraFields({})}<div class="form-footer"><button type="button" onclick="go(returnToWizard?'wizard':'clients')">← Retour</button><button class="primary" type="submit">Enregistrer le client</button></div></form>`;
}
function editClient(id) {
  const c = clients.find((item) => item.id === id);
  if (!c)
    return intro("Client introuvable", "Retrouvez vos clients depuis le menu.");
  return `${intro("Modifier le client", "Corrigez ses coordonnées pour vos prochains documents.")}
        <form class="panel" id="editclientform" data-client-id="${c.id}">
            <label class="field">Nom du client<input name="name" autocomplete="name" required value="${esc(c.name)}"></label>
            <label class="field">Adresse complète<textarea name="address" autocomplete="street-address" required>${esc(c.address)}</textarea></label>
            <label class="field">Adresse e-mail (facultatif)<input name="email" type="email" autocomplete="email" value="${esc(c.email)}"></label>
            ${clientExtraFields(c)}<div class="notice">Les documents déjà enregistrés conservent les coordonnées du client au moment de leur création.</div>
            <div class="form-footer"><button type="button" onclick="go('clients')">← Retour</button>
                <button class="primary" type="submit">Enregistrer les modifications</button></div>
        </form>`;
}
function originalCompanyView() {
  return `${intro("Mon entreprise", "Ces coordonnées apparaissent sur vos nouveaux documents.")}<form id="companyform" class="panel"><label class="field">Nom de l’entreprise<input name="name" required value="${esc(company.name)}"></label>${companyAddressFields()}<div class="form-grid"><label class="field">Numéro de TVA<input name="vat" value="${esc(company.vat)}"></label><label class="field">Compte bancaire IBAN<input name="iban" value="${esc(company.iban)}"></label></div><label class="field">Adresse e-mail<input name="email" type="email" value="${esc(company.email)}"></label><div class="notice">Les coordonnées sont enregistrées dans votre compte et copiées sur chaque nouveau document.</div><button class="primary">Enregistrer mes coordonnées</button></form>`;
}
function originalRender() {
  if (!account) {
    $("#main").innerHTML = authHTML();
    $("#logout").hidden = true;
    $("#themebutton").hidden = true;
    return;
  }
  $("#logout").hidden = false;
  $("#themebutton").hidden = false;
  $("#headerdate").textContent = new Date().toLocaleDateString("fr-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  updateAccountIdentity();
  const route = location.hash.slice(1) || "home";
  document
    .querySelectorAll("[data-nav]")
    .forEach((a) =>
      a.classList.toggle(
        "active",
        a.dataset.nav === route &&
          (!a.dataset.filter || a.dataset.filter === filter),
      ),
    );
  if (dataState !== "ready") {
    $("#main").innerHTML = `<section class="panel" role="status" aria-live="polite"><h2>${dataState === "error" ? "Vos données n’ont pas pu être chargées." : "Chargement de votre espace…"}</h2><p>${dataState === "error" ? "Vérifiez votre connexion et réessayez." : "Nous récupérons vos factures et leurs montants."}</p>${dataState === "error" ? '<button class="primary" onclick="loadData().catch(showError)">Réessayer</button>' : ''}</section>`;
    return;
  }
  let html;
  if (route === "wizard") html = wizard();
  else if (route.startsWith("join/") && /^[a-f0-9]{64}$/.test(route.slice(5))) html = invitationView(route.slice(5));
  else if (route === "clients") html = clientsView();
  else if (route === "newclient") html = newClient();
  else if (route.startsWith("editclient/")) html = editClient(route.slice(11));
  else if (route === "company") html = companyView();
  else if (route === "peppol" && typeof peppolView === 'function') html = peppolView();
  else if (route.startsWith("view/")) html = view(route.slice(5));
  else if (route === "docs")
    html = `${intro(filter === "facture" ? "Mes factures" : filter === "devis" ? "Mes devis" : "Devis et factures", "Tous vos documents, au même endroit.", `<div class="filter-row">${filter !== "devis" ? `<button class="primary" onclick="start('facture')">+ Ajouter une facture</button>` : ""}${filter !== "facture" ? `<button class="primary" onclick="start('devis')">+ Ajouter un devis</button>` : ""}</div>`)}<div class="filter-row">${[
      ["all", "Tous"],
      ["facture", "Factures"],
      ["devis", "Devis"],
    ]
      .map(
        ([v, l]) =>
          `<button class="${filter === v ? "active" : ""}" onclick="openDocuments('${v}')">${l}</button>`,
      )
      .join(
        "",
      )}</div>${searchField()}<div class="panel">${rows(docs.filter((d) => filter === "all" || d.type === filter))}</div>`;
  else if (route === "payments")
    html = `${intro("Qui doit encore me payer ?", "Ouvrez une facture pour noter son paiement.")}${searchField()}<div class="panel">${rows(docs.filter((d) => d.type === "facture" && !d.paid))}</div><div class="section-head" style="margin-top:30px"><h2>Factures payées</h2></div><div class="panel">${rows(docs.filter((d) => d.type === "facture" && d.paid))}</div>`;
  else html = home();
  $("#main").innerHTML = html;
  if ($("#clientform"))
    $("#clientform").onsubmit = (e) => {
      e.preventDefault();
      const f = new FormData(e.target),
        name = f.get("name").trim(),
        address = f.get("address").trim();
      if (!name || !address) {
        toast("Complétez le nom et l’adresse du client.");
        return;
      }
      saveClient({ name, address, email: f.get("email").trim(), ...readClientExtras(f) })
        .then((c) => {
          clients.push(c);
          if (returnToWizard && draft) {
            draft.client = c.id;
            go("wizard");
          } else go("clients");
          toast("Client enregistré.");
        })
        .catch(showError);
    };
  if ($("#editclientform"))
    $("#editclientform").onsubmit = async (event) => {
      event.preventDefault();
      const form = event.target;
      const button = form.querySelector('[type="submit"]');
      const values = new FormData(form);
      const updated = {
        name: String(values.get("name")).trim(),
        address: String(values.get("address")).trim(),
        email: String(values.get("email")).trim(),
        ...readClientExtras(values),
      };
      if (!updated.name || !updated.address || button.disabled) return;
      button.disabled = true;
      try {
        const saved = await updateClient(form.dataset.clientId, updated);
        const index = clients.findIndex((c) => c.id === saved.id);
        if (index !== -1) clients[index] = saved;
        go("clients");
        toast("Client modifié.");
      } catch (error) {
        showError(error);
        button.disabled = false;
      }
    };
  if ($("#companyform"))
    $("#companyform").onsubmit = (e) => {
      e.preventDefault();
      const values = Object.fromEntries(new FormData(e.target));
      values.address = [values.street + (values.house_number ? " " + values.house_number : "") + (values.box ? " boîte " + values.box : ""), [values.postal_code, values.city].filter(Boolean).join(" "), values.country].filter(Boolean).join("\n");
      values.logo = logoDirty ? logoDraft : company.logo || null;
      if (logoLoading) {
        toast("Le logo est encore en cours de chargement.");
        return;
      }
      if (!values.name.trim() || !values.address.trim()) {
        toast("Complétez le nom et l’adresse.");
        return;
      }
      saveCompany(values)
        .then(() => {
          company = { ...company, ...values, theme: themeChoice };
          logoDirty = false;
          updateAccountIdentity();
          toast("Coordonnées enregistrées.");
          go("home");
        })
        .catch(featureError);
    };
}
window.addEventListener("hashchange", () => {
  render();
  $("#main").focus();
  window.scrollTo(0, 0);
});
$("#help").onclick = () => $("#helpdialog").showModal();
$("#themebutton").onclick = () => $("#themedialog").showModal();
$("#logout").onclick = async () => {
  const { error } = await db.auth.signOut();
  if (error) showError(error);
};
$("#textsize").onclick = () => {
  const large = document.documentElement.dataset.large !== "yes";
  document.documentElement.dataset.large = large ? "yes" : "no";
  document.documentElement.style.fontSize = large ? "22px" : "";
  $("#textsize").innerHTML = large
    ? "A− <span>Texte standard</span>"
    : "A+ <span>Agrandir le texte</span>";
};

function authHTML() {
  const configured =
    window.APP_CONFIG?.supabaseUrl?.startsWith("https://") &&
    window.APP_CONFIG?.supabaseKey &&
    !window.APP_CONFIG.supabaseKey.startsWith("VOTRE_");
  if (!configured || !window.supabase?.createClient) {
    return intro(
      "Configuration nécessaire",
      "Renseignez l’URL et la clé publique dans config.js, puis rechargez la page.",
    );
  }
  if (authMode === "reset-success") {
    return `${intro("Mot de passe modifié", "Votre nouveau mot de passe est enregistré.")}
      <div class="panel auth-panel"><button class="primary" onclick="authMode='login';go('home');render()">Accéder à mon espace</button></div>`;
  }
  if (authMode === "reset") {
    if (!account || recoveryLinkError) {
      return `${intro("Réinitialiser mon mot de passe", "Ce lien est invalide ou a expiré. Demandez un nouveau lien de récupération.")}
        <div class="panel auth-panel"><button class="primary" onclick="authMode='forgot';render()">Demander un nouveau lien</button></div>`;
    }
    return `${intro("Choisir un nouveau mot de passe", "Votre compte et vos documents seront conservés.")}
      <form id="resetpasswordform" class="panel auth-panel">
        <label class="field">Nouveau mot de passe<input name="password" type="password" autocomplete="new-password" minlength="6" required></label>
        <label class="field">Confirmer le mot de passe<input name="confirmation" type="password" autocomplete="new-password" minlength="6" required></label>
        <button class="primary" type="submit">Enregistrer mon nouveau mot de passe</button>
        <p id="authmessage" role="status" aria-live="polite"></p>
      </form>`;
  }
  if (authMode === "forgot") {
    return `${intro("Mot de passe oublié", "Recevez un lien pour choisir un nouveau mot de passe.")}
      <form id="recoveryrequestform" class="panel auth-panel">
        <label class="field">Adresse e-mail<input name="email" type="email" autocomplete="email" required></label>
        <button class="primary" type="submit">Recevoir le lien</button>
        <button class="link" type="button" onclick="authMode='login';render()">Retour à la connexion</button>
        <p id="authmessage" role="status" aria-live="polite"></p>
      </form>`;
  }
  return `${intro(authMode === "signup" ? "Créer mon compte" : "Me connecter", "Retrouvez vos clients et documents sur vos appareils.")}
        <form id="authform" class="panel auth-panel">
            <label class="field">Adresse e-mail<input type="email" name="email" autocomplete="email" required></label>
            <label class="field">Mot de passe<input type="password" name="password" autocomplete="${authMode === "signup" ? "new-password" : "current-password"}" minlength="6" required></label>
            <div class="form-footer">
                <button class="primary" type="submit">${authMode === "signup" ? "Créer mon compte" : "Me connecter"}</button>
            </div>
            <button class="link" type="button" onclick="authMode='${authMode === "signup" ? "login" : "signup"}';render()">${authMode === "signup" ? "J’ai déjà un compte" : "Créer un compte"}</button>
            ${authMode === "login" ? '<button class="link" type="button" onclick="authMode=\'forgot\';render()">Mot de passe oublié ?</button>' : ''}
            <p id="authmessage" role="status"></p>
        </form>`;
}

function errorMessage(error) {
  const raw = String(error?.message || error || 'Erreur inattendue.');
  if (/PEPPOL-COMMON-R043/.test(raw)) return 'Le numéro BCE du client est invalide. Vérifiez les 10 chiffres et la clé de contrôle de son identifiant Peppol (0208:…).';
  if (/BR-CO-09/.test(raw)) return 'Le numéro de TVA du client doit commencer par le code pays, par exemple BE pour la Belgique.';
  if (error?.code === 'PGRST202' || /delete_unsent_invoice.*schema cache/i.test(raw)) return 'La suppression n’est pas encore activée. Exécutez le fichier 20260927_facture_ui.sql dans Supabase.';
  if (['42703','PGRST204','42P01','PGRST205'].includes(error?.code)) return 'La base doit être mise à jour. Exécutez les migrations fournies avec cette version.';
  if (/Failed to fetch|NetworkError|Load failed|fetch failed/i.test(raw)) return 'Connexion au service interrompue. Vérifiez votre connexion. Si un envoi était en cours, vérifiez son état avant de réessayer.';
  if (/timeout|timed out|aborted/i.test(raw)) return 'Le service met trop de temps à répondre. Vérifiez si l’opération a abouti avant de la relancer.';
  if (error?.status === 401 || /JWT expired|session.*expired/i.test(raw)) return 'Votre session a expiré. Reconnectez-vous puis vérifiez le résultat de la dernière opération.';
  if (error?.code === '42501') return 'Votre compte n’a pas les droits nécessaires pour cette opération.';
  if (error?.code === '23505') return 'Cet enregistrement existe déjà. Rechargez vos documents avant de réessayer.';
  if (error?.code === '23503') return 'Ce document est lié à un autre enregistrement et ne peut pas être supprimé.';
  if (/Recommand HTTP 400/.test(raw)) return 'Peppol a refusé les données du document. Consultez le détail ci-dessous, corrigez la fiche client ou la facture puis actualisez le brouillon.';
  if (/Recommand HTTP (401|403)/.test(raw)) return 'L’accès à Recommand a été refusé. Vérifiez la clé API et les droits de l’entreprise configurée.';
  return raw.length > 500 ? 'L’opération a échoué. Consultez le détail technique ci-dessous.' : raw;
}
function showError(error) {
  console.error(error);
  const message = errorMessage(error);
  let target = document.querySelector('#feature-dialog[open] .application-error') || $('#action-error') || $('#error');
  if (!target) {
    const parent = document.querySelector('#feature-dialog[open]') || $('#main');
    if (!parent) return toast(message);
    target = document.createElement('div');
    parent.prepend(target);
  }
  target.classList.add('application-error', 'no-print');
  target.setAttribute('role','alert');
  target.setAttribute('tabindex','-1');
  target.replaceChildren();
  const summary = document.createElement('div');
  summary.textContent = message;
  target.append(summary);
  const raw = String(error?.message || '');
  if (raw && raw !== message) {
    const details = document.createElement('details');
    const title = document.createElement('summary'); title.textContent = 'Détail technique';
    const content = document.createElement('pre'); content.textContent = raw.slice(0,6000);
    details.append(title,content); target.append(details);
  }
  target.focus({preventScroll:true});
  target.scrollIntoView({block:'nearest',behavior:'smooth'});
}
window.addEventListener('unhandledrejection', event => { event.preventDefault(); showError(event.reason); });
window.addEventListener('error', event => { if (event.error) showError(event.error); });
function addCalendarDays(value, days) {
  if (!validDate(value)) return '';
  const date = new Date(value + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0,10);
}
function changeDraftDate(value) {
  const days = draft.type === "devis" ? 14 : 21;
  const automatic = !draft.dueManual && draft.due === addCalendarDays(draft.date,days);
  draft.date = value;
  if (automatic && validDate(value)) {
    draft.due = addCalendarDays(value,days);
    render();
  }
}

async function saveClient({ name, address, email, ...extra }) {
  const { data, error } = await db
    .from("clients")
    .insert({ user_id: companyOwner(), name, address, email: email || null, ...extra })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function updateClient(id, { name, address, email, ...extra }) {
  const { data, error } = await db
    .from("clients")
    .update({ name, address, email: email || null, ...extra })
    .eq("id", id)
    .eq("user_id", companyOwner())
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function saveCompany(values) {
  const { error } = await db.from("companies").upsert({
    user_id: companyOwner(),
    name: values.name.trim(),
    address: values.address.trim(),
    vat: values.vat?.trim() || null,
    iban: values.iban?.trim() || null,
    email: values.email?.trim() || null,
    logo: values.logo || null,
    logo_shape: values.logo_shape === "square" ? "square" : "rectangle",
    ...Object.fromEntries(["street","house_number","box","postal_code","city","country"].map(k => [k, values[k] || ""])),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  const themeUpdate = await db
    .from("companies")
    .update({ theme: themeChoice })
    .eq("user_id", companyOwner());
  if (!themeUpdate.error) themeColumnReady = true;
  else if (!["42703", "PGRST204"].includes(themeUpdate.error.code))
    console.error(themeUpdate.error);
  const interfaceUpdate = await db.from('companies').update({ui_theme:uiChoice}).eq('user_id',companyOwner());
  if (!interfaceUpdate.error) { uiColumnReady = true; company.ui_theme = uiChoice; }
  else if (!["42703", "PGRST204"].includes(interfaceUpdate.error.code)) console.error(interfaceUpdate.error);
}

function readDocument(row, lines) {
  return {
    id: row.number,
    dbId: row.id,
    sentAt: row.sent_at,
    appearance: row.appearance || DEFAULT_APPEARANCE,
    peppol: row.peppol || null,
    type: row.type,
    client: row.client_id,
    date: row.issue_date,
    vatDate: row.vat_date || null,
    due: row.due_date,
    job: row.job,
    site: row.site,
    recurrence: row.recurrence || null,
    paid: row.paid,
    paidAt: row.paid_at || null,
    convertedFrom: row.converted_from,
    issuer: row.issuer_snapshot,
    customer: row.customer_snapshot,
    lines: lines
      .filter((line) => line.document_id === row.id)
      .sort((a, b) => a.position - b.position)
      .map((line) => ({
        name: line.name,
        qty: Number(line.quantity),
        price: Number(line.unit_price),
        tax: Number(line.vat_rate),
      })),
  };
}

function loadData() {
  if (!account) return Promise.resolve();
  const userId = account.id;
  const generation = sessionGeneration;
  if (dataLoad?.userId === userId && dataLoad.generation === generation)
    return dataLoad.promise;
  const task = { userId, generation, promise: null };
  task.promise = fetchData(userId, generation).catch(error => {
    if (account?.id === userId && sessionGeneration === generation && dataState !== "ready") {
      dataState = "error";
      render();
    }
    throw error;
  }).finally(() => { if (dataLoad === task) dataLoad = null; });
  dataLoad = task;
  return task.promise;
}

async function fetchData(userId, generation) {
  if (dataState !== "ready") {
    dataState = "loading";
    render();
  }
  if (db?.rpc) await resolveTeam(userId, generation);
  if(account?.id !== userId || sessionGeneration !== generation) return;
  // Secondary data must not hold up the invoice amounts.
  const secondary = Promise.all([loadReminders(userId), loadVAT(userId)]).catch(error => {
    if (account?.id === userId && sessionGeneration === generation) showError(error);
  });
  const [clientResult, companyResult, documentResult, lineResult] =
    await Promise.all([
      db
        .from("clients")
        .select("*")
        .eq("user_id", companyOwner(userId))
        .order("created_at"),
      db.from("companies").select("*").eq("user_id", companyOwner(userId)).maybeSingle(),
      db
        .from("documents")
        .select("*")
        .eq("user_id", companyOwner(userId))
        .order("created_at", { ascending: false }),
      db
        .from("document_lines")
        .select("*")
        .eq("user_id", companyOwner(userId))
        .order("position"),
    ]);
  for (const result of [
    clientResult,
    companyResult,
    documentResult,
    lineResult,
  ]) {
    if (result.error) throw result.error;
  }
  if (account?.id !== userId || sessionGeneration !== generation) return;
  clients = clientResult.data || [];
  company = companyResult.data || {
    name: "",
    address: "",
    vat: "",
    iban: "",
    email: "",
  };
  themeColumnReady = Object.hasOwn(company, "theme");
  applyTheme(themeColumnReady ? company.theme : localTheme());
  const linesByDocument = new Map();
  for (const line of lineResult.data || []) {
    const lines = linesByDocument.get(line.document_id) || [];
    lines.push(line);
    linesByDocument.set(line.document_id, lines);
  }
  docs = (documentResult.data || []).map(row => readDocument(row, linesByDocument.get(row.id) || []));
  const conversions = new Map(docs.filter(doc => doc.convertedFrom).map(doc => [doc.convertedFrom, doc]));
  for (const doc of docs) {
    const converted = conversions.get(doc.dbId);
    if (converted) doc.converted = converted.id;
  }
  dataState = "ready";
  render();
  secondary.then(() => {
    if (account?.id !== userId || sessionGeneration !== generation) return;
    const route = location.hash.slice(1) || "home";
    // Do not replace a form while the user is typing.
    if (!draft && !document.getElementById("feature-dialog") &&
        (["home", "dashboard"].includes(route) || route.startsWith("view/"))) render();
  });
}

async function persistDocument(source, convertedFrom = null) {
  const {data, error} = await db.rpc("save_document_v2", {payload: {
    id: source.dbId || null, client_id: source.client, type: source.type,
    issue_date: source.date, due_date: source.due, job: source.job, site: source.site || null,
    issuer_snapshot: source.issuer, customer_snapshot: publicCustomer(source.customer),
    recurrence: source.recurrence || null, appearance: source.appearance || DEFAULT_APPEARANCE,
    converted_from: convertedFrom, lines: source.lines
  }});
  if (error) throw error;
  return {...source, id: data.number, dbId: data.id, sentAt:null, peppol:null};
}

async function initialize() {
  if (
    !window.supabase?.createClient ||
    !window.APP_CONFIG?.supabaseUrl?.startsWith("https://") ||
    !window.APP_CONFIG?.supabaseKey ||
    window.APP_CONFIG.supabaseKey.startsWith("VOTRE_")
  ) {
    render();
    return;
  }
  db = window.supabase.createClient(
    window.APP_CONFIG.supabaseUrl,
    window.APP_CONFIG.supabaseKey,
  );
  db.auth.onAuthStateChange((_event, session) => {
    if (_event === "PASSWORD_RECOVERY") authMode = "reset";
    if (_event === "SIGNED_OUT") authMode = "login";
    const nextId = session?.user?.id || null;
    if (nextId === account?.id) {
      if (_event === "PASSWORD_RECOVERY" || _event === "SIGNED_OUT") render();
      return;
    }
    const generation = ++sessionGeneration;
    if(typeof outlookReset==='function')outlookReset();
    account = session?.user || null;
    dataState = account ? "loading" : "idle";
    clients = [];
    docs = [];
    reminders = [];
    document.getElementById("feature-dialog")?.remove();
    document.getElementById("draft-dialog")?.remove();
    recurrenceDoc = null;
    recurrenceEdit = null;
    logoDraft = null;
    logoDirty = false;
    company = { name: "", address: "", vat: "", iban: "", email: "" };
    themeColumnReady = false;
    teamContext = null;
    applyTheme(account ? localTheme() : "plombier");
    draft = null;
    render();
    if (account) setTimeout(() => {
      if (generation !== sessionGeneration || !account) return;
      loadData().catch(error => {
        if (generation === sessionGeneration) showError(error);
      });
    }, 0);
  });
  const { data, error } = await db.auth.getSession();
  if (error) showError(error);
  if (data?.session?.user && !account) {
    account = data.session.user;
    applyTheme(localTheme());
    await loadData().catch(showError);
  }
  render();
}

document.addEventListener("submit", async (event) => {
  if (["resetpasswordform", "recoveryrequestform"].includes(event.target.id)) {
    event.preventDefault();
    const form = event.target;
    const message = form.querySelector("#authmessage");
    const submit = form.querySelector('[type="submit"]');
    if (submit.disabled) return;
    const values = new FormData(form);
    submit.disabled = true;
    message.textContent = "Veuillez patienter…";
    try {
      if (form.id === "recoveryrequestform") {
        const { error } = await db.auth.resetPasswordForEmail(String(values.get("email")).trim(), {
          redirectTo: location.origin + location.pathname + "?reset=1",
        });
        if (error) throw error;
        message.textContent = "Si un compte correspond à cette adresse, vous recevrez un lien de récupération. Vérifiez aussi vos courriers indésirables.";
      } else {
        const password = String(values.get("password"));
        if (password.length < 6) throw Error("Le mot de passe doit contenir au moins 6 caractères.");
        if (password !== String(values.get("confirmation"))) throw Error("Les deux mots de passe ne correspondent pas.");
        if (!account || authMode !== "reset" || recoveryLinkError) throw Error("Ce lien est invalide ou a expiré. Demandez un nouveau lien.");
        const { error } = await db.auth.updateUser({ password });
        if (error) throw error;
        form.reset();
        authMode = "reset-success";
        // Retirer les paramètres de récupération pour les prochains chargements.
        history.replaceState(null, "", location.pathname + "#home");
        render();
      }
    } catch (error) {
      message.textContent = ["session_not_found", "refresh_token_not_found", "otp_expired"].includes(error.code) || /Auth session missing/i.test(error.message || "")
        ? "Ce lien est invalide ou a expiré. Demandez un nouveau lien."
        : error.message || "Impossible de réinitialiser le mot de passe. Réessayez.";
    } finally {
      submit.disabled = false;
    }
    return;
  }
  if (event.target.id !== "authform") return;
  event.preventDefault();
  const form = event.target;
  const message = form.querySelector("#authmessage");
  const submit = form.querySelector('[type="submit"]');
  const values = new FormData(form);
  const isSignup = authMode === "signup";
  const duplicateMessage =
    "Un compte existe déjà avec cette adresse e-mail. Cliquez sur « J’ai déjà un compte » pour vous connecter.";
  submit.disabled = true;
  message.textContent = "Veuillez patienter…";
  try {
    const credentials = {
      email: String(values.get("email")).trim(),
        ...readClientExtras(values),
      password: String(values.get("password")),
    };
    const result =
      isSignup
        ? await db.auth.signUp({
            ...credentials,
            options: {
              emailRedirectTo: location.origin + location.pathname,
            },
          })
        : await db.auth.signInWithPassword(credentials);
    if (result.error) {
      if (isSignup && (
        ["user_already_exists", "email_exists"].includes(result.error.code) ||
        /user already registered|user already exists|email already (?:registered|exists)/i.test(result.error.message || "")
      )) {
        message.textContent = duplicateMessage;
        return;
      }
      throw result.error;
    }
    // Supabase peut masquer un compte confirmé par un utilisateur sans identités.
    if (isSignup && !result.data.session &&
      Array.isArray(result.data.user?.identities) &&
      result.data.user.identities.length === 0) {
      message.textContent = duplicateMessage;
      return;
    }
    if (isSignup && !result.data.session) {
      message.textContent =
        "Vérifiez votre boîte e-mail pour confirmer votre compte.";
    } else {
      message.textContent = "Connexion réussie.";
    }
  } catch (error) {
    message.textContent = error.message || "Connexion impossible.";
  } finally {
    submit.disabled = false;
  }
});

// Prestations, récurrences, relances et identité de l'entreprise.
let reminders = [],
  logoDraft = null,
  logoDirty = false,
  logoLoading = false;
let featureBusy = false;
function validDate(value) {
  const date = new Date(value + "T12:00:00Z");
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value || "") &&
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}
function featureDialog(title, body) {
  document.getElementById('template-preview')?.previewObserver?.disconnect();
  document.getElementById("feature-dialog")?.remove();
  const dialog = document.createElement("dialog");
  dialog.id = "feature-dialog";
  dialog.innerHTML = `<h2>${esc(title)}</h2>${body}<div class="application-error no-print" role="alert"></div><p><button type="button" onclick="this.closest('dialog').close()">Fermer</button></p>`;
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}
function featureError(error) { showError(error); }

function manageCatalog() {
  const entries = structuredClone(catalogForTheme());
  const dialog = featureDialog(
    "Mes prestations · " + PROFESSIONS[themeChoice].label,
    '<p>Ces raccourcis sont enregistrés pour votre métier. Les lignes déjà ajoutées aux factures restent inchangées.</p><form id="catalog-search" class="catalog-search"><label class="field">Rechercher une prestation<input id="catalog-query" type="search" placeholder="Nom de la prestation"></label><button type="submit">Rechercher</button></form><p id="catalog-results" class="muted" role="status"></p><div id="catalog-editor"></div><button id="catalog-add">+ Nouvelle prestation</button><button class="primary" id="catalog-save">Enregistrer les prestations</button>',
  );
  const searchInput = dialog.querySelector("#catalog-query");
  const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").trim();
  function filter() {
    const query = normalize(searchInput.value);
    let count = 0;
    dialog.querySelectorAll(".catalog-edit").forEach((row) => {
      row.hidden = !normalize(row.querySelector('[data-key="0"]').value).includes(query);
      if (!row.hidden) count++;
    });
    dialog.querySelector("#catalog-results").textContent = query
      ? (count ? `${count} prestation(s) trouvée(s).` : "Aucune prestation ne correspond à votre recherche.")
      : "";
  }
  dialog.querySelector("#catalog-search").onsubmit = (event) => {
    event.preventDefault();
    filter();
  };
  searchInput.oninput = filter;
  function draw() {
    dialog.querySelector("#catalog-editor").innerHTML =
      entries
        .map(
          (entry, i) =>
            `<div class="catalog-edit"><label>Prestation<input data-index="${i}" data-key="0" value="${esc(entry[0])}" maxlength="200"></label><label>Quantité<input type="number" min="0.01" step="0.01" data-index="${i}" data-key="1" value="${entry[1]}"></label><label>Prix HTVA<input type="number" min="0" step="0.01" data-index="${i}" data-key="2" value="${entry[2]}"></label><button data-remove="${i}" aria-label="Supprimer ${esc(entry[0])}">Supprimer</button></div>`,
        )
        .join("") || "<p>Aucune prestation enregistrée.</p>";
    filter();
  }
  dialog.oninput = (e) => {
    if (e.target.dataset.index !== undefined)
      entries[+e.target.dataset.index][+e.target.dataset.key] =
        e.target.dataset.key === "0"
          ? e.target.value
          : e.target.value === ""
            ? NaN
            : Number(e.target.value);
  };
  dialog.onclick = (e) => {
    if (e.target.dataset.remove !== undefined) {
      entries.splice(+e.target.dataset.remove, 1);
      draw();
    }
  };
  dialog.querySelector("#catalog-add").onclick = () => {
    searchInput.value = "";
    entries.push(["", 1, 0]);
    draw();
    dialog.querySelector(".catalog-edit:last-child input").focus();
  };
  dialog.querySelector("#catalog-save").onclick = async (e) => {
    if (
      entries.some(
        (x) =>
          !x[0].trim() ||
          !Number.isFinite(x[1]) ||
          x[1] <= 0 ||
          !Number.isFinite(x[2]) ||
          x[2] < 0,
      )
    )
      return toast(
        "Complétez chaque prestation avec une quantité et un prix valides.",
      );
    if (!company.name?.trim())
      return toast("Enregistrez d’abord Mon entreprise.");
    e.target.disabled = true;
    try {
      const catalogs = { ...(company.catalogs || {}), [themeChoice]: entries };
      const result = await db
        .from("companies")
        .update({ catalogs })
        .eq("user_id", companyOwner())
        .select("user_id")
        .single();
      if (result.error) throw result.error;
      company.catalogs = catalogs;
      dialog.close();
      render();
      toast("Prestations enregistrées.");
    } catch (error) {
      featureError(error);
    } finally {
      e.target.disabled = false;
    }
  };
  draw();
}
function recurrenceFields(recurrence, context = "draft") {
  const set = context === "draft" ? "draft.recurrence" : "recurrenceEdit";
  return `<fieldset class="recurrence-box"><legend>Abonnement / facture récurrente</legend><label><input type="checkbox" ${recurrence ? "checked" : ""} onchange="${set}=this.checked?{frequency:'yearly',next:today(),anchor:today()}:null;${context === "draft" ? "render()" : "redrawRecurrence()"}"> Me rappeler de préparer une nouvelle facture</label>${recurrence ? `<div class="form-grid"><label>Fréquence<select onchange="${set}.frequency=this.value"><option value="monthly" ${recurrence.frequency === "monthly" ? "selected" : ""}>Tous les mois</option><option value="quarterly" ${recurrence.frequency === "quarterly" ? "selected" : ""}>Tous les 3 mois</option><option value="yearly" ${recurrence.frequency === "yearly" ? "selected" : ""}>Tous les ans</option></select></label><label>Prochaine facturation<input type="date" value="${esc(recurrence.next)}" onchange="${set}.next=this.value;${set}.anchor=this.value"></label></div>` : ""}<p class="muted">Exemple : tous les ans, à partir du 20 décembre. Le rappel apparaît dans l’application ; vous vérifiez et envoyez la facture vous-même.</p></fieldset>`;
}
let recurrenceEdit = null,
  recurrenceDoc = null;
function editRecurrence(id) {
  recurrenceDoc = docs.find((d) => d.id === id);
  recurrenceEdit = structuredClone(recurrenceDoc.recurrence || null);
  featureDialog(
    "Planifier cette facture",
    '<div id="recurrence-editor"></div><button class="primary" onclick="saveRecurrence()">Enregistrer</button>',
  );
  redrawRecurrence();
}
function redrawRecurrence() {
  $("#recurrence-editor").innerHTML = recurrenceFields(recurrenceEdit, "edit");
}
async function saveRecurrence() {
  if (featureBusy) return;
  if (recurrenceEdit && !validDate(recurrenceEdit.next))
    return toast("Choisissez une date valide.");
  featureBusy = true;
  try {
    const { error } = await db
      .from("documents")
      .update({ recurrence: recurrenceEdit })
      .eq("id", recurrenceDoc.dbId)
      .eq("user_id", companyOwner());
    if (error) throw error;
    recurrenceDoc.recurrence = structuredClone(recurrenceEdit);
    $("#feature-dialog").close();
    render();
    toast("Récurrence enregistrée.");
  } catch (error) {
    featureError(error);
  } finally {
    featureBusy = false;
  }
}
function advanceDate(recurrence) {
  const [y, m] = recurrence.next.split("-").map(Number);
  const anchorDay = Number((recurrence.anchor || recurrence.next).slice(8, 10));
  const months = { monthly: 1, quarterly: 3, yearly: 12 }[recurrence.frequency];
  if (!months || !validDate(recurrence.next))
    throw Error("Récurrence invalide.");
  const end = new Date(Date.UTC(y, m - 1 + months + 1, 0));
  return `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(anchorDay, end.getUTCDate())).padStart(2, "0")}`;
}
async function finishOccurrence(id) {
  const d = docs.find((d) => d.id === id);
  if (
    !d?.recurrence ||
    featureBusy ||
    !confirm(
      "Vous confirmez avoir traité la facturation du " +
        fmt(d.recurrence.next) +
        " ? La prochaine échéance sera affichée.",
    )
  )
    return;
  featureBusy = true;
  try {
    const old = structuredClone(d.recurrence),
      next = { ...old, next: advanceDate(old) };
    const result = await db
      .from("documents")
      .update({ recurrence: next })
      .eq("id", d.dbId)
      .eq("user_id", companyOwner())
      .eq("recurrence->>next", old.next)
      .select("id")
      .single();
    if (result.error) throw result.error;
    d.recurrence = next;
    render();
    toast("Prochaine facturation : " + fmt(next.next));
  } catch (error) {
    featureError(error);
  } finally {
    featureBusy = false;
  }
}
function recurringDraft(id) {
  if (draft) {
    go("wizard");
    return toast("Terminez ou abandonnez votre brouillon en cours.");
  }
  const d = docs.find((d) => d.id === id);
  if (!d?.recurrence) return;
  const terms = Math.max(
    0,
    Math.round((Date.parse(d.due) - Date.parse(d.date)) / 86400000),
  );
  const due = new Date(today() + "T12:00:00Z");
  due.setUTCDate(due.getUTCDate() + terms);
  draft = {
    type: "facture",
    client: d.client,
    date: today(),
    due: due.toISOString().slice(0, 10),
    job: d.job,
    site: d.site,
    lines: structuredClone(d.lines),
  };
  step = 2;
  go("wizard");
  toast(
    "Brouillon préparé. Après envoi, marquez l’échéance traitée dans Abonnements.",
  );
}
function recurringView() {
  const list = docs
    .filter((d) => d.type === "facture" && d.recurrence)
    .sort((a, b) => a.recurrence.next.localeCompare(b.recurrence.next));
  return `${intro("Mes abonnements", "Préparez vos factures aux dates prévues. Aucun e-mail automatique.")}<div class="notice">Après avoir envoyé votre facture, cliquez sur « Échéance traitée » pour passer à la date suivante. Une échéance oubliée reste visible.</div>${list.map((d) => `<section class="panel recurring-card"><h2>${esc(client(d).name)} · ${esc(d.job)}</h2><p><strong>${d.recurrence.next <= today() ? "À facturer maintenant" : "Prochaine facturation"} : ${fmt(d.recurrence.next)}</strong> · ${{ monthly: "Mensuel", quarterly: "Trimestriel", yearly: "Annuel" }[d.recurrence.frequency]}</p><div class="filter-row"><button class="primary" onclick="recurringDraft('${d.id}')">Préparer la facture</button><button onclick="finishOccurrence('${d.id}')">Échéance traitée</button><button onclick="editRecurrence('${d.id}')">Modifier / arrêter</button><button onclick="go('view/${d.id}')">Facture modèle</button></div></section>`).join("") || '<div class="panel">Aucun abonnement. Activez une récurrence pendant la création d’une facture ou depuis une facture enregistrée.</div>'}`;
}
function home() {
  const due = docs.filter(
    (d) => d.type === "facture" && d.recurrence && d.recurrence.next <= today(),
  );
  return (
    (due.length
      ? `<div class="notice no-print"><strong>${due.length} facturation(s) récurrente(s) à préparer.</strong> <a href="#recurring">Voir mes abonnements →</a></div>`
      : "") + originalHome()
  );
}
async function loadReminders(userId) {
  const scopeOwner = companyOwner(userId);
  const result = await db
    .from("payment_reminders")
    .select("*")
    .eq("user_id", scopeOwner)
    .order("created_at", { ascending: false });
  if (account?.id !== userId || companyOwner(userId) !== scopeOwner) return;
  reminders = result.error ? [] : result.data || [];
  if (result.error && !["42P01", "PGRST205"].includes(result.error.code))
    featureError(result.error);
}
function invoiceExtras(d) {
  if (d.type !== "facture") return "";
  const history = reminders.filter((r) => r.document_id === d.dbId);
  return `<section class="no-print panel invoice-extras"><div class="filter-row"><button onclick="editRecurrence('${d.id}')">↻ ${d.recurrence ? "Modifier la récurrence" : "Ajouter une récurrence"}</button>${!d.paid && d.due < today() ? `<button class="primary" onclick="remindClient('${d.id}')">Relancer : retard de paiement</button>` : ""}</div><details ${history.length ? "open" : ""}><summary>Historique des relances (${history.length})</summary>${history.map((r) => `<div class="reminder-entry"><strong>${r.status === "confirmed" ? "Envoi confirmé par vous" : "E-mail préparé — envoi non confirmé"}</strong><p>${new Date(r.created_at).toLocaleString("fr-BE")} · ${esc(r.recipient)}</p>${r.confirmed_at ? `<p>Confirmation : ${new Date(r.confirmed_at).toLocaleString("fr-BE")}</p>` : ""}<details><summary>Voir le message</summary><pre>${esc(r.subject)}\n\n${esc(r.body)}</pre></details>${r.status !== "confirmed" ? `<button onclick="confirmReminder('${r.id}')">J’ai envoyé cette relance</button>` : ""}</div>`).join("") || "<p>Aucune relance.</p>"}</details></section>`;
}
function remindClient(id) {
  const d = docs.find((d) => d.id === id);
  if (!d || d.paid || d.due >= today()) return;
  const c = client(d),
    biz = d.issuer || company;
  const subject = `Rappel de paiement — facture ${d.id}`;
  const body = `Bonjour ${c.name},\n\nSauf erreur de notre part, la facture ${d.id} d’un montant de ${euro(totals(d).total)}, arrivée à échéance le ${fmt(d.due)}, reste impayée.\n\nMerci de procéder au règlement sur le compte ${biz.iban || "[compte à préciser]"}, avec la communication ${d.id}.\n\nSi le paiement a déjà été effectué, merci de ne pas tenir compte de ce rappel.\n\nBien à vous,\n${biz.name}`;
  const dialog = featureDialog(
    "Relance pour retard de paiement",
    `<form id="reminder-form"><label class="field">Destinataire<input name="recipient" type="email" required value="${esc(c.email || "")}"></label><label class="field">Objet<input name="subject" required value="${esc(subject)}"></label><label class="field">Message<textarea name="body" rows="10" required>${esc(body)}</textarea></label><p class="muted">Le bouton crée un fichier e-mail avec la facture PDF déjà jointe. Ouvrez le fichier dans Outlook, puis transférez-le au destinataire indiqué.</p><button class="primary">Envoyer un rappel</button></form>`,
  );
  dialog.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const button = e.target.querySelector("button");
    button.disabled = true;
    button.textContent='Création de l’e-mail et du PDF…';
    try {
      const values = Object.fromEntries(new FormData(e.target));
      const draft=await prepareDocumentEmail(d,values);
      const result = await db
        .from("payment_reminders")
        .insert({
          ...values,
          user_id: companyOwner(),
          document_id: d.dbId,
          status: "prepared",
        })
        .select()
        .single();
      if (result.error) throw result.error;
      reminders.unshift(result.data);
      downloadAttachment(draft,'rappel-'+documentFilename(d)+'.eml');
      dialog.innerHTML = `<h2>Relance prête avec PDF joint</h2><p>Ouvrez <strong>${esc('rappel-'+documentFilename(d)+'.eml')}</strong> dans les téléchargements du navigateur. Dans Outlook, choisissez <strong>Transférer</strong>, renseignez <strong>${esc(values.recipient)}</strong> et envoyez le message. Le PDF est déjà joint.</p><p>L’envoi n’est pas encore confirmé dans l’historique.</p><button onclick="confirmReminder('${result.data.id}')">J’ai envoyé cette relance</button><button onclick="this.closest('dialog').close();render()">Fermer</button>`;
    } catch (error) {
      featureError(error);
      button.disabled = false;
      button.textContent='Envoyer un rappel';
    }
  };
}
async function confirmReminder(id) {
  if (
    featureBusy ||
    !confirm("Confirmez-vous avoir envoyé ce message depuis votre messagerie ?")
  )
    return;
  featureBusy = true;
  try {
    const confirmed_at = new Date().toISOString();
    const result = await db
      .from("payment_reminders")
      .update({ status: "confirmed", confirmed_at })
      .eq("id", id)
      .eq("user_id", companyOwner())
      .select("id")
      .single();
    if (result.error) throw result.error;
    Object.assign(
      reminders.find((r) => r.id === id),
      { status: "confirmed", confirmed_at },
    );
    $("#feature-dialog")?.close();
    render();
    toast("Envoi confirmé dans l’historique.");
  } catch (error) {
    featureError(error);
  } finally {
    featureBusy = false;
  }
}
function safeLogo(value) {
  return (
    typeof value === "string" &&
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value) &&
    value.length < 600000
  );
}
function logoHTML(value, shape = company.logo_shape) {
  return safeLogo(value)
    ? `<img class="company-logo logo-${shape === 'square' ? 'square' : 'rectangle'}" src="${value}" alt="Logo de l’entreprise">`
    : "";
}
function companyView() {
  const logo = logoDirty ? logoDraft : company.logo;
  const nameField = `<label class="field company-name-field">Nom de l’entreprise<input name="name" form="companyform" required value="${esc(company.name)}"></label>`;
  return originalCompanyView().replace('<form id="companyform"', professionSettings() + nameField + teamSettings() + '<form id="companyform"')
    .replace(/<label class="field">Nom de l’entreprise<input name="name" required value="[^"]*"><\/label>/, '')
    .replace(
      '<form id="companyform" class="panel">',
      `<form id="companyform" class="panel"><fieldset class="logo-editor"><legend>Logo de l’entreprise</legend><div id="logo-preview">${logoHTML(logo) || "<p>Aucun logo sélectionné.</p>"}</div><label class="field">Format du logo<select name="logo_shape" onchange="previewLogoShape(this.value)"><option value="rectangle" ${company.logo_shape !== 'square' ? 'selected' : ''}>Rectangle — maximum 190 × 100 px</option><option value="square" ${company.logo_shape === 'square' ? 'selected' : ''}>Carré — 120 × 120 px</option></select></label><label class="field">Choisir un logo (PNG, JPEG ou WebP, maximum 2 Mo)<input type="file" accept="image/png,image/jpeg,image/webp" onchange="selectLogo(this.files[0])"></label><button type="button" onclick="removeLogo()">Retirer le logo</button><p class="muted">Le logo sera affiché en haut des nouvelles factures et des devis. Enregistrez vos coordonnées pour conserver ce choix.</p></fieldset>`,
    )
    .replace(
      'name="iban"',
      'placeholder="BE12 4567 1245 1245 (à vérifier)" name="iban"',
    );
}
function previewLogoShape(shape) {
  const preview = $('#logo-preview');
  if (preview) preview.innerHTML = logoHTML(logoDirty ? logoDraft : company.logo, shape) || '<p>Aucun logo sélectionné.</p>';
}
async function selectLogo(file) {
  if (!file) return;
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 2 * 1024 * 1024
  )
    return toast("Choisissez une image PNG, JPEG ou WebP de moins de 2 Mo.");
  const owner = account?.id;
  logoLoading = true;
  try {
    const image = await createImageBitmap(file);
    const scale = Math.min(1, 640 / image.width, 640 / image.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    image.close();
    const data = canvas.toDataURL("image/png");
    if (!safeLogo(data))
      throw Error(
        "Image trop volumineuse après réduction. Choisissez un logo plus simple.",
      );
    if (account?.id !== owner) return;
    logoDraft = data;
    logoDirty = true;
    previewLogoShape($('[name="logo_shape"]')?.value || company.logo_shape);
  } catch (error) {
    toast(error.message || "Impossible de lire cette image.");
  } finally {
    logoLoading = false;
  }
}
function removeLogo() {
  logoDraft = null;
  logoDirty = true;
  $("#logo-preview").innerHTML = "<p>Aucun logo sélectionné.</p>";
}
function validBelgianIBAN(value) {
  const iban = String(value || "")
    .replace(/\s/g, "")
    .toUpperCase();
  if (!/^BE\d{14}$/.test(iban)) return false;
  const digits = iban.slice(4) + "1114" + iban.slice(2, 4);
  let remainder = 0;
  for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  return (
    remainder === 1 &&
    (Number(iban.slice(4, 14)) % 97 || 97) === Number(iban.slice(14))
  );
}
function render() {
  if (["reset", "reset-success", "forgot"].includes(authMode)) {
    $("#main").innerHTML = authHTML();
    $("#logout").hidden = !account;
    $("#themebutton").hidden = true;
    return;
  }
  originalRender();
  if (account && dataState !== "ready") return;
  if (account && location.hash === "#recurring")
    $("#main").innerHTML = recurringView();
  if (account && location.hash === "#dashboard")
    $("#main").innerHTML = dashboard();
}


const DEFAULT_APPEARANCE = {template:"classique", color:"#194739", font:"sans"};
const TEMPLATES = {
  classique:"1 · Original", bleu_nuit:"2 · Bleu nuit", cuivre:"3 · ORBYT — Noir et cuivre",
  orbytek:"4 · Orbytek — Bleu électrique", architecture:"5 · Architecture — Plan technique",
  industriel:"6 · Industriel — Atelier et chantier",
};
let appearanceDraft = null;
let appearanceTarget = null;
function publicCustomer(c) {
  const {note, user_id, ...safe} = c || {};
  return safe;
}
function companyAddressFields() {
  const fields = [["street","Rue",company.street ?? company.address],["house_number","Numéro",company.house_number],["box","Boîte",company.box],["postal_code","Code postal",company.postal_code],["city","Ville",company.city],["country","Pays (code ISO)",company.country || "BE"]];
  return `<fieldset><legend>Adresse de l’entreprise</legend>${!company.street && company.address ? '<p class="muted">Votre ancienne adresse est conservée dans Rue. Répartissez-la dans les champs ci-dessous.</p>' : ''}<div class="form-grid">${fields.map(([k,label,value]) => `<label class="field">${label}<input name="${k}" value="${esc(value)}" ${["street","postal_code","city","country"].includes(k) ? "required" : ""} ${k === "country" ? 'pattern="[A-Za-z]{2}" maxlength="2"' : ''}></label>`).join('')}</div></fieldset>`;
}
function clientExtraFields(c) {
  return `<label class="field">Note interne<textarea name="note" maxlength="4000" placeholder="Ex. : envoyer les factures par courrier postal">${esc(c.note)}</textarea><small>Visible uniquement dans votre espace, jamais sur les documents.</small></label><details><summary>Coordonnées pour Peppol (test)</summary><div class="form-grid">${[["vat","TVA"],["peppol_id","Identifiant Peppol (0208:…)"],["street","Rue et numéro"],["postal_code","Code postal"],["city","Ville"],["country","Pays ISO (BE)"]].map(([k,l]) => `<label class="field">${l}<input name="${k}" value="${esc(c[k] || (k === 'country' ? 'BE' : ''))}"></label>`).join('')}</div></details>`;
}
function readClientExtras(form) {
  return Object.fromEntries(["note","vat","peppol_id","street","postal_code","city","country"].map(k => [k, String(form.get(k) || '').trim()]));
}
const TEMPLATE_COLORS = {classique:'#194739',bleu_nuit:'#0b304e',cuivre:'#a45f36',orbytek:'#009fe3',architecture:'#0087ad',industriel:'#ea6500'};
function cleanAppearance(a = {}) {
  const template = Object.hasOwn(TEMPLATES,a?.template) ? a.template : 'classique';
  const color = /^#[0-9a-f]{6}$/i.test(a?.color) ? a.color : TEMPLATE_COLORS[template];
  return {template,color,font:'sans'};
}
function accentText(color) {
  const rgb=color.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);
  return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722 > 0.179 ? '#171717' : '#ffffff';
}
function documentHeader(d) {
  const c=d.customer || client(d),biz=documentBusiness(d);
  return `<div class="document-heading">${logoHTML(biz.logo,biz.logo_shape)}<div class="invoice-title"><h2>${d.type==='devis'?'DEVIS':'FACTURE'}</h2><div>${esc(d.id)}</div></div></div><div class="invoice-parties"><div><h3 class="party-heading">${esc(biz.name)}</h3><p>${invoiceAddress(biz)}${biz.vat?'<br>'+esc(biz.vat):''}</p></div><div class="invoice-buyer"><h3 class="party-heading">CLIENT</h3><p><strong>${esc(c.name)}</strong><br>${invoiceAddress(c)}${c.vat?'<br>'+esc(c.vat):''}</p><p class="invoice-dates">Date : ${fmt(d.date)}<br>${d.type==='devis'?'Valable jusqu’au':'Échéance'} : ${fmt(d.due)}</p></div></div>`;
}
function documentBusiness(d) {
  const biz = d.issuer || company;
  // Old quotes may predate the logo upload. Keep their other snapshot fields.
  return d.type === 'devis' && !safeLogo(biz.logo)
    ? {...biz, logo:company.logo, logo_shape:company.logo_shape} : biz;
}
function navyDocumentHTML(d) {
  const c = d.customer || client(d), biz = documentBusiness(d);
  return `<article class="document">${documentHeader(d)}${d.job ? `<h3 class="invoice-job">Objet : ${esc(d.job)}</h3>` : ''}${d.site ? `<p>Chantier : ${esc(d.site)}</p>` : ''}<table><thead><tr><th>Description</th><th>Qté</th><th>Prix HTVA</th><th>TVA</th><th>Total HTVA</th></tr></thead><tbody>${d.lines.map(l=>`<tr><td>${esc(l.name)}</td><td>${l.qty}</td><td>${euro(l.price)}</td><td>${l.tax} %</td><td>${euro(round(l.qty*l.price))}</td></tr>`).join('')}</tbody></table>${totalBlock(d)}<div class="invoice-payment">${paymentQR(d,biz)}<p>Compte bancaire : ${esc(biz.iban)}<br>Communication : ${esc(d.id)}</p></div><div class="demo-stamp">DOCUMENT À VÉRIFIER AVANT UTILISATION</div><p class="muted document-legal">Mentions légales et traitement TVA à valider avant utilisation professionnelle. Vérifiez les mentions applicables à votre activité.</p></article>`;
}
// Live document layouts: reuse invoice snapshots, tax rounding and EPC payment data.
function designedDocumentHTML(d, template) {
  const biz = documentBusiness(d), buyer = d.customer || client(d);
  const quote = d.type === 'devis', title = quote ? 'Devis' : 'Facture';
  const label = text => `<span class="design-label">${text}</span>`;
  const party = (p, heading) => `<div class="design-party">${label(heading)}<h3>${esc(p.name)}</h3><p>${invoiceAddress(p)}${p.vat ? '<br>TVA : '+esc(p.vat) : ''}${p.email ? '<br>'+esc(p.email) : ''}</p></div>`;
  const issuer = party(biz, 'Émetteur'), customer = party(buyer, 'Client');
  const identity = `<div class="design-identity">${logoHTML(biz.logo,biz.logo_shape)}<h3>${esc(biz.name)}</h3></div>`;
  const metadata = `<dl class="design-meta"><div><dt>Référence</dt><dd>${esc(d.id)}</dd></div><div><dt>Date</dt><dd>${esc(fmt(d.date))}</dd></div><div><dt>${quote ? 'Valable jusqu’au' : 'Échéance'}</dt><dd>${esc(fmt(d.due))}</dd></div></dl>`;
  const project = d.job || d.site ? `<div class="design-project">${d.job ? `${label('Projet')}<h3>${esc(d.job)}</h3>` : ''}${d.site ? `<p><strong>Chantier :</strong> ${esc(d.site)}</p>` : ''}</div>` : '';
  const numbered = template !== 'orbytek';
  const table = `<p class="design-scroll-hint no-print">Faites défiler le tableau pour voir les montants →</p><div class="design-table-wrap" role="region" aria-label="Détail des prestations et montants" tabindex="0"><table class="design-lines"><colgroup>${numbered ? '<col class="design-col-number">' : ''}<col class="design-col-description"><col class="design-col-qty"><col class="design-col-price"><col class="design-col-tax"><col class="design-col-amount"></colgroup><thead><tr>${numbered ? '<th scope="col" class="design-line-number">N°</th>' : ''}<th scope="col" class="design-description">${template === 'orbytek' ? 'Services' : 'Description'}</th><th scope="col">Qté</th><th scope="col">Prix unitaire HTVA</th><th scope="col">TVA</th><th scope="col">Total HTVA</th></tr></thead><tbody>${d.lines.map((l,i) => `<tr>${numbered ? `<td class="design-line-number"><span>${template === 'industriel' ? 'P' : ''}${String(i+1).padStart(2,'0')}</span></td>` : ''}<td class="design-description">${esc(l.name)}</td><td>${esc(l.qty)}</td><td>${euro(l.price)}</td><td>${esc(l.tax)} %</td><td>${euro(round(l.qty*l.price))}</td></tr>`).join('')}</tbody></table></div>`;
  const summary = `<div class="design-summary">${totalBlock(d)}</div>`;
  const payment = `<section class="invoice-payment design-payment"><div class="design-bank">${label('Coordonnées bancaires')}<p>IBAN : ${esc(biz.iban)}<br>Communication : ${esc(d.id)}</p></div>${paymentQR(d,biz)}</section>`;
  const legal = `<div class="design-legal"><div class="demo-stamp">DOCUMENT À VÉRIFIER AVANT UTILISATION</div><p class="muted document-legal">Mentions légales et traitement TVA à valider avant utilisation professionnelle. Vérifiez les mentions applicables à votre activité.</p></div>`;
  let content;
  if (template === 'architecture') {
    const sequence = String(d.id || '').match(/(?:^|-)(\d+)$/)?.[1];
    content = `<div class="design-heading design-architecture-heading"><div>${project}${customer}</div><div class="design-document-reference"><h2>${title}</h2>${sequence ? `<div class="design-sequence" aria-hidden="true">/ ${esc(sequence)}</div>` : ''}${metadata}</div></div><div class="design-schedule">${table}</div>${summary}<div class="design-architecture-footer">${payment}<div class="design-title-block">${identity}${issuer}${metadata}</div></div>${legal}`;
  } else if (template === 'industriel') {
    content = `<div class="design-heading design-industrial-heading">${identity}<div class="design-serial"><h2>${title}</h2><div>${esc(d.id)}</div></div></div><div class="design-parties">${issuer}${customer}</div><div class="design-industrial-meta">${metadata}${project}</div><section class="design-schedule">${label('Détail des prestations')}${table}</section>${summary}${payment}${legal}`;
  } else {
    content = `<div class="design-heading design-orbytek-heading"><div>${identity}<p class="design-issuer-details">${invoiceAddress(biz)}${biz.vat ? '<br>TVA : '+esc(biz.vat) : ''}${biz.email ? '<br>'+esc(biz.email) : ''}</p></div><div class="design-document-reference">${label(title)}<strong>${esc(d.id)}</strong><span class="design-orbits" aria-hidden="true"></span></div></div><h2 class="design-hero-title">${title}</h2><div class="design-orbytek-parties">${metadata}${customer}</div>${project}${table}${summary}${payment}${legal}`;
  }
  return `<article class="document invoice-designed">${content}</article>`;
}
function documentHTML(d) {
  const a = cleanAppearance(d.appearance || company.appearance || DEFAULT_APPEARANCE);
  const designed = ['orbytek','architecture','industriel'].includes(a.template);
  const html = designed ? designedDocumentHTML(d,a.template) : a.template !== 'classique' ? navyDocumentHTML(d) : baseDocumentHTML(d);
  return html.replace('class="document', `style="--invoice-accent:${a.color};--invoice-on-accent:${accentText(a.color)}" class="document template-${a.template}${a.template === 'cuivre' ? ' template-bleu_nuit' : ''} font-sans`);
}
function documentActions(d) {
  return `<section class="no-print panel document-actions"><div class="filter-row document-toolbar"><span class="document-state"><span class="document-state-dot" aria-hidden="true"></span>${d.sentAt ? 'Envoyé le ' + new Date(d.sentAt).toLocaleString('fr-BE') : 'Enregistré'}</span><button onclick="sendDocument('${d.id}')">${d.sentAt ? 'Renvoyer par e-mail' : 'Envoyer par e-mail'}</button><button onclick="customizeDocument('${d.id}')">Modèle et aperçu</button>${!d.sentAt && !d.paid && !d.peppol ? `<button onclick="editDocument('${d.id}')">Modifier le contenu</button>${d.type === 'facture' ? `<button class="danger-button" onclick="deleteInvoice('${d.id}')">Supprimer la facture</button>` : ''}` : ''}${d.type === 'facture' ? `<button onclick="sendPeppolTest('${d.id}')">Peppol · test</button>` : ''}</div>${d.peppol ? `<p>Peppol test : demande enregistrée auprès du fournisseur. Vérifiez la livraison dans son tableau de bord.</p>` : ''}<div id="action-error" class="application-error" role="alert"></div></section>`;
}
async function deleteInvoice(id) {
  const d = docs.find(item => item.id === id);
  if (!d || featureBusy || busy) return;
  if (d.type !== 'facture' || d.sentAt || d.paid || d.peppol) return showError(new Error('Seule une facture non envoyée et non payée peut être supprimée.'));
  if (!confirm('Supprimer définitivement la facture ' + d.id + ' ? Son numéro ne sera pas réutilisé.')) return;
  featureBusy = true;
  try {
    const {data,error} = await db.rpc('delete_unsent_invoice',{target_document:d.dbId});
    if (error) throw error;
    if (data?.deleted !== true) throw new Error('Suppression non confirmée. Rechargez vos documents.');
    docs = docs.filter(item => item.dbId !== d.dbId);
    reminders = reminders.filter(item => item.document_id !== d.dbId);
    for (const source of docs) if (source.converted === d.id) delete source.converted;
    if (draft?.dbId === d.dbId) draft = null;
    go('docs'); toast('Facture supprimée.');
  } catch(error) { showError(error); }
  finally { featureBusy = false; }
}
function editDocument(id) {
  const d = docs.find(x => x.id === id);
  if (!d || d.sentAt || d.paid || d.peppol) return toast('Ce document ne peut plus être modifié.');
  if (draft) return toast('Terminez ou abandonnez le brouillon en cours.');
  draft = structuredClone(d); draft.dueManual = true; delete draft.customer; step = 2; go('wizard');
}
function customizeDocument(id) {
  appearanceTarget = id || null;
  const d = id ? docs.find(x => x.id === id) : draft;
  if (!d) return;
  appearanceDraft = cleanAppearance(d.appearance || company.appearance || DEFAULT_APPEARANCE);
  const dialog = featureDialog('Personnaliser le document', `<div class="template-editor"><div><label class="field">Modèle<select id="template-choice" onchange="updateAppearance('template',this.value)">${Object.entries(TEMPLATES).map(([key,label]) => `<option value="${key}" ${appearanceDraft.template === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label class="field">Couleur du document<input id="template-color" type="color" value="${appearanceDraft.color}" oninput="updateAppearance('color',this.value)"></label><button onclick="resetAppearance()">Retour au modèle par défaut</button><label class="field"><span><input id="default-appearance" type="checkbox"> Utiliser aussi pour mes prochains documents</span></label><button class="primary" onclick="saveAppearance()">Enregistrer le modèle</button></div><div id="template-preview" aria-live="polite"></div></div>`);
  dialog.classList.add('wide-dialog', 'appearance-dialog');
  dialog.addEventListener('close', () => $('#template-preview')?.previewObserver?.disconnect(), {once:true});
  drawAppearance();
}
function drawAppearance() {
  const d = appearanceTarget ? docs.find(x => x.id === appearanceTarget) : draft;
  const preview = $('#template-preview');
  preview.previewObserver?.disconnect();
  preview.innerHTML = `<div class="template-preview-page"><div class="template-preview-document">${documentHTML({...d, id:d.id || 'Aperçu · numéro à attribuer', appearance:appearanceDraft})}</div></div>`;
  const fit = () => fitAppearancePreview(preview);
  fit();
  if (typeof ResizeObserver === 'function') {
    preview.previewObserver = new ResizeObserver(() => requestAnimationFrame(fit));
    preview.previewObserver.observe(preview);
    preview.previewObserver.observe(preview.querySelector('.document'));
  }
}
function fitAppearancePreview(preview) {
  const page = preview.querySelector('.template-preview-page');
  const paper = preview.querySelector('.document');
  if (!page || !paper || !preview.isConnected) return;
  const style = getComputedStyle(preview);
  const width = preview.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  if (width <= 0 || !paper.offsetWidth) return;
  const scale = Math.min(1, width / paper.offsetWidth);
  page.style.width = `${paper.offsetWidth * scale}px`;
  page.style.height = `${Math.ceil(paper.offsetHeight * scale)}px`;
  preview.querySelector('.template-preview-document').style.transform = `scale(${scale})`;
}
function updateAppearance(k,v) { appearanceDraft[k]=v; if(k==='template'){appearanceDraft.color=TEMPLATE_COLORS[v];$('#template-color').value=appearanceDraft.color;} drawAppearance(); }
function resetAppearance() {
  appearanceDraft = {...DEFAULT_APPEARANCE};
  $('#template-choice').value=appearanceDraft.template; $('#template-color').value=appearanceDraft.color; drawAppearance();
}
async function saveAppearance() {
  if (featureBusy) return; featureBusy=true;
  try {
    const a = cleanAppearance(appearanceDraft);
    const d = appearanceTarget ? docs.find(x => x.id === appearanceTarget) : draft;
    if (appearanceTarget) {
      const {error} = await db.from('documents').update({appearance:a}).eq('id',d.dbId).eq('user_id',companyOwner());
      if (error) throw error;
    }
    d.appearance=a;
    if ($('#default-appearance').checked) {
      if (!company.name) throw Error('Enregistrez les coordonnées de votre entreprise avant de définir un modèle par défaut.');
      const {error} = await db.from('companies').update({appearance:a}).eq('user_id',companyOwner());
      if (error) throw error; company.appearance=a;
    }
    $('#feature-dialog').close(); render(); toast('Modèle enregistré.');
  } catch(e) { featureError(e); } finally {featureBusy=false;}
}
function askSend(id) {
  featureDialog('Facture enregistrée', `<p>Voulez-vous l’envoyer par e-mail au client ?</p><button class="primary" onclick="sendDocument('${id}')">Oui, préparer l’envoi</button> <button onclick="this.closest('dialog').close()">Plus tard</button>`);
}
async function documentPDF(d) {
  if (typeof html2pdf !== 'function') throw Error('Le générateur PDF est indisponible. Rechargez la page.');
  const wrapper = document.createElement('div');
  wrapper.className = 'pdf-export'; wrapper.style.width = '182mm';
  wrapper.innerHTML = documentHTML(d);
  return await html2pdf().set({margin:14,filename:documentFilename(d)+'.pdf',
    image:{type:'jpeg',quality:0.96},html2canvas:{scale:2,backgroundColor:'#ffffff',logging:false,windowWidth:1120},
    jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
    pagebreak:{mode:['css'],avoid:['tr','.document-heading','.invoice-parties','.total','.payment-qr','.invoice-payment','.document-legal','.design-heading','.design-parties','.design-orbytek-parties','.design-meta','.design-project','.design-architecture-footer','.design-legal']}
  }).from(wrapper).outputPdf('blob');
}
function documentFilename(d) { return String(d.id).replace(/[^a-zA-Z0-9_-]/g,'_'); }
function downloadAttachment(blob,name) {
  const url=URL.createObjectURL(blob), link=document.createElement('a');
  link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
function base64UTF8(value) {
  return btoa(Array.from(new TextEncoder().encode(value),b=>String.fromCharCode(b)).join(''));
}
function documentMailto(recipient,subject,body) {
  recipient=String(recipient).trim();
  if (!recipient || /[\r\n]/.test(recipient)) throw Error('Adresse e-mail invalide.');
  const text=String(body).replace(/\r\n|\r|\n/g,'\r\n');
  return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(String(subject).replace(/[\r\n]/g,' '))}&body=${encodeURIComponent(text)}`;
}
async function emailDraftBlob(pdf,filename,recipient,subject,body,sender='') {
  if (/[\r\n]/.test(recipient)) throw Error('Adresse e-mail invalide.');
  if (/[\r\n]/.test(sender)) throw Error('Adresse expéditeur invalide.');
  const bytes = new Uint8Array(await pdf.arrayBuffer());
  let binary=''; for(let i=0;i<bytes.length;i+=8192) binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  const wrap = s => s.match(/.{1,76}/g)?.join('\r\n') || '';
  const boundary='facture_'+Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
  // A normal saved message preserves attachments when forwarded in new Outlook.
  // X-Unsent is deliberately omitted: some new Outlook versions lose its PDF.
  const headers=[...(sender?['From: '+sender]:[]),'To: '+recipient,
    'Date: '+new Date().toUTCString(),
    'Subject: =?UTF-8?B?'+base64UTF8(subject.replace(/[\r\n]/g,' '))+'?=',
    'MIME-Version: 1.0','Content-Type: multipart/mixed; boundary="'+boundary+'"','',
    '--'+boundary,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',wrap(base64UTF8(body)),
    '--'+boundary,'Content-Type: application/pdf; name="'+filename+'"','Content-Disposition: attachment; filename="'+filename+'"',
    'Content-Transfer-Encoding: base64','',wrap(btoa(binary)),'--'+boundary+'--',''];
  return new Blob([headers.join('\r\n')],{type:'message/rfc822'});
}
async function prepareDocumentEmail(d,values) {
  const recipient=String(values.recipient || '').trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw Error('Adresse e-mail invalide.');
  const pdf=await documentPDF(d);
  return emailDraftBlob(pdf,documentFilename(d)+'.pdf',recipient,String(values.subject || ''),String(values.body || ''),account?.email || '');
}
function sendDocument(id) {
  const d = docs.find(x => x.id === id); if (!d) return;
  const c = d.customer || client(d);
  featureDialog('Envoyer le document', `<p>${esc(id)} · ${esc(c.name)}</p>${clients.find(x=>x.id===d.client)?.note ? `<p class="notice">Note interne : ${esc(clients.find(x=>x.id===d.client).note)}</p>` : ''}<p>Un seul bouton crée le fichier e-mail avec le PDF déjà joint. Ouvrez-le dans Outlook, puis transférez-le au destinataire indiqué.</p><form id="send-form"><label class="field">Destinataire<input name="recipient" type="email" required value="${esc(c.email)}"></label><label class="field">Objet<input name="subject" required value="${esc((d.type === 'facture' ? 'Facture ' : 'Devis ') + d.id)}"></label><label class="field">Message<textarea name="body" rows="6">${esc(`Bonjour,\n\nVeuillez trouver en pièce jointe ${d.type === 'facture' ? 'la facture' : 'le devis'} ${d.id}, pour un montant de ${euro(totals(d).total)}.\n\nBien à vous,\n${d.issuer?.name || company.name}`)}</textarea></label><button class="primary">Ouvrir ma messagerie</button></form><div id="send-confirm" aria-live="polite"></div>`);
  $('#send-form').onsubmit = async e => {
    e.preventDefault(); if(featureBusy)return; featureBusy=true;
    const submit=e.target.querySelector('button');submit.disabled=true;submit.textContent='Génération du PDF…';
    const f = new FormData(e.target), recipient=String(f.get('recipient')).trim(), subject=String(f.get('subject')), body=String(f.get('body'));
    try {
      const eml=await prepareDocumentEmail(d,{recipient,subject,body});
      const filename=documentFilename(d)+'.eml';
      downloadAttachment(eml,filename);
      $('#send-confirm').innerHTML=`<p>Ouvrez <strong>${esc(filename)}</strong> dans les téléchargements du navigateur. Dans Outlook, choisissez <strong>Transférer</strong>, renseignez <strong>${esc(recipient)}</strong> et envoyez le message. Le PDF est déjà joint.</p><p>Après l’envoi effectif dans Outlook :</p><button id="confirm-document-send">J’ai envoyé ce document</button>`;
      $('#confirm-document-send').onclick=()=>confirmDocumentSend(d,recipient);
    } catch(error) { featureError(error); }
    finally {featureBusy=false;submit.disabled=false;submit.textContent='Ouvrir ma messagerie';}
  };
}
async function confirmDocumentSend(d,recipient) {
  if(featureBusy) return; featureBusy=true;
  try {
    const {data,error}=await db.rpc('confirm_document_send',{document_id:d.dbId, recipient});
    if(error) throw error; d.sentAt=data; $('#feature-dialog').close(); render(); toast('Envoi confirmé par vous.');
  } catch(e){featureError(e);} finally{featureBusy=false;}
}
async function integration(action,d) {
  const {data,error}=await db.functions.invoke('invoice-integrations',{body:{action, documentId:d.dbId}});
  if(error) { let message='Service indisponible : vérifiez le déploiement et la configuration de invoice-integrations.'; try {message=(await error.context.json()).error || message;} catch {} throw Error(message); }
  if(data?.error) throw Error(data.error); return data;
}
function epcPayload(d, biz) {
  if (!validBelgianIBAN(biz.iban))
    throw Error(
      "QR de paiement indisponible : renseignez un IBAN belge valide dans Mon entreprise.",
    );
  const name = String(biz.name || "").trim(),
    reference = String(d.id || "");
  const amount = totals(d).total;
  if (
    !name ||
    name.length > 70 ||
    /[\r\n]/.test(name + reference) ||
    reference.length > 140
  )
    throw Error(
      "Nom du bénéficiaire ou communication incompatible avec le QR.",
    );
  if (!Number.isFinite(amount) || amount < 0.01 || amount > 999999999.99)
    throw Error("Montant incompatible avec le QR de paiement.");
  const payload = [
    "BCD",
    "002",
    "1",
    "SCT",
    "",
    name,
    biz.iban.replace(/\s/g, "").toUpperCase(),
    "EUR" + amount.toFixed(2),
    "",
    "",
    reference,
  ].join("\n");
  if (new TextEncoder().encode(payload).length > 331)
    throw Error("Données trop longues pour le QR de paiement.");
  return payload;
}
function paymentQR(d, biz) {
  if (d.type !== "facture" || d.paid) return "";
  if (!d.dbId)
    return '<p class="muted">Le QR de paiement sera disponible après l’enregistrement et l’attribution du numéro de facture.</p>';
  try {
    const payload = epcPayload(d, biz);
    if (typeof qrcode !== "function")
      throw Error(
        "Générateur QR indisponible. Le paiement par virement reste possible.",
      );
    const qr = qrcode(0, "M");
    qr.addData(payload, "Byte");
    qr.make();
    if (qr.getModuleCount() > 69)
      throw Error("Données trop longues pour le QR de paiement.");
    return `<div class="payment-qr">${qr.createSvgTag({ cellSize: 4, margin: 16, scalable: true })}<div><strong>Payer par virement</strong><p>Scannez avec votre application bancaire compatible EPC / SEPA.</p><p>${esc(biz.name)}<br>${esc(biz.iban)}<br>${euro(totals(d).total)} · ${esc(d.id)}</p></div></div>`;
  } catch (error) {
    return `<p class="notice qr-warning">${esc(error.message)}</p>`;
  }
}
async function sendPeppolTest(id) {
  const d=docs.find(x=>x.id===id); if(!d || featureBusy) return;
  if(d.peppol) return toast('Demande déjà transmise. Consultez le fournisseur pour son état.');
  if(!confirm('Transmettre cette facture au compte Peppol de test configuré ? Aucun envoi en production.')) return;
  featureBusy=true;
  try {const result=await integration('peppol-test',d); d.peppol=result.peppol; render(); toast('Demande de test acceptée. Vérifiez sa livraison chez le fournisseur.');} catch(e){featureError(e);} finally{featureBusy=false;}
}
interfaceOptions();
applyInterface('orbytek');
initialize();

// --- Dashboard activité -----------------------------------------------------
// Dashboard: CA HT; créances et règlements TTC. Aucun envoi automatique.
let dashboardPeriod = '12months', dashboardCustomStart = '', dashboardCustomEnd = '';
const dashDay = 86400000;
function dashDate(s) { if (!s) return null; const d = new Date(String(s).slice(0,10)+'T12:00:00'); return Number.isNaN(+d) ? null : d; }
function dashISO(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function dashShift(d,n) { return new Date(d.getFullYear(),d.getMonth()+n,Math.min(d.getDate(),new Date(d.getFullYear(),d.getMonth()+n+1,0).getDate()),12); }
function dashRange() {
  const end=dashDate(today()); let start=new Date(end.getFullYear(),end.getMonth(),1,12);
  if(dashboardPeriod==='30days') start=new Date(+end-29*dashDay);
  if(/^(3|6|12)months$/.test(dashboardPeriod)) start=new Date(end.getFullYear(),end.getMonth()-parseInt(dashboardPeriod)+1,1,12);
  if(dashboardPeriod==='year') start=new Date(end.getFullYear(),0,1,12);
  if(dashboardPeriod==='custom') return {start:dashDate(dashboardCustomStart),end:dashDate(dashboardCustomEnd)};
  return {start,end};
}
function dashWithin(d,a,b,key='date') { const v=dashDate(d[key]); return v && v>=a && v<=b; }
function dashSum(a,key='net') { return round(a.reduce((s,d)=>s+totals(d)[key],0)); }
function dashPct(a,b) { return b>0 ? (a-b)/b*100 : null; }
function dashTrend(a,b) { const p=dashPct(a,b); return p===null?'Comparaison indisponible':`${p>=0?'↗ +':'↘ '}${p.toLocaleString('fr-BE',{maximumFractionDigits:1})} %`; }
function dashInvoices() { return docs.filter(d=>d.type==='facture'); }
function dashProducts(list) {
  const map=new Map(); list.forEach(d=>(d.lines||[]).forEach(l=>{
    const name=(l.name||'Prestation').trim(), key=name.toLocaleLowerCase('fr');
    const p=map.get(key)||{key,name,total:0,qty:0}; p.total+=round(Number(l.qty)*Number(l.price)); p.qty+=Number(l.qty); map.set(key,p);
  })); return [...map.values()].sort((a,b)=>b.total-a.total);
}
function dashClients(list) {
  const map=new Map(); list.forEach(d=>{const key=d.client||d.dbId, c=map.get(key)||{key,name:client(d).name,total:0,count:0}; c.total+=totals(d).net;c.count++;map.set(key,c);});
  return [...map.values()].sort((a,b)=>b.total-a.total);
}
function dashPaymentStats(list) {
  const known=list.filter(d=>d.paid&&dashDate(d.paidAt)&&dashDate(d.date)&&d.paidAt>=d.date);
  const avg=a=>a.length?a.reduce((s,d)=>s+Math.round((dashDate(d.paidAt)-dashDate(d.date))/dashDay),0)/a.length:null;
  const groups=dashClients(known).map(c=>({...c,days:avg(known.filter(d=>d.client===c.key))})).filter(c=>c.days!==null).sort((a,b)=>a.days-b.days);
  return {known,average:avg(known),groups};
}
function dashTable(headers,rs) { return `<div class="dash-scroll"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rs.length?rs.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}">Aucune donnée sur cette période.</td></tr>`}</tbody></table></div>`; }
function dashOpenDocs(title,list) {
  const dialog=featureDialog(title,dashTable(['Facture / client','Date','HT','TTC','Actions'],list.map((d,i)=>[
    `${esc(d.id)}<br>${esc(client(d).name)}`,esc(d.date),euro(totals(d).net),euro(totals(d).total),`<button data-open="${i}">Ouvrir</button>${!d.paid&&d.due&&d.due<today()?` <button data-remind="${i}">Relancer</button>`:''}${d.paid&&!d.paidAt?` <button data-date="${i}">Date de paiement</button>`:''}`])));
  dialog.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{dialog.close();go('view/'+list[+b.dataset.open].id);});
  dialog.querySelectorAll('[data-remind]').forEach(b=>b.onclick=()=>remindClient(list[+b.dataset.remind].id));
  dialog.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>dashSetPaymentDate(list[+b.dataset.date]));
}
async function dashSetPaymentDate(d) {
  if(busy)return;const value=prompt('Date réelle du paiement (AAAA-MM-JJ)',today());if(value===null)return;
  if(!validDate(value)||value>today()||value<d.date)return toast('Date de paiement invalide.');
  busy=true;try {const {error}=await db.from('documents').update({paid_at:value}).eq('id',d.dbId).eq('user_id',companyOwner());if(error)throw error;d.paidAt=value;$('#feature-dialog')?.close();render();}catch(e){if(['42703','PGRST204'].includes(e.code))toast('Exécutez dashboard.sql dans Supabase pour enregistrer les dates de paiement.');else showError(e);}finally{busy=false;}
}
function dashKpi(kind) {
  const all=dashInvoices(),now=dashDate(today()),m=new Date(now.getFullYear(),now.getMonth(),1,12),y=new Date(now.getFullYear(),0,1,12);
  const list=kind==='unpaid'?all.filter(d=>!d.paid):kind==='late'?all.filter(d=>!d.paid&&d.due&&d.due<today()):all.filter(d=>dashWithin(d,kind==='year'?y:m,now));
  if(kind==='average')return featureDialog('Panier moyen HT · ce mois',dashTable(['Client','Factures','Panier moyen HT'],dashClients(list).map(c=>[esc(c.name),c.count,euro(c.total/c.count)])));
  dashOpenDocs({month:'CA du mois · factures',unpaid:'Factures à encaisser',late:'Factures en retard',year:'CA de l’année · factures'}[kind],list);
}
function dashBuckets(start,end) {
  const daily=(end-start)/dashDay<=40, result=[];
  for(let d=new Date(start);d<=end;d=daily?new Date(+d+dashDay):new Date(d.getFullYear(),d.getMonth()+1,1,12)) {
    const stop=daily?new Date(d):new Date(Math.min(+end,+new Date(d.getFullYear(),d.getMonth()+1,0,12)));
    result.push({start:new Date(d),end:stop,label:d.toLocaleDateString('fr-BE',daily?{day:'numeric',month:'short'}:{month:'short',year:'2-digit'})});
  }return result;
}
function dashBucketDetail(start,end) {
  const all=dashInvoices(),a=dashDate(start),b=dashDate(end),list=all.filter(d=>dashWithin(d,a,b)),received=all.filter(d=>d.paid&&dashWithin(d,a,b,'paidAt'));
  const newClients=new Set(list.filter(d=>d.client&&!all.some(x=>x.client===d.client&&x.date<start)).map(d=>d.client)).size;
  featureDialog(`${fmt(start)} — ${fmt(end)}`,`<p>Facturé HT : <strong>${euro(dashSum(list))}</strong> · Encaissé TTC daté : <strong>${euro(dashSum(received,'total'))}</strong></p><p>${list.length} facture(s) · Panier moyen HT : ${euro(list.length?dashSum(list)/list.length:0)} · ${newClients} client(s) facturé(s) pour la première fois</p>${dashTable(['Facture','Client','HT'],list.map(d=>[esc(d.id),esc(client(d).name),euro(totals(d).net)]))}`);
}
function dashRecurring(all) {
  const list=all.filter(d=>d.recurrence&&dashDate(d.recurrence.next)&&['monthly','quarterly','yearly'].includes(d.recurrence.frequency));
  const now=dashDate(today()),start=new Date(now.getFullYear(),now.getMonth()+1,1,12),end=new Date(now.getFullYear(),now.getMonth()+2,0,12);
  let planned=0;list.forEach(d=>{let r={...d.recurrence};for(let i=0;i<2400&&dashDate(r.next)<=end;i++){if(dashDate(r.next)>=start)planned+=totals(d).net; r={...r,next:advanceDate(r)};}});
  return {list:list.sort((a,b)=>a.recurrence.next.localeCompare(b.recurrence.next)),monthly:list.reduce((s,d)=>s+totals(d).net/({monthly:1,quarterly:3,yearly:12}[d.recurrence.frequency]),0),planned};
}
function dashPaymentChanges(all,start,end) {
  const current=dashPaymentStats(all.filter(d=>dashWithin(d,start,end,'paidAt')));
  const days=Math.round((end-start)/dashDay)+1, previousEnd=new Date(+start-dashDay), previousStart=new Date(+start-days*dashDay);
  const previous=dashPaymentStats(all.filter(d=>dashWithin(d,previousStart,previousEnd,'paidAt')));
  return {current,previous,slower:current.groups.map(c=>({...c,before:previous.groups.find(p=>p.key===c.key)})).filter(c=>c.before&&c.days>c.before.days)};
}
function dashAnalysis() {
  const {start,end}=dashRange();if(!start||!end||start>end)return;
  const all=dashInvoices(),list=all.filter(d=>dashWithin(d,start,end)),prev=all.filter(d=>dashWithin(d,dashShift(start,-12),dashShift(end,-12))),cs=dashClients(list),ps=dashProducts(list),sum=dashSum(list),late=all.filter(d=>!d.paid&&d.due&&d.due<today()),stats=dashPaymentStats(list);
  featureDialog('Analyse de mon activité',`<p>${fmt(dashISO(start))} — ${fmt(dashISO(end))}</p><ul class="dash-summary"><li>Vous avez facturé <strong>${euro(sum)} HT</strong> sur ${list.length} facture(s). ${dashTrend(sum,dashSum(prev))} par rapport aux mêmes dates l’année précédente.</li>${ps[0]&&sum?`<li>Votre première prestation, <strong>${esc(ps[0].name)}</strong>, représente ${Math.round(ps[0].total/sum*100)} % du CA.</li>`:''}${cs[0]&&sum?`<li>Votre premier client, <strong>${esc(cs[0].name)}</strong>, représente ${Math.round(cs[0].total/sum*100)} % du CA.</li>`:''}<li>${late.length} facture(s) échue(s) : <strong>${euro(dashSum(late,'total'))} TTC</strong>, dont ${euro(dashSum(late.filter(d=>(dashDate(today())-dashDate(d.due))/dashDay>30),'total'))} depuis plus de 30 jours.</li><li>${stats.average===null?'Délai de paiement indisponible : aucune date connue.':`Délai moyen : ${stats.average.toFixed(1)} jours sur ${stats.known.length} facture(s) payée(s) datée(s) de la période.`}</li></ul><p class="muted">Observations calculées à partir de vos données, sans IA et sans prévision de ventes.</p>`);
}
function dashboard() {
  const all=dashInvoices(),now=dashDate(today()),{start,end}=dashRange();
  const filters=`<div class="dash-period">${[['month','Ce mois'],['30days','30 jours'],['3months','3 mois'],['6months','6 mois'],['12months','12 mois'],['year','Année'],['custom','Personnalisé']].map(([v,l])=>`<button class="${dashboardPeriod===v?'active':''}" onclick="dashboardPeriod='${v}';render()">${l}</button>`).join('')}</div>${dashboardPeriod==='custom'?`<div class="form-grid"><label>Du<input type="date" value="${esc(dashboardCustomStart)}" onchange="dashboardCustomStart=this.value;render()"></label><label>Au<input type="date" value="${esc(dashboardCustomEnd)}" onchange="dashboardCustomEnd=this.value;render()"></label></div>`:''}`;
  const heading=`<div class="dash-heading"><div><div class="eyebrow">Pilotage de votre activité</div><h1>Dashboard</h1><p>Vos revenus, vos clients et les prochaines actions.</p></div><button class="primary" onclick="dashAnalysis()">✦ Analyser mon activité</button></div>${filters}`;
  if(!start||!end||start>end||(end-start)/dashDay>3660)return `<section class="dashboard-page">${heading}<p class="notice">Choisissez une période valide (maximum 10 ans).</p></section>`;
  const period=all.filter(d=>dashWithin(d,start,end)),ca=dashSum(period),cs=dashClients(period),ps=dashProducts(period);
  const ms=new Date(now.getFullYear(),now.getMonth(),1,12),ys=new Date(now.getFullYear(),0,1,12),month=all.filter(d=>dashWithin(d,ms,now)),previous=all.filter(d=>dashWithin(d,dashShift(ms,-1),dashShift(now,-1))),year=all.filter(d=>dashWithin(d,ys,now)),previousYear=all.filter(d=>dashWithin(d,dashShift(ys,-12),dashShift(now,-12)));
  const unpaid=all.filter(d=>!d.paid),late=unpaid.filter(d=>d.due&&d.due<today()),avg=month.length?dashSum(month)/month.length:0,prevAvg=previous.length?dashSum(previous)/previous.length:0;
  const kpi=(kind,label,value,sub,cls='')=>`<button class="dash-kpi ${cls}" onclick="dashKpi('${kind}')"><span>${label}</span><strong>${euro(value)}</strong><small>${sub}</small></button>`;
  const buckets=dashBuckets(start,end).map(b=>({...b,total:dashSum(all.filter(d=>dashWithin(d,b.start,b.end))),prior:dashSum(all.filter(d=>dashWithin(d,dashShift(b.start,-12),dashShift(b.end,-12)))),received:dashSum(all.filter(d=>d.paid&&dashWithin(d,b.start,b.end,'paidAt')),'total')}));
  const max=Math.max(1,...buckets.flatMap(b=>[b.total,b.prior,b.received]));
  const paid=period.filter(d=>d.paid),overdue=period.filter(d=>!d.paid&&d.due&&d.due<today()),waiting=period.length-paid.length-overdue.length,pct=n=>period.length?n/period.length*100:0;
  const stats=dashPaymentStats(period),unknown=all.filter(d=>d.paid&&!dashDate(d.paidAt)),rec=dashRecurring(all),concentration=ca?cs.slice(0,3).reduce((s,c)=>s+c.total,0)/ca*100:0;
  const paymentChanges=dashPaymentChanges(all,start,end);
  const recurringShare=ca?dashSum(period.filter(d=>d.recurrence))/ca*100:0;
  const priorProducts=dashProducts(all.filter(d=>dashWithin(d,dashShift(start,-12),dashShift(end,-12))));
  const baseline=dashProducts(all.filter(d=>dashWithin(d,dashShift(ms,-3),new Date(+ms-dashDay)))),currentProducts=dashProducts(month);
  const declines=baseline.map(p=>({...p,current:currentProducts.find(x=>x.key===p.key)?.total||0,baseline:p.total/3})).filter(p=>p.current<p.baseline).sort((a,b)=>(a.current/a.baseline)-(b.current/b.baseline));
  const card=(title,body)=>`<section class="dash-card"><div class="dash-card-head"><h2>${title}</h2></div>${body}</section>`;
  const clientRows=cs.map(c=>[esc(c.name),euro(c.total),c.count,`${ca?(c.total/ca*100).toFixed(1):0} %`]);
  return `<section class="dashboard-page">${heading}<p class="dash-footnote">CA et prestations hors TVA · Créances et encaissements TTC · Paiements déclarés manuellement. Les KPI mensuels et annuels portent sur aujourd’hui ; les blocs ci-dessous suivent la période choisie.</p>
  ${vatDashboard()}
  <div class="dash-kpis">${kpi('month','CA ce mois · HT',dashSum(month),dashTrend(dashSum(month),dashSum(previous))+' vs mois précédent à date','featured')}${kpi('unpaid','À encaisser · TTC',dashSum(unpaid,'total'),unpaid.length+' factures · toutes dates')}${kpi('late','En retard · TTC',dashSum(late,'total'),late.length+' factures · toutes dates','danger')}${kpi('average','Panier moyen du mois · HT',avg,dashTrend(avg,prevAvg)+' vs mois précédent à date')}${kpi('year','CA cette année · HT',dashSum(year),dashTrend(dashSum(year),dashSum(previousYear))+' vs année précédente à date')}</div>
  ${card(`Chiffre d’affaires · ${fmt(dashISO(start))} — ${fmt(dashISO(end))}`,`<div class="dash-chart-legend"><span>● Facturé HT</span><span>● Même période N−1 HT</span><span>● Encaissé TTC daté</span></div><div class="dash-chart-scroll"><div class="dash-comparison" style="--cols:${buckets.length}">${buckets.map(b=>`<button class="dash-chart-column" onclick="dashBucketDetail('${dashISO(b.start)}','${dashISO(b.end)}')" aria-label="${esc(b.label)} : facturé ${euro(b.total)}, précédent ${euro(b.prior)}, encaissé ${euro(b.received)}" title="Facturé HT : ${euro(b.total)} · N−1 : ${euro(b.prior)} · Encaissé TTC : ${euro(b.received)}"><span class="dash-chart-bars">${[b.total,b.prior,b.received].map((n,i)=>`<i class="series-${i}" style="height:${n/max*100}%"></i>`).join('')}</span><small>${esc(b.label)}</small></button>`).join('')}</div></div><p class="dash-footnote">Cliquez sur une date pour le détail. Total facturé : <b>${euro(ca)} HT</b>. ${unknown.length} facture(s) payée(s) sans date exclue(s) de la série d’encaissements.</p>`)}
  <div class="dash-two">${card('Top clients',dashTable(['Client','CA HT','Factures','Part'],clientRows.slice(0,5))+`<details><summary>Voir tous les clients (${cs.length})</summary>${dashTable(['Client','CA HT','Factures','Part'],clientRows)}</details><p class="dash-insight">Vos ${Math.min(3,cs.length)} premiers clients représentent <strong>${concentration.toFixed(1)} %</strong> du CA sélectionné.</p>`)}
  ${card('Top prestations',dashTable(['Prestation','CA HT','Quantité','Prix moyen HT','Part','Évolution N−1'],ps.map(p=>[esc(p.name),euro(p.total),p.qty.toLocaleString('fr-BE'),euro(p.qty?p.total/p.qty:0),`${ca?(p.total/ca*100).toFixed(1):0} %`,dashTrend(p.total,priorProducts.find(x=>x.key===p.key)?.total||0)]))+`<p class="dash-footnote">Regroupement par libellé. Le CA ne mesure pas la rentabilité : les coûts ne sont pas enregistrés.</p>`)}</div>
  <div class="dash-two">${card('Suivi des paiements',`<div class="dash-payment-grid"><div class="dash-donut" style="background:conic-gradient(var(--green) 0 ${pct(paid.length)}%,#d8a83e ${pct(paid.length)}% ${pct(paid.length+waiting)}%,#a52b20 ${pct(paid.length+waiting)}% 100%)"><div><strong>${pct(paid.length).toFixed(0)} %</strong><small>payées</small></div></div><div>${[['Payées',paid.length],['En attente',waiting],['En retard',overdue.length]].map(([label,n])=>`<p>${label} : <b>${n} · ${pct(n).toFixed(0)} %</b></p>`).join('')}</div></div>${paymentChanges.current.average!==null&&paymentChanges.previous.average!==null?`<p>Évolution par date de paiement : ${paymentChanges.previous.average.toFixed(1)} → ${paymentChanges.current.average.toFixed(1)} jours (période précédente de même durée).</p>`:''}<p>Délai moyen : <strong>${stats.average===null?'Non disponible':stats.average.toFixed(1)+' jours'}</strong> · ${stats.known.length} paiement(s) daté(s).</p>${stats.groups.length?`<p>Le plus rapide : ${esc(stats.groups[0].name)} · ${stats.groups[0].days.toFixed(1)} j (${stats.groups[0].count} factures)<br>Le plus lent : ${esc(stats.groups.at(-1).name)} · ${stats.groups.at(-1).days.toFixed(1)} j (${stats.groups.at(-1).count} factures)</p>`:''}<p class="dash-footnote">Statut actuel des factures émises sur la période, en nombre de factures.</p>${unknown.length?`<button onclick="dashOpenDocs('Dates de paiement manquantes',dashInvoices().filter(d=>d.paid&&!dashDate(d.paidAt)))">Compléter ${unknown.length} date(s) manquante(s)</button>`:''}`)}
  ${card('Revenus récurrents',`<div class="dash-recurring-value">${euro(rec.monthly)} <small>HT / mois</small></div><p>${rec.list.length} récurrence(s) configurée(s) · montant mensualisé</p><p>${recurringShare.toFixed(1)} % du CA sélectionné porte une récurrence.</p><p class="dash-footnote">Part des factures avec une récurrence attachée uniquement : les copies sans lien d’abonnement ne sont pas identifiables.</p><p><strong>CA déjà planifié le mois prochain : ${euro(rec.planned)} HT</strong></p><p class="dash-footnote">Échéances récurrentes projetées uniquement. Aucune facture ni aucun envoi automatique. Les retards à préparer restent dans Abonnements.</p>${dashTable(['Prochaine échéance','Client','HT'],rec.list.slice(0,5).map(d=>[esc(d.recurrence.next),esc(client(d).name),euro(totals(d).net)]))}<a href="#recurring">Gérer les abonnements →</a>`)}</div>
  ${card('À surveiller',`<div class="dash-attention">${paymentChanges.slower.map(c=>`<div><b>${esc(c.name)} · paiement plus lent</b><span>${c.before.days.toFixed(1)} → ${c.days.toFixed(1)} jours · ${c.before.count} puis ${c.count} paiement(s) daté(s)</span></div>`).join('')}${late.sort((a,b)=>a.due.localeCompare(b.due)).slice(0,5).map(d=>`<button onclick="dashKpi('late')"><b>${esc(d.id)} · ${esc(client(d).name)}</b><span>${Math.round((now-dashDate(d.due))/dashDay)} jours de retard · ${euro(totals(d).total)} TTC</span><strong>Voir / relancer →</strong></button>`).join('')||'<p>Aucune facture en retard.</p>'}<button onclick="dashKpi('month')"><b>Évolution mensuelle du CA</b><span>${dashTrend(dashSum(month),dashSum(previous))} vs mois précédent à date</span></button>${concentration>=40?`<div><b>Dépendance clients</b><span>${concentration.toFixed(1)} % du CA provient des ${Math.min(3,cs.length)} premiers clients.</span></div>`:''}</div>`)}
  ${card('Prestations en baisse · mois en cours',dashTable(['Prestation','CA HT à ce jour','Moyenne mensuelle des 3 mois complets précédents','Écart'],declines.map(p=>[esc(p.name),euro(p.current),euro(p.baseline),dashTrend(p.current,p.baseline)]))+`<p class="dash-footnote">Le mois en cours est incomplet : cet écart est un signal à vérifier, pas une baisse définitive.</p>`)}
  </section>`;
}
