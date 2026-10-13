const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const app = readFileSync('app.js','utf8');
const context = vm.createContext({console, Intl, Blob, Date});
vm.runInContext(`let clients=[],docs=[],account={id:'user'}; const esc=s=>String(s??'').replace(/[<>]/g,''); const euro=n=>String(n); const fmt=s=>s; ${app.slice(app.indexOf('const round ='),app.indexOf('function toast('))}
function dashISO(d){return d.toISOString().slice(0,10)}
function dashTable(h,r){return JSON.stringify([h,r])}
${readFileSync('vat.js','utf8')}`,context);
const evaluate = code => vm.runInContext(code,context);
evaluate(`const range={start:'2026-07-01',end:'2026-09-30'};
const invoice=(id,date,lines,customer={name:'Client',country:'BE'})=>({id,type:'facture',date,lines,customer});
const line=(price,tax,qty=1)=>({price,tax,qty});
const purchase=(category,net,vat,percent=100)=>({tax_date:'2026-09-30',category,net_amount:net,vat_amount:vat,deduction_percent:percent});`);
const result = JSON.parse(evaluate(`JSON.stringify(vatData([
 invoice('a','2026-07-01',[line(100,6),line(100,12),line(100,21)]),
 invoice('b','2026-09-30',[line(0.05,21),line(0.05,21)]),
 invoice('zero','2026-08-01',[line(100,0)]),
 invoice('foreign','2026-08-01',[line(100,21)],{country:'FR'}),
 invoice('vatforeign','2026-08-01',[line(100,21)],{vat:'FR123'}),
 invoice('outside','2026-06-30',[line(100,21)]),
 {...invoice('quote','2026-08-01',[line(100,21)]),type:'devis'},
 {...invoice('moved','2026-06-30',[line(100,21)]),vatDate:'2026-07-01'}
],[purchase('81',100,21,50),purchase('82',100,21,0),purchase('83',100,21)],range))`));
assert.deepEqual(result.grids,{'01':100,'02':100,'03':200.1,'54':60.02,'59':31.5,'81':110.5,'82':121,'83':100,'71':28.52});
assert.equal(result.review.length,3);
assert.equal(result.sales.length,3);
assert.equal(evaluate(`vatData([], [purchase('82',100,21)],range).grids['72']`),21);
assert.equal(evaluate(`vatData([],[],range).grids['71']`),0);
assert.equal(evaluate(`'72' in vatData([],[],range).grids`),false);
assert.equal(evaluate(`vatData([invoice('invalid','2026-08-01',[line(-1,21)])],[],range).review.length`),1);
assert.match(evaluate(`vatCSV([['=SUM(A1)','normal','a"b','+cmd']])`),/"'=SUM\(A1\)";"normal";"a""b";"'\+cmd"/);
evaluate(`vatPurchases=[purchase('82',100,21)];vatUser='other';docs=[];`);
assert.equal(evaluate(`vatCurrent().buys.length`),0);
evaluate(`vatUser='user';vatError='Migration requise';`);
assert.match(evaluate(`vatDashboard()`),/Indisponible/);
assert.match(evaluate(`vatDashboard()`),/disabled/);
console.log('TVA : calcul multi-taux, arrondis, déduction partielle/nulle, dates, exclusions, solde/crédit, CSV et isolation de compte vérifiés.');
