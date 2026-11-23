# Cloudflare Worker backend

Single-file Worker that receives site form submissions and writes them to Google Sheets using a Google service account.

## Files

- `worker.js` — the entire Worker. Paste it into the Cloudflare dashboard.
- `../docs/GOOGLE-SHEET-CLOUDFLARE.md` — full setup guide.

## Routes

| Route | Method | Purpose |
|---|---|---|
| `/` or `/health` or `/lead` | GET | Health check |
| `/lead` | POST | Create a lead |
| `/event` | POST | Append an analytics event |
| any | OPTIONS | CORS preflight |

## Required variables

Set these in **Cloudflare Dashboard → Worker → Settings → Variables and Secrets**:

| Name | Type | Value |
|---|---|---|
| `SHEET_ID` | Secret | Google Sheet ID |
| `GOOGLE_SERVICE_ACCOUNT_JSON_B64` | Secret | base64 of the service account JSON |
| `ALLOWED_ORIGINS` | Secret/Text | `http://localhost:4321,http://127.0.0.1:4321,https://yourname.github.io` |
| `IP_HASH_SALT` | Secret | random long string |

Optional:

| Name | Default |
|---|---|
| `LEADS_TAB` | `Leads` |
| `EVENTS_TAB` | `Events` |
| `ENABLE_EVENTS` | `true` |
| `TIMEZONE` | `Asia/Ho_Chi_Minh` |
| `DEFAULT_SHOWROOM` | `VinFast Demo` |

If the base64 secret is rejected for size, use `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` instead.

## Local syntax check

```bash
node --check backend/worker.js
npm run qa:worker
```

`qa:worker` mocks Google OAuth and Sheets API, so it does not need real credentials.

## Test after deploy

```bash
curl https://vinfast-lead-api.your-subdomain.workers.dev/lead
```

Expected:

```json
{ "ok": true, "service": "vinfast-sheet-api", "configured": true }
```

Then use `/cau-hinh/` on the site or follow the test commands in the full guide.
