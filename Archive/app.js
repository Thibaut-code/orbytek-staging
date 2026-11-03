'use strict';
const film = document.querySelector('#film');
const grid = document.querySelector('#chapters');
const timeline = document.querySelector('#timeline');
const stripYears = document.querySelector('#strip-years');
const chapterYear = c => c.title.match(/\b(?:19|20)\d{2}\b/)?.[0] || 'Sans date';
let lastActive = -1;
let selectedYear = null;
const key = 'orbytek-thibaut-chapters-v1';
const format = t => new Date(Math.floor(t) * 1000).toISOString().slice(11,19);
function valid(list) {
  return Array.isArray(list) && list.length > 0 && list.length <= 500 && list.every(c => Number.isFinite(c.time) && c.time >= 0 && c.time < 13401.358 && typeof c.title === 'string' && c.title.trim().length > 0 && c.title.length <= 120);
}
let chapters = structuredClone(window.FILM_CHAPTERS);
try {
  const saved = JSON.parse(localStorage.getItem(key));
  const oldDefaults = Array.isArray(saved) && saved.length === 23 && saved.every((c,i) => c.provisional === true && c.time === i*600);
  if(valid(saved) && !oldDefaults) chapters = saved;
} catch {}
let thumbnails = new Map();
const probe = document.createElement('video');
probe.muted = true; probe.preload = 'none';
function save() { try { localStorage.setItem(key, JSON.stringify(chapters)); } catch { document.querySelector('#status').textContent = 'Stockage local indisponible : exportez vos chapitres pour les conserver.'; } }
function seek(time, play = true) { film.currentTime = time; highlight(); if(play) film.play().catch(() => {}); }
function skip(seconds) {
  if(!Number.isFinite(film.duration) || film.duration <= 0) return;
  film.currentTime = Math.max(0,Math.min(film.duration,film.currentTime + seconds));
  highlight();
}
document.querySelector('#back-five').addEventListener('click',() => skip(-5));
document.querySelector('#forward-five').addEventListener('click',() => skip(5));
function render() {
  chapters.sort((a,b) => a.time-b.time); grid.replaceChildren(); timeline.replaceChildren(); stripYears.replaceChildren(); lastActive = -1;
  document.querySelector('#notice').textContent = 'Clique sur une image pour retrouver ce moment.';
  chapters.forEach((c,i) => {
    const button = document.createElement('button'); button.className = 'chapter'; button.dataset.time = c.time;
    button.setAttribute('aria-label',c.title+' — '+format(c.time)); button.title = c.title;
    const thumb = document.createElement('span'); thumb.className = 'thumb';
    const fallback = document.createElement('span'); fallback.className = 'placeholder'; fallback.textContent = String(i+1).padStart(2,'0'); thumb.append(fallback);
    const stamp = document.createElement('span'); stamp.className = 'stamp'; stamp.textContent = format(c.time); thumb.append(stamp);
    const title = document.createElement('strong'); title.textContent = c.title;
    const subtitle = document.createElement('small'); subtitle.textContent = 'Revoir ce moment · '+format(c.time);
    const copy = document.createElement('span'); copy.className = 'chapter-copy'; copy.append(title,subtitle);
    const rowYear = document.createElement('span'); rowYear.className = 'row-year'; rowYear.textContent = chapterYear(c)==='Sans date' ? '—' : chapterYear(c);
    button.append(rowYear,thumb,copy); button.addEventListener('click', () => { seek(c.time); film.scrollIntoView?.({behavior:'smooth',block:'center'}); }); grid.append(button);
    if(c.thumbnail && /^thumbnails\/[\w-]+\.jpg$/.test(c.thumbnail)) setThumbnail(c.time,c.thumbnail);
    else if(c.time === 4100) { thumbnails.set(c.time,'thumbnails/bapteme-maison.jpg'); setThumbnail(c.time,'thumbnails/bapteme-maison.jpg'); }
    else if(thumbnails.has(c.time)) setThumbnail(c.time, thumbnails.get(c.time));
    const marker = document.createElement('button'); marker.className = 'timeline-item';
    const year = document.createElement('strong'); year.textContent = chapterYear(c);
    const caption = document.createElement('small'); caption.textContent = c.title;
    marker.append(year,caption); marker.addEventListener('click',() => seek(c.time)); timeline.append(marker);
    const yearButton = document.createElement('button'); yearButton.className = 'strip-year'; yearButton.textContent = chapterYear(c);
    yearButton.setAttribute('aria-label',c.title); yearButton.addEventListener('click',() => seek(c.time)); stripYears.append(yearButton);
  });
  const tabs = document.querySelector('#year-tabs'); tabs.replaceChildren();
  const years = [...new Set(chapters.map(chapterYear))].filter(y=>y!=='Sans date').sort();
  years.push('Sans date');
  years.forEach(year => {
    if(!chapters.some(c=>chapterYear(c)===year)) return;
    const tab = document.createElement('button'); tab.className='year-tab'; tab.textContent=year; tab.dataset.year=year;
    tab.addEventListener('click',() => {
      selectedYear = year;
      applyYearFilter();
      // The sticky tab bar stays at the viewport top even at the bottom of the
      // list. Scroll to the chapter itself, leaving room for the sticky tabs.
      const firstVisible = [...grid.children].find(row=>!row.hidden);
      firstVisible?.scrollIntoView?.({behavior:'smooth',block:'start'});
    }); tabs.append(tab);
  });
  applyYearFilter(); renderRows(); highlight();
}
function applyYearFilter() {
  const first = selectedYear ? chapters.findIndex(c=>chapterYear(c)===selectedYear) : 0;
  if(first < 0) selectedYear = null;
  [...grid.children].forEach((row,i) => {
    row.hidden = selectedYear === 'Sans date' ? chapterYear(chapters[i]) !== 'Sans date' : selectedYear !== null && i < first;
  });
  [...document.querySelector('#year-tabs').children].forEach(tab => {
    const current = selectedYear || (lastActive >= 0 ? chapterYear(chapters[lastActive]) : chapterYear(chapters[0]));
    const selected = tab.dataset.year === current;
    tab.classList.toggle('active',selected); tab.setAttribute('aria-current',selected?'true':'false');
  });
}
function highlight() {
  let active = -1; chapters.forEach((c,i) => { if(film.currentTime >= c.time) active = i; });
  [...grid.children].forEach((b,i) => { b.classList.toggle('active',i === active); b.setAttribute('aria-current',i === active ? 'true' : 'false'); });
  [...timeline.children].forEach((b,i) => { b.classList.toggle('active',i === active); b.setAttribute('aria-current',i === active ? 'true' : 'false'); });
  [...stripYears.children].forEach((b,i) => { b.classList.toggle('active',i === active); b.setAttribute('aria-current',i === active ? 'true' : 'false'); });
  [...timeline.children].forEach((b,i) => {
    const end = chapters[i+1]?.time || film.duration || 13401.405;
    const progress = Math.max(0,Math.min(1,(film.currentTime-chapters[i].time)/(end-chapters[i].time)));
    b.style?.setProperty('--progress',(progress*100)+'%');
  });
  document.querySelector('#current').textContent = active < 0 ? 'Le film de Thibaut' : chapters[active].title;
  document.querySelector('#chapter-count').textContent = active < 0 ? chapters.length+' souvenirs' : 'Souvenir '+String(active+1).padStart(2,'0')+' / '+chapters.length;
  if(active !== lastActive && active >= 0) {
    [...document.querySelector('#year-tabs').children].forEach(b=> { const selected=b.dataset.year===(selectedYear || chapterYear(chapters[active])); b.classList.toggle('active',selected); b.setAttribute('aria-current',selected?'true':'false'); });
    lastActive = active;
  }
}
function renderRows() {
  const rows = document.querySelector('#rows'); rows.replaceChildren();
  chapters.forEach(c => {
    const row = document.createElement('div'); row.className = 'row';
    const time = document.createElement('button'); time.textContent = format(c.time); time.title = 'Aller à ce moment'; time.onclick = () => seek(c.time,false);
    const name = document.createElement('input'); name.value = c.title; name.maxLength = 120; name.setAttribute('aria-label','Nom du chapitre à '+format(c.time));
    name.onchange = () => { if(name.value.trim()) { c.title = name.value.trim(); c.provisional = false; save(); render(); } else name.value = c.title; };
    const remove = document.createElement('button'); remove.textContent = 'Supprimer'; remove.disabled = chapters.length === 1; remove.onclick = () => { chapters = chapters.filter(x => x !== c); save(); render(); };
    row.append(time,name,remove); rows.append(row);
  });
}
function setThumbnail(time,src) {
  const thumb = [...grid.children].find(b => Number(b.dataset.time) === time)?.querySelector('.thumb'); if(!thumb) return;
  thumb.querySelector('.placeholder')?.remove(); thumb.querySelector('img')?.remove();
  const img = document.createElement('img'); img.src = src; img.alt = ''; thumb.prepend(img);
}
function waitEvent(target,event) { return new Promise((resolve,reject) => { const timer = setTimeout(() => finish(new Error('timeout')),20000); const done = () => finish(); const error = () => finish(new Error('video')); function finish(err) { clearTimeout(timer); target.removeEventListener(event,done); target.removeEventListener('error',error); err ? reject(err) : resolve(); } target.addEventListener(event,done,{once:true}); target.addEventListener('error',error,{once:true}); }); }
let generating = false;
async function generateThumbnails() {
  if(chapters.every(c => c.thumbnail || thumbnails.has(c.time))) return;
  if(generating) return; generating = true;
  try {
    if(!probe.getAttribute('src')) { const ready = waitEvent(probe,'loadedmetadata'); probe.src = film.getAttribute('src'); probe.load(); await ready; }
    else if(probe.readyState < 1) await waitEvent(probe,'loadedmetadata');
    const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 300; const ctx = canvas.getContext('2d');
    for(const c of [...chapters]) {
      if(c.thumbnail || thumbnails.has(c.time)) continue;
      const ready = waitEvent(probe,'seeked'); probe.currentTime = Math.min(c.time + 3,probe.duration-0.1); await ready;
      ctx.drawImage(probe,0,0,canvas.width,canvas.height); const src = canvas.toDataURL('image/jpeg',0.72); thumbnails.set(c.time,src); setThumbnail(c.time,src);
    }
  } catch { document.querySelector('#status').textContent = 'Certaines vignettes ne sont pas disponibles. La lecture et les chapitres restent accessibles.'; }
  finally { generating = false; }
}
film.addEventListener('timeupdate',highlight);
let initialMetadata = true;
film.addEventListener('loadedmetadata',() => {
  document.querySelector('#duration').textContent = format(film.duration)+' de souvenirs';
  if(initialMetadata) {
    const t = Number(new URLSearchParams(location.hash.slice(1)).get('t'));
    if(Number.isFinite(t) && t > 0 && t < film.duration) seek(t,false);
  }
  initialMetadata = false;
});
film.addEventListener('error',() => { document.querySelector('#current').textContent = 'Vidéo indisponible : vérifiez que '+film.getAttribute('src')+' est à côté de cette page.'; });
document.querySelector('#edit').onclick = () => { const editor = document.querySelector('#editor'); editor.hidden = !editor.hidden; document.querySelector('#edit').setAttribute('aria-expanded',String(!editor.hidden)); if(!editor.hidden) editor.scrollIntoView({behavior:'smooth',block:'start'}); };
document.querySelector('#add').onsubmit = e => { e.preventDefault(); const input = document.querySelector('#title'); chapters.push({time:Math.floor(film.currentTime), title:input.value.trim(), provisional:false}); save(); render(); input.value = ''; generateThumbnails(); };
document.querySelector('#export').onclick = () => { const content = 'window.FILM_CHAPTERS = '+JSON.stringify(chapters,null,2)+';\n'; const blob = new Blob([content],{type:'text/javascript'}); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'chapters.js'; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000); document.querySelector('#status').textContent = 'Remplacez chapters.js sur le site par ce fichier pour publier vos repères.'; };
document.querySelector('#import').onchange = async e => { try { const file = e.target.files[0]; if(!file) return; if(file.size > 1000000) throw Error(); const list = JSON.parse(await file.text()); if(!valid(list)) throw Error(); chapters = list; save(); render(); generateThumbnails(); document.querySelector('#status').textContent = 'Chapitres importés.'; } catch { document.querySelector('#status').textContent = 'Fichier invalide. Utilisez un tableau JSON avec time (secondes) et title.'; } e.target.value = ''; };
document.querySelector('#reset').onclick = () => { if(confirm('Remplacer vos chapitres par les séquences repérées dans le film ?')) { chapters = structuredClone(window.FILM_CHAPTERS); save(); render(); generateThumbnails(); } };
render(); generateThumbnails();
