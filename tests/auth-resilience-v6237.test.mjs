import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const landing = fs.readFileSync(new URL('../rebuild-v5000/landing.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../rebuild-v5000/app.js', import.meta.url), 'utf8');
const rootHtml = fs.readFileSync(new URL('../rebuild-v5000/index.html', import.meta.url), 'utf8');
const appHtml = fs.readFileSync(new URL('../rebuild-v5000/app-index.html', import.meta.url), 'utf8');
const view = fs.readFileSync(new URL('../rebuild-v5000/bridgepoint-view-v5917.js', import.meta.url), 'utf8');
const PC_API = 'https://characterization-seas-total-adopt.trycloudflare.com';

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
assert.ok(landing.includes("AUTH_STORE='bp_auth_v5045'"), 'website preserves the existing session store');
assert.ok(app.includes("AUTH_STORE='bp_auth_v5045'"), 'app preserves the existing session store');
assert.ok(landing.includes("mode==='signin'"), 'landing only auto-retries password sign-in');
assert.ok(app.includes("path==='token?grant_type=password'||path==='token?grant_type=refresh_token'"), 'app retries password and refresh token exchanges only');
assert.ok(app.includes("if([400,401].includes(Number(e?.status))"), 'transient refresh failures do not erase sessions');
assert.ok(app.includes("if([401,403].includes(Number(r.status)))saveSession(null)"), 'transient user-check failures do not erase sessions');
assert.ok(rootHtml.includes('landing.js?v=6312-post-signin-queue'), 'root entry loads the cache-busted post-sign-in mobile queue bundle');
assert.ok(rootHtml.includes('form.dataset.bpAuthMode=nextMode'), 'welcome CTAs always record the requested sign-in or sign-up mode');
assert.ok(rootHtml.includes('window.__BP_SET_AUTH_MODE__(nextMode)'), 'welcome CTAs use the shared authentication mode setter when loaded');
assert.ok(landing.includes("$('authForm').dataset.bpAuthMode=mode"), 'the shared setter keeps the form mode in sync');
assert.ok(landing.includes("const requestedMode=$('authForm').dataset.bpAuthMode"), 'form submission honors the welcome screen mode even when its deferred bundle loads late');
assert.ok(landing.includes("document.getElementById('authForm')?.dataset.bpAuthMode==='signin'"), 'a welcome-screen sign-in selection survives deferred landing bundle startup');
assert.ok(appHtml.includes('app.js?v=6312-post-auth-unblock-map'), 'app entry loads the post-auth responsive app bundle');
assert.ok(rootHtml.includes('bpw-globe-aura'), 'welcome globe is preserved');
assert.ok(rootHtml.includes('window.__BP_FRESH_SIGNIN__!==true'), 'a stored token alone cannot bypass the welcome/sign-in gate on a new page entry');
assert.ok(rootHtml.includes('return sized&&styleReady;'), 'the welcome animation does not wait for every basemap tile');
assert.ok(landing.includes('bpFreshEntryTarget') && landing.includes('markFreshSignIn'), 'successful sign-in marks the current entry and safely returns direct app deep links');
assert.ok(appHtml.includes("sessionStorage.getItem('bp_fresh_signin_v1')==='1'"), 'direct app entry requires a fresh sign-in handshake');
assert.ok(landing.includes('schedulePostSigninFeatureRestore'), 'mobile welcome sign-in schedules feature restoration only after closing the account dialog');
assert.ok(landing.includes('window.__BP_LANDING_FEATURE_RESTORE_BUSY__=true'), 'mobile feature restoration exposes a serialization guard');
assert.ok(landing.includes('requestAnimationFrame(()=>setTimeout(finish,230))'), 'mobile feature modules yield between initializers so map input can run');
assert.ok(rootHtml.includes('priorityReadyAt') && rootHtml.includes('optionalStageReadyAt'), 'mobile deferred loader exposes core-card readiness before optional modules');
assert.ok(rootHtml.includes("typeof map.getCanvas==='function'&&map.getCanvas()"), 'card controls can start as soon as the base globe canvas exists');
assert.ok(rootHtml.includes('window.__BP_LANDING_FEATURE_RESTORE_SCHEDULED__===true'), 'optional deferred scripts wait for the post-sign-in feature restoration batch');
assert.ok(view.includes("async function openWorldChanges()"), 'World Changes uses the shared timeline opener');
assert.ok(view.includes("dock.classList.add('bpwt-standalone-open')"), 'World Changes explicitly forces the timeline into its expanded state');
assert.ok(view.includes("expand.setAttribute('aria-pressed','true')"), 'expanded timeline keeps its control accessibility state synchronized');
assert.ok(rootHtml.includes('bridgepoint-view-v5917.js?v=6238-pc-runtime&emrf=1&worldhistory=6313-open-fix'), 'website loads the explicit timeline-open fix');
assert.ok(appHtml.includes('bridgepoint-view-v5917.js?v=6238-pc-runtime&emrf=1&worldhistory=6313-open-fix'), 'app loads the explicit timeline-open fix');
assert.ok(appHtml.includes("status:'waiting-for-globe-canvas'"), 'app feature queue waits for the WebGL canvas, not full map style readiness');
assert.ok(!appHtml.includes('while(document.hidden)'), 'app feature queue never waits indefinitely for a page visibility transition');
assert.ok(appHtml.includes('state.lastStarted=src'), 'app feature queue reports the currently loading control script');
assert.ok(appHtml.includes('backgroundLoadCount'), 'app feature queue reports when scripts are loaded while backgrounded');
assert.ok(appHtml.includes("typeof map.getCanvas==='function')canvas=map.getCanvas()"), 'app feature controls start as soon as the globe canvas exists');
assert.ok(appHtml.includes("setTimeout(()=>{if(!queuePromise)void loadQueue()},mobile?180:120)"), 'app feature modules begin immediately after the canvas becomes available');
assert.ok(appHtml.includes('priorityReadyAt'), 'app deferral exposes when the core feature controls finish loading');
assert.ok(app.includes("await authExchange('token?grant_type=password',{email,password});setText('authMessage','');closeAuth();"), 'in-app sign-in closes the account overlay before workspace data loads');
assert.ok(app.includes("setTimeout(()=>{void loadWorkspace(true).then(()=>{if(pk)return handlePackageAction(pk)}).catch"), 'in-app account workspace loads in the background after sign-in');
assert.ok(app.includes("setText('authMessage','Account created and signed in.');closeAuth();setTimeout(()=>{void loadWorkspace(true)"), 'in-app account creation releases the map before loading account data');
console.log('BRIDGEPOINT_AUTH_RESILIENCE_V6237_PASS');
