import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const recovery = new URL('../recovery/', import.meta.url);
const sources = [
  ['landing', fs.readFileSync(new URL('landing-auth-v6228.js', recovery), 'utf8')],
  ['app', fs.readFileSync(new URL('app-auth-v6228.js', recovery), 'utf8')],
];

function response(status, body = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  };
}

function loadHelper(source, fetchImpl) {
  const marker = 'async function bpAuthRequestV6228(';
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, 'retry helper must be present');
  const end = source.indexOf('\nasync function ', start + marker.length);
  assert.notEqual(end, -1, 'retry helper must end before the next function');
  const sandbox = {
    fetch: fetchImpl,
    AbortController,
    setTimeout: (fn, ms) => {
      if (ms < 15000) queueMicrotask(fn);
      return { ms };
    },
    clearTimeout: () => {},
  };
  vm.createContext(sandbox);
  vm.runInContext(
    source.slice(start, end) + '\nglobalThis.__authRequest = bpAuthRequestV6228;',
    sandbox,
    { timeout: 1000 },
  );
  return sandbox.__authRequest;
}

for (const [name, source] of sources) {
  let calls = 0;
  let retries = 0;
  let helper = loadHelper(source, async () => {
    calls += 1;
    return calls === 1
      ? response(504, { message: 'context deadline exceeded' })
      : response(200, { access_token: 'test-session' });
  });
  let result = await helper('/auth/token', { method: 'POST' }, true, () => { retries += 1; });
  assert.equal(result.r.status, 200, name + ': transient 504 should recover');
  assert.equal(calls, 2, name + ': transient failure should retry exactly once');
  assert.equal(retries, 1, name + ': retry notice should appear once');

  calls = 0;
  retries = 0;
  helper = loadHelper(source, async () => {
    calls += 1;
    return response(400, { message: 'Invalid login credentials' });
  });
  result = await helper('/auth/token', { method: 'POST' }, true, () => { retries += 1; });
  assert.equal(result.r.status, 400, name + ': bad credentials should be returned unchanged');
  assert.equal(calls, 1, name + ': bad credentials must not be retried');
  assert.equal(retries, 0, name + ': bad credentials must not show a retry notice');

  calls = 0;
  helper = loadHelper(source, async () => {
    calls += 1;
    if (calls === 1) throw new TypeError('simulated connection reset');
    return response(200, { access_token: 'test-session' });
  });
  result = await helper('/auth/token', { method: 'POST' }, true);
  assert.equal(result.r.status, 200, name + ': one network interruption should recover');
  assert.equal(calls, 2, name + ': network failure should retry exactly once');

  calls = 0;
  helper = loadHelper(source, async () => {
    calls += 1;
    return response(503, { message: 'service unavailable' });
  });
  result = await helper('/auth/signup', { method: 'POST' }, false);
  assert.equal(result.r.status, 503, name + ': signup errors should be returned without retry');
  assert.equal(calls, 1, name + ': signup must not auto-retry');

  calls = 0;
  helper = loadHelper(source, async () => {
    calls += 1;
    return response(504, { message: 'still unavailable' });
  });
  result = await helper('/auth/token', { method: 'POST' }, true);
  assert.equal(result.r.status, 504, name + ': second 504 should reach the existing error handler');
  assert.equal(calls, 2, name + ': a transient failure must never loop indefinitely');
  console.log(name + ': retry, no-retry, invalid-credentials, and bounded-attempt tests passed');
}

const landing = sources[0][1];
const app = sources[1][1];
assert.ok(landing.includes("mode==='signin'"), 'landing retries only password sign-in');
assert.ok(landing.includes('v=6224-underwater-dive-camera'), 'underwater dive camera code remains');
assert.ok(app.includes("path==='token?grant_type=password'||path==='token?grant_type=refresh_token'"), 'app retries password sign-in and token refresh only');
assert.ok(app.includes('if([400,401].includes(Number(e?.status))'), 'transient refresh errors must not clear a saved session');
assert.ok(app.includes('if([401,403].includes(Number(r.status)))saveSession(null)'), 'transient auth-user errors must not clear a saved session');
console.log('Auth preservation and production feature guards passed');