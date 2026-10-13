const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');

const source = stripTypeScriptTypes(fs.readFileSync(path.join(__dirname,
  '../supabase/functions/invoice-integrations/index.ts'), 'utf8')
  .replace(/^import .*;\r?\n/m, ''));

function handler({ failClient = false, document = null, membershipError = null,
  appOrigin = '' } = {}) {
  let serve;
  const chain = (result) => {
    const query = {};
    for (const method of ['select', 'eq', 'single', 'maybeSingle']) {
      query[method] = () => query;
    }
    query.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
    return query;
  };
  vm.runInNewContext(source, {
    Request, Response, Set, Number, JSON, Error,
    console: { log() {}, error() {} },
    Deno: { env: { get: name => name === 'APP_ORIGIN' ? appOrigin : '' },
      serve: fn => { serve = fn; } },
    createClient() {
      if (failClient) throw new Error('Configuration serveur absente');
      return {
        auth: { getUser: async () => ({ data: { user: { id: 'user' } } }) },
        from: table => chain(table === 'company_members'
          ? { data: null, error: membershipError }
          : { data: document, error: null }),
      };
    },
  });
  return serve;
}

function request(origin, method = 'POST', token = true) {
  const headers = {};
  if (origin) headers.Origin = origin;
  if (token) headers.Authorization = 'Bearer test-token';
  return new Request('https://example.invalid/invoice-integrations', {
    method, headers,
    ...(method === 'POST' ? { body: JSON.stringify({ action: 'peppol-test',
      documentId: '12345678-1234-1234-1234-123456789abc' }) } : {}),
  });
}

for (const origin of ['https://orbytek.be', 'https://www.orbytek.be']) {
  test(`CORS ${origin} : prévalidation, succès et erreurs`, async () => {
    const scenarios = [
      [handler(), request(origin, 'OPTIONS'), 204],
      [handler(), request(origin, 'GET'), 405],
      [handler(), request(origin, 'POST', false), 401],
      [handler({ membershipError: { code: '42501' } }), request(origin), 503],
      [handler(), request(origin), 404],
      [handler({ failClient: true }), request(origin), 502],
      [handler({ document: { type: 'facture', peppol: { mode: 'generate' } } }),
        request(origin), 200],
    ];
    for (const [serve, req, status] of scenarios) {
      const response = await serve(req);
      assert.equal(response.status, status);
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
      assert.equal(response.headers.get('Vary'), 'Origin');
      assert.match(response.headers.get('Access-Control-Allow-Methods'), /POST/);
      assert.match(response.headers.get('Access-Control-Allow-Headers'), /authorization/);
    }
  });
}

test('une origine étrangère ou ressemblante ne reçoit aucune autorisation CORS', async () => {
  for (const origin of ['https://evil.invalid', 'https://orbytek.be.evil.invalid', 'null']) {
    const response = await handler()(request(origin, 'OPTIONS'));
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
    assert.equal(response.headers.get('Vary'), 'Origin');
  }
});

test('APP_ORIGIN reste autorisée et un appel sans Origin reste possible', async () => {
  const origin = 'http://localhost:4175';
  const response = await handler({ appOrigin: origin })(request(origin, 'OPTIONS'));
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  const direct = await handler()(request('', 'POST', false));
  assert.equal(direct.status, 401);
  assert.equal(direct.headers.get('Access-Control-Allow-Origin'), null);
});
