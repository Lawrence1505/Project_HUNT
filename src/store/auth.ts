import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../lib/api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface SignUpPayload {
  name: string;
  email: string;
  /** Optional. When provided, verified via OTP (dev) or Firebase phone auth. */
  phone?: string;
  password: string;
  /** Proof JWT from the email OTP verification step. */
  emailProof: string;
  /** Proof JWT from the phone verification step — only when a phone was verified. */
  phoneProof?: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  /** Throws ApiError with a human message on failure. `identifier` = email or phone. */
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (payload: SignUpPayload) => Promise<void>;
  signOut: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,

      // On sign-in/sign-up we only set the session. App.tsx watches the user id
      // and binds the life-data store to this account's namespace (loading their
      // saved data, or a fresh profile for a new account) — that's what keeps
      // one user's data from ever leaking into another's session.
      signIn: async (identifier, password) => {
        const res = await api<AuthResponse>("/auth/signin", {
          body: { identifier, password },
        });
        set({ token: res.token, user: res.user });
      },

      signUp: async (payload) => {
        const res = await api<AuthResponse>("/auth/signup", {
          body: payload,
        });
        set({ token: res.token, user: res.user });
      },

      signOut: () => set({ token: null, user: null }),
    }),
    { name: "heal-auth" }
  )
);
