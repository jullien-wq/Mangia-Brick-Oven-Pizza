/************************************************************************
 * MANGIA — Website Form Submissions → Google Sheets database
 * ----------------------------------------------------------------------
 * WHAT IT DOES
 *   Every form on the website (Contact, Private Events, Catering, 2-for-$40
 *   Offers, and Careers) sends its data here. This script writes each
 *   submission to TWO places in your spreadsheet:
 *     1) "All Submissions"  – one master log of everything, newest on top
 *     2) a per-category tab – Contact / Private Events / Catering /
 *                             Offers / Careers, so you can filter quickly
 *   New field columns are added automatically the first time they appear,
 *   so you never have to maintain the headers by hand.
 *
 * ----------------------------------------------------------------------
 * ONE-TIME SETUP (about 3 minutes)
 *   1. Go to https://sheets.google.com and create a new blank spreadsheet.
 *      Name it something like "Mangia Website Leads".
 *   2. In that sheet: Extensions ▸ Apps Script.
 *   3. Delete anything in the editor, paste THIS ENTIRE FILE, click Save.
 *   4. Click Deploy ▸ New deployment.
 *        - Click the gear ▸ select "Web app".
 *        - Description: Mangia forms
 *        - Execute as: Me
 *        - Who has access: Anyone   <-- important, must be "Anyone"
 *      Click Deploy, then Authorize access and allow the permissions.
 *   5. Copy the "Web app URL" it gives you (ends in /exec).
 *   6. In the website file (Mangia Website.dc.html) find SHEET_ENDPOINT()
 *      and paste the URL between the quotes, e.g.
 *        SHEET_ENDPOINT(){ return 'https://script.google.com/.../exec'; }
 *   7. Redeploy the site. Done — submissions now appear in the sheet.
 *
 *   To TEST without the website: open this editor, pick the function
 *   "testInsert" in the toolbar dropdown, click Run. A sample row should
 *   appear in your sheet.
 ************************************************************************/

// Fixed leading columns that every tab starts with (in this order).
var BASE_COLS = ['Submitted', 'Form', 'Location', 'Form ID'];

// Maps a submission's formId/form to a friendly category tab name.
function categoryFor(p) {
  var id = (p.formId || '').toLowerCase();
  if (id.indexOf('contact') === 0)  return 'Contact';
  if (id.indexOf('events') === 0)   return 'Private Events';
  if (id.indexOf('catering') === 0) return 'Catering';
  if (id.indexOf('offer') === 0)    return 'Offers';
  if (id === 'careers')             return 'Careers';
  return 'Other';
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (err) {}
  try {
    var p = JSON.parse(e.postData.contents);
    var when = p.submitted ? new Date(p.submitted) : new Date();

    // Flatten: base columns + every field the form sent.
    var row = {
      'Submitted': Utilities.formatDate(when, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
      'Form': p.form || '',
      'Location': p.location || '',
      'Form ID': p.formId || ''
    };
    var data = p.data || {};
    for (var k in data) { if (data.hasOwnProperty(k)) row[k] = data[k]; }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    writeRow(ss, 'All Submissions', row);          // master log
    writeRow(ss, categoryFor(p), row);             // category tab

    // Email the right inbox directly from this Google account — no FormSubmit,
    // no activation step. Attachment (resume or PDF summary) rides along.
    if (p.mail && p.mail.to) {
      try {
        var opts = { name: 'Mangia Website' };
        if (p.mail.replyTo) opts.replyTo = p.mail.replyTo;
        if (p.attachment && p.attachment.dataB64) {
          var bytes = Utilities.base64Decode(p.attachment.dataB64);
          opts.attachments = [ Utilities.newBlob(
            bytes,
            p.attachment.mimeType || 'application/octet-stream',
            p.attachment.name || 'attachment'
          ) ];
        }
        MailApp.sendEmail(p.mail.to, p.mail.subject || 'Mangia Lead', buildBody(p), opts);
      } catch (mErr) { /* logging already succeeded; ignore mail errors */ }
    }

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

// Appends a row to the named sheet, creating the tab and expanding the
// header row with any new field names as needed. Newest row goes to top.
function writeRow(ss, tabName, row) {
  var sh = ss.getSheetByName(tabName);
  if (!sh) {
    sh = ss.insertSheet(tabName);
    sh.appendRow(BASE_COLS.slice());
    styleHeader(sh, BASE_COLS.length);
  }

  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];

  // Add any columns this submission introduces that aren't in the header yet.
  var added = false;
  for (var key in row) {
    if (!row.hasOwnProperty(key)) continue;
    if (headers.indexOf(key) === -1) { headers.push(key); added = true; }
  }
  if (added) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    styleHeader(sh, headers.length);
  }

  // Build the values array in header order.
  var values = headers.map(function (h) { return row[h] != null ? row[h] : ''; });

  // Insert just below the header so newest is always on top (row 2).
  sh.insertRowAfter(1);
  sh.getRange(2, 1, 1, values.length).setValues([values]);
}

// Plain-text email body built from the submission fields.
function buildBody(p) {
  var L = [];
  L.push(p.form || 'Website Form Submission');
  if (p.location) L.push('Location: ' + p.location);
  L.push('Submitted: ' + (p.submitted || new Date().toISOString()));
  L.push('');
  var d = p.data || {};
  for (var k in d) { if (d.hasOwnProperty(k) && d[k]) L.push(k + ': ' + d[k]); }
  if (p.attachment && p.attachment.name) {
    L.push(''); L.push('Attachment: ' + p.attachment.name);
  }
  return L.join('\n');
}

function styleHeader(sh, nCols) {
  var h = sh.getRange(1, 1, 1, nCols);
  h.setFontWeight('bold').setBackground('#A50000').setFontColor('#FFFFFF');
  sh.setFrozenRows(1);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Friendly response if someone opens the URL in a browser.
function doGet() {
  return json({ ok: true, service: 'Mangia form intake', time: new Date().toISOString() });
}

// --- Run this manually from the editor to confirm it writes a row. ---
function testInsert() {
  var fake = {
    postData: { contents: JSON.stringify({
      form: 'Catering Request',
      formId: 'catering-jackson',
      location: 'Jackson',
      submitted: new Date().toISOString(),
      data: {
        'First Name': 'Test', 'Last Name': 'Lead',
        'Email': 'test@example.com', 'Phone': '(732) 000-0000',
        'Guest Count': '40', 'Message': 'Sample submission from testInsert()'
      }
    }) }
  };
  doPost(fake);
}
