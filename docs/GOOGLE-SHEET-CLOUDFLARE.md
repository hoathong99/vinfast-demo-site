# Google Sheet + Cloudflare Worker setup

This guide configures the demo site so test-drive leads are written directly into a Google Sheet via a Cloudflare Worker and a Google service account.

No Apps Script deployment is required for this path. `apps-script/` remains available as an older alternative.

> CMS data (products, sale programs, articles, media) uses Cloudflare D1 + R2 instead of
> Sheets. See [`D1-R2-BACKEND.md`](./D1-R2-BACKEND.md). This guide stays focused on the
> lead/event pipeline.

---

## 1. How it works

```text
Browser form
   ↓  POST JSON
Cloudflare Worker (backend/worker.js)
   ↓  service-account JWT + Google Sheets API
Google Sheet (Leads tab)
```

- The browser never sees the service account key.
- The Sheet can stay private.
- The Worker creates the `Leads` / `Events` tabs and header rows if they are missing.
- The service account only needs **Editor** access to that one Sheet.

---

## 2. Naming conventions used in this guide

| Thing | Suggested name |
|---|---|
| Google Cloud project | `vinfast-demo-sheet` |
| Service account | `vinfast-sheet-writer` |
| Google Sheet | `VinFast Demo — Leads` |
| Cloudflare Worker | `vinfast-lead-api` |
| Leads tab | `Leads` |
| Events tab | `Events` |

You can use different names, but keep the Worker variables and tab names consistent.

---

## 3. Before you start

You need:

- A Google account
- A Google Cloud project
- A Cloudflare account (free plan is enough)
- This repository checked out locally
- Node.js installed

---

## 4. Google Cloud setup

### 4.1 Open the project

1. Go to <https://console.cloud.google.com/>.
2. Select your project, e.g. `vinfast-demo-sheet`.

### 4.2 Enable the Google Sheets API

1. Open **APIs & Services → Library**.
2. Search for **Google Sheets API**.
3. Open it and click **Enable**.

You do **not** need the Google Drive API for this Worker.

### 4.3 Create a service account

1. Open **IAM & Admin → Service Accounts**.
2. Click **Create service account**.
3. Name: `vinfast-sheet-writer`.
4. Description: `Writes VinFast demo leads to a Google Sheet`.
5. Click **Create and continue**.
6. Skip the project role step.
7. Skip the user access step.
8. Click **Done**.

### 4.4 Create and download a JSON key

1. Click the new service account.
2. Open the **Keys** tab.
3. Click **Add key → Create new key**.
4. Choose **JSON**.
5. Click **Create**.
6. Save the downloaded file as:

```text
env/service-account.json
```

> The file is a secret. Do not commit it, paste it into chat, or put it in the browser. `env/` is gitignored.

### 4.5 Copy the service account email

Open the JSON file and find:

```json
"client_email": "vinfast-sheet-writer@your-project-id.iam.gserviceaccount.com"
```

Copy that email. It looks like a normal email address but is a robot account.

### 4.6 Create the Sheet

1. Open <https://sheets.new>.
2. Rename it to `VinFast Demo — Leads`.
3. You do **not** need to create headers manually. The Worker creates `Leads` and `Events` on first write.

### 4.7 Share the Sheet with the service account

1. In the Sheet, click **Share**.
2. Paste the `client_email` from step 4.5.
3. Choose **Editor**.
4. Click **Send** / **Share**.

The Sheet can stay private. Do not choose “Anyone with the link”.

### 4.8 Copy the Sheet ID

From the Sheet URL:

```text
https://docs.google.com/spreadsheets/d/SHEET_ID/edit
```

Copy `SHEET_ID` and save it as:

```text
env/SHEET_ID
```

The file should contain only the ID, with no quotes and no extra text.

---

## 5. The `env/` folder

### 5.1 Files

```text
env/
  .env                              # real Astro public config (ignored)
  .env.example                      # tracked sample
  SHEET_ID                          # real Sheet ID (ignored)
  SHEET_ID.example                  # tracked sample
  service-account.json              # real service-account key (ignored)
  service-account.example.json      # tracked sample
  README.md                         # folder notes (tracked)
```

### 5.2 What each file is for

| File | Read by | Purpose |
|---|---|---|
| `env/.env` | Astro/Vite | `PUBLIC_*` endpoints used by the site |
| `env/SHEET_ID` | You | Copy this into the Cloudflare Worker secret `SHEET_ID` |
| `env/service-account.json` | You | Base64-encode this into the Worker secret |
| `env/*.example` | Git | Safe samples for the demo push |

Astro is configured with:

```js
vite: {
  envDir: "./env",
}
```

