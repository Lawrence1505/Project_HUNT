# Deploying HEAL beyond localhost

Three ways to run HEAL where other people can reach it, cheapest first.

## Option 1 — Same network (LAN), zero setup

Run the app bound to all interfaces so phones/laptops on your Wi‑Fi can open it:

```bash
# API (already binds 0.0.0.0)
cd server && npm start

# Web, exposed to the LAN
npm run dev -- --host
```

Vite prints a `Network:` URL like `http://192.168.1.20:5173/`. Open that on any
device on the same network. Good for demos; not public internet.

## Option 2 — Render.com (free, public URL)

The repo ships a [`render.yaml`](../render.yaml) blueprint that provisions all
three pieces (Postgres + API + static web) on Render's free tier.

1. Push this repo to GitHub (see below).
2. Render dashboard → **New → Blueprint** → pick the repo. It reads `render.yaml`.
3. Click **Apply**. Render creates `heal-db`, `heal-api`, and `heal-web`,
   generates `JWT_SECRET`/`OTP_PEPPER`, and wires `DATABASE_URL` automatically.
4. On **heal-api → Environment**, set `SMTP_USER`, `SMTP_PASS` (Gmail App
   Password), and `MAIL_FROM` to turn on real OTP emails.
5. If `heal-api`'s URL isn't `https://heal-api.onrender.com`, update the rewrite
   `destination` in `render.yaml` (or the web service's rewrite rule) to match.

Notes: Render's free web services **sleep after ~15 min idle** (first request
after that is slow), and the free Postgres is deleted after 90 days — fine for a
portfolio/demo, upgrade for anything real.

## Option 3 — Any Docker host (VPS, Fly.io, self-host)

The repo ships Dockerfiles and a full-stack compose file.

```bash
# From the repo root, with JWT_SECRET / OTP_PEPPER (and SMTP_* for email) exported
# or placed in a .env next to the compose file:
export JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
export OTP_PEPPER=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
docker compose -f docker-compose.full.yml up -d --build
```

Open `http://<host>:8080`. The `web` container (nginx) serves the built SPA and
proxies `/api` to the `api` container; `api` talks to the `db` container.

For real email, also set `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`. For real phone
OTP, set `SMS_PROVIDER=firebase`, `FIREBASE_PROJECT_ID`, and the `VITE_FIREBASE_*`
build args (see [AUTH.md](AUTH.md)).

## Production checklist (all options)

- `NODE_ENV=production` and `DEV_ECHO_OTP=false` (both already set in the compose
  and Render configs) — OTPs are never echoed in responses.
- Strong, unique `JWT_SECRET` and `OTP_PEPPER` (generated automatically above).
- `TRUST_PROXY=1` when behind nginx/Render so rate limiting sees real client IPs.
- Put the API behind HTTPS (Render does this for you; for Docker, terminate TLS
  at a reverse proxy such as Caddy or Cloudflare).
- Restrict CORS to your web origin once the frontend URL is known.
- Back up Postgres (`pg_dump`) on a schedule.

## Pushing this repo to GitHub

```bash
git init
git add .
git commit -m "HEAL: full app + OTP auth + deploy configs"
git branch -M main
git remote add origin https://github.com/Lawrence1505/Project_HUNT.git
git push -u origin main        # use a GitHub Personal Access Token as the password
```

`node_modules`, `dist`, and every `.env` are gitignored — secrets never leave
your machine.
