const BP_SUPABASE_URL = 'https://xdfsjztwgsbmabshzsjw.supabase.co';
const BP_PUBLISHABLE_KEY = 'sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('BridgePoint')
    .addItem('Open BridgePoint Intelligence', 'bridgePointOpenApp')
    .addItem('Open integration docs', 'bridgePointOpenDocs')
    .addToUi();
}

function bridgePointOpenApp() {
  const html = HtmlService.createHtmlOutput(
    '<script>window.open("https://bridgepointintelligence.online/app/?utm_source=google_sheets&utm_medium=workspace_addon&utm_campaign=distribution","_blank");google.script.host.close();</script>'
  ).setWidth(120).setHeight(60);
  SpreadsheetApp.getUi().showModalDialog(html, 'BridgePoint');
}

function bridgePointOpenDocs() {
  const html = HtmlService.createHtmlOutput(
    '<script>window.open("https://bridgepointintelligence.online/distribution/google-sheets/?utm_source=google_sheets&utm_medium=workspace_addon&utm_campaign=distribution","_blank");google.script.host.close();</script>'
  ).setWidth(120).setHeight(60);
  SpreadsheetApp.getUi().showModalDialog(html, 'BridgePoint');
}

function BP_POST_(rpcName, payload) {
  const response = UrlFetchApp.fetch(
    BP_SUPABASE_URL + '/rest/v1/rpc/' + rpcName,
    {
      method: 'post',
      contentType: 'application/json',
      headers: {
        apikey: BP_PUBLISHABLE_KEY,
        Accept: 'application/json'
      },
      payload: JSON.stringify(payload || {}),
      muteHttpExceptions: true
    }
  );
  const code = response.getResponseCode();
  const text = response.getContentText();
  if (code < 200 || code >= 300) throw new Error('BridgePoint HTTP ' + code + ': ' + text.slice(0, 180));
  return JSON.parse(text || '{}');
}

/**
 * Resolve one exact address through BridgePoint.
 *
 * Example:
 * =BRIDGEPOINT_SEARCH(A2,"property_id")
 *
 * Supported fields commonly include:
 * full_address, property_id, parcel_number, municipality, state_code,
 * postal_code, latitude, longitude and match_reason.
 *
 * @param {string} address exact street address
 * @param {string} field field to return
 * @return value from the best BridgePoint match
 * @customfunction
 */
function BRIDGEPOINT_SEARCH(address, field) {
  if (!address) return '';
  field = String(field || 'full_address').trim();
  const data = BP_POST_('bridgepoint_public_search_v5200', {p_query: String(address), p_limit: 4});
  const rows = Array.isArray(data.results) ? data.results : [];
  const row = rows.find(r => r && r.property_id) || rows[0];
  if (!row) return '#NO_MATCH';
  const value = row[field];
  if (value === undefined || value === null) return '';
  return typeof value === 'object' ? JSON.stringify(value) : value;
}

/**
 * Return a compact BridgePoint property row for an address.
 *
 * Example:
 * =BRIDGEPOINT_PROPERTY(A2)
 *
 * @param {string} address exact street address
 * @return 2D array suitable for a Google Sheet
 * @customfunction
 */
function BRIDGEPOINT_PROPERTY(address) {
  if (!address) return [['full_address','property_id','parcel_number','municipality','state_code','latitude','longitude']];
  const data = BP_POST_('bridgepoint_public_search_v5200', {p_query: String(address), p_limit: 4});
  const rows = Array.isArray(data.results) ? data.results : [];
  const row = rows.find(r => r && r.property_id) || rows[0];
  const headers = ['full_address','property_id','parcel_number','municipality','state_code','latitude','longitude'];
  if (!row) return [headers, ['#NO_MATCH','','','','','','']];
  return [headers, headers.map(k => row[k] == null ? '' : row[k])];
}

/**
 * Read current public BridgePoint platform counters/status.
 *
 * Example:
 * =BRIDGEPOINT_STATUS("canonical_properties")
 *
 * @param {string} field status field
 * @return public status value
 * @customfunction
 */
function BRIDGEPOINT_STATUS(field) {
  const data = BP_POST_('bridgepoint_frontend_status_v5000', {});
  const value = data[String(field || 'canonical_properties')];
  return value == null ? '' : (typeof value === 'object' ? JSON.stringify(value) : value);
}
