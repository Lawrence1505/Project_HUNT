# HEAL Auth — Email OTP Verification

How accounts work in HEAL: **email-OTP-verified** sign-up (phone optional and
never OTP-verified — free real SMS no longer exists), sign-in with email *or*
phone, and a full forgot-password flow. Everything runs **free out of the box**
— add a Gmail App Password to send real OTP emails; Firebase Phone Auth remains
an optional (paid-SMS) plug-in.

> Spec: [docs/AUTH-CONTRACT.md](AUTH-CONTRACT.md) is the source of truth this
> document explains.

## 1. Overview

Passwords are bcrypt-hashed, sessions are 7-day JWTs sent as
`Authorization: Bearer <token>`, and `GET /api/auth/me` returns the current
user. Existing users are grandfathered as verified and keep signing in as before.
The OTP is **never returned to the browser** — it is delivered by email (or, with
no SMTP configured, printed to the server console for local dev).

Creating an account requires proving you own the email address, via a 6-digit
one-time password. A phone number may be provided but is optional and stored
as-is (not verified).

```text
SIGN UP  (stepper: Details → Verify Email → Done)

  ┌──────────────┐
  │ Details form │  name · email · phone (optional) · password
  └──────┬───────┘
         │  POST /api/auth/otp/request   {channel:'email', purpose:'signup'}
         ▼
  ┌──────────────┐  6-digit code arrives by email (or server console in dev)
  │ Verify email │  POST /api/auth/otp/verify  → emailProof (JWT, 30 min)
  └──────┬───────┘
         │  POST /api/auth/signup  { …details, emailProof }
         ▼
  ┌──────────────┐
  │   Account    │  201 { token, user } → signed in, redirected to "/"
  └──────────────┘

SIGN IN     identifier (email or phone) + password → POST /api/auth/signin
            → 200 { token, user }   (403 only if email unverified)

RESET       identifier → OTP → POST /api/auth/otp/verify (purpose:'reset')
            → proofToken → POST /api/auth/reset { proofToken, newPassword }
```

**Proof tokens** are how verification survives without a pending-users table.
Verifying an OTP does not create anything in the database — it returns a
short-lived JWT (`kind:'proof'`, 30 min, signed with the same `JWT_SECRET`)
that encodes the channel (`email`/`phone`), the purpose (`signup`/`reset`), and
the exact identifier that was verified. `/signup` and `/reset` accept these
proofs and re-check every claim server-side, so pre-account verification stays
completely stateless.

## 2. Server layout

```text
server/
├── index.js                  # app wiring: helmet, cors, rate limiters, routes, errors
├── db.js                     # pg pool + migrate() (auto-runs at startup)
├── routes/auth.js            # route handlers (thin)
├── services/otpService.js    # generate / hash / verify / cooldowns / cleanup
├── services/emailService.js  # nodemailer transport + sendOtpEmail (console fallback)
├── services/phoneService.js  # dev sender + Firebase ID-token verification
├── services/userService.js   # user queries (create / find by email or phone)
├── lib/validate.js           # validators + normalizers (email, E.164 phone, password)
├── lib/tokens.js             # session JWT + proof JWT sign/verify
├── lib/audit.js              # audit(event, identifier, ip, meta) → audit_logs
└── templates/otpEmail.js     # HTML email (HEAL branding, dark-compatible)
```

Migrations run automatically at server start: `users` gains
`phone`, `email_verified`, `phone_verified` (existing rows grandfathered to
verified), plus new `user_otps` and `audit_logs` tables.

## 3. Installation & environment

Dependencies are already in each `package.json` (`nodemailer`, `helmet`,
`express-rate-limit` on the server; `firebase` on the frontend) — a normal
`npm install` in each directory covers everything.

```bash
cp server/.env.example server/.env   # backend config
cp .env.example .env                 # frontend config (VITE_* vars)
```

The defaults work with zero external services: emails print to the server
console, phone OTPs are console-delivered, and `DEV_ECHO_OTP=true` echoes codes
in API responses during development.

### Server — `server/.env`