So it reads `env/.env`, not a project-root `.env`.

### 5.3 `.gitignore`

The repository already contains:

```gitignore
# Private demo environment (keep only safe samples)
env/*
!env/README.md
!env/.env.example
!env/SHEET_ID.example
!env/service-account.example.json
```

This means:

- `env/.env`, `env/SHEET_ID`, `env/service-account.json` are **not** committed.
- The example files are committed for the demo.

### 5.4 Ignore the whole folder after the demo

If you later want to stop pushing even the examples:

```bash
git rm -r --cached env
```

Then replace the block in `.gitignore` with:

```gitignore
env/
```

The local files stay on disk; only Git tracking is removed.

---

## 6. Cloudflare Worker setup

### 6.1 Create the Worker

1. Open <https://dash.cloudflare.com/>.
2. Go to **Workers & Pages**.
3. Click **Create application → Create Worker**.
4. Name: `vinfast-lead-api`.
5. Click **Deploy** to create the default Worker.
6. Click **Edit code**.

### 6.2 Paste the Worker code

1. Open `backend/worker.js` in this repository.
2. Replace everything in the Cloudflare editor with that file.
3. Click **Deploy**.

### 6.3 Add variables and secrets

Open:

**Worker → Settings → Variables and Secrets**

Add these:

| Name | Type | Value |
|---|---|---|
| `SHEET_ID` | Secret | Contents of `env/SHEET_ID` |
| `GOOGLE_SERVICE_ACCOUNT_JSON_B64` | Secret | Base64 of `env/service-account.json` |
| `ALLOWED_ORIGINS` | Secret or Text | Comma-separated origins |
| `IP_HASH_SALT` | Secret | Random long string |

Optional:

| Name | Default | Purpose |
|---|---|---|
| `LEADS_TAB` | `Leads` | Tab name for leads |
| `EVENTS_TAB` | `Events` | Tab name for events |
| `ENABLE_EVENTS` | `true` | Set `false` to ignore events |
| `TIMEZONE` | `Asia/Ho_Chi_Minh` | Date validation / LeadID date |
| `DEFAULT_SHOWROOM` | `VinFast Demo` | Fallback showroom value |

### 6.4 Encode the service account JSON

The Worker expects base64 so the multi-line private key does not break the Cloudflare editor.

**Any OS (Node.js):**

```bash
node -e "console.log(require('fs').readFileSync('env/service-account.json').toString('base64'))"
```

**Windows PowerShell:**

```powershell
[Convert]::ToBase64String(
  [Text.Encoding]::UTF8.GetBytes((Get-Content -Raw .\env\service-account.json))
)
```

**macOS / Linux:**

```bash
base64 env/service-account.json | tr -d '\n'
```

Copy the whole output as one line and paste it into `GOOGLE_SERVICE_ACCOUNT_JSON_B64`.

If Cloudflare rejects the value because it is too large, use the fallback secrets instead:

| Name | Value |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` from the JSON |
| `GOOGLE_PRIVATE_KEY` | `private_key` from the JSON |

The Worker supports both approaches.

### 6.5 Set `ALLOWED_ORIGINS`

Use the site origin, not the repository path.

Examples:

```text
http://localhost:4321,http://127.0.0.1:4321,https://yourname.github.io
```

- For GitHub Pages project sites, the origin is `https://yourname.github.io` (no `/repo-name`).
- For a custom domain, use `https://demo.example.com`.
- Do not include a path, query, or trailing slash.
- Multiple origins are separated by commas.
- `*` allows every origin, but do not use it for a real demo.

The `/cau-hinh/` page can generate this string for you.

### 6.6 Generate `IP_HASH_SALT`

Any long random string is fine:

```bash
openssl rand -hex 32
```

On Windows PowerShell:

```powershell
-join ((48..57) + (97..102) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

This is used only to hash `CF-Connecting-IP` before writing `IPHash`.

### 6.7 Copy the Worker URL

After deploy, Cloudflare shows:

```text
https://vinfast-lead-api.your-subdomain.workers.dev
```

Use the `/lead` route:

```text
https://vinfast-lead-api.your-subdomain.workers.dev/lead
```

---

## 7. Connect the site

### 7.1 Recommended: `/cau-hinh/`

1. Open `http://localhost:4321/cau-hinh/`.
2. In **Thông tin triển khai Cloudflare Worker**:
   - Worker name: `vinfast-lead-api`
   - workers.dev subdomain: your Cloudflare subdomain
   - Production origin: `https://yourname.github.io` or your custom domain
