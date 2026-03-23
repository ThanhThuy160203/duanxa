import { BrowserRouter, Route, Routes } from "react-router-dom";
import AuthSessionManager from "../features/auth/AuthSessionManager";
import LoginEntry from "../features/auth/LoginEntry";
import Profile from "../features/auth/Profile";
import Dashboard from "../features/dashboard/Dashboard";
import Reports from "../features/reports/Reports";
import TaskDetail from "../features/tasks/TaskDetail";
import Tasks from "../features/tasks/Tasks";
import AdminManagement from "../features/users/AdminManagement";
import MainLayout from "../layouts/MainLayout";
import { Role } from "../types/role";
import ProtectedRoute from "./ProtectedRoute";

const AppRouter = () => {
  return (
    <BrowserRouter>
      <AuthSessionManager />
      <Routes>
        <Route path="/login" element={<LoginEntry />} />

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
          <Route path="/tasks/:taskId" element={<TaskDetail />} />
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