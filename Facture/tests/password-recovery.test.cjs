const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const app = readFileSync('app.js', 'utf8');
const handler = app.slice(app.indexOf('document.addEventListener("submit"'), app.indexOf('// Prestations, récurrences'));

function environment(options = {}) {
  let listener;
  const message = { textContent: '' }, button = { disabled: false }, calls = [];
  const context = vm.createContext({
    authMode: 'reset', account: options.account === null ? null : { id: 'client' }, recoveryLinkError: false,
    document: { addEventListener(type, callback) { listener = callback; } },
    FormData: class { get(key) { return ({ password: 'new-password', confirmation: 'new-password', email: ' client@example.com ', ...options.values })[key]; } },
    location: { origin: 'https://example.com', pathname: '/Facture/index.html' },
    history: { replaceState(...args) { calls.push(['history', ...args]); } },
    render() { calls.push(['render']); },
    db: { auth: {
      async updateUser(value) { calls.push(['update', value]); return { error: options.error }; },
      async resetPasswordForEmail(email, config) { calls.push(['request', email, config]); return { error: options.error }; },
    } },
  });
  vm.runInContext(handler, context);
  async function submit(id = 'resetpasswordform') {
    await listener({ preventDefault() {}, target: {
      id, querySelector: selector => selector === '#authmessage' ? message : button,
      reset() { calls.push(['clear-passwords']); },
    } });
    assert.equal(button.disabled, false);
  }
  return { context, message, calls, submit };
}

test('la récupération enregistre le mot de passe, efface les champs et confirme le succès', async () => {
  const e = environment(); await e.submit();
  assert.equal(e.calls[0][0], 'update');
  assert.equal(e.calls[0][1].password, 'new-password');
  assert.equal(e.context.authMode, 'reset-success');
  assert.ok(e.calls.some(call => call[0] === 'clear-passwords'));
  assert.ok(e.calls.some(call => call[0] === 'history' && call[3] === '/Facture/index.html#home'));
});

test('des mots de passe différents ou trop courts ne sont pas envoyés', async () => {
  for (const values of [{ confirmation: 'different' }, { password: 'short', confirmation: 'short' }]) {
    const e = environment({ values }); await e.submit();
    assert.equal(e.calls.length, 0);
    assert.match(e.message.textContent, /ne correspondent pas|au moins 6/);
  }
});

test('une session absente ou expirée affiche un message utile', async () => {
  const absent = environment({ account: null }); await absent.submit();
  assert.equal(absent.calls.length, 0);
  assert.match(absent.message.textContent, /invalide ou a expiré/);
  const expired = environment({ error: { code: 'session_not_found', message: 'Session missing' } });
  await expired.submit();
  assert.match(expired.message.textContent, /invalide ou a expiré/);
  assert.equal(expired.context.authMode, 'reset');
});

test('les règles supplémentaires de mot de passe Supabase sont affichées sans faux succès', async () => {
  const e = environment({ error: { code: 'weak_password', message: 'Password should contain at least 10 characters.' } });
  await e.submit();
  assert.match(e.message.textContent, /at least 10/);
  assert.equal(e.context.authMode, 'reset');
});

test('la demande de lien utilise la bonne adresse et la page de récupération', async () => {
  const e = environment(); await e.submit('recoveryrequestform');
  assert.equal(e.calls[0][1], 'client@example.com');
  assert.equal(e.calls[0][2].redirectTo, 'https://example.com/Facture/index.html?reset=1');
  assert.match(e.message.textContent, /Si un compte correspond/);
});

test('PASSWORD_RECOVERY ouvre le formulaire même si cet utilisateur est déjà connecté', async () => {
  let callback, renders = 0;
  const context = vm.createContext({
    authMode: 'login', account: { id: 'client' },
    window: { APP_CONFIG: { supabaseUrl: 'https://example.com', supabaseKey: 'public' }, supabase: {
      createClient: () => ({ auth: {
        onAuthStateChange(fn) { callback = fn; },
        async getSession() { return { data: { session: { user: { id: 'client' } } } }; },
      } }),
    } },
    render() { renders++; }, showError() {},
  });
  vm.runInContext(app.slice(app.indexOf('async function initialize()'), app.indexOf('document.addEventListener("submit"')), context);
  await context.initialize();
  callback('PASSWORD_RECOVERY', { user: { id: 'client' } });
  assert.equal(context.authMode, 'reset');
  assert.equal(renders, 2);
});

test('les liens de récupération ou expirés sont reconnus dès le chargement', () => {
  const state = app.slice(app.indexOf('let authMode ='), app.indexOf('let sessionGeneration ='));
  for (const location of [
    { hash: '#access_token=test&type=recovery', search: '' },
    { hash: '', search: '?reset=1&code=test' },
    { hash: '#error=access_denied&error_code=otp_expired', search: '' },
  ]) {
    const context = vm.createContext({ location, URLSearchParams });
    vm.runInContext(state, context);
    assert.equal(vm.runInContext('authMode', context), 'reset');
  }
});

test('le formulaire de récupération reste prioritaire sur le dashboard', () => {
  const elements = { '#main': {}, '#logout': {}, '#themebutton': {} };
  const context = vm.createContext({ authMode: 'reset', account: { id: 'client' },
    $: selector => elements[selector], authHTML: () => 'reset-form',
    originalRender() { throw Error('Le dashboard ne doit pas remplacer le formulaire.'); },
  });
  vm.runInContext(app.slice(app.indexOf('function render()'), app.indexOf('const DEFAULT_APPEARANCE')), context);
  context.render();
  assert.equal(elements['#main'].innerHTML, 'reset-form');
});
