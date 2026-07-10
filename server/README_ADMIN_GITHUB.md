# Admin Cars (Secure GitHub Commit)

This backend is required because the website is static.

## What it does
- Exposes `POST /admin/commit-data-json`
- Authenticates using your **GitHub App** (server-side)
- Updates `data.json` in `vizitiumarius94/HW-Finder` (configurable)

## Prerequisites (GitHub App)
Your GitHub App must have:
- Permission to read/write repository contents
- Installation access to the target repo

## Configure secrets
Create `server/.env` (copy from `server/.env.example`) with:
- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY` (full PEM; keep line breaks as `\n` in .env)
- `GITHUB_INSTALLATION_ID`
- `GITHUB_REPO=owner/repo`

DO NOT commit `.env`.

## Run locally
From repo root:

```bat
cd server
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
set PORT=8000
# ensure server/.env is loaded for your shell
python -m uvicorn app:app --reload --port %PORT%
```

Then hit the endpoint:

```js
fetch('http://localhost:8000/admin/commit-data-json', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data_json: {/* full updated data.json object */} })
})
```

## Admin page integration
`admin-cars.html` calls:
- `POST {serverBaseUrl}/admin/commit-data-json`

By default it uses:
- `http://localhost:8000`

You can override via query string:
- `admin-cars.html?server=http://localhost:8000`


