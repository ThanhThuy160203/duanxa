import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppSelector } from "../../app/store";
import { clearLogoutReason, getLogoutReason } from "./authSlice";
import FlashScreen from "./FlashScreen";
import Login from "./Login";

const FLASH_DURATION_MS = 1100;

const LoginEntry = () => {
  const user = useAppSelector((state) => state.auth.user);
  const location = useLocation();
  const [showFlash, setShowFlash] = useState(true);

  const logoutReasonFromQuery = new URLSearchParams(location.search).get("reason");
  const logoutReason = logoutReasonFromQuery ?? getLogoutReason();
  const logoutMessage =
    logoutReason === "idle"
      ? "Phiên đăng nhập đã hết hạn do không thao tác trong 15 phút. Vui lòng đăng nhập lại."
      : null;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowFlash(false);
    }, FLASH_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (logoutReason) {
      clearLogoutReason();
    }
  }, [logoutReason]);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  if (showFlash) {
    return <FlashScreen />;
  }

  return <Login sessionMessage={logoutMessage} />;
};

export default LoginEntry;
