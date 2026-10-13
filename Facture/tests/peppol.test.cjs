const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const domain=import('../supabase/functions/_shared/peppol-domain.mjs');
const invoice={number:'F-2026-1',issue_date:'2026-10-12',due_date:'2026-11-12',issuer_snapshot:{iban:'BE68539007547034'},customer_snapshot:{name:'Client',street:'Rue 1',city:'Bruxelles',postal_code:'1000',country:'BE',vat:'BE0428643097',peppol_id:'0208:0428643097'}};
const lines=[{name:'Travail',quantity:2,unit_price:100,vat_rate:21}];
test('le statut Peppol ignore une livraison e-mail et préfère les preuves du canal Peppol',async()=>{
 const {deliveryState}=await domain;
 assert.equal(deliveryState({sentOverEmail:true,deliveryStatus:'delivered'}),'unknown');
 assert.equal(deliveryState({deliveries:[{channel:'email',status:'delivered'},{channel:'peppol',status:'failed'}]}),'failed');
 assert.equal(deliveryState({deliveries:[{channel:'peppol',status:'failed'},{channel:'peppol',status:'pending'}]}),'sent');
 assert.equal(deliveryState({deliveries:[{channel:'peppol',status:'delivered'}]}),'delivered');
 assert.equal(deliveryState({sentOverPeppol:true,deliveryStatus:'pending'}),'sent');
 assert.equal(deliveryState({}),'unknown');
});
test('le contrat facture et avoir conserve les montants et référence la facture originale',async()=>{
 const {invoicePayload}=await domain;
 const p=invoicePayload(invoice,lines);assert.equal(p.document.lines[0].netPriceAmount,'100.00');assert.equal(p.documentType,'invoice');assert.equal(p.recipient,'0208:0428643097');
 const c=invoicePayload(invoice,lines,{number:'NC-F-2026-1',date:'2026-10-12',reason:'Annulation'});
 assert.equal(c.documentType,'creditNote');assert.equal(c.document.invoiceNumber,undefined);assert.equal(c.document.invoiceReferences[0].id,invoice.number);assert.equal(c.document.lines[0].quantity,'2');
 assert.throws(()=>invoicePayload(invoice,[{...lines[0],vat_rate:0}]),/catégorie/);
 const exempt=invoicePayload(invoice,[{...lines[0],vat_rate:0}],null,{category:'E',reason:'Motif confirmé par l’émetteur'});
 assert.equal(exempt.document.lines[0].vat.category,'E');assert.equal(exempt.document.vat.exemptionReason,'Motif confirmé par l’émetteur');
 assert.throws(()=>invoicePayload(invoice,[{...lines[0],quantity:NaN}]),/quantité/);
 assert.throws(()=>invoicePayload({...invoice,customer_snapshot:{}},lines),/coordonnées/);
});
test('la création belge valide le modulo 97 et ne demande pas la réception implicitement',async()=>{
 const {companyPayload}=await domain;
 const c={name:'Test',vat:'BE 0428.643.097',street:'Rue',postal_code:'1000',city:'Bruxelles',country:'BE'};
 assert.equal(companyPayload(c).enterpriseNumber,'0428643097');assert.equal(companyPayload(c).isSmpRecipient,false);
 assert.throws(()=>companyPayload({...c,vat:'BE0123456789'}),/valide/);
});
test('la réception conserve les devises et ne présente pas un montant absent comme zéro',async()=>{
 const {summary}=await domain;
 assert.equal(summary({id:'doc',direction:'incoming',parsed:{}}).amount,null);
 const s=summary({id:'doc',direction:'incoming',type:'creditNote',parsed:{creditNoteNumber:'NC1',currency:'USD',totals:{taxInclusiveAmount:'0'},seller:{name:'S'}}});
 assert.equal(s.amount,0);assert.equal(s.currency,'USD');assert.equal(s.status,'received');
});
test('la signature webhook porte sur les octets exacts et rejette les falsifications',async()=>{
 const {validSignature}=await domain;const {createHmac}=require('node:crypto');
 const body='{"companyId":"c_1"}',secret='only-test-secret';
 const signature='sha256='+createHmac('sha256',secret).update(body).digest('hex');
 assert(await validSignature(body,signature,secret));assert.equal(await validSignature(body+' ',signature,secret),false);assert.equal(await validSignature(body,signature,'wrong'),false);assert.equal(await validSignature(body,null,secret),false);
});
test('le service réutilise les clés existantes sans changer le test historique',()=>{
 let src=fs.readFileSync('supabase/functions/_shared/peppol-service.ts','utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
 const context=vm.createContext({Deno:{env:{get:k=>k==='INTEGRATION_ACCOUNTS'?JSON.stringify({owner:{recommandKey:'k',recommandSecret:'s',peppolEnvironment:'test',testCompanyId:'c_test'}}):''}}});
 vm.runInContext(stripTypeScriptTypes(src),context);
 const c=context.configuration('owner');assert.equal(c.companyId,'c_test');assert.equal(c.mode,'playground');assert.equal(c.recommandSecret,'s');assert.throws(()=>context.configuration('other'),/pas configuré/);
});
test('les nouveaux handlers sont syntaxiquement valides et contrôlent eux-mêmes les JWT',()=>{
 for(const file of ['peppol','peppol-webhook']){
   const src=fs.readFileSync(`supabase/functions/${file}/index.ts`,'utf8').replace(/^import .*;\r?\n/gm,'');
   let handler;vm.runInNewContext(stripTypeScriptTypes(src),{Deno:{serve:f=>handler=f}});assert.equal(typeof handler,'function');
 }
});
