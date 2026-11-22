/* BridgePoint Public 3D Scan Library v1 — public only after explicit consent. */
(() => {
  'use strict';
  if (window.__BP_PUBLIC_SCANS_V1__) return;
  window.__BP_PUBLIC_SCANS_V1__ = true;

  const VERSION = '1.1.0';
  const API = 'https://bridgepoint-scan-library-api.olekingkole28.chatgpt.site/api/v1/scans';
  const CATALOG_URL = '/bridgepoint-public-scan-catalog-v1.json';
  const BUTTON_ID = 'bpPublicScansLaunchV1';
  const ROOT_ID = 'bpPublicScansRootV1';
  const STYLE_ID = 'bpPublicScansStyleV1';
  const IMPORT_MAP_ID = 'bpPublicScansImportMapV1';
  const DELETE_PREFIX = 'bp_public_scan_delete_v1_';
  const UPLOAD_URL = 'https://openscan.eu/pages/openscancloud-uploader';
  const state = { screen: 'browse', items: [], total: 0, communityTotal: 0, offset: 0, query: '', loading: false, catalog: [], catalogReady: false, catalogLoading: false, catalogError: '', visibleItems: [], active: null, renderer: null, scene: null, controls: null, frame: 0, objectUrls: [] };
  const $ = (selector, root = document) => root.querySelector(selector);
  const escText = value => String(value ?? '');
  const formatBytes = bytes => bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const formatDate = value => { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); };

  function installCSS() {
    if ($('#' + STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${BUTTON_ID}{position:fixed;z-index:2147482901;right:12px;top:60px;min-height:40px;padding:0 13px;border:1px solid #7ef7ee;border-radius:13px;background:linear-gradient(145deg,#a9fff2 0%,#32d5d5 38%,#147b9a 100%);color:#06141c;font:950 11px/1 system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:.055em;text-shadow:0 1px 0 #fff9;box-shadow:0 7px 0 #075363,0 10px 24px #000a,0 0 24px #42e7df55;cursor:pointer;touch-action:manipulation}
      #${BUTTON_ID}:active{transform:translateY(2px);box-shadow:0 4px 0 #075363,0 7px 18px #000a}
      #${BUTTON_ID}[hidden],#${ROOT_ID}[hidden]{display:none!important}
      #${ROOT_ID}{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;padding:calc(env(safe-area-inset-top) + 10px) 10px calc(env(safe-area-inset-bottom) + 10px);background:rgba(2,7,13,.82);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);font:500 14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;color:#eefaff}
      #${ROOT_ID} *{box-sizing:border-box}
      .bpScanPanelV1{width:min(920px,100%);max-height:100%;display:flex;flex-direction:column;overflow:hidden;border:1px solid #50d7e178;border-radius:22px;background:radial-gradient(120% 95% at 100% 0%,#16445d 0%,transparent 54%),linear-gradient(145deg,#0b1b2b,#07111b 68%,#081c25);box-shadow:0 26px 90px #000d,0 0 40px #28d5e31b}
      .bpScanHeadV1{display:flex;align-items:center;gap:14px;padding:17px 20px;border-bottom:1px solid #80dce122}
      .bpScanBrandV1{min-width:0;flex:1}.bpScanKickerV1{margin:0 0 3px;color:#77eee3;font-size:10px;font-weight:950;letter-spacing:.16em}.bpScanHeadV1 h2{margin:0;color:#f3fdff;font-size:clamp(18px,3vw,25px);line-height:1.12}.bpScanHeadV1 small{display:block;margin-top:5px;color:#9bb9c6;font-size:11px}
      .bpScanCloseV1{width:40px;height:40px;border:1px solid #7ac8d54a;border-radius:12px;background:#102838;color:#dff9ff;font-size:25px;cursor:pointer}
      .bpScanTabsV1{display:flex;gap:8px;padding:11px 16px 0}.bpScanTabV1{min-height:40px;padding:0 15px;border:1px solid #34596a;border-radius:12px;background:#0a1925;color:#a8c5d0;font:850 11px system-ui;letter-spacing:.04em;cursor:pointer}.bpScanTabV1[aria-selected="true"]{border-color:#55e3df;background:linear-gradient(135deg,#16485a,#133246);color:#ddfffc;box-shadow:inset 0 0 20px #4ce3e821}
      .bpScanBodyV1{overflow:auto;overscroll-behavior:contain;padding:16px;min-height:180px}.bpScanToolbarV1{display:flex;gap:9px;align-items:center;margin:0 0 13px}.bpScanSearchV1{flex:1;min-width:0;min-height:44px;padding:0 12px;border:1px solid #335869;border-radius:12px;background:#06121d;color:#effbff;font:600 14px system-ui}.bpScanActionV1,.bpScanSecondaryV1{min-height:42px;padding:0 14px;border:1px solid #65d9df;border-radius:12px;background:linear-gradient(135deg,#29cad1,#137fa2);color:#04131a;font:900 11px system-ui;letter-spacing:.035em;cursor:pointer}.bpScanSecondaryV1{border-color:#477181;background:#102535;color:#c6e7ed}.bpScanActionV1:disabled{opacity:.55;cursor:wait}
      .bpScanGridV1{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,245px),1fr));gap:11px}.bpScanCardV1{overflow:hidden;border:1px solid #3e6c7d;border-radius:17px;background:linear-gradient(150deg,#112c3b,#091722);box-shadow:0 9px 24px #0005}.bpScanThumbV1{position:relative;display:grid;place-items:center;height:146px;background:radial-gradient(ellipse at 50% 72%,#4ee2df44,transparent 43%),linear-gradient(150deg,#12334a,#08111b 66%);border-bottom:1px solid #67cedf33}.bpScanThumbV1:before{content:"";position:absolute;width:104px;height:104px;border:1px solid #5ae3dc50;border-radius:50%;box-shadow:0 0 26px #42e6e54a,inset 0 0 28px #42e6e522;transform:rotateX(65deg)}.bpScanMeshV1{position:relative;display:grid;place-items:center;width:76px;height:76px;border:1px solid #87f5e6;border-radius:19px;background:linear-gradient(145deg,#b1fff2,#3ad2d4 48%,#177f9c);color:#071720;font-size:31px;text-shadow:0 1px 0 #fff8;box-shadow:0 7px 0 #0b5364,0 13px 25px #0009;transform:rotate(-8deg)}
      .bpScanCardInfoV1{padding:12px}.bpScanCardInfoV1 h3{margin:0;color:#f2fdff;font-size:15px;line-height:1.3;overflow-wrap:anywhere}.bpScanMetaV1{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px;color:#a5c0cb;font-size:10px}.bpScanPillV1{padding:3px 7px;border:1px solid #406778;border-radius:99px;background:#0a1b27;color:#abced8}.bpScanDescV1{margin:8px 0;color:#bdd0d8;font-size:12px;line-height:1.45;overflow-wrap:anywhere}.bpScanCardActionsV1{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.bpScanEmptyV1,.bpScanStatusV1,.bpScanNoticeV1{padding:13px;border:1px solid #3b6270;border-radius:13px;background:#0b1b27;color:#bfd8e0;font-size:12px;line-height:1.5}.bpScanNoticeV1{margin:0 0 13px;border-color:#33849a;background:#0c2633;color:#c9e9ed}.bpScanNoticeV1 strong{color:#8bf7e6}.bpScanStatusV1{margin-top:12px;color:#8ff1de}.bpScanStatusV1[data-kind="error"]{border-color:#9c4f5d;color:#ffc0c0}.bpScanFormV1{display:grid;gap:11px;max-width:720px}.bpScanFieldV1{display:grid;gap:5px;color:#b9d2dc;font-size:12px;font-weight:750}.bpScanFieldV1 input,.bpScanFieldV1 textarea{width:100%;min-height:42px;padding:10px 12px;border:1px solid #335869;border-radius:11px;background:#06121d;color:#effbff;font:550 14px system-ui}.bpScanFieldV1 textarea{min-height:84px;resize:vertical}.bpScanFieldV1 input[type="file"]{padding:8px}.bpScanConsentV1{display:flex;align-items:flex-start;gap:9px;padding:11px;border:1px solid #3e6b7c;border-radius:12px;background:#0b1b27;color:#c4d8df;font-size:12px;line-height:1.45}.bpScanConsentV1 input{width:18px;height:18px;flex:0 0 auto;margin:0;accent-color:#28d7d1}.bpScanViewerV1{width:100%;height:min(55vh,480px);min-height:260px;border:1px solid #4a8192;border-radius:16px;background:#07131d;overflow:hidden}.bpScanViewerV1 canvas{display:block;width:100%;height:100%}.bpScanViewerToolsV1{display:flex;gap:8px;margin:10px 0}.bpScanAttributionV1{margin:11px 0 0;color:#86a4b0;font-size:10px;line-height:1.5}.bpScanLinkV1{color:#75e9e6;font-weight:800}.bpScanFootV1{padding:10px 16px;border-top:1px solid #80dce122;color:#7897a4;font-size:10px;line-height:1.45}
      @media(max-width:600px){#${BUTTON_ID}{right:9px;min-height:37px;padding:0 10px;font-size:9px}.bpScanHeadV1{padding:12px}.bpScanTabsV1{padding:8px 10px 0}.bpScanBodyV1{padding:11px}.bpScanFootV1{padding:9px 11px}.bpScanPanelV1{border-radius:17px}.bpScanGridV1{grid-template-columns:1fr}.bpScanThumbV1{height:126px}.bpScanToolbarV1{flex-wrap:wrap}.bpScanSearchV1{flex-basis:100%}}
    `;
    style.textContent += ".bpScanSummaryV1{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 14px;padding:14px 15px;border:1px solid #4fdedb8c;border-radius:15px;background:linear-gradient(120deg,#103846,#09202b 72%);box-shadow:inset 0 0 28px #39d7d019,0 8px 24px #0004}.bpScanSummaryV1 strong{display:block;color:#b7fff5;font-size:clamp(19px,4vw,26px);line-height:1.05;font-weight:950}.bpScanSummaryV1 span{display:block;margin-top:5px;color:#a4c6d1;font-size:10px;line-height:1.4}.bpScanLocationListV1{display:grid;gap:8px}.bpScanLocationV1{overflow:hidden;border:1px solid #315867;border-radius:14px;background:linear-gradient(140deg,#0d2533,#091722)}.bpScanLocationV1[open]{border-color:#40c9d18a;box-shadow:0 7px 20px #0003}.bpScanLocationSummaryV1{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:48px;padding:10px 13px;color:#e9fbff;cursor:pointer;list-style:none;font-size:13px;font-weight:850}.bpScanLocationSummaryV1::-webkit-details-marker{display:none}.bpScanLocationSummaryV1:after{content:'＋';color:#77eee3;font-size:16px}.bpScanLocationV1[open]>.bpScanLocationSummaryV1:after{content:'−'}.bpScanLocationNameV1{min-width:0;overflow-wrap:anywhere}.bpScanLocationCountV1{flex:0 0 auto;padding:4px 8px;border:1px solid #47b6bd66;border-radius:99px;background:#0b3440;color:#a8fff2;font-size:10px;font-weight:950}.bpScanLocationModelsV1{padding:0 10px 10px}.bpScanLocationModelsV1 .bpScanGridV1{grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr))}.bpScanViewerV1 iframe{display:block;width:100%;height:100%;border:0}.bpScanOriginV1{color:#7af0df!important}@media(max-width:600px){.bpScanSummaryV1{align-items:flex-start;flex-direction:column}.bpScanLocationModelsV1 .bpScanGridV1{grid-template-columns:1fr}}";
    document.head.appendChild(style);
  }

  function mountButton() {
    const maps = $('#' + 'bpMapsLaunchV1');
    if (!maps || maps.hidden || !document.body) {
      const old = $('#' + BUTTON_ID);
      if (old) old.hidden = true;
      return;
    }
    installCSS();
    let button = $('#' + BUTTON_ID);
    if (!button) {
      button = document.createElement('button');
      button.id = BUTTON_ID;
      button.type = 'button';
      button.textContent = '◇  PUBLIC 3D SCAN LIBRARY';
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-expanded', 'false');
      button.addEventListener('click', openPanel);
      document.body.appendChild(button);
    }
    button.hidden = false;
    const rect = maps.getBoundingClientRect();
    button.style.top = `${Math.max(5, rect.bottom + 8)}px`;
    button.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
  }

  function ensurePanel() {
    if ($('#' + ROOT_ID)) return;
    const root = document.createElement('div');
    root.id = ROOT_ID;
    root.hidden = true;
    root.innerHTML = `<section class="bpScanPanelV1" role="dialog" aria-modal="true" aria-labelledby="bpScanTitleV1"><header class="bpScanHeadV1"><div class="bpScanBrandV1"><p class="bpScanKickerV1">BRIDGEPOINT COMMUNITY MODELS</p><h2 id="bpScanTitleV1">Public 3D scan library</h2><small>Browse, inspect, or publish a finished scan with your permission.</small></div><button class="bpScanCloseV1" type="button" data-bp-scan-action="close" aria-label="Close scan library">×</button></header><nav class="bpScanTabsV1" aria-label="Scan library sections"><button class="bpScanTabV1" type="button" data-bp-scan-action="tab" data-screen="browse" aria-selected="true">EXPLORE SCANS</button><button class="bpScanTabV1" type="button" data-bp-scan-action="tab" data-screen="publish" aria-selected="false">PUBLISH A SCAN</button></nav><main class="bpScanBodyV1" id="bpScanBodyV1"></main><footer class="bpScanFootV1">Public scans can be viewed and downloaded by anyone. BridgePoint stores only the finished model you select here; photos stay on your device unless you send them to a separate processing service.</footer></section>`;
    root.addEventListener('click', onClick);
    root.addEventListener('submit', onSubmit);
    root.addEventListener('keydown', event => { if (event.key === 'Escape') closePanel(); });
    root.addEventListener('input', event => { if (event.target?.id === 'bpScanSearchV1') { state.query = event.target.value; } });
    root.addEventListener('change', event => { if (event.target?.id === 'bpScanSearchV1') { state.query = event.target.value; loadScans(true); } });
    document.body.appendChild(root);
  }

  function openPanel() {
    mountButton();
    ensurePanel();
    const root = $('#' + ROOT_ID);
    root.hidden = false;
    $('#' + BUTTON_ID)?.setAttribute('aria-expanded', 'true');
    render();
    if (state.screen === 'browse') { loadCatalog(); loadScans(true); }
    $('#' + ROOT_ID + ' .bpScanCloseV1')?.focus();
  }

  function closePanel() {
    const root = $('#' + ROOT_ID);
    if (!root) return;
    root.hidden = true;
    $('#' + BUTTON_ID)?.setAttribute('aria-expanded', 'false');
    stopViewer();
    state.screen = 'browse';
    state.active = null;
  }

  function renderTabs() {
    const root = $('#' + ROOT_ID);
    root?.querySelectorAll('.bpScanTabV1').forEach(button => button.setAttribute('aria-selected', String(button.dataset.screen === state.screen)));
  }

  function status(message, kind = 'info') {
    const node = $('#bpScanStatusV1');
    if (!node) return;
    node.textContent = message;
    node.dataset.kind = kind;
    node.hidden = !message;
  }

  function render() {
    ensurePanel();
    renderTabs();
    const body = $('#bpScanBodyV1');
    if (!body) return;
    if (state.screen === 'publish') renderPublish(body);
    else if (state.screen === 'viewer' && state.active) renderViewer(body, state.active);
    else renderBrowse(body);
  }

  function renderBrowse(body) {
    body.replaceChildren();
    const catalogItems = state.catalog.filter(item => matchesQuery(item, state.query));
    const communityItems = state.items.filter(item => matchesQuery(item, state.query));
    const grouped = new Map();
    for (const item of [...catalogItems, ...communityItems]) {
      const location = String(item.location || 'Community uploads · location not listed').trim();
      if (!grouped.has(location)) grouped.set(location, []);
      grouped.get(location).push(item);
    }
    const total = (Number(state.catalog.length) || 0) + (Number(state.communityTotal) || 0);
    const catalogLocations = new Set(state.catalog.map(item => String(item.location || '').trim()).filter(Boolean)).size;
    const locationTotal = catalogLocations + (state.communityTotal ? 1 : 0);
    const bridgepointHostedCount = state.catalog.filter(item => item.asset_url).length + state.communityTotal;
    const creatorHostedCount = Math.max(0, state.catalog.length - state.catalog.filter(item => item.asset_url).length);
    const overview = document.createElement('div'); overview.className = 'bpScanSummaryV1';
    const overviewCount = document.createElement('strong'); overviewCount.textContent = total.toLocaleString() + ' INDEXED 3D MODELS';
    const overviewDetail = document.createElement('span'); overviewDetail.textContent = locationTotal.toLocaleString() + ' locations · ' + bridgepointHostedCount.toLocaleString() + ' BridgePoint-hosted · ' + creatorHostedCount.toLocaleString() + ' creator-hosted viewers';
    overview.append(overviewCount, overviewDetail); body.append(overview);
    const toolbar = document.createElement('div');
    toolbar.className = 'bpScanToolbarV1';
    const search = document.createElement('input');
    search.type = 'search'; search.id = 'bpScanSearchV1'; search.className = 'bpScanSearchV1';
    search.placeholder = 'Search models or locations'; search.setAttribute('aria-label', 'Search models or locations');
    search.value = state.query;
    const refresh = document.createElement('button');
    refresh.type = 'button'; refresh.className = 'bpScanSecondaryV1'; refresh.dataset.bpScanAction = 'refresh'; refresh.textContent = 'REFRESH';
    toolbar.append(search, refresh);
    body.append(toolbar);
    const list = document.createElement('div'); list.className = 'bpScanLocationListV1'; list.id = 'bpScanGridV1'; body.append(list);
    const sortedGroups = [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }));
    state.visibleItems = sortedGroups.flatMap(([, items]) => items);
    if (!state.catalogReady && !state.catalogError && !state.items.length) list.append(makeMessage('Loading the existing 3D scan catalog…'));
    else if (state.catalogError && !state.catalog.length && !state.items.length) list.append(makeMessage('The indexed scan catalog is temporarily unavailable. Check the connection and refresh.'));
    else if (!sortedGroups.length && state.loading) list.append(makeMessage('Loading the public scan library…'));
    else if (!sortedGroups.length) list.append(makeMessage(state.query ? 'No 3D models match that search.' : 'No 3D models are currently indexed.'));
    else sortedGroups.forEach(([location, items]) => {
      items.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' }));
      const group = document.createElement('details'); group.className = 'bpScanLocationV1';
      const groupSummary = document.createElement('summary'); groupSummary.className = 'bpScanLocationSummaryV1';
      const name = document.createElement('span'); name.className = 'bpScanLocationNameV1'; name.textContent = location;
      const count = document.createElement('span'); count.className = 'bpScanLocationCountV1'; count.textContent = items.length + (items.length === 1 ? ' MODEL' : ' MODELS');
      groupSummary.append(name, count);
      const models = document.createElement('div'); models.className = 'bpScanLocationModelsV1';
      const grid = document.createElement('div'); grid.className = 'bpScanGridV1';
      items.forEach(item => grid.append(makeCard(item)));
      models.append(grid); group.append(groupSummary, models); list.append(group);
    });
    if (state.total > state.items.length) {
      const more = document.createElement('button'); more.type = 'button'; more.className = 'bpScanSecondaryV1'; more.dataset.bpScanAction = 'more'; more.textContent = 'LOAD MORE SCANS'; more.style.marginTop = '12px'; body.append(more);
    }
    if (state.loading && state.items.length) body.append(makeMessage('Refreshing scans…'));
    const attribution = document.createElement('p'); attribution.className = 'bpScanAttributionV1';
    attribution.textContent = 'The indexed catalog brings together 3D viewers already used by BridgePoint map layers. Each card identifies whether the model file is BridgePoint-hosted or remains in its creator’s viewer. New community uploads appear here only after explicit public-sharing consent.';
    body.append(attribution);
  }

  function matchesQuery(item, query) {
    const needle = String(query || '').trim().toLocaleLowerCase();
    if (!needle) return true;
    return [item.title, item.location, item.category, item.description, item.method, item.creator, item.creator_name]
      .some(value => String(value || '').toLocaleLowerCase().includes(needle));
  }

  async function loadCatalog() {
    if (state.catalogReady || state.catalogLoading) return;
    state.catalogLoading = true;
    try {
      const response = await fetch(CATALOG_URL + '?v=' + VERSION, { headers: { Accept: 'application/json' }, credentials: 'omit', cache: 'force-cache' });
      if (!response.ok) throw new Error('Catalog request returned ' + response.status + '.');
      const data = await response.json();
      if (!Array.isArray(data.items) || !Number.isFinite(Number(data.total)) || Number(data.total) !== data.items.length) throw new Error('The indexed scan catalog is incomplete.');
      state.catalog = data.items;
      state.catalogReady = true;
      state.catalogError = '';
    } catch (error) {
      state.catalogError = error?.message || 'The indexed scan catalog could not be loaded.';
    } finally {
      state.catalogLoading = false;
    }
    if (!$('#' + ROOT_ID)?.hidden && state.screen === 'browse') renderBrowse($('#bpScanBodyV1'));
  }

  function makeMessage(text) { const box = document.createElement('div'); box.className = 'bpScanEmptyV1'; box.textContent = text; return box; }

  function makeCard(item) {
    const card = document.createElement('article'); card.className = 'bpScanCardV1';
    const thumb = document.createElement('div'); thumb.className = 'bpScanThumbV1';
    const mesh = document.createElement('div'); mesh.className = 'bpScanMeshV1'; mesh.textContent = '◇'; mesh.setAttribute('aria-hidden', 'true'); thumb.append(mesh);
    const info = document.createElement('div'); info.className = 'bpScanCardInfoV1';
    const isCatalog = Boolean(item.viewer_url || item.asset_url);
    const title = document.createElement('h3'); title.textContent = escText(item.title); info.append(title);
    const meta = document.createElement('div'); meta.className = 'bpScanMetaV1';
    const labels = isCatalog
      ? [item.category || '3D scan', item.asset_url ? 'BridgePoint-hosted' : 'Creator-hosted viewer']
      : [item.creator_name || 'BridgePoint community', formatDate(item.created_at), String(item.file_name || '').split('.').pop()?.toUpperCase() || '3D MODEL', formatBytes(Number(item.file_bytes) || 0)];
    for (const text of labels.filter(Boolean)) {
      const pill = document.createElement('span'); pill.className = 'bpScanPillV1'; pill.textContent = text; meta.append(pill);
    }
    info.append(meta);
    const descriptionText = item.description || item.method || '';
    if (descriptionText) { const description = document.createElement('p'); description.className = 'bpScanDescV1'; description.textContent = descriptionText; info.append(description); }
    const actions = document.createElement('div'); actions.className = 'bpScanCardActionsV1';
    const view = document.createElement('button'); view.type = 'button'; view.className = 'bpScanActionV1'; view.textContent = 'OPEN 3D VIEWER'; view.dataset.bpScanAction = 'view'; view.dataset.scanId = item.id; actions.append(view);
    let token = '';
    try { token = localStorage.getItem(DELETE_PREFIX + item.id) || ''; } catch (_) { /* Storage may be disabled. */ }
    if (token) { const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'bpScanSecondaryV1'; remove.textContent = 'REMOVE MY SCAN'; remove.dataset.bpScanAction = 'delete'; remove.dataset.scanId = item.id; actions.append(remove); }
    info.append(actions); card.append(thumb, info); return card;
  }

  function renderPublish(body) {
    body.replaceChildren();
    const notice = document.createElement('div'); notice.className = 'bpScanNoticeV1';
    notice.innerHTML = `Need to create a model first? <a class="bpScanLinkV1" href="${UPLOAD_URL}" target="_blank" rel="noopener">Open OpenScanCloud’s secure uploader</a>. It requires their access token; their service processes the photos and may route them through Dropbox for research/testing. When you receive the finished model archive, come back here and upload that file.`;
    body.append(notice);
    const form = document.createElement('form'); form.className = 'bpScanFormV1'; form.id = 'bpScanPublishFormV1';
    const title = field('Scan name', 'text', 'title', 'Give your scan a name', true, 120); title.input.autocomplete = 'off'; form.append(title.wrap);
    const creator = field('Creator name (optional)', 'text', 'creator', 'Name to show in the public library', false, 80); creator.input.autocomplete = 'name'; form.append(creator.wrap);
    const description = document.createElement('label'); description.className = 'bpScanFieldV1'; description.textContent = 'Description (optional)';
    const descriptionInput = document.createElement('textarea'); descriptionInput.name = 'description'; descriptionInput.maxLength = 600; descriptionInput.placeholder = 'What did you scan?'; description.append(descriptionInput); form.append(description);
    const fileField = document.createElement('label'); fileField.className = 'bpScanFieldV1'; fileField.textContent = 'Finished 3D model';
    const fileInput = document.createElement('input'); fileInput.name = 'model'; fileInput.type = 'file'; fileInput.accept = '.glb,.gltf,.ply,.zip,model/gltf-binary,application/zip'; fileInput.required = true; fileField.append(fileInput); form.append(fileField);
    const fileNote = document.createElement('small'); fileNote.className = 'bpScanAttributionV1'; fileNote.textContent = 'OpenScanCloud ZIP archives, GLB, PLY, and self-contained glTF models are supported. Maximum model size: 100 MB.'; form.append(fileNote);
    const consent = document.createElement('label'); consent.className = 'bpScanConsentV1';
    const checkbox = document.createElement('input'); checkbox.name = 'consent'; checkbox.type = 'checkbox'; checkbox.required = true;
    const consentCopy = document.createElement('span'); consentCopy.textContent = 'I have permission to share this model and its contents publicly. I understand anyone can view and download it. I am uploading only the finished model, not my private photo set.';
    consent.append(checkbox, consentCopy); form.append(consent);
    const submit = document.createElement('button'); submit.type = 'submit'; submit.className = 'bpScanActionV1'; submit.textContent = 'PUBLISH THIS SCAN TO BRIDGEPOINT'; form.append(submit);
    const feedback = document.createElement('div'); feedback.id = 'bpScanStatusV1'; feedback.className = 'bpScanStatusV1'; feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite'); feedback.hidden = true; form.append(feedback);
    body.append(form);
  }

  function field(labelText, type, name, placeholder, required, maxLength) {
    const wrap = document.createElement('label'); wrap.className = 'bpScanFieldV1'; wrap.append(document.createTextNode(labelText));
    const input = document.createElement('input'); input.type = type; input.name = name; input.placeholder = placeholder; input.required = required; input.maxLength = maxLength; wrap.append(input);
    return { wrap, input };
  }

  function renderViewer(body, item) {
    body.replaceChildren();
    const isCatalog = Boolean(item.viewer_url || item.asset_url);
    const back = document.createElement('button'); back.type = 'button'; back.className = 'bpScanSecondaryV1'; back.dataset.bpScanAction = 'back'; back.textContent = 'BACK TO PUBLIC SCANS'; body.append(back);
    const title = document.createElement('h3'); title.textContent = item.title; title.style.cssText = 'margin:13px 0 4px;color:#f2fdff;font-size:19px'; body.append(title);
    const meta = document.createElement('div'); meta.className = 'bpScanMetaV1';
    meta.textContent = isCatalog
      ? (item.category || '3D scan') + ' · ' + (item.creator || 'Creator not listed') + ' · ' + (item.asset_url ? 'BridgePoint-hosted model' : 'Creator-hosted viewer')
      : (item.creator_name || 'BridgePoint community') + ' · ' + formatDate(item.created_at) + ' · ' + formatBytes(Number(item.file_bytes) || 0);
    body.append(meta);
    for (const [label, value] of [['Location', item.location], ['Capture', item.method], ['Description', item.description], ['Precision', item.precision], ['License', item.license]]) {
      if (!value) continue;
      const copy = document.createElement('p'); copy.className = 'bpScanDescV1'; copy.textContent = label + ': ' + value; body.append(copy);
    }
    const tools = document.createElement('div'); tools.className = 'bpScanViewerToolsV1';
    const link = document.createElement('a'); link.className = 'bpScanSecondaryV1';
    link.href = isCatalog ? (item.source_url || item.asset_url || item.viewer_url) : API + '/' + encodeURIComponent(item.id) + '/file';
    link.target = '_blank'; link.rel = 'noopener'; link.textContent = isCatalog && !item.asset_url ? 'OPEN CREATOR SOURCE' : 'DOWNLOAD MODEL'; link.style.cssText = 'display:inline-flex;align-items:center;text-decoration:none'; tools.append(link); body.append(tools);
    const stage = document.createElement('div'); stage.className = 'bpScanViewerV1'; stage.id = 'bpScanViewerCanvasV1'; stage.setAttribute('role', 'img'); stage.setAttribute('aria-label', 'Interactive 3D view of ' + item.title); body.append(stage);
    const note = document.createElement('p'); note.className = 'bpScanAttributionV1'; note.textContent = isCatalog
      ? (item.asset_url ? 'Drag to rotate · pinch or scroll to zoom. This 3D model file is hosted by BridgePoint.' : 'The original creator-hosted interactive 3D viewer is shown here. The model remains hosted by its listed source.')
      : 'Drag to rotate · pinch or scroll to zoom. This model was shared publicly by its uploader and is hosted by BridgePoint.';
    body.append(note);
    loadViewer(item, stage);
  }

  async function loadScans(reset) {
    if (state.loading) return;
    if (reset) { state.offset = 0; state.items = []; }
    state.loading = true;
    if (state.screen === 'browse' && !$('#bpScanGridV1')) render();
    try {
      const params = new URLSearchParams({ limit: '60', offset: String(state.offset) });
      if (state.query.trim()) params.set('q', state.query.trim());
      const response = await fetch(API + '?' + params.toString(), { headers: { Accept: 'application/json' }, credentials: 'omit', cache: 'no-store' });
      if (!response.ok) throw new Error(`Library request returned ${response.status}.`);
      const data = await response.json();
      if (reset) state.items = Array.isArray(data.items) ? data.items : [];
      else state.items = state.items.concat(Array.isArray(data.items) ? data.items : []);
      state.total = Number(data.total) || 0;
      if (!state.query.trim()) state.communityTotal = state.total;
      state.offset = state.items.length;
    } catch (error) {
      state.items = reset ? [] : state.items;
      state.total = state.items.length;
      state.loadError = error?.message || 'The scan library could not be loaded.';
    } finally {
      state.loading = false;
      if (!$('#' + ROOT_ID)?.hidden && state.screen === 'browse') renderBrowse($('#bpScanBodyV1'));
      if (state.loadError && !state.items.length) $('#bpScanBodyV1')?.append(makeMessage('Scan library is temporarily unavailable. Check the connection and refresh.'));
      state.loadError = '';
    }
  }

  async function uploadScan(form) {
    const feedback = $('#bpScanStatusV1', form);
    const submit = form.querySelector('[type="submit"]');
    const file = form.elements.model.files?.[0];
    const title = String(form.elements.title.value || '').trim();
    if (!file || !title) { if (feedback) { feedback.hidden = false; feedback.dataset.kind = 'error'; feedback.textContent = 'Add a title and choose a finished model file.'; } return; }
    if (file.size > 100 * 1024 * 1024) { if (feedback) { feedback.hidden = false; feedback.dataset.kind = 'error'; feedback.textContent = 'This model is over the 100 MB limit.'; } return; }
    submit.disabled = true; submit.textContent = 'UPLOADING MODEL…';
    if (feedback) { feedback.hidden = false; feedback.dataset.kind = 'info'; feedback.textContent = 'Uploading the finished model to BridgePoint’s public library…'; }
    try {
      const response = await fetch(API, {
        method: 'POST', credentials: 'omit',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'X-BP-Title': encodeURIComponent(title),
          'X-BP-Description': encodeURIComponent(String(form.elements.description.value || '').trim()),
          'X-BP-Creator': encodeURIComponent(String(form.elements.creator.value || '').trim()),
          'X-BP-File-Name': encodeURIComponent(file.name),
          'X-BP-Public-Consent': form.elements.consent.checked ? 'yes' : 'no',
        },
        body: file,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Upload returned ${response.status}.`);
      try { localStorage.setItem(DELETE_PREFIX + data.item.id, data.delete_token); } catch (_) { /* The published scan remains public even if this device cannot save its removal key. */ }
      state.screen = 'browse'; state.active = null; state.query = ''; state.loadError = '';
      state.items = [data.item]; state.total = Math.max(1, state.total + 1); state.communityTotal += 1; state.offset = 1;
      renderTabs(); renderBrowse($('#bpScanBodyV1'));
      const notice = document.createElement('div'); notice.className = 'bpScanStatusV1'; notice.setAttribute('role', 'status');
      notice.textContent = 'Your scan is now publicly hosted by BridgePoint and appears first in the library. Its removal key is saved on this device.';
      $('#bpScanBodyV1')?.prepend(notice);
    } catch (error) {
      if (feedback) { feedback.hidden = false; feedback.dataset.kind = 'error'; feedback.textContent = error?.message || 'The scan could not be published. Try again.'; }
      submit.disabled = false; submit.textContent = 'PUBLISH THIS SCAN TO BRIDGEPOINT';
    }
  }

  async function onSubmit(event) {
    if (event.target?.id !== 'bpScanPublishFormV1') return;
    event.preventDefault();
    if (!event.target.reportValidity()) return;
    await uploadScan(event.target);
  }

  async function onClick(event) {
    const button = event.target.closest('[data-bp-scan-action]');
    if (!button) return;
    const action = button.dataset.bpScanAction;
    if (action === 'close') closePanel();
    else if (action === 'tab') {
      stopViewer(); state.screen = button.dataset.screen === 'publish' ? 'publish' : 'browse'; state.active = null; render();
      if (state.screen === 'browse') loadScans(true);
    } else if (action === 'refresh') { if (!state.catalogReady) { state.catalogError = ''; loadCatalog(); } loadScans(true); }
    else if (action === 'more') loadScans(false);
    else if (action === 'view') {
      state.active = state.visibleItems.find(item => item.id === button.dataset.scanId) || null;
      if (state.active) { state.screen = 'viewer'; render(); }
    } else if (action === 'back') { stopViewer(); state.screen = 'browse'; render(); }
    else if (action === 'delete') await deleteScan(button.dataset.scanId, button);
  }

  async function deleteScan(id, button) {
    let token = '';
    try { token = localStorage.getItem(DELETE_PREFIX + id) || ''; } catch (_) { /* no-op */ }
    if (!token || !window.confirm('Remove this scan from the public BridgePoint library?')) return;
    button.disabled = true;
    try {
      const response = await fetch(API + '/' + encodeURIComponent(id), { method: 'DELETE', credentials: 'omit', headers: { 'X-BP-Delete-Token': token } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'The scan could not be removed.');
      localStorage.removeItem(DELETE_PREFIX + id);
      state.items = state.items.filter(item => item.id !== id); state.total = Math.max(0, state.total - 1); state.communityTotal = Math.max(0, state.communityTotal - 1); state.screen = 'browse'; state.active = null; renderBrowse($('#bpScanBodyV1'));
    } catch (error) { window.alert(error?.message || 'The scan could not be removed.'); button.disabled = false; }
  }

  async function importLibraries() {
    if (!$('#' + IMPORT_MAP_ID)) {
      const map = document.createElement('script'); map.type = 'importmap'; map.id = IMPORT_MAP_ID;
      map.textContent = JSON.stringify({ imports: {
        'three': 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js',
        'three/addons/': 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/',
      } });
      document.head.appendChild(map);
    }
    const [THREE, { OrbitControls }, { GLTFLoader }, { OBJLoader }, { MTLLoader }, { PLYLoader }, fflate] = await Promise.all([
      import('three'), import('three/addons/controls/OrbitControls.js'), import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/loaders/OBJLoader.js'), import('three/addons/loaders/MTLLoader.js'), import('three/addons/loaders/PLYLoader.js'),
      import('https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/browser.js'),
    ]);
    return { THREE, OrbitControls, GLTFLoader, OBJLoader, MTLLoader, PLYLoader, unzipSync: fflate.unzipSync, gunzipSync: fflate.gunzipSync };
  }

  function bufferFor(value) { return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength); }

  async function loadViewer(item, stage) {
    if (item.viewer_url && !item.asset_url) {
      let viewer;
      try { viewer = new URL(item.viewer_url); } catch (_) { stage.textContent = 'The creator viewer link is invalid.'; return; }
      if (viewer.protocol !== 'https:') { stage.textContent = 'The creator viewer link is not secure.'; return; }
      const frame = document.createElement('iframe');
      frame.src = viewer.href; frame.title = 'Creator-hosted 3D model: ' + item.title;
      frame.loading = 'eager'; frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.allow = 'fullscreen; autoplay; xr-spatial-tracking'; frame.allowFullscreen = true;
      stage.replaceChildren(frame);
      return;
    }
    stage.textContent = 'Loading interactive 3D model…';
    try {
      let fileUrl;
      if (item.asset_url) {
        fileUrl = new URL(item.asset_url, window.location.origin);
        if (fileUrl.origin !== window.location.origin || !fileUrl.pathname.startsWith('/assets/')) throw new Error('The BridgePoint model path is invalid.');
      } else fileUrl = new URL(API + '/' + encodeURIComponent(item.id) + '/file');
      const [libraries, response] = await Promise.all([
        importLibraries(), fetch(fileUrl.href, { credentials: 'omit', cache: 'force-cache' }),
      ]);
      if (!stage.isConnected || $('#' + ROOT_ID)?.hidden) return;
      if (!response.ok) throw new Error('The hosted model could not be downloaded.');
      let buffer = await response.arrayBuffer();
      if (!stage.isConnected || $('#' + ROOT_ID)?.hidden) return;
      if (buffer.byteLength > 100 * 1024 * 1024) throw new Error('This model exceeds the viewer’s 100 MB limit.');
      let fileName = item.file_name || String(item.asset_url || '').split('/').pop() || 'model.glb';
      if (/\.gz$/i.test(fileName)) {
        const bytes = libraries.gunzipSync(new Uint8Array(buffer));
        buffer = bufferFor(bytes);
        fileName = fileName.replace(/\.gz$/i, '');
        if (buffer.byteLength > 180 * 1024 * 1024) throw new Error('The unpacked model exceeds the viewer’s 180 MB limit.');
      }
      await renderModel(libraries, buffer, fileName, stage);
    } catch (error) {
      if (!stage.isConnected || $('#' + ROOT_ID)?.hidden) return;
      stage.textContent = error?.message || 'This model could not be rendered in this browser.';
      stage.style.cssText += ';display:grid;place-items:center;padding:20px;color:#b6d3dd;text-align:center';
    }
  }

  async function renderModel(libs, buffer, fileName, stage) {
    const { THREE, OrbitControls, GLTFLoader, OBJLoader, MTLLoader, PLYLoader, unzipSync } = libs;
    const extension = String(fileName || '').split('.').pop()?.toLowerCase();
    const resources = new Map();
    let modelObject;
    const manager = new THREE.LoadingManager();
    manager.setURLModifier(url => {
      const plain = decodeURIComponent(String(url).split(/[?#]/)[0]);
      const key = plain.split('/').pop()?.toLowerCase();
      return resources.get(plain.toLowerCase()) || resources.get(key) || url;
    });
    const rememberFiles = files => {
      const names = Object.keys(files);
      if (names.length > 4000) throw new Error('The archive contains too many files to open safely.');
      let total = 0;
      for (const name of names) {
        const bytes = files[name]; total += bytes.byteLength;
        if (total > 180 * 1024 * 1024) throw new Error('The unpacked model is too large for this viewer.');
        const normalized = name.replace(/^\.\//, '').toLowerCase();
        const blobUrl = URL.createObjectURL(new Blob([bytes]));
        state.objectUrls.push(blobUrl); resources.set(normalized, blobUrl); resources.set(normalized.split('/').pop(), blobUrl);
      }
      return names;
    };
    const openGltf = data => new Promise((resolve, reject) => {
      new GLTFLoader(manager).parse(bufferFor(data), '', gltf => resolve(gltf.scene || gltf.scenes?.[0]), reject);
    });
    const openObj = (files, names) => {
      const objName = names.find(name => name.toLowerCase().endsWith('.obj'));
      if (!objName) throw new Error('No OBJ model was found inside this archive.');
      const materialName = names.find(name => name.toLowerCase().endsWith('.mtl'));
      if (materialName) {
        const materials = new MTLLoader(manager).parse(new TextDecoder().decode(files[materialName]), '');
        materials.preload();
        const loader = new OBJLoader(manager); loader.setMaterials(materials); return loader.parse(new TextDecoder().decode(files[objName]));
      }
      return new OBJLoader(manager).parse(new TextDecoder().decode(files[objName]));
    };
    const openPly = data => {
      const geometry = new PLYLoader(manager).parse(bufferFor(data));
      geometry.computeVertexNormals();
      const material = new THREE.MeshStandardMaterial({ color: 0x9cefe8, vertexColors: geometry.hasAttribute('color'), roughness: .82, metalness: .05, side: THREE.DoubleSide });
      return new THREE.Mesh(geometry, material);
    };

    if (extension === 'zip') {
      const zipBytes = new Uint8Array(buffer);
      preflightZip(zipBytes);
      const files = unzipSync(zipBytes);
      const names = rememberFiles(files);
      const glbName = names.find(name => name.toLowerCase().endsWith('.glb'));
      const gltfName = names.find(name => name.toLowerCase().endsWith('.gltf'));
      const plyName = names.find(name => name.toLowerCase().endsWith('.ply'));
      if (glbName) modelObject = await openGltf(files[glbName]);
      else if (gltfName) modelObject = await openGltf(files[gltfName]);
      else if (names.some(name => name.toLowerCase().endsWith('.obj'))) modelObject = openObj(files, names);
      else if (plyName) modelObject = openPly(files[plyName]);
      else throw new Error('The ZIP must include a GLB, glTF, OBJ, or PLY model.');
    } else if (extension === 'glb' || extension === 'gltf') {
      modelObject = await openGltf(new Uint8Array(buffer));
    } else if (extension === 'ply') {
      modelObject = openPly(new Uint8Array(buffer));
    } else {
      throw new Error('Use a GLB, PLY, or ZIP model archive.');
    }

    if (!modelObject) throw new Error('No 3D scene was found in this model.');
    if (!stage.isConnected || $('#' + ROOT_ID)?.hidden) return;
    stage.replaceChildren();
    const width = Math.max(240, stage.clientWidth || 360), height = Math.max(220, stage.clientHeight || 320);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x07131d);
    scene.add(new THREE.HemisphereLight(0xd9ffff, 0x17232f, 2.1));
    const key = new THREE.DirectionalLight(0xffffff, 3.1); key.position.set(5, 8, 6); scene.add(key);
    const fill = new THREE.DirectionalLight(0x36dcd2, 1.1); fill.position.set(-5, 2, -4); scene.add(fill);
    scene.add(modelObject);
    state.scene = scene;
    const box = new THREE.Box3().setFromObject(modelObject);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const largest = Math.max(size.x, size.y, size.z, .001);
    modelObject.position.sub(center);
    const camera = new THREE.PerspectiveCamera(40, width / height, .001, largest * 100);
    camera.position.set(largest * 1.65, largest * 1.25, largest * 2.15);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.setSize(width, height); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    stage.append(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = .065; controls.autoRotate = true; controls.autoRotateSpeed = .7; controls.target.set(0, 0, 0);
    const distance = largest * 2.8; controls.minDistance = largest * .12; controls.maxDistance = largest * 20; camera.position.set(distance * .58, distance * .4, distance * .76);
    renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
    state.renderer = renderer; state.controls = controls;
    state.resizeObserver = new ResizeObserver(() => {
      const w = Math.max(240, stage.clientWidth || width), h = Math.max(220, stage.clientHeight || height);
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    }); state.resizeObserver.observe(stage);
  }

  function preflightZip(bytes) {
    // Check the ZIP central directory before decompression so a tiny archive cannot
    // expand into an unbounded allocation on mobile devices.
    const min = Math.max(0, bytes.length - 65557);
    let eocd = -1;
    for (let i = bytes.length - 22; i >= min; i--) {
      if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('This ZIP archive is incomplete or unsupported.');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const entries = view.getUint16(eocd + 10, true);
    const centralBytes = view.getUint32(eocd + 12, true);
    const centralOffset = view.getUint32(eocd + 16, true);
    if (entries > 2000 || entries === 0xffff || centralBytes === 0xffffffff || centralOffset === 0xffffffff) {
      throw new Error('This ZIP archive has too many files or uses an unsupported archive format.');
    }
    if (centralOffset + centralBytes > eocd || centralOffset + centralBytes > bytes.length) {
      throw new Error('This ZIP archive has an invalid file index.');
    }
    let cursor = centralOffset, totalExpanded = 0;
    for (let index = 0; index < entries; index++) {
      if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== 0x02014b50) {
        throw new Error('This ZIP archive has an invalid file index.');
      }
      const compressed = view.getUint32(cursor + 20, true);
      const expanded = view.getUint32(cursor + 24, true);
      const nameBytes = view.getUint16(cursor + 28, true);
      const extraBytes = view.getUint16(cursor + 30, true);
      const commentBytes = view.getUint16(cursor + 32, true);
      if (expanded === 0xffffffff || compressed === 0xffffffff) throw new Error('Large ZIP64 models are not supported in the browser viewer.');
      totalExpanded += expanded;
      if (totalExpanded > 180 * 1024 * 1024) throw new Error('This archive expands beyond the viewer’s 180 MB safety limit.');
      if (expanded > 1024 * 1024 && compressed > 0 && expanded / compressed > 250) {
        throw new Error('This ZIP contains an unusually compressed file and cannot be opened safely.');
      }
      cursor += 46 + nameBytes + extraBytes + commentBytes;
      if (cursor > centralOffset + centralBytes) throw new Error('This ZIP archive has an invalid file index.');
    }
  }

  function stopViewer() {
    state.resizeObserver?.disconnect(); state.resizeObserver = null;
    state.scene?.traverse(object => {
      object.geometry?.dispose?.();
      const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
      for (const material of materials) {
        for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
        material.dispose?.();
      }
    });
    state.scene = null;
    if (state.renderer) { state.renderer.setAnimationLoop(null); state.renderer.dispose(); state.renderer.domElement.remove(); state.renderer = null; }
    if (state.controls) { state.controls.dispose(); state.controls = null; }
    for (const url of state.objectUrls) URL.revokeObjectURL(url);
    state.objectUrls = [];
  }

  const observer = new MutationObserver(mountButton);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  window.addEventListener('resize', mountButton, { passive: true });
  window.addEventListener('orientationchange', mountButton, { passive: true });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('#' + ROOT_ID)?.hidden) closePanel(); });
  let attempts = 0;
  const timer = window.setInterval(() => { mountButton(); attempts += 1; if ($('#' + BUTTON_ID) || attempts >= 240) window.clearInterval(timer); }, 500);
  mountButton();
})();
