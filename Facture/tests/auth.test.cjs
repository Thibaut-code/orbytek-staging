const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const app = readFileSync('app.js', 'utf8');
const handler = app.slice(app.indexOf('document.addEventListener("submit"'), app.indexOf('// Prestations, récurrences'));

async function submit(result, mode = 'signup') {
  let listener;
  const message = { textContent: '' }, button = { disabled: false };
  const calls = [];
  const context = vm.createContext({
    authMode: mode,
    document: { addEventListener(type, callback) { listener = callback; } },
    FormData: class { get(key) { return key === 'email' ? ' client@example.com ' : 'password123'; } },
    readClientExtras: () => ({}),
    location: { origin: 'https://example.com', pathname: '/Facture/' },
    db: { auth: {
      async signUp(credentials) { calls.push(['signup', credentials]); return result; },
      async signInWithPassword(credentials) { calls.push(['login', credentials]); return result; },
    } },
  });
  vm.runInContext(handler, context);
  await listener({ preventDefault() {}, target: {
    id: 'authform', querySelector: selector => selector === '#authmessage' ? message : button,
  } });
  assert.equal(button.disabled, false);
  assert.equal(calls[0][1].email, 'client@example.com');
  return { text: message.textContent, calls };
}

test('un compte existant reçoit un message français pour les erreurs Supabase', async () => {
  for (const error of [
    { code: 'user_already_exists', message: 'Already registered' },
    { code: 'email_exists', message: 'Email exists' },
    { message: 'User already registered' },
  ]) {
    const response = await submit({ error });
    assert.match(response.text, /Un compte existe déjà.*J’ai déjà un compte/);
  }
});

test('un compte existant masqué ne reçoit pas une fausse demande de confirmation', async () => {
  const response = await submit({ data: { session: null, user: { identities: [] } } });
  assert.match(response.text, /Un compte existe déjà/);
});

test('un nouveau compte peut toujours confirmer son e-mail ou se connecter', async () => {
  const pending = await submit({ data: { session: null, user: { identities: [{ id: 'new' }] } } });
  assert.equal(pending.text, 'Vérifiez votre boîte e-mail pour confirmer votre compte.');
  const confirmed = await submit({ data: { session: { user: {} } } });
  assert.equal(confirmed.text, 'Connexion réussie.');
});

test('une réponse sans identités renseignées ne suffit pas à déclarer un doublon', async () => {
  const response = await submit({ data: { session: null, user: {} } });
  assert.match(response.text, /confirmer votre compte/);
});

test('la connexion et les autres erreurs gardent leur comportement', async () => {
  const login = await submit({ data: { session: {}, user: { identities: [] } } }, 'login');
  assert.equal(login.calls[0][0], 'login');
  assert.equal(login.text, 'Connexion réussie.');
  const failed = await submit({ error: { message: 'Failed to fetch' } });
  assert.equal(failed.text, 'Failed to fetch');
});
