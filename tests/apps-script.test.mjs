// Runs apps-script/Code.gs in Node with stand-ins for Google's services: node --test tests/
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const code = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');

function google() {
  const tabs = new Map();
  const cache = new Map();
  const mail = [];
  const sheet = name => {
    const rows = [];
    return {
      name,
      rows,
      appendRow: r => rows.push(r.map(String)),
      setFrozenRows() {},
      getRange: (row, col) => ({
        setFontWeight() {},
        setNumberFormat() {},
        createTextFinder: text => ({
          matchEntireCell: () => ({
            findNext: () => rows.slice(1).find(r => r[(col ?? 3) - 1].replace(/^'/, '') === text) ?? null,
          }),
        }),
      }),
      getLastRow: () => rows.length,
    };
  };
  const ctx = {
    console,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: n => tabs.get(n) ?? null,
        insertSheet: n => (tabs.set(n, sheet(n)), tabs.get(n)),
      }),
    },
    CacheService: { getScriptCache: () => ({ get: k => cache.get(k) ?? null, put: (k, v) => cache.set(k, v) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k === 'NOTIFY_EMAIL' ? 'team@example.com' : null) }) },
    MailApp: { sendEmail: m => mail.push(m) },
    Utilities: { formatDate: () => '2026-10-15 20:00:00' },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ setMimeType: () => JSON.parse(s) }) },
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  const post = body => ctx.doPost({ postData: { contents: JSON.stringify(body) } });
  return { post, tabs, mail, ctx };
}

const good = { kind: 'waitlist', name: 'Chiamaka Eze', phone: '0803 123 4567', email: '', state: 'Lagos', uses: ['Bank transfers'], consent: true, website: '', page: '/' };
let g;
beforeEach(() => {
  g = google();
});

test('adds a waitlist row with the phone in +234 form, and creates the tab with headers', () => {
  assert.deepEqual(g.post(good), { ok: true });
  const rows = g.tabs.get('Waitlist').rows;
  assert.equal(rows[0][2], 'Phone');
  assert.equal(rows[1][1], 'Chiamaka Eze');
  assert.equal(rows[1][2], "'+2348031234567"); // written as text, never a formula or a number
  assert.equal(rows[1][4], 'Lagos');
});

test('one row per phone number: joining again says already on the list', () => {
  g.post(good);
  assert.deepEqual(g.post({ ...good, phone: '+234 803 123 4567' }), { ok: true, duplicate: true });
  assert.equal(g.tabs.get('Waitlist').rows.length, 2);
});

test('checks every field again on the server', () => {
  assert.equal(g.post({ ...good, phone: '12345' }).field, 'phone');
  assert.equal(g.post({ ...good, name: 'A' }).field, 'name');
  assert.equal(g.post({ ...good, state: 'Atlantis' }).field, 'state');
  assert.equal(g.post({ ...good, email: 'not-an-email' }).field, 'email');
  assert.equal(g.post({ ...good, consent: 'yes' }).field, 'consent');
  assert.equal(g.tabs.get('Waitlist'), undefined);
});

test('ignores bots that fill the honeypot, and unknown choices', () => {
  assert.deepEqual(g.post({ ...good, website: 'http://spam' }), { ok: true });
  assert.equal(g.tabs.get('Waitlist'), undefined);
  g.post({ ...good, uses: ['Bank transfers', '=HYPERLINK("x")'] });
  assert.equal(g.tabs.get('Waitlist').rows[1][5], 'Bank transfers');
});

test('a value that looks like a formula is stored as plain text', () => {
  g.post({ ...good, name: '=IMPORTXML("http://evil","//a")', utm_source: '+cmd' });
  const row = g.tabs.get('Waitlist').rows[1];
  assert.ok(row[1].startsWith("'="));
  assert.ok(row[6].startsWith("'+"));
});

test('contact messages go to their own tab, notify the team, and are limited per email', () => {
  const msg = { kind: 'contact', name: 'Tunde', email: 'Tunde@Example.com', topic: 'Press', message: 'Hello, I write for a newspaper.', website: '' };
  assert.deepEqual(g.post(msg), { ok: true });
  assert.equal(g.tabs.get('Messages').rows[1][2], 'tunde@example.com');
  assert.equal(g.mail[0].replyTo, 'tunde@example.com');
  g.post(msg);
  g.post(msg);
  assert.equal(g.post(msg).ok, false);
});

test('a broken request gets a polite error, not a crash', () => {
  const out = g.ctx.doPost({ postData: { contents: '{not json' } });
  assert.equal(out.ok, false);
});
