const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('peppol.js','utf8');
function setup(rows){
  const context=vm.createContext({Intl,docs:[],document:{querySelector:()=>null},esc:s=>s});
  vm.runInContext(source.slice(0,source.indexOf('function peppolView()')),context);
  context.rows=rows;
  vm.runInContext('peppolState.rows=rows;peppolDrawTable=()=>{};',context);
  return {context,read:()=>Array.from(context.peppolRows(),r=>r.number),run:code=>vm.runInContext(code,context)};
}
const row=(number,extra={})=>({number,direction:'incoming',status:'received',...extra});
test('tri numérique des montants et valeurs absentes en dernier dans les deux sens',()=>{
  const e=setup([row('A',{amount:100}),row('B',{amount:'9'}),row('C',{amount:null})]);
  e.run("peppolTab='incoming';peppolPage=2;peppolSortBy('amount')");
  assert.deepEqual(e.read(),['B','A','C']);assert.equal(e.run('peppolPage'),1);
  e.context.peppolSortBy('amount');assert.deepEqual(e.read(),['A','B','C']);
});
test('dates chronologiques et numéros triés naturellement sur toute la liste',()=>{
  const e=setup(Array.from({length:13},(_,i)=>row('INV-'+(i+1),{created_at:i===0?'2026-09-30':'2026-10-01'})));
  e.run("peppolTab='incoming'");assert.equal(e.read().at(-1),'INV-1');
  e.context.peppolSortBy('number');assert.equal(e.read()[1],'INV-2');assert.equal(e.read().at(-1),'INV-13');
  assert.equal(e.context.peppolSortHeader('number','Numéro').includes('aria-sort="ascending"'),true);
});
test('tri des noms français, filtres et ordre indépendant par onglet',()=>{
  const e=setup([row('A',{party_name:'Électricité'}),row('B',{party_name:'Atelier'}),row('C',{direction:'outgoing',party_name:'Client'})]);
  e.run("peppolTab='incoming';peppolSortBy('party')");assert.deepEqual(e.read(),['B','A']);
  e.run("peppolQuery='electricite'");assert.deepEqual(e.read(),['A']);
  e.run("peppolTab='outgoing';peppolQuery='';peppolSortBy('number')");assert.deepEqual(e.read(),['C']);
  e.run("peppolTab='incoming'");assert.equal(e.run('peppolSorts.incoming.key'),'party');assert.deepEqual(e.read(),['B','A']);
});
