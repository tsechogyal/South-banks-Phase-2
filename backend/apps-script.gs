// South Banks Phase 2 registrations -> Google Sheet + email alert.
//
// Setup (about 5 minutes):
// 1. Create a Google Sheet. Extensions > Apps Script. Paste this file in.
// 2. Project Settings > Script properties: add NOTIFY_EMAIL = the inbox that should get new-lead alerts.
// 3. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
// 4. Copy the web app URL into FORM_ENDPOINT at the top of assets/js/main.js.

const SHEET_NAME = 'Registrations';
const HEADERS = ['Timestamp', 'Name', 'Email', 'Phone', 'Interested as', 'Has realtor', 'Consent', 'Source', 'Page'];

function doPost(e) {
  const p = (e && e.parameter) || {};
  if (p.company) return ok(); // honeypot filled = bot

  const email = String(p.email || '').trim().toLowerCase();
  if (!p.name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return ok();

  // Ignore repeat submits from the same email within a minute.
  const cache = CacheService.getScriptCache();
  if (cache.get(email)) return ok();
  cache.put(email, '1', 60);

  // The sheet write is the one step that has to succeed.
  const sheet = getSheet();
  sheet.appendRow([new Date(), p.name, email, p.phone || '', p.intent || '', p.realtor || '',
    p.consent === 'yes' ? 'Yes' : 'No', p.source || '', p.page || '']);

  try {
    const to = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL');
    if (to) {
      MailApp.sendEmail({
        to: to,
        replyTo: email,
        subject: 'New South Banks Phase 2 registration: ' + p.name,
        body: [
          'Name: ' + p.name,
          'Email: ' + email,
          'Phone: ' + (p.phone || ''),
          'Interested as: ' + (p.intent || ''),
          'Working with a realtor: ' + (p.realtor || ''),
          'Source: ' + (p.source || ''),
        ].join('\n'),
      });
    }
  } catch (err) {
    console.error('Notification email failed', err);
  }
  return ok();
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function ok() {
  return ContentService.createTextOutput('ok');
}
