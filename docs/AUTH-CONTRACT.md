# HEAL Auth v2 — OTP Verification Contract

Single source of truth for the Email-OTP + Phone-OTP upgrade. Backend, frontend,
and docs are built against THIS document. Existing behavior that must not break:
JWT session tokens in `Authorization: Bearer`, `GET /api/auth/me`, bcrypt password
hashing, existing signed-in users keep working (grandfathered as verified).

## Architecture decisions

- **Email OTP:** server-generated 6-digit code via Nodemailer + Gmail SMTP
  (free). No SMTP configured → console transport (OTP printed to server log).
- **Phone OTP:** pluggable provider, `SMS_PROVIDER=dev|firebase`.
  - `dev` (default): server-generated OTP through the same OTP service,
    "delivered" to the server console. Free, fully functional.
  - `firebase`: client-side Firebase Phone Auth (reCAPTCHA +
    signInWithPhoneNumber); backend verifies the Firebase ID token
    (RS256 against Google securetoken certs, `aud == FIREBASE_PROJECT_ID`)
    and issues the same proof token. NOTE: Google bills per SMS (Blaze).
- **Dev echo:** when `DEV_ECHO_OTP=true` AND `NODE_ENV != 'production'`,
  OTP request responses include `devOtp` so flows are testable without SMTP.
  Never in production.
- **Proof tokens:** verifying an OTP yields a short-lived JWT
  `{ kind:'proof', channel:'email'|'phone', purpose:'signup'|'reset', idf:<identifier> }`
  (30 min, same JWT_SECRET). Account creation / password reset require proofs.
  This keeps pre-account verification stateless — no pending-users table.

## OTP rules (all server-enforced)

- 6 digits, `crypto.randomInt`, stored as `sha256(otp + OTP_PEPPER + identifier)`.
- Expires **5 minutes** after send. Expired rows deleted opportunistically + hourly.
- Max **5 wrong verify attempts** → row locked → HTTP 423 until expiry.
- Resend cooldown **30 s** (429 with `retryAfter`), max **5 sends** per
  identifier+purpose per rolling hour (counted via audit_logs) → 429.
- New request for same identifier+channel+purpose replaces the previous row.
- OTP row is deleted on successful verification (single use).

## Database (auto-migrated at server start, `server/db.js`)

```sql
-- users: add (if missing; when adding, grandfather existing rows to verified)
phone          TEXT UNIQUE,            -- E.164, nullable for legacy accounts
email_verified BOOLEAN NOT NULL DEFAULT false,
phone_verified BOOLEAN NOT NULL DEFAULT false

CREATE TABLE user_otps (
  id BIGSERIAL PRIMARY KEY,
  identifier TEXT NOT NULL,                -- normalized email (lowercase) or phone (+E.164)
  channel TEXT NOT NULL CHECK (channel IN ('email','phone')),
  purpose TEXT NOT NULL CHECK (purpose IN ('signup','reset')),
  otp_hash TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  locked BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_otps_key ON user_otps (identifier, channel, purpose);

CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  event TEXT NOT NULL,          -- otp_sent | otp_verified | otp_verify_failed | otp_locked |
                                -- signup | signin_ok | signin_failed | reset_requested | reset_ok
  identifier TEXT,
  ip TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_event_time ON audit_logs (event, identifier, created_at);
```

## Validation rules (shared)

