(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AlbertCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const PEOPLE = Object.assign(Object.create(null), { maman: 'Maman', 'jean-paul': 'Jean-Paul', thibaut: 'Thibaut' });
  function registerPeople(people) {
    for (const p of people || []) {
      if (!p || !/^(maman|jean-paul|thibaut|p-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/.test(p.id) || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 80) continue;
      PEOPLE[p.id] = p.name;
    }
  }
  const clone = value => JSON.parse(JSON.stringify(value));
  const key = (person, id) => `${person}/${id}`;
  function emptyStore() { return { version: 2, records: {}, drafts: {}, lastSync: null }; }
  function record(store, person, id) { return store.drafts[key(person, id)] || store.records[key(person, id)]; }
  function edit(store, person, id, kind, data) {
    if (!PEOPLE[person]) throw Error('Profil inconnu');
    const k = key(person, id), previous = record(store, person, id);
    store.drafts[k] = { person, id, kind, data: clone(data),
      baseRevision: store.drafts[k]?.baseRevision ?? store.records[k]?.revision ?? 0,
      editVersion: (previous?.editVersion || 0) + 1,
      ...(store.drafts[k]?.conflict ? { conflict: true } : {}) };
    return store.drafts[k];
  }
  function batch(store, person) {
    return Object.values(store.drafts).filter(r => r.person === person && !r.conflict).map(clone);
  }
  function acknowledge(store, sent, result) {
    for (const row of result.saved || []) {
      const k = key(row.person, row.id), draft = store.drafts[k];
      store.records[k] = row;
      const original = sent.find(r => key(r.person, r.id) === k);
      if (!original || !draft) continue;
      if (draft.editVersion === original.editVersion) delete store.drafts[k];
      else draft.baseRevision = row.revision;
    }
    for (const row of result.conflicts || []) {
      const k = key(row.person, row.id);
      store.records[k] = row;
      if (store.drafts[k]) store.drafts[k].conflict = true;
    }
  }
  function merge(store, rows) {
    for (const row of rows) {
      const k = key(row.person, row.id), draft = store.drafts[k];
      if (draft && row.revision !== draft.baseRevision) draft.conflict = true;
      store.records[k] = row;
    }
  }
  function resolve(store, person, id, keepDraft) {
    const k = key(person, id);
    if (keepDraft && store.drafts[k]) {
      store.drafts[k].baseRevision = store.records[k]?.revision || 0;
      delete store.drafts[k].conflict;
    } else delete store.drafts[k];
  }
  function replaceRecords(store, rows) {
    const present=new Set(rows.map(r=>key(r.person,r.id)));
    for(const k of Object.keys(store.records))if(!present.has(k))delete store.records[k];
    merge(store,rows);
  }
  function hasContent(data) { return !!(data && (data.answer?.trim() || data.memory?.trim() || data.photos?.length)); }
  function copyAnswer(store, person, id, source, precision) {
    if (source.person === person || source.kind !== 'question') throw Error('Réponse source invalide');
    const current = record(store, person, id)?.data || {};
    return edit(store, person, id, 'question', { ...current,
      answer: precision && current.answer?.trim() ? current.answer : source.data.answer || '',
      memory: precision && current.memory?.trim() ? current.memory : source.data.memory || '',
      mode: precision ? 'precision' : 'agree', source: source.person,
      sourceRevision: source.revision, sourceAnswer: source.data.answer || '' });
  }
  return { PEOPLE, registerPeople, clone, key, emptyStore, record, edit, batch, acknowledge, merge, replaceRecords, resolve, hasContent, copyAnswer };
});