3. Click **Lưu thông tin Worker**.
4. Click **Copy ALLOWED_ORIGINS** and paste it into the Worker’s `ALLOWED_ORIGINS` variable on Cloudflare.
5. Click **Dùng URL gợi ý** to fill the endpoint.
6. Select **Cloudflare Worker / API proxy**.
7. Click **Lưu cấu hình**.
8. Click **Kiểm tra kết nối**.
9. Click **Gửi lead thử**.
10. Open the Sheet and check the `Leads` tab.

The Worker name and production origin on this page are **local notes**. They do not create or modify the Worker. You must still paste `ALLOWED_ORIGINS` into Cloudflare yourself.

### 7.2 Local `.env`

Edit `env/.env`:

```env
PUBLIC_API_ENDPOINT=https://vinfast-lead-api.your-subdomain.workers.dev/lead
PUBLIC_EVENT_ENDPOINT=https://vinfast-lead-api.your-subdomain.workers.dev/event
PUBLIC_WORKER_NAME=vinfast-lead-api
PUBLIC_WORKERS_SUBDOMAIN=your-subdomain
PUBLIC_PRODUCTION_ORIGIN=https://yourname.github.io
PUBLIC_SHEET_ENDPOINT=
```

Restart:

```bash
npm run dev
```

If `PUBLIC_EVENT_ENDPOINT` is empty, events fall back to `PUBLIC_API_ENDPOINT`.

### 7.3 GitHub Pages

Add repository variables under:

**Settings → Secrets and variables → Actions → Variables**

| Variable | Example |
|---|---|
| `PUBLIC_API_ENDPOINT` | `https://vinfast-lead-api.your-subdomain.workers.dev/lead` |
| `PUBLIC_EVENT_ENDPOINT` | `https://vinfast-lead-api.your-subdomain.workers.dev/event` |
| `PUBLIC_WORKER_NAME` | `vinfast-lead-api` |
| `PUBLIC_WORKERS_SUBDOMAIN` | `your-subdomain` |
| `PUBLIC_PRODUCTION_ORIGIN` | `https://yourname.github.io` |

Then redeploy the site.

### 7.4 Cloudflare Pages / Workers static hosting

Build settings:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | `22` |

Environment variables:

```text
SITE_URL=https://vinfast-demo-site.hoathong99.workers.dev
BASE_PATH=/
PUBLIC_API_ENDPOINT=https://tiny-night-de11.hoathong99.workers.dev/lead
PUBLIC_EVENT_ENDPOINT=https://tiny-night-de11.hoathong99.workers.dev/event
PUBLIC_WORKER_NAME=vinfast-lead-api
PUBLIC_WORKERS_SUBDOMAIN=hoathong99
PUBLIC_PRODUCTION_ORIGIN=https://vinfast-demo-site.hoathong99.workers.dev
PUBLIC_SHEET_ENDPOINT=
```

Replace the hostnames with your actual Pages/Workers site. `BASE_PATH=/` is important: Astro uses it for asset URLs and canonical links.

Then add the same site origin to the Worker:

```text
ALLOWED_ORIGINS=https://vinfast-demo-site.hoathong99.workers.dev,http://localhost:4321,http://127.0.0.1:4321
```

Cloudflare Pages/Workers serve `public/_headers` as an HTTP CSP. Keep it in sync with the meta tag in `BaseLayout.astro`; otherwise the stricter policy can block the Worker `fetch`.

---

## 8. Test it

### 8.1 Health check

```bash
curl https://vinfast-lead-api.your-subdomain.workers.dev/lead
```

Expected:

```json
{
  "ok": true,
  "service": "vinfast-sheet-api",
  "configured": true
}
```

`configured: true` only means the required Worker variables exist. It does not prove Sheet access. Use the test lead for that.

You can also run the offline Worker tests locally:

```bash
npm run qa:worker
```

### 8.2 Test lead with curl

Bash:

```bash
curl -X POST "https://vinfast-lead-api.your-subdomain.workers.dev/lead" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "lead",
    "formType": "test_drive",
    "fullName": "Curl Demo",
    "phone": "0900000000",
    "vehicleSlug": "vinfast-vf-3",
    "preferredDate": "2030-01-01",
    "preferredTime": "09:00",
    "showroom": "VinFast Demo",
    "consent": true,
    "consentVersion": "curl-test",
    "pagePath": "/dang-ky-lai-thu/",
    "elapsedMs": 5000
  }'
```

PowerShell:

