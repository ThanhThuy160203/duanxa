import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/store";
import { buildTaskAlerts, getVisibleTasksByRole } from "../features/tasks/taskData";
import { useTasksRealtime } from "../features/tasks/useTasksRealtime";
import { Role, ROLE_LABEL_MAP } from "../types/role";
import { logout } from "../features/auth/authSlice";

const PRIMARY_NAV = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/tasks", label: "Nhiệm vụ" },
  { path: "/reports", label: "Báo cáo" },
];

const MANAGEMENT_NAV_ROLES: Role[] = [Role.CHU_TICH, Role.PCT, Role.TRUONG_PHONG];

const MainLayout = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const user = useAppSelector((state) => state.auth.user);
  const { tasks } = useTasksRealtime();
  const [showAlerts, setShowAlerts] = useState(true);

  const loginAlerts = useMemo(() => {
    if (!user) {
      return [];
    }

    const visibleTasks = getVisibleTasksByRole(tasks, user.role);
    return buildTaskAlerts(visibleTasks).messages;
  }, [tasks, user]);

  const navItems = useMemo(() => {
    const items = [...PRIMARY_NAV];

    if (user?.role === Role.ADMIN) {
      items.push({ path: "/admin", label: "Quản trị tài khoản" });
    } else if (user && MANAGEMENT_NAV_ROLES.includes(user.role)) {
      items.push({ path: "/admin", label: "Quản trị tài khoản" });
    }

    items.push({ path: "/profile", label: "Hồ sơ" });

    return items;
  }, [user]);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default", p: 2 }}>
      <Box
        component="aside"
        sx={{
          width: 290,
          bgcolor: "background.paper",
          color: "text.primary",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          p: 2,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 1 }}>
          <Avatar sx={{ bgcolor: "primary.main", width: 38, height: 38 }}>
            {user?.name?.charAt(0) ?? "U"}
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700} letterSpacing={0.2}>
              UBND Đắk Lắk
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Hệ thống quản lý nhiệm vụ
            </Typography>
          </Box>
        </Stack>

        <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2.5, bgcolor: "primary.main", color: "common.white" }}>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            Người dùng hiện tại
          </Typography>
          <Typography fontWeight={700}>{user?.name ?? "Khách"}</Typography>
          {user?.role && (
            <Chip
              size="small"
              label={ROLE_LABEL_MAP[user.role]}
              sx={{ mt: 1, bgcolor: "rgba(255,255,255,0.18)", color: "common.white", fontWeight: 600 }}
            />
          )}
        </Paper>

        <Box>
          <Typography variant="overline" sx={{ opacity: 0.7, px: 1 }}>
            Điều hướng chính
          </Typography>
          <List sx={{ p: 0 }}>
            {navItems.map((item) => (
              <ListItemButton
                key={item.path}
                selected={isActive(item.path)}
                onClick={() => navigate(item.path)}
                sx={{
                  mb: 0.5,
                  "&.Mui-selected": {
                    bgcolor: "rgba(15, 98, 254, 0.1)",
                    color: "primary.main",
                  },
                }}
              >
                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600 }} />
              </ListItemButton>
            ))}
          </List>
        </Box>

        <Divider />
        <Button variant="outlined" color="error" fullWidth onClick={handleLogout}>
          Đăng xuất
        </Button>
      </Box>

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", ml: 2, minWidth: 0 }}>
        <Paper
          sx={{
            flex: 1,
            p: { xs: 2, md: 3 },
            borderRadius: 4,
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow: "0 25px 60px rgba(15,23,42,0.08)",
            backgroundColor: "rgba(255,255,255,0.9)",
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
          }}
        >
          <Paper
            component="header"
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              background: "linear-gradient(135deg, rgba(15,98,254,0.95) 0%, rgba(92,63,252,0.9) 100%)",
              color: "common.white",
            }}
          >
            <Typography variant="h5" fontWeight={700}>
              Trung tâm điều hành nhiệm vụ
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.4 }}>
              Theo dõi tiến độ, cảnh báo quá hạn và hiệu suất theo từng cấp quản lý.
            </Typography>
          </Paper>

          {showAlerts && loginAlerts.length > 0 && (
            <Stack spacing={1}>
              {loginAlerts.map((message) => (
                <Alert
                  key={message}
                  severity={message.includes("quá hạn") ? "error" : "warning"}
                  action={
                    <IconButton size="small" color="inherit" onClick={() => setShowAlerts(false)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  {message}
                </Alert>
              ))}
            </Stack>
          )}

          <Box component="main" sx={{ flex: 1 }}>
            <Outlet />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default MainLayout;
