import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const landing = fs.readFileSync(new URL('../rebuild-v5000/landing.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../rebuild-v5000/app.js', import.meta.url), 'utf8');
const rootHtml = fs.readFileSync(new URL('../rebuild-v5000/index.html', import.meta.url), 'utf8');
const appHtml = fs.readFileSync(new URL('../rebuild-v5000/app-index.html', import.meta.url), 'utf8');
const PC_API = 'https://solaris-boat-upgrades-stocks.trycloudflare.com';

function response(status, body = {}) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

function loadRetryHelper(source, fetchImpl) {
  const marker = 'async function bpAuthRequestV6237(';
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, 'v6237 retry helper must be present');
  const end = source.indexOf('\nasync function ', start + marker.length);
  assert.notEqual(end, -1, 'retry helper must end before the next async function');
  const sandbox = {
    fetch: fetchImpl,
    AbortController,
    setTimeout: (fn, ms) => { if (ms < 15000) queueMicrotask(fn); return { fn, ms }; },
    clearTimeout: () => {},
  };
  vm.createContext(sandbox);
  vm.runInContext(
    source.slice(start, end) + '\nglobalThis.__request = bpAuthRequestV6237;',
    sandbox,
    { timeout: 1000 },
  );
  return sandbox.__request;
}

for (const [name, source] of [['landing', landing], ['app', app]]) {
  let calls = 0, notices = 0;
  let helper = loadRetryHelper(source, async () => {
    calls++;
    return calls === 1
      ? response(502, { message: 'temporary upstream failure' })
      : response(200, { access_token: 'test-session' });
  });
  let result = await helper(PC_API + '/auth/v1/token?grant_type=password', {}, true, () => notices++);
  assert.equal(result.r.status, 200, name + ': transient 502 recovers');
  assert.equal(calls, 2, name + ': retries exactly once');
  assert.equal(notices, 1, name + ': emits one retry notice');

  calls = 0; notices = 0;
  helper = loadRetryHelper(source, async () => {
    calls++;
    return response(400, { msg: 'Invalid login credentials' });
  });
  result = await helper(PC_API + '/auth/v1/token?grant_type=password', {}, true, () => notices++);
  assert.equal(result.r.status, 400, name + ': invalid credentials remain an auth error');
  assert.equal(calls, 1, name + ': invalid credentials are never retried');
  assert.equal(notices, 0, name + ': invalid credentials do not show retry notice');

  calls = 0;
  helper = loadRetryHelper(source, async () => {
    calls++;
    if (calls === 1) throw new TypeError('simulated connection reset');
    return response(200, { access_token: 'test-session' });
  });
  result = await helper(PC_API + '/auth/v1/token?grant_type=password', {}, true);
  assert.equal(result.r.status, 200, name + ': transient network reset recovers');
  assert.equal(calls, 2, name + ': network failure gets one retry');

  calls = 0;
  helper = loadRetryHelper(source, async () => {
    calls++;
    return response(504, { message: 'still unavailable' });
  });
  result = await helper(PC_API + '/auth/v1/token?grant_type=password', {}, true);
  assert.equal(result.r.status, 504, name + ': second 504 reaches the existing error handler');
  assert.equal(calls, 2, name + ': retries are bounded');
}
assert.ok(landing.includes("const SUPA='" + PC_API + "'"), 'website routes to the PC account runtime');
assert.ok(app.includes("const SUPA='" + PC_API + "'"), 'app routes to the PC account runtime');
assert.ok(!landing.includes("const SUPA='https://xdfsjztwgsbmabshzsjw.supabase.co'"), 'website does not route auth to Supabase');
assert.ok(!app.includes("const SUPA='https://xdfsjztwgsbmabshzsjw.supabase.co'"), 'app does not route auth to Supabase');
assert.ok(landing.includes("const AUTH_STORE='bp_auth_v5045'"), 'website preserves the existing session store');
assert.ok(app.includes("const AUTH_STORE='bp_auth_v5045'"), 'app preserves the existing session store');
assert.ok(landing.includes("mode==='signin'"), 'landing only auto-retries password sign-in');
assert.ok(app.includes("path==='token?grant_type=password'||path==='token?grant_type=refresh_token'"), 'app retries password and refresh token exchanges only');
assert.ok(app.includes("if([400,401].includes(Number(e?.status))"), 'transient refresh failures do not erase sessions');
assert.ok(app.includes("if([401,403].includes(Number(r.status)))saveSession(null)"), 'transient user-check failures do not erase sessions');
assert.ok(rootHtml.includes('landing.js?v=6237-pc-auth'), 'root entry loads v6237');
assert.ok(appHtml.includes('app.js?v=6237-pc-auth'), 'app entry loads v6237');
assert.ok(rootHtml.includes('bpw-globe-aura'), 'welcome globe is preserved');
console.log('BRIDGEPOINT_AUTH_RESILIENCE_V6237_PASS');
