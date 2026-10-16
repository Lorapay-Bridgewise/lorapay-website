/**
 * Lorapay website forms -> Google Sheet.
 *
 * A Google Apps Script web app, bound to the Google Sheet that holds the waitlist. The website's
 * forms POST JSON here; each entry becomes a row in the "Waitlist" or "Messages" tab.
 * Set-up: apps-script/README.md.
 *
 * Protections: a honeypot field, strict checks on every field, one sign-up per phone number,
 * limits per number/email and per minute overall, a lock so two sign-ups can't clash, and cell
 * values that can never be read as spreadsheet formulas.
 */

var WAITLIST_TAB = 'Waitlist';
var MESSAGES_TAB = 'Messages';
var WAITLIST_HEADERS = ['Joined (Lagos time)', 'Name', 'Phone', 'Email', 'State', 'Wants to use it for', 'utm_source', 'utm_medium', 'utm_campaign', 'ref', 'Referrer', 'Page', 'Consent'];
var MESSAGE_HEADERS = ['Received (Lagos time)', 'Name', 'Email', 'Topic', 'Message', 'Page'];

var STATES = ['Abia', 'Abuja (FCT)', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'];
var USES = ['Sending to family', 'Bank transfers', 'Airtime & data', 'Paying for my business', 'Places with bad network'];
var TOPICS = ['A question about Lorapay', 'Partnership or investment', 'Press', 'Something else'];

/** Most sign-ups and messages accepted per minute in all (stops a script filling the sheet). */
var MAX_PER_MINUTE = 120;

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.website) {
      return json_({ ok: true }); // honeypot filled: a bot. Pretend it worked.
    }
    if (!underGlobalLimit_()) {
      return json_({ ok: false, error: 'We are getting a lot of sign-ups right now. Please try again in a minute.' });
    }
    if (body.kind === 'waitlist') {
      return json_(addToWaitlist_(body));
    }
    if (body.kind === 'contact') {
      return json_(addMessage_(body));
    }
    return json_({ ok: false, error: 'Unknown form.' });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'Something went wrong on our side. Please try again in a moment.' });
  }
}

/** Opening the web app's address in a browser shows that it's running. */
function doGet() {
  return json_({ ok: true, service: 'lorapay-forms' });
}

function addToWaitlist_(b) {
  var name = clean_(b.name, 80);
  var phone = normalizePhone_(b.phone);
  var email = clean_(b.email, 120).toLowerCase();
  var state = STATES.indexOf(b.state) >= 0 ? b.state : '';
  var uses = (Array.isArray(b.uses) ? b.uses : []).filter(function (u) { return USES.indexOf(u) >= 0; });

  if (name.length < 2) return { ok: false, field: 'name', error: 'Please enter your name.' };
  if (!phone) return { ok: false, field: 'phone', error: 'Enter a Nigerian mobile number, like 0803 123 4567.' };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, field: 'email', error: 'That email doesn’t look right.' };
  if (!state) return { ok: false, field: 'state', error: 'Choose your state.' };
  if (b.consent !== true) return { ok: false, field: 'consent', error: 'Tick the box so we can text you at launch.' };

  var cache = CacheService.getScriptCache();
  var recentKey = 'wl:' + phone;
  if (cache.get(recentKey)) {
    return { ok: true, duplicate: true }; // the same number a moment ago (double tap, retry)
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = tab_(WAITLIST_TAB, WAITLIST_HEADERS);
    var found = sheet.getRange(2, 3, Math.max(sheet.getLastRow() - 1, 1), 1)
      .createTextFinder(phone).matchEntireCell(true).findNext();
    cache.put(recentKey, '1', 60);
    if (found) {
      return { ok: true, duplicate: true };
    }
    sheet.appendRow([
      lagosNow_(), safe_(name), safe_(phone), safe_(email), safe_(state), safe_(uses.join(', ')),
      safe_(clean_(b.utm_source, 80)), safe_(clean_(b.utm_medium, 80)), safe_(clean_(b.utm_campaign, 80)),
      safe_(clean_(b.ref, 80)), safe_(clean_(b.referrer, 120)), safe_(clean_(b.page, 120)), 'yes',
    ]);
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

function addMessage_(b) {
  var name = clean_(b.name, 80);
  var email = clean_(b.email, 120).toLowerCase();
  var topic = TOPICS.indexOf(b.topic) >= 0 ? b.topic : 'Something else';
  var message = clean_(b.message, 2000);

  if (name.length < 2) return { ok: false, field: 'name', error: 'Please enter your name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, field: 'email', error: 'Enter an email we can reply to.' };
  if (message.length < 10) return { ok: false, field: 'message', error: 'Tell us a little more (at least 10 characters).' };

  var cache = CacheService.getScriptCache();
  var key = 'msg:' + email;
  var count = Number(cache.get(key) || 0);
  if (count >= 3) {
    return { ok: false, error: 'You have sent several messages in the last hour. We will reply soon.' };
  }
  cache.put(key, String(count + 1), 3600);

  tab_(MESSAGES_TAB, MESSAGE_HEADERS).appendRow([lagosNow_(), safe_(name), safe_(email), safe_(topic), safe_(message), safe_(clean_(b.page, 120))]);

  var notify = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL');
  if (notify) {
    MailApp.sendEmail({
      to: notify,
      replyTo: email,
      subject: 'Lorapay website: ' + topic,
      body: 'From: ' + name + ' <' + email + '>\n\n' + message,
    });
  }
  return { ok: true };
}

// ------------------------------------------------------------------------------------- helpers

/** +234XXXXXXXXXX for a Nigerian mobile number, or '' */
function normalizePhone_(input) {
  var d = String(input || '').replace(/\D/g, '');
  if (d.indexOf('234') === 0) d = d.slice(3);
  if (d.charAt(0) === '0') d = d.slice(1);
  return /^[789][01]\d{8}$/.test(d) ? '+234' + d : '';
}

function clean_(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

/**
 * A spreadsheet treats text starting with = + - @ as a formula. Every value is written as text, and
 * such values get a leading apostrophe, so nobody can plant a formula in the sheet.
 */
function safe_(value) {
  var s = String(value);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function underGlobalLimit_() {
  var cache = CacheService.getScriptCache();
  var key = 'all:' + Math.floor(Date.now() / 60000);
  var count = Number(cache.get(key) || 0);
  if (count >= MAX_PER_MINUTE) return false;
  cache.put(key, String(count + 1), 120);
  return true;
}

function tab_(name, headers) {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = book.getSheetByName(name);
  if (!sheet) {
    sheet = book.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.getRange('C:C').setNumberFormat('@'); // phone numbers stay text
  }
  return sheet;
}

function lagosNow_() {
  return Utilities.formatDate(new Date(), 'Africa/Lagos', 'yyyy-MM-dd HH:mm:ss');
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
