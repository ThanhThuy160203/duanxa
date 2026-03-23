import type { PayloadAction } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";
import type { UserProfile } from "../../types/user";

interface AuthState {
  user: UserProfile | null;
}

export type LogoutReason = "idle";

export const AUTH_STORAGE_KEY = "duanxa.auth.user";
export const LAST_ACTIVITY_STORAGE_KEY = "duanxa.auth.lastActivityAt";
export const LOGOUT_REASON_STORAGE_KEY = "duanxa.auth.logoutReason";

export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

const loadPersistedUser = (): UserProfile | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

const persistUser = (user: UserProfile) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
};

export const touchLastActivity = (timestamp = Date.now()) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(timestamp));
};

export const getLastActivity = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

export const setLogoutReason = (reason: LogoutReason) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOGOUT_REASON_STORAGE_KEY, reason);
};

export const getLogoutReason = (): LogoutReason | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(LOGOUT_REASON_STORAGE_KEY);
  return raw === "idle" ? "idle" : null;
};

export const clearLogoutReason = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(LOGOUT_REASON_STORAGE_KEY);
};

const clearPersistedSession = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
};

const initialState: AuthState = {
  user: loadPersistedUser(),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<UserProfile>) {
      state.user = action.payload;
      persistUser(action.payload);
      touchLastActivity();
      clearLogoutReason();
    },
    logout(state) {
      state.user = null;
      clearPersistedSession();
    },
  },
});

export const { setUser, logout } = authSlice.actions;
export default authSlice.reducer;