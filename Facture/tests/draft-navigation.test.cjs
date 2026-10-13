const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
function environment(type='facture') {
  let dialog;
  const context=vm.createContext({structuredClone, company:{}, DEFAULT_APPEARANCE:{}, today:()=> '2026-10-02', addCalendarDays:()=> '2026-10-16',
    document:{getElementById:()=>null,createElement:()=>{
      const buttons={};dialog={buttons,innerHTML:'',setAttribute(){},querySelector:key=>buttons[key]||= {},addEventListener(){},remove(){},showModal(){},close(){}};return dialog;
    },body:{append(){}}},go:route=>context.route=route});
  vm.runInContext(`let draft={type:'${type}',job:'Travaux en cours',lines:[{name:'Prestation',qty:2,price:75}],dbId:'saved-document'},step=2,returnToWizard=true,filter='facture';`,context);
  vm.runInContext(app.slice(app.indexOf('function start(type)'),app.indexOf('function wizard()')),context);
  return {context,dialog:()=>dialog,state:()=>vm.runInContext('({draft,step,returnToWizard,filter})',context)};
}
test('aller aux devis demande un choix et continuer conserve la facture et son étape',()=>{
  const e=environment();e.context.openDocuments('devis');assert.match(e.dialog().innerHTML,/Une facture est en cours/);assert.equal(e.context.route,undefined);
  e.dialog().buttons['[data-continue]'].onclick();assert.equal(e.context.route,'wizard');assert.equal(e.state().step,2);assert.equal(e.state().draft.job,'Travaux en cours');assert.equal(e.state().filter,'facture');
});
test('abandonner ouvre les devis et nettoie seulement le brouillon',()=>{
  const e=environment();e.context.openDocuments('devis');e.dialog().buttons['[data-discard]'].onclick();assert.equal(e.context.route,'docs');assert.equal(e.state().filter,'devis');assert.equal(e.state().draft,null);assert.equal(e.state().returnToWizard,false);
});
test('annuler conserve les champs sans changer de page',()=>{
  const e=environment();e.context.start('devis');e.dialog().buttons['[data-cancel]'].onclick();assert.equal(e.context.route,undefined);assert.equal(e.state().draft.lines[0].qty,2);
});
test('abandonner pour créer un devis initialise bien un nouveau devis',()=>{
  const e=environment();e.context.start('devis');e.dialog().buttons['[data-discard]'].onclick();assert.equal(e.context.route,'wizard');assert.equal(e.state().draft.type,'devis');assert.equal(e.state().draft.lines.length,0);assert.equal(e.state().step,1);assert.equal(e.state().draft.dbId,undefined);
});
test('le choix est symétrique et la liste du même type reste accessible',()=>{
  const e=environment('devis');e.context.openDocuments('facture');assert.match(e.dialog().innerHTML,/Un devis est en cours/);
  const same=environment();same.context.openDocuments('facture');assert.equal(same.dialog(),undefined);assert.equal(same.context.route,'docs');assert.equal(same.state().draft.type,'facture');
});
