import React from "react";
import { Navigate } from "react-router-dom";
import { useAppSelector } from "../app/store";
import { Role } from "../types/role";

interface Props {
  roles: Role[];
  children: React.ReactElement;
}

const ProtectedRoute = ({ roles, children }: Props) => {
  const user = useAppSelector((state) => state.auth.user);

  if (!user) return <Navigate to="/login" />;

  if (user.status !== "ACTIVE") {
    return <Navigate to="/unauthorized" />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

export default ProtectedRoute;