| Variable | Purpose | Example |
|---|---|---|
| `PORT` | API port | `4000` |
| `NODE_ENV` | `development` locally; **`production`** for any real deploy | `development` |
| `DATABASE_URL` | Postgres connection string | `postgresql://heal:healpass@localhost:5433/heal` |
| `TRUST_PROXY` | Set behind a reverse proxy so rate limits key on the real client IP | `1` |
| `JWT_SECRET` | Signs session JWTs **and** proof JWTs | `64+ random hex chars` |
| `SMTP_HOST` | SMTP server for OTP emails | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `465` |
| `SMTP_SECURE` | Implicit TLS (`true` for port 465) | `true` |
| `SMTP_USER` | SMTP login (your Gmail address). **Empty → console transport** | `you@gmail.com` |
| `SMTP_PASS` | Gmail **App Password** (not your account password) | `abcd efgh ijkl mnop` |
| `MAIL_FROM` | From header on OTP emails | `"HEAL <you@gmail.com>"` |
| `OTP_PEPPER` | Server-side secret mixed into every OTP hash | `long random string` |
| `DEV_ECHO_OTP` | `true` **and** `NODE_ENV=development` → OTP responses include `devOtp`. Fail-closed: off unless both hold. Default `false` | `false` |
| `SMS_PROVIDER` | Phone OTP delivery: `dev` (console, free) or `firebase` | `dev` |
| `FIREBASE_PROJECT_ID` | Expected `aud` when verifying Firebase ID tokens | `heal-12345` |

Generate strong secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Frontend — root `.env`

| Variable | Purpose | Example |
|---|---|---|
| `VITE_SMS_PROVIDER` | Which phone step the UI shows; keep in sync with the server's `SMS_PROVIDER` | `dev` |
| `VITE_FIREBASE_API_KEY` | Firebase web app config (only for `firebase` provider) | `AIza...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase web app config | `heal-12345.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase web app config | `heal-12345` |

Firebase web config values are not secrets (they ship in the client bundle),
but keep them in `.env` anyway so environments stay swappable.

## 4. Gmail SMTP setup (free)

Gmail's SMTP relay is free and plenty for OTP volumes. It requires an **App
Password** — Google removed "less secure app" password sign-in in 2024.

