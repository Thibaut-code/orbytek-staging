'use strict';
const C = window.AlbertCore, { sections } = window.ALBERT_DATA;
const config = window.ALBERT_CONFIG, $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const qid = (s, q) => `s${s}q${q}`;
const allQuestions = sections.flatMap((s, si) => s.questions.map((q, qi) => ({ id: qid(si, qi), question: q })));
let store = C.emptyStore(), db, person = null, chosen = null, familyCode = '', syncing = null, localTimer, toastTimer;
let onlineReady = false, localReady = false;
function preference(k, value) { try { if (value !== undefined) localStorage.setItem(`albert-v2-${k}`, value); return localStorage.getItem(`albert-v2-${k}`) || ''; } catch { return ''; } }
function toast(text) { $('#toast').textContent = text; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').hidden = true, 5000); }
function status(text, tone = '') { $('#status').textContent = text; $('#saveDot').className = `save-dot ${tone}`; }
function notice(text = '') { $('#connectionNotice').textContent = text; $('#connectionNotice').hidden = !text; }
function welcomeNotice(text) { $('#welcomeStatus').textContent = text; $('#welcomeStatus').hidden = !text; }
function renderPeople() {
  const descriptions={maman:'Marianne','jean-paul':'Son frère',thibaut:'Son fils'}, colors=['rose','blue','sage'];
  const people=store.people||Object.entries(C.PEOPLE).map(([id,name])=>({id,name}));
  $('#people').innerHTML=people.map(({id,name},i)=>`<button class="person" data-person="${esc(id)}"><span class="avatar ${colors[i%3]}">${esc(Array.from(name)[0]?.toLocaleUpperCase('fr'))}</span><strong>${esc(name)}</strong><small>${esc(descriptions[id]||'Un proche d’Albert')}</small><span class="person-arrow" aria-hidden="true">↗</span></button>`).join('');
}
function isActive(id){return Array.isArray(store.people)?store.people.some(p=>p.id===id):!!C.PEOPLE[id];}
function removedProfile(){person=null;chosen=null;preference('person','');$('#workspace').hidden=true;$('#welcome').hidden=false;$('#changePerson').hidden=true;showPeople();welcomeNotice('Ce profil a été supprimé par l’administrateur. Choisis une autre personne pour continuer.');}
function mergeSnapshot(result) {
  if(Array.isArray(result.people)){store.people=result.people;C.registerPeople(result.people);renderPeople();}
  C.replaceRecords(store,result.records);
}
async function loadPeople() {
  if(!familyCode)return;
  try{const result=await rpc('albert_people',{p_code:familyCode});store.people=result.people;C.registerPeople(result.people);renderPeople();await persist();if(person&&!isActive(person))removedProfile();}catch{ /* Les profils déjà connus restent disponibles hors connexion. */ }
}
function showPeople() {
  $('#people').hidden=false;$('#addPerson').hidden=false;$('#accessForm').hidden=true;$('#newPersonForm').hidden=true;welcomeNotice('');renderPeople();
}
async function createPerson(event) {
  event.preventDefault();const name=$('#newPersonName').value.trim().replace(/\s+/g,' ');
  if(!name)return $('#newPersonName').focus();
  const code=familyCode||$('#newPersonCode').value.trim();if(!code)return $('#newPersonCode').focus();
  $('#createPerson').disabled=true;$('#cancelNewPerson').disabled=true;$('#newPersonStatus').hidden=true;
  try{
    const result=await rpc('albert_add_person',{p_code:code,p_name:name});familyCode=code;preference('code',code);
    C.registerPeople([result.person]);store.people=[...(store.people||[]).filter(p=>p.id!==result.person.id),result.person];await persist();
    $('#newPersonForm').hidden=true;$('#newPersonName').value='';if(!result.created)toast('Ce prénom est déjà dans la liste. Voici ses souvenirs.');
    await selectPerson(result.person.id);
  }catch(error){$('#newPersonStatus').textContent=error.code==='22023'?(error.message.startsWith('Ce prénom')?error.message:'Choisis un prénom ou un nom de 1 à 80 caractères.'):error.code==='42501'?friendlyError(error):'Impossible d’ajouter une personne pour le moment. Vérifie ta connexion puis réessaie.';$('#newPersonStatus').hidden=false;}
  finally{$('#createPerson').disabled=false;$('#cancelNewPerson').disabled=false;}
}
function formatTime(value) { return new Intl.DateTimeFormat('fr-BE', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('AlbertCourtoisQuestionnaire', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('draft');
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
}
function dbGet(key) {
  return new Promise((resolve, reject) => { const req = db.transaction('draft').objectStore('draft').get(key); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
}
async function persist() {
  clearTimeout(localTimer);
  if (!db) return false;
  try {
    await new Promise((resolve, reject) => { const tx = db.transaction('draft', 'readwrite'); tx.objectStore('draft').put(C.clone(store), 'albert-collaboratif-v2'); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
    localReady = true; return true;
  } catch { localReady = false; status('Brouillon non sauvegardé sur cet appareil. Enregistre en ligne ou télécharge une copie.', 'error'); return false; }
}
function own(id) { return C.record(store, person, id); }
function pendingCount() { return Object.values(store.drafts).filter(r => r.person === person).length; }
function changed(id, kind, data) {
  C.edit(store, person, id, kind, data);
  status('Modification en cours · enregistrement en ligne dans moins d’une minute', 'pending');
  clearTimeout(localTimer);
  localTimer = setTimeout(async () => { if (await persist()) status('Brouillon gardé sur cet appareil · enregistrement en ligne chaque minute', 'pending'); }, 180);
  updateProgress();
}
async function rpc(name, params) {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST', headers: { apikey: config.supabaseKey, 'Content-Type': 'application/json' }, body: JSON.stringify(params), signal: AbortSignal.timeout(25000)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) { const err = Error(result.message || 'Connexion indisponible'); err.code = result.code; err.status = response.status; throw err; }
  return result;
}
function friendlyError(error) {
  if (error.code === '42501') return 'Le code de la famille est incorrect. Vérifie le code reçu avec ton invitation.';
  if (error.code === 'PGRST202' || error.status === 404) return 'Le partage familial doit encore être activé sur le site. Tes brouillons restent sur cet appareil.';
  return 'Connexion au partage indisponible. Tes brouillons restent sur cet appareil ; une nouvelle tentative aura lieu dans une minute.';
}
async function sync() {
  if (!person || !familyCode) return;
  if (syncing) return syncing;
  const owner = person;
  syncing = (async () => {
    await persist(); status('Enregistrement et actualisation…', 'pending');
    try {
      const sent = C.batch(store, owner);
      // Les paquets sont par profil et par ligne ; aucun document global n’est remplacé.
      for (let i = 0; i < sent.length; i += 8) {
        const chunk = sent.slice(i, i + 8);
        const result = await rpc('albert_save', { p_code: familyCode, p_person: owner, p_changes: chunk.map(({id,kind,data,baseRevision}) => ({id,kind,data,baseRevision})) });
        C.acknowledge(store, chunk, result);
        await persist();
      }
      const result = await rpc('albert_snapshot', { p_code: familyCode });
      mergeSnapshot(result); store.lastSync = new Date().toISOString(); onlineReady = true;
      await persist();
      if(!isActive(owner)){removedProfile();return false;}
      if (person === owner) {
        const conflicts = Object.values(store.drafts).filter(r => r.person === person && r.conflict).length;
        notice(conflicts ? 'Ce profil a aussi été modifié sur un autre appareil. Choisis la version à garder dans les souvenirs signalés.' : '');
        status(conflicts ? `${conflicts} souvenir(s) à vérifier avant enregistrement` : pendingCount() ? 'Nouvelles modifications en attente · brouillon local conservé' : `Enregistré en ligne à ${formatTime(store.lastSync)} · actualisation chaque minute`, conflicts ? 'error' : pendingCount() ? 'pending' : '');
        refreshRemote(); updateProgress();
      }
      return true;
    } catch (error) { onlineReady = false; if(error.message==='Profil supprimé'){await loadPeople();removedProfile();return false;} if (person === owner) { notice(friendlyError(error)); status(localReady ? 'Brouillon local conservé · partage en attente' : 'Enregistrement indisponible · télécharge une copie', 'error'); } return false; }
    finally { syncing = null; }
  })();
  return syncing;
}
function importLegacy(legacy) {
  for (const q of allQuestions) {
    const answer = legacy.answers?.[q.id], memory = legacy.memories?.[q.id], photos = legacy.photos?.[q.id];
    if (answer === undefined && memory === undefined && !photos?.length) continue;
    const current = C.record(store,'thibaut',q.id)?.data;
    if (current && (answer || '') === (current.answer || '') && (memory || '') === (current.memory || '') && !photos?.length) continue;
    if (!store.drafts[C.key('thibaut',q.id)]) C.edit(store, 'thibaut', q.id, 'question', { answer: answer || '', memory: memory || '', photos: validPhotos(photos) });
  }
  for (const scene of legacy.dialogs || []) { const id = crypto.randomUUID(); C.edit(store, 'thibaut', id, 'conversation', {...scene, photos:validPhotos(scene.photos), createdAt:new Date().toISOString()}); }
}
async function selectPerson(id) {
  if (!isActive(id)) return;
  chosen = id; $('#people').hidden = true; $('#addPerson').hidden=true; $('#newPersonForm').hidden=true; $('#accessForm').hidden = false; $('#selectedPerson').textContent = C.PEOPLE[id];
  if (familyCode) { $('#familyCode').value = familyCode; await start(); } else $('#familyCode').focus();
}
async function start() {
  if (!chosen || !localReady) return welcomeNotice('Le stockage du navigateur est indisponible. Autorise-le puis recharge cette page pour préserver tes réponses.');
  familyCode = $('#familyCode').value.trim(); if (!familyCode) return $('#familyCode').focus();
  $('#start').disabled = true; welcomeNotice('Ouverture des souvenirs…');
  try {
    const result = await rpc('albert_snapshot', {p_code:familyCode}); mergeSnapshot(result); onlineReady = true; store.lastSync = new Date().toISOString();
  } catch (error) {
    onlineReady = false;
    if (error.code === '42501' || !store.lastSync) { welcomeNotice(friendlyError(error)); $('#start').disabled = false; return; }
  }
  if(!isActive(chosen)){showPeople();welcomeNotice('Ce profil a été supprimé par l’administrateur.');$('#start').disabled=false;return;}
  person = chosen;
  if(person==='thibaut' && store.legacyBackup && !store.legacyImported) {importLegacy(store.legacyBackup);store.legacyImported=true;delete store.legacyBackup;}
  preference('code', familyCode); preference('person', person); await persist();
  $('#welcome').hidden = true; $('#workspace').hidden = false; $('#changePerson').hidden = false; $('#changePerson').textContent = `${C.PEOPLE[person]} · Changer`;
  $('#footerInfo').textContent = 'Brouillon sur cet appareil · sauvegarde partagée chaque minute';
  welcomeNotice(''); $('#start').disabled = false; render();
  if (onlineReady) { status(`Réponses actualisées à ${formatTime(store.lastSync)} · sauvegarde chaque minute`); notice(''); }
  else { notice('Tu es hors connexion. Tes brouillons seront partagés au retour d’Internet.'); status('Brouillon local · hors connexion', 'error'); }
  if (pendingCount()) void sync(); window.scrollTo(0,0);
}
function otherRows(id) { return Object.values(store.records).filter(r => r.id === id && r.person !== person && C.hasContent(r.data)); }
function safePhoto(data) { return typeof data === 'string' && /^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(data); }
function validPhotos(photos) { return Array.isArray(photos) ? photos.filter(p => p && safePhoto(p.data) && p.data.length <= 500000).slice(0,8).map(p => ({name:String(p.name || 'Photo'),data:p.data})) : []; }
function photoHTML(photos, editable) { return validPhotos(photos).map((p,i) => `<div class="photo"><a href="${p.data}" target="_blank" rel="noopener" aria-label="Ouvrir ${esc(p.name)}"><img src="${p.data}" alt="${esc(p.name)}" loading="lazy"></a>${editable ? `<button type="button" data-remove-photo="${i}" aria-label="Retirer ${esc(p.name)}">×</button>` : ''}</div>`).join(''); }
function responseHTML(row) {
  const d = row.data;
  return `<div class="other-response"><div class="response-heading"><strong>${esc(C.PEOPLE[row.person])}</strong><span class="label-note">${d.initial ? 'Premiers souvenirs recueillis' : d.mode === 'agree' ? 'D’accord avec '+esc(C.PEOPLE[d.source] || 'un autre souvenir') : 'A déjà répondu'}</span></div>${d.answer ? `<p class="response-text">${esc(d.answer)}</p>` : ''}${d.memory ? `<p class="memory-text">${esc(d.memory)}</p>` : ''}<div class="photos">${photoHTML(d.photos,false)}</div><div class="response-actions"><button class="text-button" data-copy="agree" data-source="${row.person}">✓ Je suis d’accord</button><button class="text-button" data-copy="precision" data-source="${row.person}">Je veux apporter une précision</button></div></div>`;
}
function conflictHTML(id) {
  const draft = store.drafts[C.key(person,id)]; if (!draft?.conflict) return '';
  const remote = store.records[C.key(person,id)];
  return `<div class="conflict" role="status"><strong>Une autre version de ton souvenir est en ligne.</strong><p>Version en ligne : ${esc(remote?.data.answer || remote?.data.words || '(réponse vide)')}</p><div class="response-actions"><button class="text-button" data-resolve="keep">Garder mon brouillon</button><button class="text-button" data-resolve="remote">Reprendre la version en ligne</button></div></div>`;
}
function modeHTML(d) {
  if (d.mode === 'agree') return `<span>✓ Tu es d’accord avec ${esc(C.PEOPLE[d.source] || '')}.</span><button class="text-button" data-precision>Apporter une précision</button>`;
  if (d.mode === 'precision') return `<span>Ta version · tu peux préciser ce souvenir.</span>`;
  return '';
}
function wireConflict(container,id) {
  container.querySelectorAll('[data-resolve]').forEach(b => b.onclick = async () => { C.resolve(store,person,id,b.dataset.resolve==='keep'); await persist(); render(); void sync(); });
}
function render() {
  const openIds = new Set([...document.querySelectorAll('#form details[open]')].map(el=>el.id));
  $('#form').innerHTML = '';
  sections.forEach((section, si) => {
    const el = document.createElement('details'); el.className = 'section'; el.id=`section-${si}`; el.open=openIds.size ? openIds.has(el.id) : si===0;
    el.innerHTML = `<summary><span class="section-number">${String(si+1).padStart(2,'0')}</span><div class="section-title"><h2>${esc(section.title.replace(/^\d+\.\s*/,''))}</h2></div><span class="count" id="count-${si}"></span><span class="chevron" aria-hidden="true">⌄</span></summary><div class="questions"></div>`;
    section.questions.forEach((q,qi) => {
      const id=qid(si,qi), d=own(id)?.data || {}, card=document.createElement('article'); card.className='qcard'; card.id=`q-${id}`; card.dataset.question=id;
      card.innerHTML = `<div class="qtitle"><span class="qnum">${si+1}.${qi+1}</span><h3>${esc(q)}</h3></div><div class="others"></div><div class="conflicts">${conflictHTML(id)}</div><div class="your-answer"><label class="field-label" for="a-${id}">Ta réponse · ${esc(C.PEOPLE[person])}</label><textarea id="a-${id}" placeholder="Une date, un lieu, un petit détail…" ${d.mode==='agree'?'readonly':''}>${esc(d.answer)}</textarea><div class="answer-mode">${modeHTML(d)}</div><details class="notes-field" ${d.memory?'open':''}><summary>Un souvenir ou une note à ajouter ?</summary><label class="field-label" for="m-${id}">Ton souvenir, ton contexte ou ce qu’il faut vérifier</label><textarea id="m-${id}" placeholder="Raconte la scène et les personnes présentes. Si tu as un doute, indique-le.">${esc(d.memory)}</textarea></details><div class="photo-tools"><label for="f-${id}">＋ Ajouter une photo</label><input id="f-${id}" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden><span class="small muted">Les photos sont partagées avec la famille.</span></div><div class="photos own-photos">${photoHTML(d.photos,true)}</div></div>`;
      el.querySelector('.questions').append(card);
      const ta=card.querySelector(`#a-${id}`), memory=card.querySelector(`#m-${id}`);
      ta.oninput=()=>changed(id,'question',{...own(id)?.data,answer:ta.value,mode:'precision'});
      memory.oninput=()=>changed(id,'question',{...own(id)?.data,memory:memory.value});
      card.querySelector(`#f-${id}`).onchange=event=>addPhotos(id,'question',event.target);
      wirePhotoRemoval(card,id,'question'); wireConflict(card,id); wirePrecision(card,id);
      renderOther(card,id);
    });
    $('#form').append(el);
  });
  renderScenes(); updateProgress(); filter();
}
function wirePrecision(card,id) { const b=card.querySelector('[data-precision]'); if(b) b.onclick=()=>{changed(id,'question',{...own(id)?.data,mode:'precision'});const ta=card.querySelector('textarea');ta.readOnly=false;card.querySelector('.answer-mode').innerHTML=modeHTML(own(id).data);ta.focus();}; }
function renderOther(card,id) {
  const rows=otherRows(id), root=card.querySelector('.others');
  root.innerHTML=rows.length ? rows.map(responseHTML).join('') : '<p class="empty-other">Tu peux être la première personne à raconter ce souvenir.</p>';
  root.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>{
    const source=store.records[C.key(b.dataset.source,id)], current=own(id)?.data;
    if(C.hasContent(current) && b.dataset.copy==='agree' && current.answer!==source.data.answer && !confirm('Remplacer ta réponse par celle de '+C.PEOPLE[source.person]+' ? Seule ta version sera modifiée.')) return;
    C.copyAnswer(store,person,id,source,b.dataset.copy==='precision');
    const data=own(id).data;changed(id,'question',data);
    const ta=card.querySelector(`#a-${id}`), memory=card.querySelector(`#m-${id}`);
    ta.value=data.answer;ta.readOnly=data.mode==='agree';memory.value=data.memory;
    if(data.memory) card.querySelector('.notes-field').open=true;
    card.querySelector('.answer-mode').innerHTML=modeHTML(data);wirePrecision(card,id);ta.focus();
    toast(data.mode==='agree' ? 'La réponse a été recopiée dans tes souvenirs.' : 'Tu peux maintenant écrire ta précision.');
  });
}
function refreshRemote() {
  document.querySelectorAll('.qcard').forEach(card=>{
    const id=card.dataset.question;renderOther(card,id);card.querySelector('.conflicts').innerHTML=conflictHTML(id);wireConflict(card,id);
    // Ne pas reconstruire les champs en cours de saisie lors d’une actualisation.
    if(!store.drafts[C.key(person,id)] && !card.contains(document.activeElement)) {
      const d=own(id)?.data||{};card.querySelector(`#a-${id}`).value=d.answer||'';card.querySelector(`#m-${id}`).value=d.memory||'';card.querySelector(`#a-${id}`).readOnly=d.mode==='agree';card.querySelector('.answer-mode').innerHTML=modeHTML(d);wirePrecision(card,id);
      card.querySelector('.own-photos').innerHTML=photoHTML(d.photos,true);wirePhotoRemoval(card,id,'question');
    }
  });
  // Préserver le curseur et le texte dans une conversation ou une anecdote ouverte.
  if(!$('#sceneList').contains(document.activeElement)) renderScenes();
}
function updateProgress() {
  if(!person) return;let done=0;
  sections.forEach((section,si)=>{let n=0;section.questions.forEach((_,qi)=>{if(C.hasContent(own(qid(si,qi))?.data)){n++;done++;}});const el=$(`#count-${si}`);if(el)el.textContent=`${n} / ${section.questions.length}`;});
  $('#progressCount').textContent=`${done} / ${allQuestions.length}`;$('#progress').style.width=`${done/allQuestions.length*100}%`;
  $('#progressBar').setAttribute('aria-valuenow',done);$('#progressBar').setAttribute('aria-valuemax',allQuestions.length);
  $('#progressText').textContent=`${done} question${done>1?'s':''} commencée${done>1?'s':''} par ${C.PEOPLE[person]}. À ton rythme, sans obligation de tout remplir.`;
}
function filter() {
  const normal=s=>s.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,''), term=normal($('#search').value), only=$('#unanswered').checked;let total=0;
  document.querySelectorAll('#form .section').forEach((section,si)=>{let visible=0;section.querySelectorAll('.qcard').forEach(card=>{const id=card.dataset.question;const show=(!only||!C.hasContent(own(id)?.data))&&(!term||normal(sections[si].title+' '+card.textContent+' '+(own(id)?.data.answer||'')).includes(term));card.hidden=!show;if(show)visible++;});section.hidden=!visible;if(visible&&term)section.open=true;total+=visible;});$('#noResults').hidden=!!total;
}
async function compressedPhoto(file) {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)) throw Error('Choisis une photo JPEG, PNG ou WebP.');
  if(file.size>20*1024*1024) throw Error('Cette photo est trop volumineuse (20 Mo maximum).');
  const bitmap=await createImageBitmap(file);
  try { const scale=Math.min(1,1200/Math.max(bitmap.width,bitmap.height)), canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);let quality=.82,data;do {data=canvas.toDataURL('image/jpeg',quality);quality-=.1;}while(data.length>450000&&quality>.25);if(data.length>500000)throw Error('Cette photo reste trop volumineuse. Choisis une version plus petite.');return {name:file.name,data}; } finally {bitmap.close();}
}
async function addPhotos(id,kind,input) {
  const owner=person;input.disabled=true;
  try { for(const file of input.files){if(person!==owner)break;const d=own(id)?.data||{};if((d.photos||[]).length>=8)throw Error('Tu peux joindre jusqu’à 8 photos par souvenir.');const photo=await compressedPhoto(file);if(person!==owner)break;changed(id,kind,{...own(id)?.data,photos:[...(own(id)?.data.photos||[]),photo]});}await persist();if(kind==='question'){const card=$(`#q-${id}`);card.querySelector('.own-photos').innerHTML=photoHTML(own(id)?.data.photos,true);wirePhotoRemoval(card,id,kind);}else renderScenes(); }
  catch(error){toast(error.message);}finally{input.value='';input.disabled=false;}
}
function wirePhotoRemoval(container,id,kind) { container.querySelectorAll('.own-photos [data-remove-photo]').forEach(b=>b.onclick=()=>{const data=C.clone(own(id)?.data||{});data.photos.splice(Number(b.dataset.removePhoto),1);changed(id,kind,data);container.querySelector('.own-photos').innerHTML=photoHTML(data.photos,true);wirePhotoRemoval(container,id,kind);}); }
function sceneRows() {
  const rows={...store.records};for(const [k,v] of Object.entries(store.drafts))if(v.person===person)rows[k]=v;
  return Object.values(rows).filter(r=>r.kind!=='question'&&!r.data.deleted).sort((a,b)=>(a.data.createdAt||'').localeCompare(b.data.createdAt||''));
}
function renderScenes() {
  const root=$('#sceneList');root.innerHTML='';const rows=sceneRows();
  if(!rows.length)root.innerHTML='<p class="small muted" style="margin:20px 0 0">Ces souvenirs n’ont pas besoin de correspondre à une question.</p>';
  for(const row of rows){const d=row.data,mine=row.person===person,box=document.createElement('article');box.className='scene';box.id=`scene-${row.id}`;const title=row.kind==='anecdote'?'Anecdote':'Conversation';
    box.innerHTML=`<div class="scene-head"><div><strong>${title}</strong> <small>· ${esc(C.PEOPLE[row.person])}</small></div>${mine?'<button class="text-button danger-text" data-delete>Retirer</button>':''}</div>${mine?conflictHTML(row.id):''}`;
    if(mine){
      if(row.kind==='conversation')box.innerHTML+=`<div class="scene-grid">${[['when','Quand et où ?','Période, lieu, événement'],['who','Qui parle avec Albert ?','Prénoms et lien avec Albert'],['topic','De quoi parlent-ils ?','Contexte de la conversation'],['tone','Ton de la scène','Drôle, tendre, émouvant…']].map(([field,label,placeholder])=>`<div><label for="${row.id}-${field}">${label}</label><input id="${row.id}-${field}" type="text" data-field="${field}" value="${esc(d[field])}" placeholder="${placeholder}"></div>`).join('')}</div><label for="${row.id}-words" style="margin-top:15px">Le dialogue ou les paroles dont tu te souviens</label>`;
      else box.innerHTML+=`<label for="${row.id}-words">Raconte ton anecdote, tout simplement.</label>`;
      box.innerHTML+=`<textarea id="${row.id}-words" data-field="words" class="${row.kind==='anecdote'?'anecdote-editor':''}" placeholder="${row.kind==='anecdote'?'Un souvenir drôle, tendre ou inattendu… Prends toute la place dont tu as besoin.':'Albert : …\nL’autre personne : …\nIndique si les mots sont exacts ou approximatifs.'}">${esc(d.words)}</textarea>`;
      // Le formulaire conversation conserve les photos ; l’anecdote reste un grand éditeur simple.
      if(row.kind==='conversation')box.innerHTML+=`<div class="photo-tools"><label for="photo-${row.id}">＋ Ajouter une photo pour cette scène</label><input id="photo-${row.id}" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden></div><div class="photos own-photos">${photoHTML(d.photos,true)}</div>`;
    }else{if(row.kind==='conversation')box.innerHTML+=`<div class="small muted">${[d.when,d.who,d.topic,d.tone].filter(Boolean).map(esc).join(' · ')}</div>`;box.innerHTML+=`<p class="scene-words">${esc(d.words||'Souvenir en cours de rédaction…')}</p><div class="photos">${photoHTML(d.photos,false)}</div>`;}
    root.append(box);if(!mine)continue;
    wireConflict(box,row.id);box.querySelectorAll('[data-field]').forEach(field=>field.oninput=()=>changed(row.id,row.kind,{...own(row.id)?.data,[field.dataset.field]:field.value}));
    box.querySelector('[data-delete]').onclick=()=>{if(confirm('Retirer ce souvenir de ta contribution ?')){changed(row.id,row.kind,{...own(row.id)?.data,deleted:true});renderScenes();}};
    const upload=box.querySelector('input[type=file]');if(upload)upload.onchange=event=>addPhotos(row.id,row.kind,event.target);wirePhotoRemoval(box,row.id,row.kind);
  }
}
function addScene(kind){const id=crypto.randomUUID();changed(id,kind,{words:'',when:'',who:'',topic:'',tone:'',photos:[],createdAt:new Date().toISOString()});renderScenes();const box=$(`#scene-${id}`);box.scrollIntoView({block:'center',behavior:'smooth'});box.querySelector('textarea').focus({preventScroll:true});}
function download(){const rows={...store.records};for(const [k,row]of Object.entries(store.drafts))if(row.person===person)rows[k]=row;const blob=new Blob([JSON.stringify({format:'albert-collaboratif',version:2,person,exportedAt:new Date().toISOString(),records:Object.values(rows).filter(r=>r.person===person)},null,2)],{type:'application/json'}),a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=`souvenirs-albert-${person}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function importBackup(event){const file=event.target.files[0];if(!file)return;try{
  if(file.size>60*1024*1024)throw Error('Ce fichier est trop volumineux.');const raw=JSON.parse(await file.text());let rows;
  if(raw.format==='albert-collaboratif'&&raw.version===2&&Array.isArray(raw.records))rows=raw.records;
  else {const old=raw.state||raw;if(!old.answers||typeof old.answers!=='object')throw Error('Fichier non reconnu.');rows=allQuestions.filter(q=>q.id in old.answers||q.id in (old.memories||{})||(old.photos?.[q.id]||[]).length).map(q=>({id:q.id,kind:'question',data:{answer:old.answers[q.id]||'',memory:old.memories?.[q.id]||'',photos:validPhotos(old.photos?.[q.id])}}));rows.push(...(old.dialogs||[]).map(d=>({id:crypto.randomUUID(),kind:'conversation',data:d})));}
  if(!rows.length||rows.length>500)throw Error('Sauvegarde vide ou non reconnue.');
  const cleaned=rows.map(r=>{if(!r||!['question','conversation','anecdote'].includes(r.kind)||!r.data||typeof r.data!=='object')throw Error('Souvenir non reconnu.');if(r.kind==='question'&&!allQuestions.some(q=>q.id===r.id))throw Error('Question inconnue.');if(r.kind!=='question'&&!/^[0-9a-f-]{36}$/i.test(r.id))throw Error('Identifiant de scène incorrect.');const d=r.data;for(const f of ['answer','memory','words','when','who','tone','topic'])if(d[f]!==undefined&&(typeof d[f]!=='string'||d[f].length>50000))throw Error('Texte incorrect ou trop long.');return {id:r.id,kind:r.kind,data:{...d,photos:validPhotos(d.photos)}};});
  if(!confirm(`Importer ${cleaned.length} souvenirs dans le profil ${C.PEOPLE[person]} ? Les réponses correspondantes de ce profil seront remplacées.`))return;
  for(const r of cleaned)C.edit(store,person,r.id,r.kind,r.data);await persist();render();status('Sauvegarde importée sur cet appareil · enregistrement en ligne en attente','pending');void sync();
 }catch(error){toast(error.message||'Fichier de sauvegarde non reconnu.');}finally{event.target.value='';}}
$('#people').onclick=event=>{const button=event.target.closest('[data-person]');if(button&&!button.disabled)void selectPerson(button.dataset.person);};
$('#chooseAgain').onclick=showPeople;
$('#addPerson').onclick=()=>{$('#people').hidden=true;$('#addPerson').hidden=true;$('#newPersonForm').hidden=false;$('#newPersonCodeField').hidden=!!familyCode;$('#newPersonCode').required=!familyCode;$('#newPersonStatus').hidden=true;welcomeNotice('');$('#newPersonName').focus();};
$('#newPersonForm').onsubmit=createPerson;$('#cancelNewPerson').onclick=showPeople;
$('#accessForm').onsubmit=event=>{event.preventDefault();void start();};
$('#changePerson').onclick=async()=>{await persist();await sync();person=null;chosen=null;preference('person','');$('#workspace').hidden=true;$('#welcome').hidden=false;$('#changePerson').hidden=true;showPeople();void loadPeople();window.scrollTo(0,0);};
$('#saveNow').onclick=()=>sync();$('#search').oninput=filter;$('#unanswered').onchange=filter;
$('#expand').onclick=()=>document.querySelectorAll('#form>.section:not([hidden])').forEach(el=>el.open=true);$('#collapse').onclick=()=>document.querySelectorAll('#form>.section').forEach(el=>el.open=false);
$('#addDialog').onclick=()=>addScene('conversation');$('#addAnecdote').onclick=()=>addScene('anecdote');$('#export').onclick=download;$('#importFile').onchange=importBackup;
$('#print').onclick=()=>{const closed=[...document.querySelectorAll('#form>.section:not([open])')];closed.forEach(el=>el.open=true);window.print();closed.forEach(el=>el.open=false);};
window.addEventListener('online',()=>{if(person)void sync();});window.addEventListener('offline',()=>{if(person){notice('Connexion interrompue. Tu peux continuer : tes brouillons sont gardés sur cet appareil.');status('Hors connexion · brouillon local','pending');}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)void persist();else if(person)void sync();});
window.addEventListener('pagehide',()=>{void persist();});
window.addEventListener('beforeunload',event=>{if(person&&pendingCount()&&!localReady){event.preventDefault();event.returnValue='';}});
(async()=>{
  try{db=await openDB();store=await dbGet('albert-collaboratif-v2')||C.emptyStore();if(store.version!==2)throw Error('Version inconnue');localReady=true;
    const legacy=await dbGet('albert-questionnaire-v1');if(legacy&&!store.legacyImported)store.legacyBackup=legacy;await persist();
  }catch{welcomeNotice('Le stockage du navigateur est indisponible. Autorise-le puis recharge cette page pour préserver tes réponses.');return;}
  const fragment=new URLSearchParams(location.hash.slice(1));
  // Le code partagé actuel remplace aussi les anciens codes mémorisés et liens d’invitation.
  familyCode=config.defaultFamilyCode||fragment.get('famille')||preference('code');
  if(familyCode)preference('code',familyCode);
  if(fragment.has('famille'))history.replaceState(null,'',location.pathname+location.search);
  C.registerPeople(store.people);renderPeople();$('#addPerson').disabled=false;await loadPeople();
  setInterval(()=>{if(person)void sync();else if($('#newPersonForm').hidden)void loadPeople();},config.syncIntervalMs||60000);
  const previous=preference('person');if(isActive(previous)&&familyCode)void selectPerson(previous);
})();
