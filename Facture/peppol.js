// Peppol workspace. Provider credentials never enter the browser.
const PEPPOL_STATES={draft:'En préparation',sending:'En cours d’envoi',sent:'Envoyée',delivered:'Livrée',failed:'Échec',unknown:'Statut inconnu',received:'Reçue'};
const PEPPOL_RESPONSES={AB:'Réception confirmée',IP:'En traitement',UQ:'Informations demandées',CA:'Acceptée sous conditions',RE:'Rejetée',AP:'Acceptée',PD:'Paiement signalé'};
let peppolState={scope:'',phase:'idle',rows:[],events:[],company:null,environment:'playground',error:'',isOwner:false};
let peppolTab='outgoing',peppolQuery='',peppolFilter='',peppolPage=1,peppolBusy=false;
const peppolScope=()=>account?`${account.id}:${companyOwner()}:${sessionGeneration}`:'';
const peppolText=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr');
const peppolDate=s=>s?new Date(s.length===10?s+'T12:00:00':s).toLocaleString('fr-BE',s.length===10?{dateStyle:'short'}:{dateStyle:'short',timeStyle:'short'}):'—';
const peppolMoney=r=>r.amount==null?'Montant indisponible':new Intl.NumberFormat('fr-BE',{style:'currency',currency:/^[A-Z]{3}$/.test(r.currency)?r.currency:'EUR'}).format(r.amount);
function peppolBadge(status) {return `<span class="peppol-badge peppol-${esc(status)}">${esc(PEPPOL_STATES[status]||status)}</span>`;}
async function peppolApi(action,values={}) {
  const scope=peppolScope();
  const {data,error}=await db.functions.invoke('peppol',{body:{action,...values}});
  if(scope!==peppolScope())throw Error('La session a changé. Rechargez cet espace.');
  if(error){let message='Le service Peppol est indisponible. Vérifiez son déploiement et la configuration serveur.';try{message=(await error.context.json()).error||message;}catch{}throw Error(message);}
  if(data?.error)throw Error(data.error);return data;
}
async function loadPeppol() {
  const scope=peppolScope();if(!scope)return;
  if(peppolState.scope===scope&&peppolState.phase==='loading')return;
  const old=peppolState.scope===scope?peppolState:null;
  peppolState={scope,phase:'loading',rows:old?.rows||[],events:old?.events||[],company:old?.company||null,environment:old?.environment||'playground',error:'',isOwner:false};
  try {
    const status=await peppolApi('status');
    const rows=[];
    for(let offset=0;;offset+=500){
      const result=await db.from('peppol_documents').select('*').eq('user_id',companyOwner()).eq('environment',status.environment).order('created_at',{ascending:false}).order('id').range(offset,offset+499);
      if(result.error)throw result.error;rows.push(...result.data);if(result.data.length<500)break;
    }
    const history=await db.from('peppol_events').select('*').eq('user_id',companyOwner()).eq('environment',status.environment).order('id',{ascending:false}).limit(200);
    if(history.error)throw history.error;
    if(scope!==peppolScope())return;
    peppolState={scope,phase:'ready',rows,events:history.data,company:status.company,environment:status.environment,error:'',isOwner:status.isOwner};
    for(const row of rows.filter(r=>r.direction==='outgoing'&&r.kind==='invoice'&&r.source_id)){
      const original=docs.find(d=>d.dbId===row.source_id);
      if(original&&['sending','sent','delivered','unknown'].includes(row.status))original.peppol={mode:status.environment,moduleId:row.id,status:row.status};
    }
    if(old?.phase==='ready'){
      const added=rows.filter(r=>r.direction==='incoming'&&!old.rows.some(o=>o.id===r.id));
      if(added.length)toast(`${added.length} nouveau(x) document(s) Peppol reçu(s).`);
    }
  }catch(error){if(scope!==peppolScope())return;peppolState.phase='error';peppolState.error=error.message||'Chargement impossible.';}
  if(location.hash==='#peppol')render();
  const badge=document.querySelector('[data-peppol-unread]');
  if(badge){const n=peppolState.rows.filter(r=>r.direction==='incoming'&&!r.read_at).length;badge.textContent=n?String(n):'';badge.hidden=!n;}
}
function peppolRows() {
  const rows=peppolState.rows.filter(r=>r.direction===peppolTab);
  if(peppolTab==='outgoing') for(const doc of docs.filter(d=>d.type==='facture')) {
    if(!rows.some(r=>r.source_id===doc.dbId&&r.kind==='invoice'))rows.push({id:'',source_id:doc.dbId,number:doc.id,party_name:client(doc).name,kind:'invoice',direction:'outgoing',amount:totals(doc).total,currency:'EUR',due_date:doc.due,status:'draft',created_at:doc.date});
  }
  return rows.filter(r=>peppolText([r.number,r.party_name,r.party_vat].join(' ')).includes(peppolText(peppolQuery))&&(!peppolFilter||r.status===peppolFilter||(peppolFilter==='unread'&&!r.read_at)||(peppolFilter==='unpaid'&&!r.paid_at)||(peppolFilter===r.review_state)));
}
function peppolView() {
  if(peppolState.scope!==peppolScope()){peppolState={scope:peppolScope(),phase:'idle',rows:[],events:[],company:null,environment:'playground',error:'',isOwner:false};peppolPage=1;}
  if(peppolState.phase==='idle')queueMicrotask(loadPeppol);
  const all=peppolState.rows,out=all.filter(r=>r.direction==='outgoing'),inc=all.filter(r=>r.direction==='incoming'&&['invoice','creditNote'].includes(r.kind)),ready=peppolState.phase==='ready';
  const kpis=[['docs','Documents envoyés',out.filter(r=>r.provider_id).length,'Acceptés par le fournisseur'],['check','Livrés',out.filter(r=>r.status==='delivered').length,'Transmission Peppol confirmée'],['clock','À traiter',inc.filter(r=>!r.read_at||r.review_state==='to_review').length,'Documents fournisseurs'],['settings','Échecs',out.filter(r=>r.status==='failed').length,'À examiner avant une nouvelle tentative']];
  return `<section class="peppol-page" aria-busy="${peppolState.phase==='loading'}"><div class="peppol-heading"><div><h1>${uiIcon('peppol')} Peppol</h1><p>Envoyez et recevez vos factures électroniques, au même endroit.</p></div><div class="peppol-actions"><span class="peppol-environment">${peppolState.environment==='production'?'Production':'Playground · essais'}</span><button onclick="peppolSelectTab('settings')">${uiIcon('settings')} Paramètres Peppol</button><button ${peppolBusy?'disabled':''} onclick="peppolSync()">${uiIcon('recurring')} Synchroniser</button></div></div>
  ${peppolState.environment==='playground'?'<p class="peppol-notice">Espace de test : les documents affichés ici sont séparés de la production.</p>':''}
  ${peppolState.phase==='error'?`<div class="application-error" role="alert">${esc(peppolState.error)} <button onclick="loadPeppol()">Réessayer</button></div>`:''}
  ${peppolState.phase==='loading'?'<p role="status">Chargement de votre espace Peppol…</p>':''}
  <div class="peppol-kpis">${kpis.map(([icon,label,count,note],i)=>`<article class="peppol-kpi kpi-${i}"><span class="peppol-kpi-icon">${uiIcon(icon)}</span><div><span>${label}</span><strong>${ready?count:'—'}</strong><small>${note}</small></div></article>`).join('')}</div>
  <div class="peppol-panel"><nav class="peppol-tabs" aria-label="Rubriques Peppol">${[['outgoing','docs','Factures émises'],['incoming','clients','Factures reçues'],['history','clock','Historique'],['dashboard','dashboard','Tableau de bord'],['settings','settings','Paramètres']].map(([key,icon,label])=>`<button aria-pressed="${peppolTab===key}" class="${peppolTab===key?'active':''}" onclick="peppolSelectTab('${key}')">${uiIcon(icon)} ${label}${key==='incoming'&&inc.some(r=>!r.read_at)?` <span class="peppol-count">${inc.filter(r=>!r.read_at).length}</span>`:''}</button>`).join('')}</nav>
  ${peppolTab==='settings'?peppolSettings():peppolTab==='dashboard'?peppolDashboard():peppolTab==='history'?peppolHistory():`<div class="peppol-filters"><label class="list-search">${uiIcon('search')}<input type="search" aria-label="Rechercher une facture Peppol" placeholder="Numéro, client ou fournisseur…" value="${esc(peppolQuery)}" oninput="peppolQuery=this.value;peppolPage=1;peppolDrawTable()"></label><label>Statut<select onchange="peppolFilter=this.value;peppolPage=1;peppolDrawTable()"><option value="">Tous les statuts</option>${(peppolTab==='incoming'?[['unread','Non lues'],['to_review','À vérifier'],['verified','Vérifiées'],['disputed','À contester'],['unpaid','Non payées']]:Object.entries(PEPPOL_STATES).filter(([k])=>k!=='received')).map(([k,l])=>`<option value="${k}" ${peppolFilter===k?'selected':''}>${l}</option>`).join('')}</select></label>${peppolTab==='outgoing'?'<button onclick="peppolVerifyRecipient()">Vérifier un destinataire</button>':''}</div><div id="peppol-table">${peppolTable()}</div>`}</div>
  <p class="peppol-footnote">La livraison confirme une transmission, pas une lecture ni un paiement. Les réponses du destinataire sont affichées lorsqu’elles sont disponibles.</p></section>`;
}
function peppolSelectTab(tab){peppolTab=tab;peppolPage=1;peppolFilter='';peppolQuery='';render();}
function peppolDrawTable(){const target=$('#peppol-table');if(target)target.innerHTML=peppolTable();}
function peppolTable() {
  if(peppolState.phase!=='ready')return '<div class="empty">La liste sera disponible après le chargement du service Peppol.</div>';
  const rows=peppolRows(),pages=Math.max(1,Math.ceil(rows.length/10));peppolPage=Math.min(peppolPage,pages);
  const incoming=peppolTab==='incoming';
  const body=rows.slice((peppolPage-1)*10,peppolPage*10).map(r=>{
    const original=docs.find(d=>d.dbId===r.source_id),canSend=!incoming&&r.source_id&&['draft','failed'].includes(r.status)&&!r.provider_id;
    return `<tr><td>${esc(peppolDate(r.provider_created_at||r.created_at))}</td><td><div class="peppol-party"><span class="peppol-avatar">${esc(Array.from(r.party_name||'?')[0])}</span><div><strong>${esc(r.party_name)}</strong><small>${esc(r.party_vat||'')}</small></div></div></td><td>${esc(r.number)}${r.kind==='creditNote'?'<small>Note de crédit</small>':!['invoice','creditNote'].includes(r.kind)?`<small>${esc(r.kind)}</small>`:''}</td><td class="peppol-amount">${esc(peppolMoney(r))}</td><td>${esc(peppolDate(r.due_date))}</td><td>${incoming?`${r.read_at?peppolBadge('received'):'<span class="peppol-badge peppol-unread">Non lue</span>'}<small>${r.paid_at?'Payée':({to_review:'À vérifier',verified:'Vérifiée',disputed:'À contester'})[r.review_state]||''}</small>`:peppolBadge(r.status)}${r.business_response?`<small>${esc(PEPPOL_RESPONSES[r.business_response]||r.business_response)}</small>`:''}</td><td><div class="peppol-row-actions">${r.id?`<button data-peppol-view="${esc(r.id)}">Voir</button>${r.provider_id?`<button data-peppol-file="${esc(r.id)}" data-type="pdf">PDF</button><button data-peppol-file="${esc(r.id)}" data-type="xml">XML</button>`:''}`:original?`<button data-peppol-source="${esc(original.id)}">Voir</button>`:''}${canSend?`<button class="primary" data-peppol-${r.kind==='creditNote'?'credit':'send'}="${esc(r.source_id)}">${r.status==='failed'?'Réessayer':'Envoyer'}</button>`:''}${original?`<button data-peppol-test="${esc(original.id)}">Test existant</button>`:''}</div></td></tr>`;
  }).join('');
  return `<div class="peppol-table-scroll"><table><thead><tr><th>${incoming?'Réception':'Date'}</th><th>${incoming?'Fournisseur':'Client'}</th><th>Numéro</th><th>Montant TTC</th><th>Échéance</th><th>Statut</th><th>Actions</th></tr></thead><tbody>${body||'<tr><td colspan="7"><div class="empty">Aucun document ne correspond à cette liste.</div></td></tr>'}</tbody></table></div><div class="peppol-pagination"><span>${rows.length} document(s) · 10 par page</span><div><button ${peppolPage===1?'disabled':''} onclick="peppolPage--;peppolDrawTable()">Précédent</button><span>${peppolPage} / ${pages}</span><button ${peppolPage===pages?'disabled':''} onclick="peppolPage++;peppolDrawTable()">Suivant</button></div></div>`;
}
function peppolSettings() {
  const c=peppolState.company,owner=peppolState.isOwner;
  return `<div class="peppol-settings"><h2>Activation Peppol de ${esc(company.name||'votre entreprise')}</h2><ol class="peppol-steps"><li><strong>1. Informations de l’entreprise</strong><p>Nom, BCE, TVA et adresse structurée.</p><a href="#company">Vérifier mes coordonnées</a></li><li><strong>2. Entreprise Recommand</strong><p>${c?.provider_id?'Entreprise liée à votre espace.':'Créez votre accès pour cette entreprise.'}</p>${!c?.provider_id&&owner?'<button onclick="peppolActivate()">Activer Peppol</button>':''}</li><li><strong>3. Vérification du représentant</strong><p>${c?.verified?'Identité vérifiée.':'Le représentant autorisé doit confirmer son identité.'}</p>${c?.provider_id&&!c.verified&&owner?'<button onclick="peppolVerification()">Vérifier mon identité</button>':''}</li><li><strong>4. Réception des factures</strong><p>${c?.reception_enabled?'Réception activée.':'Réception non encore activée. Une entreprise ne peut recevoir que chez un seul prestataire à la fois.'}</p>${c?.provider_id&&!c.reception_enabled&&owner?'<button onclick="peppolEnableReception()">Activer la réception</button>':''}</li></ol>
  ${c?.webhook_error?`<p class="notice">Les notifications restent à connecter : ${esc(c.webhook_error)}</p>`:''}${c?.webhook_id?'<p>Notifications Peppol connectées.</p>':''}${c?.error?`<p class="application-error">${esc(c.error)}</p>`:''}<p>Identifiant Peppol : <strong>${esc(c?.peppol_id||'Non encore attribué')}</strong></p><div class="peppol-actions"><button onclick="loadPeppol()">Actualiser l’activation</button>${c?.provider_id&&owner?'<button onclick="peppolConnectNotifications()">Connecter les notifications</button>':''}<a href="https://app.recommand.eu" target="_blank" rel="noopener">Ouvrir Recommand ↗</a></div>${!owner?'<p class="muted">Le responsable de l’entreprise gère l’activation.</p>':''}<p class="muted">Le test Peppol existant reste accessible depuis les factures émises. Le mode de test et la production sont configurés séparément par le responsable du service.</p></div>`;
}
function peppolDashboard() {
  if(peppolState.phase!=='ready')return '<div class="empty">Chargement des indicateurs…</div>';
  const rows=peppolState.rows,groups={};
  for(const r of rows.filter(r=>['invoice','creditNote'].includes(r.kind)&&r.amount!=null)){
    const key=r.currency||'EUR';groups[key]||={out:0,in:0,unpaid:0};const value=Number(r.amount)*(r.kind==='creditNote'?-1:1);
    groups[key][r.direction==='incoming'?'in':'out']+=value;if(r.direction==='incoming'&&!r.paid_at)groups[key].unpaid+=value;
  }
  return `<div class="peppol-settings"><h2>Vue d’ensemble</h2><div class="peppol-dashboard-grid">${Object.entries(groups).map(([currency,g])=>`<article><h3>${esc(currency)}</h3><p>Émis : <strong>${peppolMoney({amount:g.out,currency})}</strong></p><p>Reçus : <strong>${peppolMoney({amount:g.in,currency})}</strong></p><p>Fournisseurs non payés : <strong>${peppolMoney({amount:g.unpaid,currency})}</strong></p></article>`).join('')||'<p>Aucun montant disponible.</p>'}</div><p>Les notes de crédit sont déduites des montants. Les devises restent séparées.</p><p>${rows.filter(r=>r.status==='unknown').length} transmission(s) à vérifier · ${rows.filter(r=>r.archive_error).length} archivage(s) à réessayer.</p><button onclick="peppolSync()">Actualiser les échanges</button></div>`;
}
function peppolHistory(documentId) {
  const events=peppolState.events.filter(e=>!documentId||e.document_id===documentId);
  return `<div class="peppol-settings"><h2>Historique ${documentId?'du document':'des échanges'}</h2><p class="muted">Les 200 derniers événements de l’entreprise.</p><ol class="peppol-history">${events.map(e=>`<li><time>${esc(peppolDate(e.created_at))}</time><strong>${esc(e.detail?.status?PEPPOL_STATES[e.detail.status]||e.detail.status:e.event_type==='review'?'Suivi fournisseur mis à jour':e.event_type==='sending'?'En cours d’envoi':e.event_type)}</strong><span>${esc(peppolState.rows.find(r=>r.id===e.document_id)?.number||'')}</span>${e.detail?.businessResponse?`<span>${esc(PEPPOL_RESPONSES[e.detail.businessResponse]||e.detail.businessResponse)}</span>`:''}</li>`).join('')||'<li>Aucun événement enregistré.</li>'}</ol></div>`;
}
async function peppolRun(task) {
  if(peppolBusy)return;peppolBusy=true;
  try{await task();}catch(error){showError(error);}finally{peppolBusy=false;}
}
async function peppolSync() {return peppolRun(async()=>{
  let page=1,more=true;const errors=[];
  while(more){const result=await peppolApi('sync',{page});errors.push(...result.errors);more=result.hasMore;page++;toast(`Synchronisation Peppol : page ${page-1} traitée…`);}
  await loadPeppol();if(errors.length)throw Error(`${errors.length} document(s) non synchronisé(s). ${errors[0].error}`);toast('Échanges Peppol synchronisés.');
});}
function peppolActivate(){if(!confirm('Confirmez-vous être autorisé à activer Peppol pour cette entreprise ? La réception pourra être activée séparément.'))return;peppolRun(async()=>{await peppolApi('activate',{confirm:true,receive:false});await loadPeppol();toast('Entreprise créée. Terminez la vérification de votre identité.');});}
function peppolVerification(){peppolRun(async()=>{const r=await peppolApi('verify-company');const url=new URL(r.verificationUrl);if(url.protocol!=='https:')throw Error('Lien de vérification invalide.');featureDialog('Vérifier mon identité',`<p>Ouvrez le parcours sécurisé du prestataire pour confirmer votre identité.</p><a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">Commencer la vérification ↗</a>`);});}
function peppolEnableReception(){if(!confirm('Activer la réception chez Recommand ? Si votre entreprise reçoit déjà chez un autre prestataire, organisez d’abord son transfert.'))return;peppolRun(async()=>{await peppolApi('receive',{confirm:true});await loadPeppol();});}
function peppolConnectNotifications(){peppolRun(async()=>{await peppolApi('webhook');toast('Notifications de réception connectées.');});}
function peppolVerifyRecipient(){
  const dialog=featureDialog('Vérifier un destinataire','<form id="peppol-verify-form"><label class="field">Identifiant Peppol<input name="address" required placeholder="0208:0123456789"></label><button class="primary">Vérifier</button></form><p id="peppol-verify-result" role="status"></p>');
  dialog.querySelector('form').onsubmit=e=>{e.preventDefault();peppolRun(async()=>{const r=await peppolApi('verify-recipient',{address:new FormData(e.target).get('address').trim()});dialog.querySelector('#peppol-verify-result').textContent=r.isValid?`Destinataire joignable${r.companyName?' : '+r.companyName:''}. La compatibilité du document sera vérifiée lors de l’envoi.`:'Destinataire non trouvé ou vérification indisponible. Vérifiez l’identifiant avant de continuer.';});};
}
function peppolSend(sourceId,credit=false){
  const d=docs.find(x=>x.dbId===sourceId);if(!d)return toast('Facture introuvable.');
  if(!peppolState.company?.verified)return toast('Terminez l’activation et la vérification dans les paramètres Peppol.');
  const dialog=featureDialog(credit?'Créer une note de crédit totale':'Confirmer l’envoi Peppol',`<p><strong>${esc(d.id)}</strong> · ${esc(client(d).name)} · ${euro(totals(d).total)}</p><p>Destinataire : ${esc(client(d).peppol_id||'À compléter')}</p><p>Environnement : <strong>${peppolState.environment==='production'?'PRODUCTION — transmission réelle':'PLAYGROUND — essai'}</strong></p>${credit?'<p>Cette note crédite la totalité de la facture. Elle conserve la facture d’origine et ne déclenche aucun remboursement bancaire.</p><label class="field">Motif<textarea id="peppol-credit-reason" required maxlength="2000"></textarea></label>':''}${d.lines.some(l=>Number(l.tax)===0)?`<fieldset><legend>TVA des lignes à 0 %</legend><p>Choisissez le traitement applicable à toutes les lignes à 0 %. La validation Peppol vérifie ensuite sa cohérence.</p><label class="field">Catégorie<select id="peppol-tax-category"><option value="">Choisir…</option><option value="Z">Taux zéro</option><option value="E">Exonération</option><option value="AE">Autoliquidation</option><option value="K">Livraison intracommunautaire</option><option value="G">Exportation</option><option value="O">Hors champ de TVA</option></select></label><label class="field">Motif fiscal / référence légale<textarea id="peppol-tax-reason" maxlength="1000"></textarea></label></fieldset>`:''}<button class="primary" id="peppol-confirm">${credit?'Confirmer la note de crédit et envoyer':'Confirmer et envoyer'}</button><p id="peppol-send-error" role="alert"></p>`);
  dialog.querySelector('#peppol-confirm').onclick=()=>peppolRun(async()=>{
    const button=dialog.querySelector('#peppol-confirm');button.disabled=true;
    try{await peppolApi(credit?'credit':'send',{sourceId,confirm:true,environment:peppolState.environment,taxTreatment:dialog.querySelector('#peppol-tax-category')?{category:dialog.querySelector('#peppol-tax-category').value,reason:dialog.querySelector('#peppol-tax-reason').value}:null,...(credit?{reason:dialog.querySelector('#peppol-credit-reason').value,date:today()}:{})});dialog.close();await loadPeppol();toast('Document transmis. Consultez son statut de livraison.');}
    catch(error){dialog.querySelector('#peppol-send-error').textContent=error.message;await loadPeppol();button.disabled=false;}
  });
}
async function peppolDetail(id){
  const r=peppolState.rows.find(x=>x.id===id);if(!r)return;
  const p=r.parsed||r.payload?.document||{},local=docs.find(d=>d.dbId===r.source_id);
  const dialog=featureDialog('Document Peppol · '+r.number,`<div class="peppol-detail"><p><strong>${esc(r.party_name)}</strong> · ${esc(peppolMoney(r))} · ${peppolBadge(r.status)}</p>${r.archive_error?`<p class="notice">Archivage à réessayer : ${esc(r.archive_error)}</p>`:''}${r.failure?.length?`<div class="application-error"><strong>Transmission à vérifier</strong><p>${r.failure.map(f=>esc(f.message||JSON.stringify(f))).join('<br>')}</p></div>`:''}${r.validation?.result&&r.validation.result!=='valid'?`<p class="notice">Validation du document : ${esc(r.validation.result)}</p>`:''}<p>${esc(p.note||'')}</p><div class="peppol-table-scroll"><table><thead><tr><th>Prestation</th><th>Quantité</th><th>Prix HT</th><th>TVA</th></tr></thead><tbody>${(p.lines||[]).map(l=>`<tr><td>${esc(l.name)}</td><td>${esc(l.quantity)}</td><td>${esc(l.netPriceAmount)}</td><td>${esc(l.vat?.percentage)} %</td></tr>`).join('')}</tbody></table></div><div class="peppol-actions">${r.provider_id?`<button data-peppol-refresh="${esc(r.id)}">Actualiser le statut</button><button data-peppol-file="${esc(r.id)}" data-type="pdf">Télécharger PDF</button><button data-peppol-file="${esc(r.id)}" data-type="xml">Télécharger XML</button>`:''}${r.direction==='incoming'?`<button data-peppol-review="${esc(r.id)}" data-review="verified">Marquer vérifiée</button><button data-peppol-review="${esc(r.id)}" data-review="disputed">À contester</button><button data-peppol-paid="${esc(r.id)}" data-paid="${!r.paid_at}">${r.paid_at?'Annuler le statut payé':'Marquer payée'}</button>`:local&&r.kind==='invoice'&&['sent','delivered'].includes(r.status)?`<button data-peppol-credit="${esc(r.source_id)}">Note de crédit totale</button>`:''}${local&&r.status==='failed'&&!r.provider_id?`<button data-peppol-correct="${esc(r.id)}">Corriger la facture</button>`:''}</div>${peppolHistory(r.id)}<details><summary>Détails techniques et validation</summary><pre>${esc(JSON.stringify({provider:r.provider_id,validation:r.validation,failure:r.failure,businessResponse:r.business_response},null,2))}</pre></details></div>`);
  if(r.direction==='incoming'&&!r.read_at)try{await peppolApi('review',{id,read:true});r.read_at=new Date().toISOString();}catch(error){showError(error);}
}
document.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b)return;
  const d=b.dataset;
  if(d.peppolView)peppolDetail(d.peppolView);
  if(d.peppolSource)go('view/'+d.peppolSource);
  if(d.peppolSend)peppolSend(d.peppolSend);
  if(d.peppolCredit){b.closest('dialog')?.close();peppolSend(d.peppolCredit,true);}
  if(d.peppolTest)sendPeppolTest(d.peppolTest);
  if(d.peppolCorrect)peppolRun(async()=>{const result=await peppolApi('correct',{id:d.peppolCorrect});const doc=docs.find(x=>x.dbId===result.sourceId);if(!doc)throw Error('Rechargez la liste des factures.');b.closest('dialog')?.close();doc.peppol=null;editDocument(doc.id);});
  if(d.peppolFile)peppolRun(async()=>{const r=await peppolApi('download',{id:d.peppolFile,type:d.type});const a=document.createElement('a');a.href=r.url;a.rel='noopener';a.target='_blank';a.click();});
  if(d.peppolRefresh)peppolRun(async()=>{await peppolApi('refresh',{id:d.peppolRefresh});b.closest('dialog')?.close();await loadPeppol();peppolDetail(d.peppolRefresh);});
  if(d.peppolReview||d.peppolPaid)peppolRun(async()=>{await peppolApi('review',{id:d.peppolReview||d.peppolPaid,...(d.peppolReview?{review:d.review}:{paid:d.paid==='true'})});b.closest('dialog')?.close();await loadPeppol();});
});
setInterval(()=>{if(account&&location.hash==='#peppol'&&!document.hidden&&!peppolBusy&&peppolState.phase==='ready')loadPeppol();},60000);
