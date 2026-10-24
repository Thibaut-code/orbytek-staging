const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const app=readFileSync('app.js','utf8');
const models=['orbytek','architecture','industriel'];
function environment() {
  const elements=new Map(), writes=[];
  const element=()=>({style:{},dataset:{},checked:false,close(){},classList:{add(){}},innerHTML:''});
  const document={querySelector(key){if(!elements.has(key))elements.set(key,element());return elements.get(key);},addEventListener(){},documentElement:element()};
  const c=vm.createContext({document,window:{addEventListener(){}},location:{hash:'',search:''},URLSearchParams,TextEncoder,Blob,console,interfaceOptions(){},applyInterface(){}});
  vm.runInContext(readFileSync('team.js','utf8'),c);
  vm.runInContext(readFileSync('vendor/qrcode.js','utf8'),c);
  vm.runInContext(readFileSync('vendor/qrcode_UTF8.js','utf8'),c);
  vm.runInContext(app.replace(/\r?\ninitialize\(\);/,'\n'),c);
  vm.runInContext(`company={name:'Entreprise actuelle',address:'Rue actuelle 1',iban:'BE68539007547034'};
    clients=[{id:'client',name:'Client actuel',address:'Adresse actuelle',note:'NOTE INTERNE SECRÈTE'}];
    render=()=>{};toast=()=>{};featureError=e=>{throw e};`,c);
  const sample={id:'F-2026-025',dbId:'saved-invoice',type:'facture',date:'2026-10-18',due:'2026-11-17',client:'client',job:'Installation du chauffage',site:'Rue du chantier 7',paid:false,
    issuer:{name:'Entreprise archivée',address:'Rue archivée 12\n5000 Namur\nBE',vat:'BE0123456789',iban:'BE68539007547034',email:'archive@example.com'},
    customer:{name:'Client archivé',address:'Rue du client 28\n1000 Bruxelles\nBE',vat:'BE0987654321',email:'client@example.com',note:'NOTE INTERNE SECRÈTE'},
    lines:[{name:'Thermostat',qty:1,price:720,tax:21},{name:'Mise en service',qty:2,price:80,tax:21},{name:'Déplacement',qty:1,price:45,tax:21}]};
  return {c,sample,elements,writes};
}
const money=n=>new Intl.NumberFormat('fr-BE',{style:'currency',currency:'EUR'}).format(n);
test('six modèles sélectionnables, couleurs et anciens documents conservés',()=>{
  const {c,sample}=environment();
  assert.equal(vm.runInContext('Object.keys(TEMPLATES).length',c),6);
  for(const template of ['classique','bleu_nuit','cuivre',...models]) {
    const a=c.cleanAppearance({template});assert.equal(a.template,template);assert.match(a.color,/^#[\da-f]{6}$/i);
    const html=c.documentHTML({...sample,appearance:a});assert.match(html,new RegExp('template-'+template));
    assert.ok(html.includes(money(1119.25)));assert.ok(!html.includes('undefined'));
  }
  assert.equal(c.cleanAppearance({template:'inconnu',color:'url(x)'}).template,'classique');
});
test('les modèles utilisent les snapshots, toutes les coordonnées et le chantier sans note interne',()=>{
  const {c,sample}=environment();
  for(const template of models) {
    const html=c.documentHTML({...sample,appearance:{template}});
    for(const text of ['Entreprise archivée','Client archivé','Rue archivée 12','Rue du client 28','BE0123456789','BE0987654321','archive@example.com','client@example.com','Rue du chantier 7','BE68539007547034']) assert.ok(html.includes(text),`${template}: ${text}`);
    for(const text of ['Entreprise actuelle','Client actuel','NOTE INTERNE SECRÈTE','ATELIER HORIZON','Exemple fictif']) assert.ok(!html.includes(text));
    assert.match(html,/DOCUMENT À VÉRIFIER AVANT UTILISATION/);
    assert.match(html,/<svg/,'QR EPC réel présent');
  }
});
test('TVA multiples, décimales et arrondis restent ceux de Facture Facile',()=>{
  const {c,sample}=environment();
  const lines=[{name:'Exonéré',qty:1,price:10,tax:0},{name:'Taux réduit',qty:1.5,price:20,tax:6},{name:'Intermédiaire',qty:1,price:50,tax:12},{name:'Décimales',qty:3,price:0.335,tax:21}];
  const doc={...sample,lines};
  // 10 + 30 + 50 + 1.01; TVA 0 + 1.80 + 6 + 0.21.
  for(const template of models) {
    const html=c.documentHTML({...doc,appearance:{template}});
    assert.ok(html.includes(c.totalBlock(doc)));
    for(const n of [91.01,1.8,6,0.21,99.02]) assert.ok(html.includes(money(n)));
    for(const rate of [0,6,12,21]) assert.ok(html.includes(`TVA ${rate} %`));
  }
});
test('devis, brouillons et factures réglées respectent les règles de paiement existantes',()=>{
  const {c,sample}=environment();
  for(const template of models) {
    const appearance={template};
    const quote=c.documentHTML({...sample,type:'devis',id:'D-2026-002',appearance});
    assert.match(quote,/Devis/);assert.match(quote,/Valable jusqu’au/);assert.ok(!quote.includes('<svg'));assert.ok(quote.includes('BE68539007547034'));
    const paid=c.documentHTML({...sample,paid:true,appearance});assert.ok(!paid.includes('<svg'));assert.ok(paid.includes('BE68539007547034'));
    const draft=c.documentHTML({...sample,dbId:null,id:'Numéro attribué à l’enregistrement',appearance});
    assert.ok(!draft.includes('<svg'));assert.match(draft,/après l’enregistrement/);assert.ok(!draft.includes('design-sequence'));
    const invalid=c.documentHTML({...sample,issuer:{...sample.issuer,iban:'invalide'},appearance});assert.ok(!invalid.includes('<svg'));assert.match(invalid,/IBAN belge valide/);
  }
});
test('contenu dynamique échappé et logos autorisés uniquement',()=>{
  const {c,sample}=environment();
  for(const template of models) {
    const doc={...sample,appearance:{template},job:'<script>alert(1)</script>',site:'<img onerror=x>',customer:{name:'<img onerror=x>',address:'<script>x</script>',email:'<b>x</b>'},issuer:{...sample.issuer,logo:'javascript:alert(1)'},lines:[{name:'<img onerror=x>',qty:1,price:10,tax:21}]};
    const html=c.documentHTML(doc);assert.ok(!/<script|<img[^>]*onerror|javascript:/.test(html));assert.match(html,/&lt;script&gt;/);
    doc.issuer.logo='data:image/png;base64,aGVsbG8=';doc.issuer.logo_shape='square';
    assert.match(c.documentHTML(doc),/class="company-logo logo-square"/);
  }
});
test('enregistrement du modèle sur le document et comme préférence de société',async()=>{
  for(const template of models) {
    const {c,sample,elements,writes}=environment();c.sample=sample;
    c.mockDb={from(table){return {update(values){const entry={table,values,filters:[]};writes.push(entry);const q={eq(key,value){entry.filters.push([key,value]);return q},then(resolve){return Promise.resolve({error:null}).then(resolve)}};return q}}}};
    vm.runInContext(`account={id:'owner'};docs=[sample];db=mockDb;appearanceTarget=sample.id;appearanceDraft={template:'${template}',color:'#123456'};`,c);
    c.documentHTML(sample); // exercise document rendering before persistence
    vm.runInContext(`document.querySelector('#default-appearance').checked=true;`,c);
    await c.saveAppearance();
    assert.deepEqual(writes.map(w=>w.table),['documents','companies']);
    for(const w of writes){assert.equal(w.values.appearance.template,template);assert.equal(w.values.appearance.color,'#123456');assert.ok(w.filters.some(([k,v])=>k==='user_id'&&v==='owner'));}
    assert.equal(vm.runInContext('docs[0].appearance.template',c),template);
    assert.equal(vm.runInContext('company.appearance.template',c),template);
  }
});
test('l’export PDF utilise le même rendu, le format A4 et la pagination des lignes',async()=>{
  const {c,sample}=environment();
  for(const template of models){
    let settings,wrapper;
    c.document.createElement=()=>({style:{}});
    c.html2pdf=()=>({set(s){settings=s;return this},from(w){wrapper=w;return this},outputPdf:async()=>new Blob(['pdf'])});
    const result=await c.documentPDF({...sample,appearance:{template}});
    assert.equal(result.type,'');assert.ok(result.size>0);
    assert.equal(settings.jsPDF.format,'a4');assert.equal(settings.html2canvas.windowWidth,1120);
    assert.ok(settings.pagebreak.avoid.includes('tr'));assert.ok(settings.pagebreak.avoid.includes('.design-legal'));
    assert.match(wrapper.innerHTML,new RegExp('template-'+template));
    assert.equal(wrapper.style.width,'182mm');
  }
});
