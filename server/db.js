import pg from "pg";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  // Fail a query fast if the pool is saturated rather than hanging forever.
  connectionTimeoutMillis: 8000,
});

/**
 * Idempotent schema migration, run at every server start.
 * Pre-existing users are grandfathered to verified ONLY when the
 * verification columns are added for the first time.
 */
export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            BIGSERIAL PRIMARY KEY,
      name          TEXT        NOT NULL,
      email         TEXT        NOT NULL UNIQUE,
      password_hash TEXT        NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'users'
       AND column_name IN ('phone', 'email_verified', 'phone_verified')`
  );
  const have = new Set(rows.map((r) => r.column_name));
  const firstVerifiedMigration = !have.has("email_verified") && !have.has("phone_verified");

  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0`);

  if (firstVerifiedMigration) {
    // Accounts that existed before OTP verification shipped keep working.
    await pool.query(`UPDATE users SET email_verified = true, phone_verified = true`);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_otps (
      id BIGSERIAL PRIMARY KEY,
      identifier TEXT NOT NULL,
      channel TEXT NOT NULL CHECK (channel IN ('email','phone')),
      purpose TEXT NOT NULL CHECK (purpose IN ('signup','reset')),
      otp_hash TEXT NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      locked BOOLEAN NOT NULL DEFAULT false,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  // One live OTP per identifier+channel+purpose — enables atomic upsert-replace.
  // Deduplicate any legacy rows, then replace the old non-unique index in place.
  await pool.query(`
    DELETE FROM user_otps a USING user_otps b
    WHERE a.identifier = b.identifier AND a.channel = b.channel
      AND a.purpose = b.purpose AND a.id < b.id
  `);
  await pool.query(`DROP INDEX IF EXISTS idx_user_otps_key`);
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_user_otps_key ON user_otps (identifier, channel, purpose)`
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      event TEXT NOT NULL,
      identifier TEXT,
      ip TEXT,
      meta JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_audit_event_time ON audit_logs (event, identifier, created_at)`
  );

  // Single-use claims for consumable proof tokens (password reset).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS consumed_proofs (
      jti TEXT PRIMARY KEY,
      consumed_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}
