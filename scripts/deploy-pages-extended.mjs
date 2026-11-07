import fs from 'node:fs';

const required = [
  'GITHUB_TOKEN',
  'GITHUB_REPOSITORY',
  'GITHUB_RUN_ID',
  'GITHUB_RUN_ATTEMPT',
  'GITHUB_SHA',
  'GITHUB_OUTPUT',
  'ACTIONS_ID_TOKEN_REQUEST_URL',
  'ACTIONS_ID_TOKEN_REQUEST_TOKEN'
];
for (const key of required) {
  if (!process.env[key]) throw new Error('Missing required GitHub Actions environment value: ' + key);
}

const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
if (!owner || !repo) throw new Error('GITHUB_REPOSITORY must be owner/name');

const apiBase = (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');
const token = process.env.GITHUB_TOKEN;
const artifactName = 'bridgepoint-v5000-' + process.env.GITHUB_RUN_ATTEMPT;
const deploymentBuildVersion = process.env.GITHUB_SHA;
const maxWaitMs = 35 * 60 * 1000;
const terminalFailureStatuses = new Set([
  'deployment_failed',
  'deployment_content_failed',
  'deployment_cancelled',
  'deployment_lost'
]);

const REQUEST_TIMEOUT_MS = 15000;

async function fetchTextWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    // Keep the timeout active until the response body is fully consumed too.
    const body = await response.text();
    return { response, body };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('HTTP request exceeded ' + REQUEST_TIMEOUT_MS + ' ms: ' + url);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function githubJson(path, options = {}) {
  const { response, body } = await fetchTextWithTimeout(apiBase + path, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + token,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    throw new Error(
      'GitHub API ' + (options.method || 'GET') + ' ' + path +
      ' returned HTTP ' + response.status + ': ' + body.slice(0, 1400)
    );
  }
  return body ? JSON.parse(body) : {};
}

async function getOidcToken() {
  const { response, body } = await fetchTextWithTimeout(process.env.ACTIONS_ID_TOKEN_REQUEST_URL, {
    headers: {
      Authorization: 'Bearer ' + process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
    }
  });
  if (!response.ok) throw new Error('OIDC token request failed with HTTP ' + response.status + ': ' + body.slice(0, 1000));
  const parsed = JSON.parse(body);
  if (!parsed.value) throw new Error('OIDC token response did not contain a value');
  return parsed.value;
}

const artifacts = await githubJson(
  '/repos/' + owner + '/' + repo + '/actions/runs/' + process.env.GITHUB_RUN_ID + '/artifacts?per_page=100'
);
const matches = (artifacts.artifacts || []).filter(item => item.name === artifactName && item.expired !== true);
if (matches.length !== 1) {
  throw new Error('Expected exactly one non-expired Pages artifact named "' + artifactName + '"; found ' + matches.length);
}
const artifact = matches[0];
if (!Number.isFinite(Number(artifact.size_in_bytes)) || Number(artifact.size_in_bytes) <= 0) {
  throw new Error('Pages artifact "' + artifactName + '" has an invalid size');
}
if (Number(artifact.size_in_bytes) > 1073741824) {
  throw new Error('Pages artifact exceeds the 1 GB supported size limit');
}

console.log('Using Pages artifact "' + artifactName + '" (' + artifact.size_in_bytes + ' bytes)');
console.log('Requesting an OIDC token for the GitHub Pages deployment');
const oidcToken = await getOidcToken();

const deployment = await githubJson('/repos/' + owner + '/' + repo + '/pages/deployments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    artifact_id: artifact.id,
    environment: 'github-pages',
    pages_build_version: deploymentBuildVersion,
    oidc_token: oidcToken
  })
});
const deploymentId = String(
  deployment.id || deployment.status_url?.split('/').filter(Boolean).pop() || deploymentBuildVersion
);
const pageUrl = String(deployment.page_url || '');
if (!deploymentId) throw new Error('GitHub Pages did not return a deployment identifier');
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, 'page_url=' + pageUrl + '\n');
}
console.log('Created GitHub Pages deployment for ' + deploymentBuildVersion + ' (ID ' + deploymentId + ')');
console.log('Polling the Pages deployment status without the deploy-pages action 10-minute cancellation cutoff');

const startTime = Date.now();
let intervalMs = 5000;
let requestErrors = 0;
while (Date.now() - startTime < maxWaitMs) {
  await new Promise(resolve => setTimeout(resolve, intervalMs));
  try {
    const status = await githubJson(
      '/repos/' + owner + '/' + repo + '/pages/deployments/' + encodeURIComponent(deploymentId)
    );
    requestErrors = 0;
    const state = String(status.status || 'unknown_status');
    console.log('GitHub Pages deployment status: ' + state);
    if (state === 'succeed') {
      console.log('GitHub Pages deployment completed successfully');
      process.exit(0);
    }
    if (terminalFailureStatuses.has(state)) {
      throw new Error('GitHub Pages reported terminal deployment state: ' + state);
    }
    if (state === 'deployment_attempt_error') {
      console.warn('Pages reported a temporary deployment attempt error; continuing to poll');
    }
    intervalMs = Math.min(30000, Math.round(intervalMs * 1.5));
  } catch (error) {
    if (/terminal deployment state/.test(String(error?.message || error))) throw error;
    requestErrors++;
    console.warn('Pages status poll error ' + requestErrors + ': ' + String(error?.message || error));
    if (requestErrors >= 12) throw new Error('Too many consecutive Pages status polling errors');
    intervalMs = Math.min(30000, Math.round(intervalMs * 1.7));
  }
}

throw new Error(
  'GitHub Pages did not finish syncing the site artifact within ' +
  Math.round(maxWaitMs / 60000) + ' minutes. Deployment left intact for status inspection.'
);
