const {test}=require('node:test'),assert=require('node:assert/strict'),A=require('../admin-core.js');
const photo={name:'enfance.png',data:'data:image/png;base64,YQ=='};
const sections=[{title:'1. Origines',questions:['Quand est-il né ?','Où a-t-il grandi ?']}];
function fixture(){return {people:[{id:'thibaut',name:'Thibaut'},{id:'maman',name:'Maman'},{id:'jean-paul',name:'Jean-Paul'}],records:[
  {person:'thibaut',id:'s0q0',kind:'question',data:{answer:'Le 20 octobre 1961.',memory:'Date à vérifier.',photos:[photo]}},
  {person:'maman',id:'s0q0',kind:'question',data:{answer:'  Le 20 octobre 1961.  ',memory:'Date à vérifier.'}},
  {person:'jean-paul',id:'s0q0',kind:'question',data:{answer:'Le 21 octobre, je pense.',memory:'Voir le livret.'}},
  {person:'maman',id:'s0q1',kind:'question',data:{memory:'La maison près de la place.'}},
  {person:'thibaut',id:'scene-1',kind:'conversation',data:{when:'À la mer',who:'Albert et Hugo',words:'Une conversation mémorable.',photos:[photo]}},
  {person:'maman',id:'scene-2',kind:'anecdote',data:{words:'Un fou rire.'}},
  {person:'maman',id:'scene-3',kind:'anecdote',data:{words:'Scène retirée',deleted:true,photos:[photo]}},
  {person:'supprime',id:'s0q1',kind:'question',data:{answer:'Profil supprimé',photos:[photo]}}
]};}
test('le regroupement réunit les doublons avec leurs auteurs et conserve les variantes',()=>{
  const data=fixture(),before=JSON.stringify(data),merged=A.compile(data,sections),q=merged.questions[0];
  assert.equal(q.answers.length,2);assert.deepEqual(q.answers[0].authors.map(a=>a.name),['Thibaut','Maman']);assert.equal(q.notes.length,2);assert.equal(merged.stats.variants,1);
  assert.equal(merged.questions.length,2);assert.equal(merged.scenes.length,2);assert.equal(JSON.stringify(data),before);
});
test('chaque photo garde son auteur, sa question ou sa conversation',()=>{
  const merged=A.compile(fixture(),sections);assert.equal(merged.gallery.length,2);
  assert.equal(merged.gallery[0].author,'Thibaut');assert.equal(merged.gallery[0].questionId,'s0q0');assert.match(merged.gallery[0].title,/Quand est-il né/);
  assert.equal(merged.gallery[1].questionId,null);assert.match(merged.gallery[1].context,/Albert et Hugo/);
  assert(!merged.records.some(r=>r.person==='supprime'));assert(!merged.scenes.some(r=>r.id==='scene-3'));
});
test('l’export réunit questions, notes, variantes, conversations, anecdotes et index des photos',()=>{
  const text=A.textExport(A.compile(fixture(),sections));for(const expected of ['Thibaut, Maman','Le 20 octobre 1961.','Le 21 octobre','La maison près','Une conversation mémorable','Un fou rire','enfance.png'])assert(text.includes(expected));
  assert.equal(text.split('Le 20 octobre 1961.').length-1,1);assert(!text.includes('Profil supprimé'));assert(!text.includes('Scène retirée'));
});
test('une galerie vide et des images non reconnues sont traitées sans erreur',()=>{
  const data=fixture();data.records=[{person:'maman',id:'s0q0',kind:'question',data:{photos:[{data:'javascript:alert(1)'},{data:'data:image/svg+xml;base64,YQ=='}]}}];
  const result=A.compile(data,sections);assert.equal(result.gallery.length,0);assert.equal(result.questions.length,0);assert.equal(A.compile({people:[],records:[]},sections).stats.people,0);
});
