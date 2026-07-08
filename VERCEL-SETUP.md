# Vercel Deployment Guide — Artha Mitra

## Prerequisites

- [Vercel account](https://vercel.com) (free tier)
- All environment variables ready (see [frontend/.env.example](frontend/.env.example))

---

## Environment Variables

You must add **all 7 variables** in the Vercel dashboard before deploying.

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

| Variable | Value | Env |
|----------|-------|-----|
| `VITE_SUPABASE_URL` | `https://umltdtjhzkmtebqixpzt.supabase.co` | All |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key (`eyJ...`) | All |
| `SUPABASE_URL` | `https://umltdtjhzkmtebqixpzt.supabase.co` | All |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key (`eyJ...`) | All |
| `GEMINI_API_KEY_1` | Google AI Studio key 1 | All |
| `GEMINI_API_KEY_2` | Google AI Studio key 2 | All |
| `GEMINI_API_KEY_3` | Google AI Studio key 3 | All |

> **Important:** Select all 3 environments (Production, Preview, Development) for each variable.

---

## Deploy Options

### Option A: Vercel CLI

```bash
# Login (one-time)
npx vercel login

# Deploy preview
cd frontend
npx vercel

# Deploy to production
npx vercel --prod
```

### Option B: GitHub Integration (Recommended for auto-deploy)

1. Push code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Click **Import** next to your repo
4. Set **Root Directory** to `frontend`
5. Framework Preset: **Vite** (auto-detected)
6. Add all 7 environment variables
7. Click **Deploy**

Every future `git push` will auto-deploy.

### Option C: Manual Upload

1. Build locally: `cd frontend && npm run build`
2. Go to [vercel.com/new](https://vercel.com/new)
3. Drag-and-drop the `frontend/dist` folder
4. Add environment variables in project settings

---

## Vercel Project Settings

These are auto-detected from `vercel.json`, but verify in dashboard:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `frontend` |
| **Build Command** | `vite build` (auto) |
| **Output Directory** | `dist` (auto) |
| **Node.js Version** | 18.x or 20.x |

---

## API Routes

Vercel automatically serves files in `frontend/api/` as serverless functions:

```
api/chat.js         → POST /api/chat
api/onboard.js      → POST /api/onboard
api/stt.js          → POST /api/stt
api/reset.js        → POST /api/reset
api/credits.js      → GET  /api/credits
api/health.js       → GET  /api/health
api/schemes/all.js  → GET  /api/schemes/all
api/schemes/recommend.js → POST /api/schemes/recommend
```

Files inside `api/_lib/` are **NOT** exposed as endpoints (underscore prefix convention).

The `vercel.json` handles:
- SPA fallback (all non-API routes → `index.html`)
- API passthrough (no rewrites needed for `/api/*`)

---

## vercel.json Reference

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

---

## Local Development with API Routes

```bash
cd frontend

# Option 1: Frontend only (no API routes)
npm run dev

# Option 2: Frontend + API routes (recommended)
npx vercel dev
```

`vercel dev` runs the Vite dev server AND the serverless functions locally.

---

## Post-Deploy Verification

### 1. Health Check
```bash
curl https://your-app.vercel.app/api/health
```
Expected: `{"status":"ok","database":"up",...}`

### 2. Onboard a Test User
```bash
curl -X POST https://your-app.vercel.app/api/onboard \
  -H "Content-Type: application/json" \
  -d '{"account_id":"JD-1001","language":"hi"}'
```

### 3. Send a Chat Message
```bash
curl -X POST https://your-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"account_id":"JD-1001","message":"mera balance kya hai"}'
```

### 4. Open in Browser
Navigate to your Vercel URL → onboard with `JD-1001` → start chatting.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| API routes return 404 | Ensure `api/` folder is at `frontend/api/`, same level as `package.json` |
| `Missing SUPABASE_URL` | Add env vars in Vercel dashboard → **redeploy** after adding |
| `No Gemini API keys` | Add `GEMINI_API_KEY_1/2/3` env vars |
| Functions timeout | Vercel free tier = 10s max. Gemini calls usually take 2-4s |
| CORS errors | All endpoints already have CORS headers — check browser console |
| Build fails | Run `npm run build` locally to debug first |
| Changes not reflecting | Vercel caches — trigger redeploy or clear cache in dashboard |

## Custom Domain (Optional)

1. Go to **Project → Settings → Domains**
2. Add your domain (e.g., `artha.yourdomain.com`)
3. Update DNS records as shown by Vercel
4. SSL is automatic
