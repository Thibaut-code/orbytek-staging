const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function environment(){
const elements=new Map(),storage=new Map(),writes=[];
const element=()=>({dataset:{},style:{setProperty(){}},setAttribute(){},querySelector(){return null},close(){},textContent:'',innerHTML:''});
const $=key=>{if(!elements.has(key))elements.set(key,element());return elements.get(key)};
const context=vm.createContext({console,Date,Object,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},document:{documentElement:element(),getElementById:()=>null,querySelectorAll:()=>[]},$,account:{id:'a'},company:{name:'Test',catalogs:{plombier:[['Personnalisée',1,75]]}},themeChoice:'plombier',themeColumnReady:true,PROFESSIONS:{plombier:{label:'Plomberie'},jardinier:{label:'Jardinage'}},themeStorageKey:()=> 'profession:a',render(){},toast(){},showError(){},esc:String,db:{from:()=>({update:v=>{writes.push(v);return {eq:async()=>({})}}})}});
vm.runInContext(fs.readFileSync('interface.js','utf8'),context);
context.teamContext=null;context.companyOwner=()=>context.account.id;
context.document.querySelector=()=>null;
return {context,storage,writes};
}
test('les douze apparences ne modifient ni le métier ni les prestations personnelles',async()=>{
const e=environment();const keys=vm.runInContext('Object.keys(UI_THEMES)',e.context);assert.equal(keys.length,12);
for(const key of keys){await e.context.chooseTheme(key);assert.equal(e.context.themeChoice,'plombier');assert.equal(e.context.company.catalogs.plombier[0][0],'Personnalisée');assert.equal(e.storage.get('facture-facile-interface:a'),key)}
});
test('le métier sauvegarde la clé existante sans modifier l’apparence',async()=>{
const e=environment();e.context.applyInterface('violet');await e.context.chooseProfession('jardinier');assert.equal(e.context.themeChoice,'jardinier');assert.equal(vm.runInContext('uiChoice',e.context),'violet');assert.deepEqual(e.writes.map(x=>({...x})),[{theme:'jardinier'}]);
});
test('les préférences sont isolées par compte et les thèmes inconnus reviennent au défaut',()=>{
const e=environment();e.context.applyInterface('inconnu');assert.equal(vm.runInContext('uiChoice',e.context),'orbytek');assert.equal(e.context.uiStorageKey(),'facture-facile-interface:a');e.context.account={id:'b'};assert.equal(e.context.localInterface(),null);
});

test('le thème 12 utilise les documents du compte pour ses trois montants',()=>{
const e=environment();e.context.account.user_metadata={full_name:'Thibaut'};
e.context.docs=[{type:'facture',paid:false,total:120},{type:'facture',paid:false,total:80},{type:'facture',paid:true,total:45},{type:'devis',total:300}];
e.context.draft=null;e.context.euro=n=>n.toFixed(2)+' €';e.context.totals=d=>({total:d.total});e.context.homeTable=()=>'<table></table>';e.context.searchField=()=>'<input type="search">';
const html=e.context.orbytekHome();assert.match(html,/Bonjour Thibaut,/);assert.match(html,/200\.00 €/);assert.match(html,/45\.00 €/);assert.match(html,/300\.00 €/);assert.match(html,/2 facture\(s\) en attente/);assert.match(html,/openDocuments\('devis'\)/);
e.context.docs=[];assert.match(e.context.orbytekHome(),/Aucune facture pour le moment/);
});
