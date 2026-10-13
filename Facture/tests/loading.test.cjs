const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const app = readFileSync('app.js', 'utf8');
const loader = app.slice(app.indexOf('function loadData()'), app.indexOf('async function persistDocument('));
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
function environment() {
  const requests = {}, calls = [], renders = [], timers = [];
  let authCallback;
  const db = {
    from(table) {
      calls.push(table);
      const gate = requests[table] ||= deferred();
      const query = { select() { return this; }, eq() { return this; }, order() { return this; }, maybeSingle() { return this; }, then: gate.promise.then.bind(gate.promise) };
      return query;
    },
    auth: { onAuthStateChange(callback) { authCallback = callback; }, async getSession() { return { data: { session: null } }; } },
  };
  const context = vm.createContext({ Promise, Map, Object, setTimeout: fn => timers.push(fn), document: { getElementById: () => null }, location: { hash: '#home' },
    window: { APP_CONFIG: { supabaseUrl: 'https://example.invalid', supabaseKey: 'test-public-key' }, supabase: { createClient: () => db } },
    render() { renders.push(vm.runInContext('({state:dataState, count:docs.length})', context)); },
    showError() {}, applyTheme() {}, localTheme: () => 'plombier', companyOwner: id => id,
    readDocument: (row, lines) => ({ ...row, dbId: row.id, lines }),
    async loadReminders(userId) { await db.from('payment_reminders'); },
    async loadVAT(userId) { await db.from('vat_purchases'); },
  });
  context.mockDb = db;
  vm.runInContext(`let account={id:'user-a'}, db=mockDb, teamContext=null, sessionGeneration=1, dataState='loading', dataLoad=null, clients=[], docs=[], company={}, themeColumnReady=false, draft=null, reminders=[], recurrenceDoc=null, recurrenceEdit=null, logoDraft=null, logoDirty=false;`, context);
  vm.runInContext(loader, context);
  const resolveCore = (documents = [{ id: 'invoice-1' }]) => {
    requests.clients.resolve({ data: [] }); requests.companies.resolve({ data: { name: 'Test' } });
    requests.documents.resolve({ data: documents }); requests.document_lines.resolve({ data: [{ document_id: 'invoice-1', quantity: 1, unit_price: 100 }] });
  };
  return { context, calls, requests, renders, timers, resolveCore, auth: () => authCallback };
}
test('les montants deviennent disponibles sans attendre les relances et la TVA', async () => {
  const e = environment(); const loading = e.context.loadData();
  assert.equal(e.calls.length, 6, 'les six requêtes démarrent en parallèle');
  e.resolveCore(); await loading;
  assert.equal(vm.runInContext('dataState', e.context), 'ready');
  assert.equal(e.renders.at(-1).count, 1);
  assert.equal(vm.runInContext('docs[0].lines.length', e.context), 1);
  e.requests.payment_reminders.resolve({}); e.requests.vat_purchases.resolve({});
});
test('deux demandes simultanées ne dupliquent pas les requêtes', async () => {
  const e = environment(); const first = e.context.loadData(), second = e.context.loadData();
  assert.equal(first, second); assert.equal(e.calls.length, 6);
  e.resolveCore(); await first;
});
test('une ancienne session ne remplace pas les données de la nouvelle session', async () => {
  const e = environment(); const loading = e.context.loadData();
  vm.runInContext("sessionGeneration++; account={id:'user-a'}; docs=[];", e.context);
  e.resolveCore(); await loading;
  assert.equal(vm.runInContext('docs.length', e.context), 0);
  assert.equal(vm.runInContext('dataState', e.context), 'loading');
});
test('une erreur initiale ne présente pas de faux montants à zéro', async () => {
  const e = environment(); const loading = e.context.loadData();
  e.requests.clients.resolve({ error: new Error('Connexion indisponible') });
  e.requests.companies.resolve({ data: {} }); e.requests.documents.resolve({ data: [] }); e.requests.document_lines.resolve({ data: [] });
  await assert.rejects(loading); assert.equal(e.renders.at(-1).state, 'error');
});
test('les requêtes sont différées hors du callback de connexion Supabase', async () => {
  const e = environment(); vm.runInContext('account=null;', e.context);
  vm.runInContext(app.slice(app.indexOf('async function initialize()'), app.indexOf('document.addEventListener("submit"')), e.context);
  await e.context.initialize(); e.auth()('SIGNED_IN', { user: { id: 'user-a' } });
  assert.equal(e.calls.length, 0, 'aucune requête dans le callback auth');
  assert.equal(e.timers.length, 1); e.timers[0](); assert.equal(e.calls.length, 6);
  e.resolveCore(); await e.context.loadData();
});
