// Préparation belge trimestrielle : opérations nationales ordinaires uniquement.
let vatPurchases = [], vatUser = null, vatError = '', vatBusy = false;
let vatYear = new Date().getFullYear(), vatQuarter = Math.floor(new Date().getMonth() / 3) + 1;
async function loadVAT(userId) {
  const scopeOwner = companyOwner(userId);
  vatUser = null; vatPurchases = []; vatError = '';
  let result;
  try { result = await db.from('vat_purchases').select('*').eq('user_id', scopeOwner).order('tax_date'); }
  catch (error) { result = {error}; }
  if (account?.id !== userId || companyOwner(userId) !== scopeOwner) return;
  vatUser = userId;
  if (result.error) vatError = ['42P01','PGRST205','42703','PGRST204'].includes(result.error.code)
    ? 'Pour activer les achats TVA, exécutez supabase/migrations/20260930_vat.sql dans Supabase, puis rechargez le site.'
    : 'Les achats TVA n’ont pas pu être chargés. Rechargez le site avant de préparer la déclaration.';
  else vatPurchases = result.data || [];
}
function vatRange() {
  const month = (vatQuarter - 1) * 3;
  return {start: dashISO(new Date(vatYear, month, 1, 12)), end: dashISO(new Date(vatYear, month + 3, 0, 12))};
}
function vatData(invoices, purchases, range) {
  const grids = {'01':0,'02':0,'03':0,'54':0,'59':0,'81':0,'82':0,'83':0};
  const sales = [], review = [];
  const within = date => date >= range.start && date <= range.end;
  invoices.filter(d => d.type === 'facture' && within(d.vatDate || d.date)).forEach(d => {
    const c = client(d), country = String(c.country || '').toUpperCase();
    const foreignVAT = c.vat && !/^BE/i.test(c.vat.replace(/\s/g,''));
    if ((country && country !== 'BE') || foreignVAT || !d.lines.length || d.lines.some(l => ![6,12,21].includes(Number(l.tax)) || !Number.isFinite(l.qty*l.price) || l.qty*l.price < 0)) {
      review.push(d); return;
    }
    sales.push(d);
    d.lines.forEach(l => {
      const base = round(l.qty*l.price), key = {6:'01',12:'02',21:'03'}[l.tax];
      grids[key] += base; grids['54'] += round(base*l.tax/100);
    });
  });
  const buys = purchases.filter(p => within(p.tax_date));
  buys.forEach(p => {
    const deductible = round(Number(p.vat_amount)*Number(p.deduction_percent)/100);
    grids['59'] += deductible;
    grids[p.category] += round(Number(p.net_amount)+Number(p.vat_amount)-deductible);
  });
  Object.keys(grids).forEach(k => grids[k] = round(grids[k]));
  const balance = round(grids['54']-grids['59']);
  grids[balance < 0 ? '72' : '71'] = Math.abs(balance);
  return {grids,sales,review,buys,balance};
}
function vatCurrent() { return vatData(docs, vatUser === account?.id ? vatPurchases : [], vatRange()); }
function vatDashboard() {
  const range = vatRange(), data = vatCurrent(), ready = vatUser === account?.id && !vatError;
  const years = [...new Set([vatYear,...Array.from({length:7},(_,i)=>new Date().getFullYear()+1-i),...docs.map(d=>Number((d.vatDate||d.date).slice(0,4))),...vatPurchases.map(p=>Number(p.tax_date.slice(0,4)))])].filter(Number.isFinite).sort((a,b)=>b-a);
  return `<section class="dash-card vat-panel"><div class="dash-card-head"><div><div class="eyebrow">Belgique · régime normal trimestriel</div><h2>Préparer ma TVA</h2></div><span class="badge pending">Préparation à vérifier</span></div>
    <div class="vat-controls"><label class="field">Année<select onchange="vatYear=Number(this.value);render()">${years.map(y=>`<option ${y===vatYear?'selected':''}>${y}</option>`).join('')}</select></label><label class="field">Trimestre<select onchange="vatQuarter=Number(this.value);render()">${[1,2,3,4].map(q=>`<option value="${q}" ${q===vatQuarter?'selected':''}>T${q}</option>`).join('')}</select></label><p>${fmt(range.start)} — ${fmt(range.end)}<br><small>Période TVA indépendante des filtres du dashboard.</small></p></div>
    ${!ready?`<p class="notice" role="status">${esc(vatError || 'Chargement des achats TVA…')}</p>`:''}
    <div class="vat-totals"><div><span>TVA due sur ventes · 54</span><strong>${euro(data.grids['54'])}</strong><small>${data.sales.length} facture(s) nationale(s)</small></div><div><span>TVA déductible · 59</span><strong>${ready?euro(data.grids['59']):'Indisponible'}</strong><small>${ready?data.buys.length+' achat(s) saisi(s)':'Achats non chargés'}</small></div><div><span>${data.balance<0?'Crédit estimé · 72':'Solde estimé · 71'}</span><strong>${ready?euro(Math.abs(data.balance)):'Indisponible'}</strong><small>Avant opérations particulières et régularisations</small></div></div>
    ${data.review.length?`<p class="notice">${data.review.length} facture(s) à examiner : taux 0 %, client étranger ou lignes non prises en charge. Elles sont exclues des grilles proposées ; le solde est incomplet.</p><button onclick="vatSales(true)">Examiner ces factures</button>`:''}
    <div class="vat-actions"><button onclick="vatSales(false)">Journal des ventes / dates TVA</button><button ${ready?'':'disabled'} onclick="vatPurchaseForm()">+ Ajouter un achat</button><button ${ready?'':'disabled'} onclick="vatExport()">Exporter la préparation CSV</button><a href="https://finances.belgium.be/fr/E-services/Intervat" target="_blank" rel="noopener">Ouvrir Intervat ↗</a></div>
    <details><summary>Grilles proposées pour la déclaration</summary>${dashTable(['Grille','Contenu','Montant'],Object.entries(data.grids).filter(([k])=>ready||['01','02','03','54'].includes(k)).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,{'01':'Ventes à 6 % · HT','02':'Ventes à 12 % · HT','03':'Ventes à 21 % · HT','54':'TVA due sur ventes','59':'TVA déductible','81':'Marchandises / matières','82':'Biens et services divers','83':'Investissements','71':'Solde dû estimé','72':'Crédit estimé'}[k],euro(v)]))}<p class="dash-footnote">Grilles 81–83 : achats hors TVA déductible, y compris la TVA non déductible. Ces montants ne constituent pas une déclaration complète.</p></details>
    <details><summary>Achats du trimestre (${ready?data.buys.length:'indisponible'})</summary>${ready?dashTable(['Date TVA','Fournisseur / référence','HT','TVA','Déduction','Actions'],data.buys.map(p=>[esc(p.tax_date),`${esc(p.supplier)}<br>${esc(p.reference)}`,euro(Number(p.net_amount)),euro(Number(p.vat_amount)),`${p.deduction_percent} % · ${euro(round(p.vat_amount*p.deduction_percent/100))}`,`<button onclick="vatPurchaseForm('${p.id}')">Modifier</button>`])):''}</details>
    <details><summary>Contrôles avant dépôt</summary><ul><li>Vérifier toutes les ventes et leurs dates d’exigibilité. Par défaut, la date de facture est utilisée ; le paiement ne filtre pas les ventes.</li><li>Saisir tous les achats nationaux et vérifier la TVA déductible avec les justificatifs. Aucun achat saisi ne signifie pas qu’il n’y a pas eu d’achat.</li><li>Compléter avec votre comptable les avoirs, acomptes, opérations intracommunautaires, autoliquidations, importations et régularisations, non calculés ici.</li><li>Contrôler le numéro de TVA de l’entreprise et le solde de votre compte auprès du SPF Finances avant paiement.</li></ul></details>
    <p class="dash-footnote">Les ventes aux taux 6 / 12 / 21 % sont proposées comme ventes nationales ordinaires. Vérifiez leur qualification et les pays absents. Dépôt et paiement à effectuer séparément. <a href="https://finances.belgium.be/fr/E-services/Intervat/modeles-des-declarations-et-notices" target="_blank" rel="noopener">Notices SPF Finances</a> · <a href="https://financien.belgium.be/nl/node/1593" target="_blank" rel="noopener">Calendrier officiel TVA</a></p></section>`;
}
function vatSales(reviewOnly) {
  const data = vatCurrent(), range = vatRange();
  const list = reviewOnly ? data.review : docs.filter(d=>d.type==='facture'&&(d.vatDate||d.date)>=range.start&&(d.vatDate||d.date)<=range.end);
  const dialog = featureDialog('Journal TVA des ventes',dashTable(['Facture / client','Date facture','Date TVA','HT','TVA','Traitement'],list.map((d,i)=>[`${esc(d.id)}<br>${esc(client(d).name)}`,esc(d.date),`<button data-date="${i}">${esc(d.vatDate||d.date)} · Modifier</button>`,euro(totals(d).net),euro(totals(d).tax),data.review.includes(d)?'À examiner · exclue des grilles':'Vente nationale proposée']))+'<p class="muted">La date TVA est la date d’exigibilité à confirmer selon l’opération. Une modification déplace la facture dans la période correspondante, sans modifier le document.</p>');
  dialog.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>vatSaleDate(list[Number(b.dataset.date)]));
}
function vatSaleDate(d) {
  const dialog = featureDialog('Date TVA · '+d.id,`<form id="vat-date-form"><label class="field">Date d’exigibilité TVA<input name="date" type="date" required value="${esc(d.vatDate||d.date)}"></label><button class="primary">Enregistrer</button></form>`);
  dialog.querySelector('form').onsubmit = async e => {
    e.preventDefault(); if(vatBusy)return;
    const date = new FormData(e.target).get('date'); if(!validDate(date))return;
    vatBusy=true; const userId=account.id;
    try {const {data,error}=await db.from('documents').update({vat_date:date}).eq('id',d.dbId).eq('user_id',companyOwner(userId)).select('id');if(error)throw error;if(!data?.length)throw Error('Facture introuvable.');if(account?.id!==userId)return;d.vatDate=date;dialog.close();render();}
    catch(error){showError(['42703','PGRST204'].includes(error.code)?Error('Exécutez la migration 20260930_vat.sql pour enregistrer les dates TVA.'):error);}finally{vatBusy=false;}
  };
}
function vatPurchaseForm(id) {
  if(vatError||vatUser!==account?.id)return;
  const p=vatPurchases.find(p=>p.id===id)||{tax_date:vatRange().start,invoice_date:vatRange().start,category:'82',deduction_percent:100};
  const input=(key,label,type='text',extra='')=>`<label class="field">${label}<input name="${key}" type="${type}" value="${esc(p[key]??'')}" required ${extra}></label>`;
  const dialog=featureDialog(id?'Modifier un achat':'Ajouter un achat national',`<p>Facture fournisseur belge ordinaire. Pour un achat à plusieurs taux ou catégories, saisissez plusieurs lignes avec la même référence. Conservez le justificatif dans votre comptabilité.</p><form id="vat-purchase-form"><div class="form-grid">${input('supplier','Fournisseur','text','maxlength="200"')}${input('reference','Référence facture','text','maxlength="200"')}${input('invoice_date','Date facture','date')}${input('tax_date','Date de déduction TVA','date')}${input('net_amount','Montant HT (€)','number','min="0" max="999999999" step="0.01"')}${input('vat_amount','TVA facturée (€)','number','min="0" max="999999999" step="0.01"')}${input('deduction_percent','TVA déductible (%)','number','min="0" max="100" step="0.01"')}<label class="field">Catégorie<select name="category">${[['81','Marchandises / matières'],['82','Biens et services divers'],['83','Investissements']].map(([k,l])=>`<option value="${k}" ${p.category===k?'selected':''}>${k} · ${l}</option>`).join('')}</select></label></div><p class="muted">Le pourcentage concerne la TVA déductible, à vérifier selon l’usage professionnel et les limitations applicables. Avoirs et achats avec autoliquidation doivent être traités séparément.</p><button class="primary">Enregistrer l’achat</button>${id?' <button type="button" id="vat-delete">Supprimer cet achat</button>':''}</form>`);
  dialog.querySelector('form').onsubmit=async e=>{
    e.preventDefault();if(vatBusy)return;
    const values=Object.fromEntries(new FormData(e.target));
    ['supplier','reference'].forEach(k=>values[k]=values[k].trim());
    ['net_amount','vat_amount','deduction_percent'].forEach(k=>values[k]=Number(values[k]));
    if(!values.supplier||!values.reference||!validDate(values.invoice_date)||!validDate(values.tax_date)||!['81','82','83'].includes(values.category)||['net_amount','vat_amount','deduction_percent'].some(k=>!Number.isFinite(values[k])||values[k]<0)||values.deduction_percent>100||values.net_amount>999999999||values.vat_amount>999999999){showError(Error('Vérifiez les dates et les montants de l’achat.'));return;}
    vatBusy=true;const userId=account.id;
    try {let query=id?db.from('vat_purchases').update(values).eq('id',id).eq('user_id',companyOwner(userId)):db.from('vat_purchases').insert({...values,user_id:companyOwner(userId)});const {data,error}=await query.select().single();if(error)throw error;if(account?.id!==userId)return;vatPurchases=vatPurchases.filter(p=>p.id!==id);vatPurchases.push(data);dialog.close();render();toast('Achat enregistré.');}catch(error){showError(error);}finally{vatBusy=false;}
  };
  if(id)dialog.querySelector('#vat-delete').onclick=()=>{
    const b=dialog.querySelector('#vat-delete');b.textContent='Confirmer la suppression';b.onclick=async()=>{
      if(vatBusy)return;vatBusy=true;const userId=account.id;
      try{const {data,error}=await db.from('vat_purchases').delete().eq('id',id).eq('user_id',companyOwner(userId)).select('id');if(error)throw error;if(!data?.length)throw Error('Achat introuvable.');if(account?.id!==userId)return;vatPurchases=vatPurchases.filter(p=>p.id!==id);dialog.close();render();}catch(error){showError(error);}finally{vatBusy=false;}
    };
  };
}
function vatCSV(rows) {
  const cell=v=>{let s=String(v??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
  return '\uFEFF'+rows.map(row=>row.map(cell).join(';')).join('\r\n');
}
function vatExport() {
  if(vatError||vatUser!==account?.id)return;
  const data=vatCurrent(),range=vatRange(),amount=n=>Number(n).toFixed(2).replace('.',',');
  const rows=[['Préparation TVA belge — à vérifier, non déposable'],['Entreprise',company.name,'TVA',company.vat],['Période',range.start,range.end],['Périmètre','Ventes nationales ordinaires et achats nationaux saisis uniquement'],['Contrôles','Vérifier exigibilité, exhaustivité des achats, pays manquants et opérations particulières'],['Factures exclues à examiner',data.review.length],[],['Grille','Montant proposé']];
  Object.entries(data.grids).sort(([a],[b])=>a.localeCompare(b)).forEach(([k,v])=>rows.push([k,amount(v)]));
  rows.push([],['VENTES','Référence','Client','Date facture','Date TVA','HT','TVA','Traitement']);
  [...data.sales,...data.review].forEach(d=>rows.push(['Vente',d.id,client(d).name,d.date,d.vatDate||d.date,amount(totals(d).net),amount(totals(d).tax),data.review.includes(d)?'À examiner — exclue des grilles':'Nationale proposée']));
  rows.push([],['ACHATS','Référence','Fournisseur','Date facture','Date TVA','HT','TVA','Déduction %','TVA déductible','Catégorie']);
  data.buys.forEach(p=>rows.push(['Achat',p.reference,p.supplier,p.invoice_date,p.tax_date,amount(p.net_amount),amount(p.vat_amount),amount(p.deduction_percent),amount(round(p.vat_amount*p.deduction_percent/100)),p.category]));
  downloadAttachment(new Blob([vatCSV(rows)],{type:'text/csv;charset=utf-8'}),`preparation-tva-${vatYear}-T${vatQuarter}.csv`);
}