1. Go to your **Google Account** → **Security**.
2. Turn **on 2-Step Verification** (App Passwords only exist with 2SV enabled).
3. Still under Security, open **App passwords** (search for it in the account
   search bar if you don't see it listed).
4. Create one — name it `HEAL` — and Google shows a 16-character password once.
5. Paste it into `SMTP_PASS` (with or without the spaces; both work).

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=you@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
MAIL_FROM="HEAL <you@gmail.com>"
```

**Limits:** free Gmail allows roughly **500 recipients per day** (Google
Workspace ~2,000). Ample for development and small deployments; beyond that,
point the same four SMTP vars at any transactional provider.

**Console fallback:** if `SMTP_USER`/`SMTP_PASS` are empty, the server uses a
console transport — the OTP email is printed to the server log instead of
sent. Combined with `DEV_ECHO_OTP=true` (code also returned in the API
response), the entire email flow is testable with no SMTP account at all.

## 5. Firebase Phone Auth setup (optional)

Phone OTPs default to `SMS_PROVIDER=dev`: the server generates the code and
"delivers" it to its own console — free and fully functional. Switch to
Firebase only when you need real SMS.

1. Go to [console.firebase.google.com](https://console.firebase.google.com) →
   **Add project** (free to create).
2. **Build → Authentication → Get started → Sign-in method →** enable **Phone**.
3. **Project settings → Your apps → Add app → Web (`</>`)** and copy the config.
4. Frontend `.env`:

   ```dotenv
   VITE_SMS_PROVIDER=firebase
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=heal-12345.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=heal-12345
   ```

5. Server `server/.env`:

   ```dotenv
   SMS_PROVIDER=firebase
   FIREBASE_PROJECT_ID=heal-12345
   ```

Flow: the browser runs an invisible reCAPTCHA + `signInWithPhoneNumber`, the
user confirms the SMS code, and the client posts the resulting Firebase ID
token to `POST /api/auth/phone/firebase`. The server verifies it (RS256
against Google's securetoken certs, `aud` must equal `FIREBASE_PROJECT_ID`)
and issues the same proof token the dev path does.

**Test phone numbers (free, recommended for development):** in
**Authentication → Sign-in method → Phone → Phone numbers for testing**, add
fictional numbers with fixed codes (e.g. `+1 650-555-3434` → `123456`). These
complete the full client flow without sending any SMS and work on the free
Spark plan.

**Pricing — read before enabling:** as of 2024+ Google requires the **Blaze
pay-as-you-go plan** to send real SMS via Phone Auth. Blaze has **no monthly
fee**, but every real SMS is billed (roughly **$0.01–$0.06 per SMS** depending
on destination country). That is exactly why `SMS_PROVIDER=dev` is HEAL's
default — free, console-delivered, and behaviorally identical.

## 6. API reference

All endpoints live under `/api/auth`, speak JSON, and return errors as
`{ "error": string, "code"?: string, ... }`.

Rate limits (per IP, JSON 429 body, standard headers):

| Scope | Limit |
|---|---|
| `/api/` (global) | 300 / 15 min |
| `POST /api/auth/otp/request` | 10 / 15 min |
| `POST /api/auth/otp/verify` | 30 / 15 min |
| `POST /api/auth/signin` | 10 / 15 min |

### POST /api/auth/otp/request

Request an OTP. The identifier field must match the channel.

```json
{ "channel": "email", "purpose": "signup", "email": "you@example.com" }
```

```json
{ "ok": true, "resendAfter": 30, "expiresIn": 300, "devOtp": "123456" }
```

`devOtp` appears only when `DEV_ECHO_OTP=true` **and** `NODE_ENV=development`
(fail-closed — an unset `NODE_ENV` disables it). For `purpose:"reset"` the
response is always the same generic `{ ok: true, resendAfter, expiresIn }`
whether or not the account exists, and `devOtp` / cooldown `429`s are never
surfaced, so the endpoint can't be used to enumerate accounts.

| Status | Body | When |
|---|---|---|
| `409` | `{ "code": "ALREADY_REGISTERED" }` | signup: identifier already belongs to a user |
| `400` | `{ "code": "USE_FIREBASE" }` | `channel:'phone'` while `SMS_PROVIDER=firebase` — client must use the Firebase SDK path |
| `429` | `{ "code": "COOLDOWN", "retryAfter": <sec> }` | within 30 s of the last send |
| `429` | `{ "code": "RESEND_LIMIT" }` | more than 5 sends per identifier+purpose per hour |

`purpose:'reset'` **always returns a generic 200** (anti-enumeration): the OTP
is only actually sent when the account exists, but the response is identical
either way.

### POST /api/auth/otp/verify

```json
{ "channel": "email", "purpose": "signup", "email": "you@example.com", "otp": "123456" }
```

```json
{ "proofToken": "eyJhbGciOi...", "channel": "email", "purpose": "signup" }
```

| Status | Body | When |
|---|---|---|
| `400` | `{ "code": "INVALID_OTP", "attemptsLeft": 3 }` | wrong code |
| `404` | `{ "code": "NO_OTP" }` | no outstanding OTP for this identifier |
| `410` | `{ "code": "OTP_EXPIRED" }` | older than 5 minutes |
| `423` | `{ "code": "OTP_LOCKED" }` | 5 wrong attempts — locked until expiry |

### POST /api/auth/phone/firebase

Only used when `SMS_PROVIDER=firebase`.

```json
{ "idToken": "<firebase-id-token>", "purpose": "signup" }
```

```json
{ "proofToken": "eyJhbGciOi...", "phone": "+919876543210" }
```

`400` when the token is invalid or Firebase is unconfigured.

### POST /api/auth/signup

```json
{
  "name": "Asha",
  "email": "you@example.com",
  "phone": "+919876543210",
  "password": "hunter42",
  "emailProof": "eyJ..."
}
```

`phone` is optional. Validates the fields, verifies the **email** proof JWT
(`kind:'proof'`, `purpose:'signup'`, channel `email`, `idf` equals the
normalized email in the body), re-checks duplicates, then creates the user with
`email_verified=true`. Any `phoneProof` sent by an older client is ignored.

- `201` → `{ "token": "<session JWT>", "user": { ... } }`
- `400` `{ "code": "BAD_PROOF" }` — missing/expired/mismatched email proof
- `409` — duplicate email (or phone, if one was given)

### POST /api/auth/signin

```json
{ "identifier": "you@example.com", "password": "hunter42" }
```

`identifier` is email **or** E.164 phone; legacy `{ "email", "password" }`
bodies still work.

- `200` → `{ "token", "user" }`
- `401` — generic invalid credentials
- `403` `{ "code": "UNVERIFIED_EMAIL" }` — safety net; new accounts are always email-verified

### POST /api/auth/reset

```json
{ "proofToken": "eyJ...", "newPassword": "newPass99" }
```

Proof purpose must be `reset`; the user is found by the proof's `idf` (email
or phone), the password is bcrypt-rehashed → `200 { "ok": true }`.

### GET /api/auth/me (unchanged)

`Authorization: Bearer <token>` → `{ "user": { ... } }`. User objects now
include `phone`, `emailVerified`, `phoneVerified` everywhere.

### Validation rules

| Field | Rule |
|---|---|
| email | trimmed, lowercased, `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` |
| phone | strip `space - ( ) .`, then `/^\+[1-9][0-9]{9,14}$/` (E.164 with country code, e.g. `+91 98765 43210`) |
| password | ≥ 8 chars, ≥ 1 letter, ≥ 1 number |
| name | trimmed, ≥ 2 chars |

## 7. How OTP works internally

- **Generation:** 6 digits via `crypto.randomInt` — never `Math.random`.
- **Storage:** only `sha256(otp + OTP_PEPPER + identifier)` is stored. The
  plaintext code is never logged or persisted; the sole exception is the
  explicit dev-echo path (`DEV_ECHO_OTP=true` outside production).
- **Expiry:** 5 minutes after send. Expired rows are deleted opportunistically
  on access plus an hourly sweep.
- **Attempts:** 5 wrong verifies lock the row → `423 OTP_LOCKED` until expiry.
- **Cooldown:** re-requesting within 30 s → `429 COOLDOWN` with `retryAfter`.
- **Hourly cap:** max 5 sends per identifier+purpose per rolling hour (counted
  from `audit_logs`) → `429 RESEND_LIMIT`.
- **Replacement:** a new request for the same identifier+channel+purpose
  replaces the previous row — only the newest code is ever valid.
- **Single use:** the row is deleted the moment verification succeeds.

Every step writes an `audit_logs` row (event, identifier, IP, metadata — never
OTP values or passwords):

`otp_sent` · `otp_verified` · `otp_verify_failed` · `otp_locked` · `signup` ·
`signin_ok` · `signin_failed` · `reset_requested` · `reset_ok`

## 8. Testing guide

Prerequisites: server running with `DEV_ECHO_OTP=true` and `SMS_PROVIDER=dev`
(the defaults). `BASE=http://localhost:4000/api/auth`. Examples are bash
(Git Bash works on Windows).

### Happy path — full signup

```bash
BASE=http://localhost:4000/api/auth

# 1. Email OTP — note devOtp in the response
curl -s -X POST $BASE/otp/request -H 'Content-Type: application/json' \
  -d '{"channel":"email","purpose":"signup","email":"test@example.com"}'
# → {"ok":true,"resendAfter":30,"expiresIn":300,"devOtp":"482913"}

curl -s -X POST $BASE/otp/verify -H 'Content-Type: application/json' \
  -d '{"channel":"email","purpose":"signup","email":"test@example.com","otp":"482913"}'
# → {"proofToken":"<EMAIL_PROOF>","channel":"email","purpose":"signup"}

# 2. Phone OTP
curl -s -X POST $BASE/otp/request -H 'Content-Type: application/json' \
  -d '{"channel":"phone","purpose":"signup","phone":"+919876543210"}'

curl -s -X POST $BASE/otp/verify -H 'Content-Type: application/json' \
  -d '{"channel":"phone","purpose":"signup","phone":"+919876543210","otp":"<devOtp>"}'
# → {"proofToken":"<PHONE_PROOF>", ...}

# 3. Create the account with both proofs
curl -s -X POST $BASE/signup -H 'Content-Type: application/json' \
  -d '{"name":"Test User","email":"test@example.com","phone":"+919876543210",
       "password":"pass1234","emailProof":"<EMAIL_PROOF>","phoneProof":"<PHONE_PROOF>"}'
# → 201 {"token":"...","user":{...,"emailVerified":true,"phoneVerified":true}}

# 4. Session works
curl -s $BASE/me -H "Authorization: Bearer <token>"
```

### Wrong OTP ×5 → 423

```bash
curl -s -X POST $BASE/otp/request -H 'Content-Type: application/json' \
  -d '{"channel":"email","purpose":"signup","email":"lock@example.com"}'

for i in 1 2 3 4 5; do
  curl -s -X POST $BASE/otp/verify -H 'Content-Type: application/json' \
    -d '{"channel":"email","purpose":"signup","email":"lock@example.com","otp":"000000"}'
done
# → 400 {"code":"INVALID_OTP","attemptsLeft":4} ... then 423 {"code":"OTP_LOCKED"}
# Even the CORRECT code now returns 423 until the row expires (≤5 min).
```

### Expired OTP → 410

```bash
curl -s -X POST $BASE/otp/request -H 'Content-Type: application/json' \
  -d '{"channel":"email","purpose":"signup","email":"slow@example.com"}'
# wait > 5 minutes, then verify with the (formerly valid) devOtp:
# → 410 {"code":"OTP_EXPIRED"}
```

### Resend cooldown → 429 COOLDOWN

```bash
curl -s -X POST $BASE/otp/request -H 'Content-Type: application/json' \
  -d '{"channel":"email","purpose":"signup","email":"fast@example.com"}'
curl -s -X POST $BASE/otp/request -H 'Content-Type: application/json' \
  -d '{"channel":"email","purpose":"signup","email":"fast@example.com"}'
# 2nd call within 30 s → 429 {"code":"COOLDOWN","retryAfter":27}
```

### Hourly resend cap → 429 RESEND_LIMIT

```bash
# 5 sends spaced >30 s apart for the same identifier+purpose, then a 6th:
# → 429 {"code":"RESEND_LIMIT"}
```

### IP rate limit → 429

```bash
# /otp/request allows 10/15 min per IP. Vary the email each time to bypass
# the per-identifier cooldown; the 11th request within 15 min → HTTP 429
# from express-rate-limit (standard RateLimit-* headers).
for i in $(seq 1 11); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST $BASE/otp/request \
    -H 'Content-Type: application/json' \
    -d "{\"channel\":\"email\",\"purpose\":\"signup\",\"email\":\"u$i@example.com\"}"
done
```

### Unverified login → 403

Only reproducible for accounts with a false flag (e.g. seeded manually — the
normal signup flow always creates verified users; legacy users are
grandfathered):

```bash
curl -s -X POST $BASE/signin -H 'Content-Type: application/json' \
  -d '{"identifier":"unverified@example.com","password":"pass1234"}'
# → 403 {"code":"UNVERIFIED_EMAIL"}
```

### Forgot / reset

```bash
# 1. Request — generic 200 whether or not the account exists
curl -s -X POST $BASE/otp/request -H 'Content-Type: application/json' \
  -d '{"channel":"email","purpose":"reset","email":"test@example.com"}'

# 2. Verify with purpose:'reset' → reset-scoped proof
curl -s -X POST $BASE/otp/verify -H 'Content-Type: application/json' \
  -d '{"channel":"email","purpose":"reset","email":"test@example.com","otp":"<devOtp>"}'

# 3. Set the new password
curl -s -X POST $BASE/reset -H 'Content-Type: application/json' \
  -d '{"proofToken":"<RESET_PROOF>","newPassword":"newPass99"}'
# → {"ok":true}

# 4. Old password now fails (401); new one signs in (200)
curl -s -X POST $BASE/signin -H 'Content-Type: application/json' \
  -d '{"identifier":"test@example.com","password":"newPass99"}'
```

## 9. Troubleshooting

| Symptom | Cause & fix |
|---|---|
| `EAUTH` / `535-5.7.8 Username and Password not accepted` | You used your Gmail **account** password. Gmail SMTP requires an **App Password** (needs 2-Step Verification on); "less secure apps" sign-in no longer exists. Regenerate and paste the 16-char code into `SMTP_PASS`. |
| `App passwords` option missing in Google Account | 2-Step Verification is off, or the account is a Workspace account where the admin disabled app passwords. |
| `ETIMEDOUT` / `ECONNREFUSED` connecting to `smtp.gmail.com:465` | Firewall/ISP blocks port 465. Try `SMTP_PORT=587` + `SMTP_SECURE=false` (STARTTLS), or a different network. |
| OTP emails land in spam | Make `MAIL_FROM` match `SMTP_USER`; expected occasionally with raw Gmail SMTP — fine for dev. |
| No email arrives, no error | SMTP vars are empty → console transport is active by design. Check the **server log** for the OTP. |
| `auth/invalid-app-credential` (Firebase) | The reCAPTCHA token was rejected: wrong `VITE_FIREBASE_API_KEY`, domain not in **Authentication → Settings → Authorized domains**, or real SMS attempted without the Blaze plan. Use test phone numbers in dev. |
| reCAPTCHA never appears / hangs | Ad blockers or privacy extensions blocking `google.com/recaptcha`; container element removed before render; unauthorized domain. `localhost` is authorized by default. |
| `OPERATION_NOT_ALLOWED: SMS unable to be sent until this region enabled` | New Firebase projects block **all** SMS regions by default. Fix in **Authentication → Settings → SMS region policy** → Allow your country (or "Allow all regions"). Required even for test numbers in some projects. |
| `auth/too-many-requests` (Firebase) | Firebase throttled the number/device. Wait, or use a configured test phone number. |
| `400 BAD_PROOF` on `/signup` right after verifying | Proof expired (30 min), or the email/phone in the signup body doesn't exactly match the verified identifier (normalization matters), or `JWT_SECRET` changed between verify and signup. |
| Tokens rejected immediately after issue | Clock skew — JWT `iat`/`exp` and Firebase ID-token checks assume a correct clock. Sync your system time (NTP), especially in VMs/containers. |
| All outstanding OTPs suddenly invalid | `OTP_PEPPER` changed — the stored hashes can no longer match. Expected; users just request a new code. |

## 10. Deployment

Checklist for going beyond `localhost`:

1. **`NODE_ENV=production`** — the `devOtp` echo is fail-closed: it needs
   `NODE_ENV=development` to activate, so production never leaks codes. Keep
   `DEV_ECHO_OTP=false` as well; belt and suspenders. (On boot the server logs a
   loud warning whenever the echo is live.)
2. **Strong secrets** — regenerate `JWT_SECRET` and `OTP_PEPPER` (48+ random
   bytes each, from `crypto.randomBytes`, stored only in env). Never reuse dev
   values.
3. **HTTPS via a reverse proxy** (Caddy, nginx, or your platform's edge). When
   behind a proxy, set `TRUST_PROXY` (e.g. `1`) so `express-rate-limit` and audit
   logs see real client IPs instead of the proxy's — otherwise every visitor
   shares one rate-limit bucket. Leave it unset for direct binding.
4. **CORS allowlist** — restrict the CORS origin to your deployed frontend
   URL(s); no wildcard in production.
5. **Real SMTP** — configure Gmail (or any transactional provider) so OTPs
   actually send; the console fallback is dev-only by nature.
6. **Postgres backups** — e.g. a nightly
   `pg_dump "$DATABASE_URL" | gzip > heal-$(date +%F).sql.gz` cron, retained
   off-host.

### Built-in protections

These are already implemented (verified by an adversarial security review):

- **Atomic OTP attempt counter** — verification runs inside a transaction under
  a Postgres advisory lock keyed to the identifier, so concurrent guesses can't
  race past the 5-attempt lock (no distributed brute force).
- **Session invalidation on password reset** — session JWTs carry a
  `token_version`; a reset bumps it, so every previously issued token stops
  working immediately (`/me` returns 401).
- **Anti-enumeration** — password-reset requests always return an identical
  generic 200, and reset OTP verification returns `INVALID_OTP` (not `NO_OTP`)
  for unknown accounts. Sign-in runs a constant-time bcrypt compare even when
  the account doesn't exist.
- **Input caps** — email ≤254, name ≤100, phone ≤20, password ≤200 chars, with
  a non-backtracking email regex (closes the ReDoS vector).
- **Fail-closed dev echo** — `devOtp` requires `NODE_ENV=development`; production
  never echoes codes.

### Security recommendations

- Rotate `JWT_SECRET` and `OTP_PEPPER` periodically and on any suspicion of
  leakage (rotating `JWT_SECRET` signs everyone out; rotating `OTP_PEPPER`
  only voids in-flight OTPs).
- Watch `audit_logs` — spikes in `signin_failed`, `otp_verify_failed`, or
  `otp_locked` for one identifier or IP are your early-warning signal.
- Future hardening worth doing: per-account lockout after repeated failed
  sign-ins (current limits are per-IP), and short-lived access tokens with
  refresh-token rotation instead of 7-day session JWTs.
- Keep `helmet`, `express-rate-limit`, and `nodemailer` updated; they carry
  the security surface.
- Never commit `.env` files; the `.env.example` files hold placeholders only.
