import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../features/auth/Login";
import Register from "../features/auth/Register";
import Profile from "../features/auth/Profile";
import Dashboard from "../features/dashboard/Dashboard";
import Tasks from "../features/tasks/Tasks";
import Reports from "../features/reports/Reports";
import AdminManagement from "../features/users/AdminManagement";
import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "./ProtectedRoute";
import { Role } from "../types/role";

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          element={
            <ProtectedRoute
              roles={[
                Role.ADMIN,
                Role.CHU_TICH,
                Role.PCT,
                Role.TRUONG_PHONG,
                Role.NHAN_VIEN,
                Role.TONG_HOP,
              ]}
            >
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/admin" element={<AdminManagement />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route
          path="/unauthorized"
          element={
            <div style={{ padding: 32, textAlign: "center" }}>
              Bạn không có quyền truy cập chức năng này.
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;