```powershell
$body = @{
  type = "lead"
  formType = "test_drive"
  fullName = "Curl Demo"
  phone = "0900000000"
  vehicleSlug = "vinfast-vf-3"
  preferredDate = "2030-01-01"
  preferredTime = "09:00"
  showroom = "VinFast Demo"
  consent = $true
  consentVersion = "curl-test"
  pagePath = "/dang-ky-lai-thu/"
  elapsedMs = 5000
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://vinfast-lead-api.your-subdomain.workers.dev/lead" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Expected:

```json
{ "ok": true, "leadId": "LD-20261123-ABC123" }
```

If the same phone + form type was submitted in the last 10 minutes, the response is:

```json
{ "ok": true, "duplicate": true, "leadId": "LD-..." }
```

Use a different phone number for repeated tests.

### 8.3 Config page test

1. Open `/cau-hinh/`.
2. Save the endpoint with transport **Cloudflare Worker / API proxy**.
3. **Kiểm tra kết nối** should return a health response.
4. **Gửi lead thử** should create a row in `Leads`.
5. The lead log on the page should show the send.

If the connection check fails with a CORS/network error, check `ALLOWED_ORIGINS` first.

### 8.4 Real form

1. Open `/dang-ky-lai-thu/`.
2. Submit a test registration.
3. Confirm the row in `Leads`.
4. Confirm the browser shows the real `leadId` response.

---

## 9. Sheet schema

The Worker writes the same `Leads` schema as `apps-script/Code.gs`:

```text
LeadID, CreatedAt, FormType, FullName, Phone, Email, Vehicle, VehicleSlug,
Showroom, PreferredDate, PreferredTime, ServiceType, Message, Consent,
ConsentVersion, PagePath, Referrer, UTMSource, UTMMedium, UTMCampaign,
UTMContent, UTMTerm, ClickID, Device, Browser, SessionID, IPHash, Status,
Owner, Note, FollowUpAt, UpdatedAt
```

`CreatedAt` and `UpdatedAt` are written as ISO 8601 strings. You can format those columns in Google Sheets as date/time.

The `Events` tab uses:

```text
EventID, Timestamp, EventName, SessionID, PagePath, PageTitle,
VehicleSlug, Label, MetadataJSON, Referrer, UTMSource, UTMMedium,
UTMCampaign, Device, Browser
```

---

## 10. Where to look for everything

| What | Where |
|---|---|
| Google Cloud project | <https://console.cloud.google.com/> |
| Enable Sheets API | APIs & Services → Library → Google Sheets API |
| Service accounts | IAM & Admin → Service Accounts |
| Service account key | Service account → Keys → Add key → JSON |
| Sheet sharing | Sheet → Share → paste `client_email` |
| Sheet ID | Sheet URL between `/d/` and `/edit` |
| Cloudflare Workers | <https://dash.cloudflare.com/> → Workers & Pages |
| Worker code | `backend/worker.js` |
| Worker secrets | Worker → Settings → Variables and Secrets |
| Site env | `env/.env` |
| Real Sheet ID | `env/SHEET_ID` |
| Real service account | `env/service-account.json` |
| Config page | `/cau-hinh/` |
| Test-drive form | `/dang-ky-lai-thu/` |
| Full guide | `docs/GOOGLE-SHEET-CLOUDFLARE.md` |

---

## 11. Troubleshooting

### `SHEET_PERMISSION_DENIED`

The service account cannot edit the Sheet.

- Share the Sheet with the exact `client_email`.
- Choose **Editor**, not Viewer.
- If the Sheet is in a Shared Drive, grant the service account access to that drive as well.

### `Google token 400: invalid_grant`

- The service account JSON is corrupted.
- The private key does not match the `client_email`.
- Time clock is wrong.
- Regenerate the JSON key and re-encode it.

### `Google token 400: invalid_scope`

Make sure `Google Sheets API` is enabled in the same Google Cloud project as the service account.

### `configured: false`

At least one required Worker variable is missing:

- `SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_JSON_B64` (or the email/key fallback)

### CORS / network error

- `ALLOWED_ORIGINS` must contain the exact browser origin.
- Local: `http://localhost:4321` and `http://127.0.0.1:4321`.
- GitHub Pages: `https://yourname.github.io`, not `https://yourname.github.io/repo`.
- Cloudflare Pages: `https://your-project.pages.dev`, not the URL with `/cau-hinh/`.
- No trailing slash, no path, no query.
- Preview deployments have their own origins; add the preview origin or test the production domain.
- Update the variable in Cloudflare and deploy/save.
- Reload the page and try again.

### `Failed to fetch` / CSP `connect-src` error on the deployed site

`public/_headers` is copied to `dist/_headers` and served by Cloudflare as a real HTTP header. Astro dev does not use it, so the problem only appears after deployment.

Both the CSP meta tag in `BaseLayout.astro` and the HTTP header in `public/_headers` are enforced. The stricter policy wins. Make sure both allow the Worker:

