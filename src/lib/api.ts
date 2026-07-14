/** Minimal typed fetch wrapper for the HEAL API. */

export class ApiError extends Error {
  status: number;
  /** Machine-readable error code from the server, e.g. "INVALID_OTP". */
  code?: string;
  /** Full parsed error body (attemptsLeft, retryAfter, …). */
  data: Record<string, unknown>;
  constructor(
    message: string,
    status: number,
    code?: string,
    data: Record<string, unknown> = {}
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {}
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: options.method ?? (options.body ? "POST" : "GET"),
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach the HEAL server — is it running?", 0);
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    const body = (data ?? {}) as Record<string, unknown>;
    const message =
      typeof body.error === "string" ? body.error : `Request failed (${res.status})`;
    const code = typeof body.code === "string" ? body.code : undefined;
    throw new ApiError(message, res.status, code, body);
  }
  return data as T;
}
