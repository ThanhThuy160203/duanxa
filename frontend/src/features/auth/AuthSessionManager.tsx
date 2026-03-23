import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/store";
import {
    AUTH_STORAGE_KEY,
    clearLogoutReason,
    getLastActivity,
    IDLE_TIMEOUT_MS,
    LAST_ACTIVITY_STORAGE_KEY,
    logout,
    LOGOUT_REASON_STORAGE_KEY,
    setLogoutReason,
    touchLastActivity,
} from "./authSlice";

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
];

const AuthSessionManager = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const timeoutRef = useRef<number | null>(null);

  const clearIdleTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearIdleTimer();

    if (!user) {
      return;
    }

    const forceLogout = (reason?: "idle") => {
      if (reason) {
        setLogoutReason(reason);
      } else {
        clearLogoutReason();
      }
      dispatch(logout());
      navigate(reason ? `/login?reason=${reason}` : "/login", { replace: true });
    };

    const getRemainingTime = () => {
      const lastActivity = getLastActivity() ?? Date.now();
      return IDLE_TIMEOUT_MS - (Date.now() - lastActivity);
    };

    const scheduleIdleCheck = () => {
      clearIdleTimer();

      const remaining = getRemainingTime();

      if (remaining <= 0) {
        forceLogout("idle");
        return;
      }

      timeoutRef.current = window.setTimeout(() => {
        forceLogout("idle");
      }, remaining);
    };

    if (getRemainingTime() <= 0) {
      forceLogout("idle");
      return;
    }

    const markActivity = () => {
      touchLastActivity();
      scheduleIdleCheck();
    };

    scheduleIdleCheck();

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true });
    });

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (getRemainingTime() <= 0) {
          forceLogout("idle");
          return;
        }
        scheduleIdleCheck();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    const onStorage = (event: StorageEvent) => {
      if (event.key === AUTH_STORAGE_KEY && !event.newValue) {
        const logoutReason = event.storageArea?.getItem(LOGOUT_REASON_STORAGE_KEY);
        dispatch(logout());
        navigate(logoutReason ? `/login?reason=${logoutReason}` : "/login", { replace: true });
        return;
      }

      if (event.key === LAST_ACTIVITY_STORAGE_KEY) {
        if (getRemainingTime() <= 0) {
          forceLogout("idle");
          return;
        }
        scheduleIdleCheck();
      }

      if (event.key === LOGOUT_REASON_STORAGE_KEY && event.newValue === null) {
        scheduleIdleCheck();
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      clearIdleTimer();
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, markActivity);
      });
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [clearIdleTimer, dispatch, navigate, user]);

  return null;
};

export default AuthSessionManager;
