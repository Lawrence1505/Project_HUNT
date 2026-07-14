import { pool } from "../db.js";

/**
 * Write an audit row. Never throws — an audit failure must not break the
 * request that triggered it. Never pass OTP values or passwords in `meta`.
 *
 * Pass `exec` (a pool client) when calling from inside an open transaction, so
 * the write reuses that connection instead of grabbing a second one from the
 * pool — otherwise, under concurrency ≥ pool size, a transaction holding a lock
 * would deadlock waiting for a connection that can't free until it commits.
 */
export async function audit(event, identifier, ip, meta, exec = pool) {
  try {
    await exec.query(
      `INSERT INTO audit_logs (event, identifier, ip, meta) VALUES ($1, $2, $3, $4)`,
      [event, identifier ?? null, ip ?? null, meta ? JSON.stringify(meta) : null]
    );
  } catch (err) {
    console.error("audit write failed:", err.message);
  }
}
