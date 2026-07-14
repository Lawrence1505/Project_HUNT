import { pool } from "../db.js";

const USER_COLUMNS =
  "id, name, email, phone, email_verified, phone_verified, token_version, created_at";

/** Shape returned to clients everywhere (signup/signin/me). */
export function publicUser(row) {
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    phone: row.phone ?? null,
    emailVerified: row.email_verified,
    phoneVerified: row.phone_verified,
    createdAt: row.created_at,
  };
}

export async function findByEmail(email) {
  const { rows } = await pool.query(
    `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = $1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function findByPhone(phone) {
  const { rows } = await pool.query(
    `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE phone = $1`,
    [phone]
  );
  return rows[0] ?? null;
}

export function findByIdentifier(channel, identifier) {
  return channel === "phone" ? findByPhone(identifier) : findByEmail(identifier);
}

export async function findById(id) {
  const { rows } = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/** Created via the verified-signup flow, so both flags start true. */
export async function createUser({ name, email, phone, passwordHash }) {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, phone, password_hash, email_verified, phone_verified)
     VALUES ($1, $2, $3, $4, true, true)
     RETURNING ${USER_COLUMNS}`,
    [name, email, phone, passwordHash]
  );
  return rows[0];
}

/** Change the password AND bump token_version so existing session JWTs stop working. */
export async function updatePassword(id, passwordHash) {
  await pool.query(
    `UPDATE users SET password_hash = $2, token_version = token_version + 1 WHERE id = $1`,
    [id, passwordHash]
  );
}
