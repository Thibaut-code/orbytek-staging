const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
class Element {
  constructor(tag) { this.tag=tag; this.children=[]; this.dataset={}; this.attrs={}; this.events={}; this.currentTime=0; this.classList={toggle(){}}; }
  append(...nodes) { for(const n of nodes) { n.parent=this; this.children.push(n); } }
  prepend(n) { n.parent=this; this.children.unshift(n); }
  replaceChildren() { this.children=[]; }
  remove() { this.parent.children=this.parent.children.filter(c=>c!==this); }
  querySelector(q) { return this.children.find(c=>q.startsWith('.') ? c.className===q.slice(1) : c.tag===q) || null; }
  setAttribute(k,v) { this.attrs[k]=v; }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(k,f) { this.events[k]=f; }
  play() { this.played=true; return Promise.resolve(); }
  pause() { this.paused=true; }
  load() { this.loaded=true; }
  scrollIntoView(options) { this.scrolledIntoView=options; }
}
function run(saved) {
  const els = {};
  const document = {querySelector(q) { return els[q] ||= new Element(q); },createElement(tag){ if(tag==='video') throw Error('Unexpected video decoding for static thumbnails'); return new Element(tag); }};
  // The probe element is created, but must never load a video for the default menu.
  let probe;
  document.createElement = tag => {const e = new Element(tag); if(tag==='video') { probe=e; e.load=()=>{throw Error('Unexpected thumbnail video loading');}; } return e; };
  const context = {window:{},document,localStorage:{getItem:()=>JSON.stringify(saved),setItem(){}},structuredClone,Map,Date,URLSearchParams,location:{hash:''},setTimeout,clearTimeout,console};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('chapters.js','utf8'),context);
  vm.runInContext(fs.readFileSync('app.js','utf8'),context);
  return {context,els,probe};
}
const {context,els,probe}=run(null);
assert.equal(els['#chapters'].children.length,13);
assert.equal(els['#timeline'].children.length,13);
assert.equal(probe.getAttribute('src'),undefined);
let last=-1;
for(const c of context.window.FILM_CHAPTERS) {
  assert(c.time>last && c.time<13401.336); last=c.time;
  assert(fs.existsSync(c.thumbnail || (c.time===4100 ? 'thumbnails/bapteme-maison.jpg' : '')));
}
const chapter=els['#chapters'].children[8];
chapter.events.click();
assert.equal(els['#film'].currentTime,8434);
assert.equal(els['#film'].played,true);
els['#film'].events.timeupdate();
assert.equal(els['#current'].textContent,'02/01/1992 : thibaut en vacance chez Jean-Paul et sa marraine');
els['#timeline'].children[5].events.click();
assert.equal(els['#film'].currentTime,5153);
els['#film'].duration=13401.336;
els['#film'].currentTime=10;
els['#back-five'].events.click();
assert.equal(els['#film'].currentTime,5);
els['#forward-five'].events.click();
assert.equal(els['#film'].currentTime,10);
els['#film'].currentTime=2;
els['#back-five'].events.click();
assert.equal(els['#film'].currentTime,0);
els['#film'].currentTime=13400;
els['#forward-five'].events.click();
assert.equal(els['#film'].currentTime,13401.336);
const old = Array.from({length:23},(_,i)=>({time:i*600,title:'Souvenirs',provisional:true}));
const yearTab = year => els['#year-tabs'].children.find(b=>b.dataset.year===year);
yearTab('1986').events.click();
assert.equal(els['#chapters'].children[0].hidden,true);
assert.equal(els['#chapters'].children.find(b=>!b.hidden).dataset.time,1942);
assert.equal(els['#chapters'].children[1].scrolledIntoView.block,'start');
assert.equal(els['#chapters'].children.at(-1).hidden,false);
els['#film'].currentTime=0; els['#film'].events.timeupdate();
assert.equal(yearTab('1986').attrs['aria-current'],'true');
yearTab('1992').events.click();
assert.equal(els['#chapters'].children.find(b=>!b.hidden).dataset.time,8434);
yearTab('1981').events.click();
assert.equal(els['#chapters'].children.filter(b=>!b.hidden).length,13);
assert.equal(run(old).els['#chapters'].children.length,13);
assert.equal(run([{time:0,title:'Mon chapitre personnel',thumbnail:'thumbnails/01.jpg'}]).els['#chapters'].children.length,1);
console.log('PASS: 13 imported chapters, ordered timings, static thumbnails, chapter seeking, year filtering and scroll target, ±5 seconds, personal edits preserved.');
