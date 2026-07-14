import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { pool, migrate } from "./db.js";
import authRouter from "./routes/auth.js";
import { cleanupExpiredOtps, devEchoEnabled } from "./services/otpService.js";

const { PORT = 4000, DATABASE_URL, JWT_SECRET } = process.env;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set (see server/.env.example)");
if (!JWT_SECRET || JWT_SECRET === "change-me")
  throw new Error("JWT_SECRET is not set to a real secret (see server/.env.example)");
if (!process.env.OTP_PEPPER)
  console.warn("OTP_PEPPER is not set — set it in server/.env (see server/.env.example)");
if (devEchoEnabled())
  console.warn(
    "⚠ DEV_ECHO_OTP is ON — OTP codes are returned in API responses. " +
      "This is for local development only; never enable it in production."
  );

const app = express();
// Behind a reverse proxy, set TRUST_PROXY (e.g. "1" or "loopback") so rate
// limiting keys on the real client IP. Left off by default (direct binding).
if (process.env.TRUST_PROXY) app.set("trust proxy", process.env.TRUST_PROXY);
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "64kb" }));

/* ---------- rate limits ---------- */

const limiter = ({ limit, error, windowMs = 15 * 60 * 1000 }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error, code: "RATE_LIMITED" },
  });

app.use("/api/", limiter({ limit: 300, error: "Too many requests — try again later" }));
app.use(
  "/api/auth/otp/request",
  limiter({ limit: 10, error: "Too many code requests — try again later" })
);
app.use(
  "/api/auth/otp/verify",
  limiter({ limit: 30, error: "Too many verification attempts — try again later" })
);
app.use(
  "/api/auth/signin",
  limiter({ limit: 10, error: "Too many sign-in attempts — try again later" })
);
app.use(
  "/api/auth/signup",
  limiter({ limit: 15, error: "Too many sign-up attempts — try again later" })
);
app.use(
  "/api/auth/reset",
  limiter({ limit: 15, error: "Too many reset attempts — try again later" })
);

/* ---------- routes ---------- */

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: "up" });
  } catch {
    res.status(503).json({ ok: false, db: "down" });
  }
});

app.use("/api/auth", authRouter);

/* ---------- 404 + errors ---------- */

app.use((_req, res) => res.status(404).json({ error: "Not found", code: "NOT_FOUND" }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (res.headersSent) return;
  if (err?.type === "entity.too.large")
    return res.status(413).json({ error: "Request body too large" });
  if (err?.type === "entity.parse.failed")
    return res.status(400).json({ error: "Invalid JSON body" });
  console.error("unhandled error:", err);
  res.status(500).json({ error: "Something went wrong — try again" });
});

/* ---------- start ---------- */

migrate()
  .then(() => {
    cleanupExpiredOtps();
    setInterval(cleanupExpiredOtps, 60 * 60 * 1000).unref();
    app.listen(PORT, () => console.log(`HEAL API listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to prepare database schema:", err.message);
    process.exit(1);
  });
