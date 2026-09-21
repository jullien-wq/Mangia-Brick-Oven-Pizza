MANGIA PIZZERIA — CLOUDFLARE PAGES DEPLOYMENT
=============================================

This folder is a complete, ready-to-host static site. The forms (contact,
careers, catering, events, coupon) only work when the site is served from a
real web server over https:// — they will NOT work if you open index.html
directly as a file. Hosting on Cloudflare Pages is exactly what makes them work.

FOLDER CONTENTS
---------------
  index.html              The entire website (all pages handled in this one file;
                          navigation uses #anchors, so no extra routing config needed).
  support.js              Runtime required by index.html. Keep it next to index.html.
  assets/                 All images and menu PDFs, referenced by relative paths.
  google-sheet-script.gs  OPTIONAL — logs every submission into a Google Sheet.
                          Setup steps are inside that file. (Don't upload it to
                          Cloudflare; it's pasted into Google Apps Script.)

DEPLOY — OPTION A (drag & drop, fastest)
----------------------------------------
  1. Log in to the Cloudflare dashboard.
  2. Go to:  Workers & Pages  ->  Create  ->  Pages  ->  Upload assets.
  3. Name the project (e.g. "mangia-pizzeria").
  4. Drag THIS ENTIRE FOLDER (or the .zip) into the upload area.
     Make sure index.html sits at the TOP LEVEL of what you upload
     (not inside a nested subfolder).
  5. Click "Deploy site". Your site goes live at
     https://<project-name>.pages.dev

DEPLOY — OPTION B (Git)
-----------------------
  1. Push these files to a GitHub/GitLab repo (index.html at the repo root).
  2. Cloudflare dashboard -> Workers & Pages -> Create -> Pages ->
     Connect to Git -> pick the repo.
  3. Build settings: Framework preset = None.
     Build command = (leave empty).  Build output directory = /  (root).
  4. Save and Deploy.

AFTER IT'S LIVE — FORM DELIVERY (no activation needed)
------------------------------------------------------
Forms are delivered by your Google Apps Script (the SHEET_ENDPOINT URL in
index.html). The script logs every submission to the Google Sheet AND emails
the correct inbox from your own Google account — so there is NO activation
link to click. Each submission also carries an attachment: the resume for
Careers, or a PDF summary ("Mangia Lead") for every other form.

Routing (subject lines in parentheses):
  - Careers:     emails the chosen location inbox below   (Mangia Careers Inquiry, + resume)
  - Shrewsbury:  mangiashrewsbury@gmail.com               (Mangia Lead, + PDF)
  - Toms River:  mangiapizzatr@gmail.com                  (Mangia Lead, + PDF)
  - Jackson:     mangiajackson10@gmail.com                (Mangia Lead, + PDF)

IMPORTANT: whenever you change google-sheet-script.gs, re-publish it from the
Apps Script editor via  Deploy ▸ Manage deployments ▸ (pencil/Edit) ▸
Version: New version ▸ Deploy.  Editing the existing deployment this way keeps
the SAME /exec URL so nothing in index.html needs to change. Saving the script
will also prompt you to re-authorize the new "send email" permission once.

If SHEET_ENDPOINT is ever left blank, the site falls back to FormSubmit.co,
which DOES require a one-time activation click per inbox.

OPTIONAL — LOG SUBMISSIONS INTO A GOOGLE SHEET
----------------------------------------------
Emails still arrive regardless; this adds an organized spreadsheet log on top.
Open google-sheet-script.gs and follow the steps at the top (create a Sheet,
paste the script, deploy as a Web App, then paste its URL into index.html at
SHEET_ENDPOINT). Each form type gets its own tab with columns filled in
automatically. Leave SHEET_ENDPOINT blank to keep this off.

CUSTOM DOMAIN (optional)
------------------------
  Pages project -> Custom domains -> Set up a domain, then point your DNS as
  instructed by Cloudflare.
