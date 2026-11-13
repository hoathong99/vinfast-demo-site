# Google Sheet backend — setup guide

This folder contains the Apps Script backend for the demo site. The static site stays on GitHub Pages; the Sheet is only the database and notification trigger.

## 1. Create the Sheet

1. Create a new Google Sheet, e.g. `VinFast Demo — Leads`.
2. Open **Extensions → Apps Script**.
3. Replace `Code.gs` with the content of `Code.gs` in this folder.
4. Save the project as `VinFast Demo Backend`.

## 2. Initialize tabs

1. In the Apps Script editor, select `setup` and click **Run**.
2. Approve the permissions (Sheets, Drive, Mail, external requests if you use Telegram).
3. The script creates/repairs:
   - `Leads` — form submissions
   - `Events` — key behavior events
   - `Errors` — backend errors
   - `Config` — showroom name/address

You can also run **VinFast Demo → Setup sheet** from the Sheet menu.

## 3. Configure notifications (optional)

Open **Project Settings → Script Properties** and add:

| Property | Example | Purpose |
|---|---|---|
| `NOTIFY_EMAIL` | `sales@example.com` | Email notification for each lead |
| `TELEGRAM_BOT_TOKEN` | `123:ABC...` | Telegram bot token |
| `TELEGRAM_CHAT_ID` | `-100123...` | Telegram group/chat ID |
| `SHARED_SECRET` | long random string | Require a secret from a trusted proxy |
| `SPREADSHEET_ID` | Sheet ID | Only needed for a standalone script |

If you set `SHARED_SECRET`, every request must include a matching `secret` field. Never put this secret in browser code — use a Cloudflare Worker/Pages Function proxy.

## 4. Deploy as a Web App

1. **Deploy → New deployment**.
2. Select type **Web app**.
3. Description: `VinFast demo form endpoint`.
4. **Execute as:** `Me`.
5. **Who has access:** `Anyone`.
6. Click **Deploy** and copy the URL ending in `/exec`.

This is your `PUBLIC_SHEET_ENDPOINT`.

Health check: open the `/exec` URL in a browser. You should see:

```json
{"ok":true,"service":"vinfast-caron-demo-sheet","time":"..."}
```

## 5. Connect the static site

### Option A — direct Apps Script (demo, simplest)

Add a GitHub Actions repository variable:

```
PUBLIC_SHEET_ENDPOINT = https://script.google.com/macros/s/.../exec
```

The site sends `text/plain` JSON with `mode: "no-cors"`. Apps Script receives it and writes to the Sheet. Because the response is opaque, the UI shows an optimistic success message.

### Option B — Cloudflare Worker/Pages Function (recommended for production)

Add:

```
PUBLIC_API_ENDPOINT = https://your-domain.com/api/lead
PUBLIC_EVENT_ENDPOINT = https://your-domain.com/api/event
```

The Function should:

1. Validate the payload and origin.
2. Enforce rate limits and honeypot rules.
3. Optionally verify Cloudflare Turnstile.
4. Sign the payload with HMAC and forward it to Apps Script.
5. Return a real `200`/`4xx` response to the browser.

This is the only way to get reliable error handling, rate limiting, and IP hashing.

## 6. Test

1. Run `sendTestLead` in Apps Script.
2. Check the `Leads` tab for a row with `LD-...`.
3. Check your email/Telegram for the notification.
4. Submit the site form in demo mode (no endpoint) and confirm the browser message.
5. Submit with the endpoint configured and confirm a new row.

## 7. Sheet tabs and columns

### Leads

`LeadID, CreatedAt, FormType, FullName, Phone, Email, Vehicle, VehicleSlug, Showroom, PreferredDate, PreferredTime, ServiceType, Message, Consent, ConsentVersion, PagePath, Referrer, UTMSource, UTMMedium, UTMCampaign, UTMContent, UTMTerm, ClickID, Device, Browser, SessionID, IPHash, Status, Owner, Note, FollowUpAt, UpdatedAt`

- `Status` has a dropdown: New, Contacted, Qualified, Won, Lost.
- `CreatedAt` and `UpdatedAt` use `yyyy-mm-dd hh:mm:ss`.
- Duplicate phone + form type within 10 minutes returns the existing `LeadID` instead of appending.
- `IPHash` is intentionally blank in direct Apps Script mode; fill it in the Worker proxy.

### Events

`EventID, Timestamp, EventName, SessionID, PagePath, PageTitle, VehicleSlug, Label, MetadataJSON, Referrer, UTMSource, UTMMedium, UTMCampaign, Device, Browser`

Tracked events: `page_view`, `vehicle_view`, `cta_click`, `zalo_open`, `form_start`, `form_submit`, `form_error`, `calculator_use`, `filter_use`, `map_load`.

Events are for a demo/light funnel view. For real analytics at scale, use GA4 or Cloudflare Web Analytics and keep only conversion events in the Sheet.

## 8. Maintenance

- **Backup:** run **VinFast Demo → Backup now**, or add a weekly time-driven trigger for `backupNow`.
- **Cleanup:** run `cleanupEvents` on a daily trigger. It deletes event rows older than 90 days.
- **Retention:** archive/delete leads according to your privacy policy (default 24 months).
- **Access:** keep the Sheet private. Share only with named staff. Use 2FA on the Google account.
- **Quotas:** Apps Script free tier is enough for a small dealership. If you expect high traffic, move event logging to Cloudflare/GA4.

## 9. Security notes

- Apps Script cannot set custom HTTP status codes or CORS headers reliably. Direct browser posts are fire-and-forget.
- A public `/exec` URL can be abused. Add a Worker proxy with rate limiting and Turnstile for production.
- The honeypot and `elapsedMs` checks are basic spam filters, not a substitute for server-side rate limiting.
- Do not store ID numbers, financial data, or other sensitive data in this demo Sheet.
- The privacy policy page in the site is a template and needs legal review before real use.