- email: trimmed, lowercased, `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- phone: strip `space - ( ) .`; must match `/^\+[1-9][0-9]{9,14}$/` (E.164 with
  country code; UI placeholder `+91 98765 43210`)
- password: ≥ 8 chars, ≥ 1 letter, ≥ 1 number
- name: trimmed, ≥ 2 chars

## API (all under /api/auth, JSON; errors -> `{ error: string, code?: string, ... }`)

### POST /otp/request
`{ channel:'email'|'phone', purpose:'signup'|'reset', email?, phone? }`
(identifier field must match channel)
- signup: 409 `{code:'ALREADY_REGISTERED'}` if identifier belongs to a user.
- reset: **always 200 generic** (anti-enumeration) — OTP only actually sent when
  the account exists; response identical either way.
- phone + `SMS_PROVIDER=firebase` + purpose signup/reset → 400
  `{code:'USE_FIREBASE'}` (client must use the Firebase SDK path instead).
- 429 `{code:'COOLDOWN', retryAfter:<sec>}` within 30 s of last send.
- 429 `{code:'RESEND_LIMIT'}` after 5 sends/hour.
- 200 → `{ ok:true, resendAfter:30, expiresIn:300, devOtp? }`

### POST /otp/verify
`{ channel, purpose, email?, phone?, otp }`
- 200 → `{ proofToken, channel, purpose }`
- 400 `{code:'INVALID_OTP', attemptsLeft}` · 404 `{code:'NO_OTP'}` ·
  410 `{code:'OTP_EXPIRED'}` · 423 `{code:'OTP_LOCKED'}`

### POST /phone/firebase
`{ idToken, purpose:'signup'|'reset' }` → verifies Firebase ID token, extracts
`phone_number` claim → 200 `{ proofToken, phone }`. 400 invalid/unconfigured.

### POST /signup
`{ name, email, phone, password, emailProof, phoneProof }`
- Validates fields; verifies both proof JWTs (kind=proof, purpose=signup,
  channel matches, `idf` equals the normalized email/phone in the body).
- Re-checks duplicates. Creates user with `email_verified=true, phone_verified=true`.
- 201 `{ token, user }` · 400 `{code:'BAD_PROOF'}` · 409 duplicates.

### POST /signin
`{ identifier, password }` — identifier is email OR phone (also accepts legacy
`{email, password}`).
- 401 generic invalid credentials.
- 403 `{code:'UNVERIFIED_EMAIL'|'UNVERIFIED_PHONE'}` when the flag is false.
- 200 `{ token, user }`

### POST /reset
`{ proofToken, newPassword }` — proof purpose must be `reset`; finds user by
proof `idf` (email or phone) → bcrypt-rehash → 200 `{ ok:true }`.

### GET /me (unchanged) → `{ user }` — user objects now include
`phone, emailVerified, phoneVerified` everywhere.

## Security middleware (server)

helmet(); express-rate-limit: `/api/` 300/15min·IP, `/otp/request` 10/15min·IP,
`/otp/verify` 30/15min·IP, `/signin` 10/15min·IP (JSON 429 body, standard
headers). Audit log rows for every event listed above (never log OTP values or
passwords). Body size limit already 64kb. All secrets via env.

## Server layout (extend, don't break)

```
server/
├── index.js               # app wiring: helmet, cors, limiters, routes, errors
├── db.js                  # pool + migrate()
├── routes/auth.js         # route handlers (thin)
├── services/otpService.js # generate/hash/verify/cooldowns/cleanup
├── services/emailService.js  # nodemailer transport + sendOtpEmail (console fallback)
├── services/phoneService.js  # dev sender + Firebase ID-token verification
├── services/userService.js   # user queries (create/find by email or phone)
├── lib/validate.js        # validators + normalizers (shared rules above)
├── lib/tokens.js          # session JWT + proof JWT sign/verify
├── lib/audit.js           # audit(event, identifier, ip, meta)
└── templates/otpEmail.js  # HTML email (HEAL branding, dark-compatible)
```

Deps (already installed): nodemailer, helmet, express-rate-limit. Frontend: firebase.

## Env additions

server/.env(.example): `SMTP_HOST=smtp.gmail.com SMTP_PORT=465 SMTP_SECURE=true
SMTP_USER= SMTP_PASS= MAIL_FROM="HEAL <you@gmail.com>" OTP_PEPPER=<random>
DEV_ECHO_OTP=true SMS_PROVIDER=dev FIREBASE_PROJECT_ID=`
root `.env.example` (frontend): `VITE_SMS_PROVIDER=dev VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN= VITE_FIREBASE_PROJECT_ID=`

## Frontend flows

**Sign Up (stepper: Details → Verify Email → Verify Phone → Done):**
1. Details form (name, email, phone, password, confirm) with inline validation.
2. Email step: auto-request OTP on entry; 6-box OTP input; 5:00 expiry countdown;
   resend button enabled after 30 s (shows countdown); on verify → store
   emailProof, show "Email Verified ✓" chip, advance.
3. Phone step: provider `dev` → same OTP UI via /otp/request(channel phone);
   provider `firebase` → dynamic-import firebase, invisible RecaptchaVerifier,
   signInWithPhoneNumber, confirm code, getIdToken → /phone/firebase → proof.
4. Auto-POST /signup with both proofs → signed in → navigate "/".
   Back-navigation allowed; proofs survive step changes (component state).
**Sign In:** one "Email or phone" identifier field + password; 403 UNVERIFIED_*
shows a clear message. "Forgot password?" link.
**Forgot Password (/forgot, new page):** identifier → channel auto-detected
(email vs phone format) → OTP step (same components) → new password + confirm →
/reset → success → link to sign in. Uses generic messaging.
**Shared components:** `OtpInput.tsx` (6 boxes, paste support, auto-advance),
`useCountdown.ts`. Status chips: OTP Sent / Verified ✓ / Expired / Locked.
Buttons disabled while pending; all requests via `src/lib/api.ts`.
`src/store/auth.ts`: `signIn(identifier, password)`, `signUp(payload)` w/ proofs.
Dev nicety: when a response contains `devOtp`, show it in a small "DEV" hint
under the OTP input (and it's printed on the server console).
