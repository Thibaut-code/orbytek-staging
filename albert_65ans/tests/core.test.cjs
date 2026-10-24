const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../core.js');
const source={person:'thibaut',id:'s0q0',kind:'question',revision:2,data:{answer:'20 octobre 1961',memory:'Date confirmée',photos:[]}};
test('un instantané retire les contributions supprimées du cache sans effacer les brouillons locaux',()=>{
  const s=C.emptyStore();s.records['thibaut/s0q0']=C.clone(source);C.edit(s,'thibaut','s0q0','question',{answer:'Brouillon à conserver'});
  C.replaceRecords(s,[]);assert.equal(Object.keys(s.records).length,0);assert.equal(C.record(s,'thibaut','s0q0').data.answer,'Brouillon à conserver');
});
test('les nouveaux participants peuvent répondre sans toucher aux profils existants',()=>{
  const id='p-12345678-1234-4234-8234-123456789abc',s=C.emptyStore();
  C.registerPeople([{id,name:'Arnaud'},{id:'toString',name:'Incorrect'}]);
  C.edit(s,id,'s0q0','question',{answer:'Mon souvenir'});
  assert.equal(C.PEOPLE[id],'Arnaud');assert.equal(C.PEOPLE.thibaut,'Thibaut');assert.equal(C.PEOPLE.toString,undefined);
  assert.equal(C.batch(s,id).length,1);assert.equal(C.batch(s,'thibaut').length,0);
});
test('un accord copie la réponse dans le seul profil actif',()=>{
  const s=C.emptyStore();s.records[C.key('thibaut','s0q0')]=C.clone(source);
  C.copyAnswer(s,'maman','s0q0',s.records['thibaut/s0q0'],false);
  assert.equal(C.record(s,'maman','s0q0').data.answer,source.data.answer);
  assert.equal(C.record(s,'maman','s0q0').data.memory,source.data.memory);
  assert.equal(C.record(s,'maman','s0q0').data.mode,'agree');
  C.record(s,'maman','s0q0').data.answer='Une précision';
  assert.equal(s.records['thibaut/s0q0'].data.answer,source.data.answer);
  assert.equal(C.batch(s,'jean-paul').length,0);
});
test('apporter une précision conserve une version personnelle existante',()=>{
  const s=C.emptyStore();C.edit(s,'maman','s0q0','question',{answer:'Ma version',memory:'Mon souvenir',photos:[]});
  C.copyAnswer(s,'maman','s0q0',source,true);
  assert.equal(C.record(s,'maman','s0q0').data.answer,'Ma version');
  assert.equal(C.record(s,'maman','s0q0').data.memory,'Mon souvenir');
  assert.equal(C.record(s,'maman','s0q0').data.mode,'precision');
});
test('une saisie pendant une sauvegarde réseau reste en attente avec la nouvelle révision',()=>{
  const s=C.emptyStore();C.edit(s,'maman','s0q1','question',{answer:'A'});const sent=C.batch(s,'maman');
  C.edit(s,'maman','s0q1','question',{answer:'B'});
  C.acknowledge(s,sent,{saved:[{...sent[0],revision:1}],conflicts:[]});
  assert.equal(C.record(s,'maman','s0q1').data.answer,'B');
  assert.equal(C.batch(s,'maman')[0].baseRevision,1);
  C.acknowledge(s,C.batch(s,'maman'),{saved:[{...C.batch(s,'maman')[0],revision:2}]});
  assert.equal(C.batch(s,'maman').length,0);assert.equal(C.record(s,'maman','s0q1').data.answer,'B');
});
test('les conflits ne sont pas envoyés à nouveau sans choix explicite',()=>{
  const s=C.emptyStore();C.edit(s,'maman','s0q0','question',{answer:'Mon brouillon'});
  C.merge(s,[{person:'maman',id:'s0q0',kind:'question',revision:2,data:{answer:'Autre appareil'}}]);
  assert.equal(C.record(s,'maman','s0q0').data.answer,'Mon brouillon');assert.equal(C.batch(s,'maman').length,0);
  C.resolve(s,'maman','s0q0',true);assert.equal(C.batch(s,'maman')[0].baseRevision,2);
  C.resolve(s,'maman','s0q0',false);assert.equal(C.record(s,'maman','s0q0').data.answer,'Autre appareil');
});
test('une actualisation des autres personnes ne marque pas un conflit personnel',()=>{
  const s=C.emptyStore();C.edit(s,'maman','s0q0','question',{answer:'Ma réponse'});C.merge(s,[source]);
  assert.equal(C.batch(s,'maman').length,1);assert.equal(C.record(s,'thibaut','s0q0').data.answer,source.data.answer);
});
test('conversations et anecdotes restent rattachées à leur auteur',()=>{
  const s=C.emptyStore();C.edit(s,'maman','scene-a','anecdote',{words:'Son premier vélo'});C.edit(s,'jean-paul','scene-b','conversation',{words:'Albert : Bonjour !'});
  assert.equal(C.batch(s,'maman').length,1);assert.equal(C.batch(s,'maman')[0].kind,'anecdote');assert.equal(C.batch(s,'jean-paul')[0].kind,'conversation');
  assert.throws(()=>C.edit(s,'inconnu','id','anecdote',{}));assert.throws(()=>C.copyAnswer(s,'thibaut','s0q0',source,false));
});
