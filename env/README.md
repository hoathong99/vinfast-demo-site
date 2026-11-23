# `env/` — private demo configuration

This folder is for **local demo secrets and config**. Real files are gitignored:

| File | Purpose | Committed? |
|---|---|---|
| `env/.env` | Astro/Vite public endpoints | No |
| `env/SHEET_ID` | Google Sheet ID | No |
| `env/service-account.json` | Google service account key | No |
| `env/.env.example` | Safe sample | Yes |
| `env/SHEET_ID.example` | Safe sample | Yes |
| `env/service-account.example.json` | Safe sample | Yes |

Astro is configured with `vite.envDir: "./env"`, so `env/.env` is loaded instead of the project-root `.env`.

## Files to fill

1. `env/service-account.json` — replace with the JSON key downloaded from Google Cloud.
2. `env/SHEET_ID` — paste the Sheet ID from the Google Sheet URL.
3. `env/.env` — paste the deployed Worker URL into `PUBLIC_API_ENDPOINT`.

Full instructions: [`../docs/GOOGLE-SHEET-CLOUDFLARE.md`](../docs/GOOGLE-SHEET-CLOUDFLARE.md).

## Pushing samples for a demo

The `.gitignore` rules ignore `env/*` but keep the example files above. To stop tracking the whole folder later:

```bash
git rm -r --cached env
```

Then replace the `env/*` block in `.gitignore` with:

```gitignore
env/
```