```text
script-src 'self' https://script.google.com https://script.googleusercontent.com;
connect-src 'self' https: http://localhost:* http://127.0.0.1:*;
```

Then redeploy and purge the Cloudflare cache. Verify:

```bash
curl -I https://your-site.example/cau-hinh/ | grep -i content-security-policy
```

Opening the Worker URL directly in a browser is not a CORS/CSP test; only the `fetch` from the deployed page is.

### `Unable to parse range` / missing tab

The Worker creates `Leads` and `Events` automatically. If it still fails:

- The service account is not an Editor.
- `LEADS_TAB` / `EVENTS_TAB` names do not match the Sheet.
- The Sheet ID is wrong.

### No row, but the UI says success

Direct Apps Script mode is optimistic, but the Worker returns real errors. If the Worker UI says success but there is no row:

- Open **Cloudflare → Worker → Logs** and start a log stream.
- Check the Worker response in DevTools → Network.
- Check the `Leads` tab.
- Check the `Errors` tab only if you are using Apps Script; the Worker does not create an `Errors` tab.

### Duplicate lead

The Worker dedupes phone + form type within 10 minutes. Use a different phone number for repeated tests.

### Invalid date

`preferredDate` must be `YYYY-MM-DD` and today or later in `Asia/Ho_Chi_Minh`.

### Events not appearing

- Set `ENABLE_EVENTS=true`.
- Set `PUBLIC_EVENT_ENDPOINT` or leave it empty so it falls back to `PUBLIC_API_ENDPOINT`.
- Check that the event name is in the allowlist in `backend/worker.js`.
- Check the `Events` tab.

### Cloudflare secret too large

Use the fallback secrets:

```text
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY
```

The Worker supports both.

### Base64 decode error

Re-encode the JSON, remove line breaks, and paste only the base64 string. Do not include `data:` or quotes.

---

## 12. Security

- `env/` is gitignored. Never commit `service-account.json` or `env/.env`.
- The service account key is a secret. Rotate it if exposed.
- The Sheet stays private; share it only with the service account.
- The Worker URL is public. CORS restricts browser origins, not `curl`.
- The Worker has a basic in-memory rate limit. For a public site, add Cloudflare WAF rate limiting rules.
- Do not put secrets in `PUBLIC_*` variables. They are embedded in the client bundle.
- Do not put the service account JSON in the browser, endpoint URL, or `/cau-hinh/` fields.
- Use a dedicated Google account for the demo if possible.
- Back up the Sheet before deleting data.

---

## 13. Maintenance

### Update the Worker

1. Edit `backend/worker.js`.
2. Paste the new code into Cloudflare.
3. Deploy.
4. Re-test `/cau-hinh/` and the real form.

### Rotate the service account key

1. Create a new JSON key in Google Cloud.
2. Update `env/service-account.json`.
3. Re-encode and update `GOOGLE_SERVICE_ACCOUNT_JSON_B64` in Cloudflare.
4. Delete the old key in Google Cloud.
5. Re-test.

### After the demo

```bash
git rm -r --cached env
```

Then change `.gitignore` to:

```gitignore
env/
```

If the service account JSON was ever committed by mistake, remove it from Git history and rotate the key immediately.

---

## Appendix A — Worker variable checklist

```text
SHEET_ID
GOOGLE_SERVICE_ACCOUNT_JSON_B64
ALLOWED_ORIGINS
IP_HASH_SALT
LEADS_TAB=Leads
EVENTS_TAB=Events
ENABLE_EVENTS=true
TIMEZONE=Asia/Ho_Chi_Minh
DEFAULT_SHOWROOM=VinFast Demo
```

Fallback credentials:

```text
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY
```

---

## Appendix B — Sample files

### `env/.env.example`

```env
PUBLIC_API_ENDPOINT=
PUBLIC_EVENT_ENDPOINT=
PUBLIC_WORKER_NAME=vinfast-lead-api
PUBLIC_WORKERS_SUBDOMAIN=
PUBLIC_PRODUCTION_ORIGIN=https://yourname.github.io
PUBLIC_SHEET_ENDPOINT=
```

### `env/SHEET_ID.example`

```text
PASTE_THE_SHEET_ID_FROM_THE_GOOGLE_SHEET_URL_HERE
```

### `env/service-account.example.json`

See `env/service-account.example.json` in the repository. It contains placeholder values only.

---

## Appendix C — `.gitignore`

```gitignore
# Private demo environment (keep only safe samples)
env/*
!env/README.md
!env/.env.example
!env/SHEET_ID.example
!env/service-account.example.json
```
