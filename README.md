# CÆCHET Daily Standup

Standalone web app that reads the daily standup from your Notion workspace and displays it at a permanent URL. Make generates the standup at 9am ET, this app reads and displays it.

## How it works

1. Make runs at 9am → Claude writes `STANDUP YYYY-MM-DD` page to your Notion hub
2. This app fetches that page from Notion and renders it
3. Auto-refreshes every 10 minutes
4. Shows the most recent available standup if today's hasn't run yet

---

## Deploy to Vercel (10 minutes)

### Step 1 — Push to GitHub

1. Create a new repo on github.com — name it `caechet-standup`
2. Upload all these files to the repo (drag and drop works)

### Step 2 — Deploy on Vercel

1. Go to vercel.com and sign in with GitHub
2. Click **Add New → Project**
3. Select your `caechet-standup` repo
4. Click **Deploy** — Vercel auto-detects Next.js

### Step 3 — Add your Notion token

1. In Vercel, go to your project → **Settings → Environment Variables**
2. Add:
   - Name: `NOTION_TOKEN`
   - Value: your Notion integration token (starts with `ntn_` or `secret_`)
3. Click **Save**
4. Go to **Deployments** and click **Redeploy** so it picks up the new variable

### Step 4 — Connect Notion pages

In Notion, open each of these pages → click ··· → Connections → select your integration:
- CÆCHET hub (2d472853-cd8c-805f-8310-d1512a415191)
- All 7 brand pages

### Step 5 — Done

Your standup is live at `https://your-project-name.vercel.app`

Share this URL with your team. Bookmark it. It updates automatically every morning at 9am when Make runs.

---

## Local development

```bash
npm install
cp .env.example .env.local
# Add your NOTION_TOKEN to .env.local
npm run dev
# Open http://localhost:3000
```

---

## No changes needed to Make

Your existing Make scenario already writes the standup to Notion. This app just reads it. Nothing to change in Make.
