import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../app/store";
import { ROLE_CAPABILITY_MAP, type RoleCapabilities } from "../authorization/roleCapabilities";
import { sendZaloNotification } from "../notifications/zaloService";
import { HIGHLIGHT_TONE_COLORS, ROLE_CONFIG_MAP } from "./roleDashboardConfig";
import { getHighlightDetail, getHighlightValue } from "./highlightUtils";
import { Role, ROLE_LABEL_MAP } from "../../types/role";
import { useDashboardStats } from "./useDashboardStats";
import { useTasksRealtime } from "../tasks/useTasksRealtime";
import { getDeadlineState } from "../tasks/taskData";

type RoleFunctionAction = {
  key: string;
  label: string;
  to: string;
  color: string;
  hoverBg: string;
  canUse: (capabilities: RoleCapabilities) => boolean;
};

const ROLE_FUNCTION_ACTIONS: RoleFunctionAction[] = [
  {
    key: "receive-task",
    label: "Nhận nhiệm vụ",
    to: "/tasks",
    color: "#2563eb",
    hoverBg: "rgba(37, 99, 235, 0.08)",
    canUse: (cap) => cap.canReceiveTask,
  },
  {
    key: "assign-task",
    label: "Giao nhiệm vụ",
    to: "/tasks",
    color: "#1d4ed8",
    hoverBg: "rgba(29, 78, 216, 0.08)",
    canUse: (cap) => cap.canAssignTask || cap.canCreateTask,
  },
  {
    key: "reassign-task",
    label: "Giao lại",
    to: "/tasks",
    color: "#3b82f6",
    hoverBg: "rgba(59, 130, 246, 0.08)",
    canUse: (cap) => cap.canReassignTask,
  },
  {
    key: "feedback",
    label: "Đánh giá/Phản hồi",
    to: "/tasks",
    color: "#10b981",
    hoverBg: "rgba(16, 185, 129, 0.1)",
    canUse: (cap) => cap.canEvaluateTask || cap.canProvideFeedback,
  },
  {
    key: "cancel-task",
    label: "Hủy nhiệm vụ",
    to: "/tasks",
    color: "#f43f5e",
    hoverBg: "rgba(244, 63, 94, 0.1)",
    canUse: (cap) => cap.canCancelTask,
  },
  {
    key: "export-report",
    label: "Xuất báo cáo chi tiết",
    to: "/reports",
    color: "#ec4899",
    hoverBg: "rgba(236, 72, 153, 0.1)",
    canUse: (cap) => cap.canExportReport,
  },
  {
    key: "performance-alert",
    label: "Cảnh báo hiệu suất",
    to: "/reports",
    color: "#d97706",
    hoverBg: "rgba(217, 119, 6, 0.1)",
    canUse: (cap) => cap.canWarnPerformance,
  },
  {
    key: "classify-source",
    label: "Phân loại nguồn giao",
    to: "/reports",
    color: "#f59e0b",
    hoverBg: "rgba(245, 158, 11, 0.12)",
    canUse: (cap) => cap.canClassifyTaskSource,
  },
  {
    key: "manage-account",
    label: "Quản trị tài khoản",
    to: "/admin",
    color: "#dc2626",
    hoverBg: "rgba(220, 38, 38, 0.12)",
    canUse: (cap) => cap.canManageAccounts,
  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const { stats, loading: statsLoading, error: statsError } = useDashboardStats(user?.role);
  const { tasks: realtimeTasks } = useTasksRealtime({ enabled: Boolean(user && user.role === Role.NHAN_VIEN) });
  const [zaloFeedback, setZaloFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const notifiedTaskIdsRef = useRef<Set<string>>(new Set());

  const overdueEmployeeTasks = useMemo(() => {
    if (!user || user.role !== Role.NHAN_VIEN) {
      return [];
    }

    return realtimeTasks.filter(
      (task) => task.assignee === user.name && getDeadlineState(task) === "QUA_HAN"
    );
  }, [realtimeTasks, user?.name, user?.role]);

  useEffect(() => {
    if (!user || user.role !== Role.NHAN_VIEN) {
      return;
    }

    const tasksToNotify = overdueEmployeeTasks.filter((task) => !notifiedTaskIdsRef.current.has(task.id));

    if (!tasksToNotify.length) {
      return;
    }

    let cancelled = false;

    const message =
      `Bạn có ${tasksToNotify.length} nhiệm vụ quá hạn cần xử lý ngay: ` +
      tasksToNotify.map((task) => `${task.id} - ${task.title}`).join(", ");

    const deliver = async () => {
      try {
        const result = await sendZaloNotification({
          userId: user.id,
          userName: user.name,
          message,
          tasks: tasksToNotify.map((task) => ({ id: task.id, title: task.title, dueDate: task.dueDate })),
        });

        if (cancelled) {
          return;
        }

        if (!result.delivered) {
          setZaloFeedback({
            type: "error",
            message: "Không thể gửi nhắc Zalo do chưa cấu hình endpoint.",
          });
          return;
        }

        tasksToNotify.forEach((task) => notifiedTaskIdsRef.current.add(task.id));
        setZaloFeedback({
          type: "success",
          message: `Đã gửi nhắc Zalo cho ${tasksToNotify.length} nhiệm vụ quá hạn.`,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Failed to send Zalo notification", error);
        setZaloFeedback({
          type: "error",
          message: "Không thể gửi nhắc Zalo. Vui lòng thử lại sau.",
        });
      }
    };

    deliver();

    return () => {
      cancelled = true;
    };
  }, [overdueEmployeeTasks, user?.id, user?.name, user?.role]);

  if (!user) {
    return null;
  }

  const config = ROLE_CONFIG_MAP[user.role];
  const capability = ROLE_CAPABILITY_MAP[user.role];
  const roleActions = ROLE_FUNCTION_ACTIONS.filter((action) => action.canUse(capability));

  const handleRoleAction = (to: string) => {
    navigate(to);
  };

  if (!config || !capability) {
    return (
      <Box textAlign="center" py={8}>
        <Typography variant="h5" gutterBottom>
          Không tìm thấy cấu hình vai trò
        </Typography>
        <Button variant="contained" onClick={() => navigate("/login")}>
          Quay lại đăng nhập
        </Button>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap">
            <Box>
              <Typography variant="h5" gutterBottom>
                Dashboard {ROLE_LABEL_MAP[user.role]}
              </Typography>
              <Typography color="text.secondary">{config.description}</Typography>
            </Box>
            <Chip
              label={config.role}
              color={HIGHLIGHT_TONE_COLORS[config.highlights[0]?.tone ?? "default"]}
              variant="outlined"
            />
          </Stack>
        </CardContent>
      </Card>

  {statsError && <Alert severity="error">{statsError}</Alert>}
  {zaloFeedback && <Alert severity={zaloFeedback.type}>{zaloFeedback.message}</Alert>}

      <Grid container spacing={2}>
        {config.highlights.map((highlight) => {
          const value = getHighlightValue(highlight, stats);
          const detailText = getHighlightDetail(highlight, stats);

          return (
            <Grid item xs={12} sm={6} md={4} key={highlight.label}>
            <Card sx={{ borderRadius: 3, height: "100%" }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2">
                  {highlight.label}
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                  {value}
                </Typography>
                {detailText && (
                  <Typography color="text.secondary" variant="body2">
                    {detailText}
                  </Typography>
                )}
                {highlight.statKey && (
                  <Typography color="text.secondary" variant="caption">
                    {statsLoading ? "Đang đồng bộ..." : "Realtime"}
                  </Typography>
                )}
              </CardContent>
            </Card>
            </Grid>
          );
        })}
      </Grid>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Chức năng theo vai trò
          </Typography>
          <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap>
            {roleActions.map((action) => (
              <Button
                key={action.key}
                variant="outlined"
                size="small"
                onClick={() => handleRoleAction(action.to)}
                sx={{
                  borderRadius: 999,
                  textTransform: "none",
                  fontWeight: 600,
                  borderColor: action.color,
                  color: action.color,
                  px: 2.5,
                  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
                  "&:hover": {
                    borderColor: action.color,
                    backgroundColor: action.hoverBg,
                  },
                }}
              >
                {action.label}
              </Button>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Nhắc việc khi đăng nhập
              </Typography>
              <Stack spacing={1}>
                {config.notifications.map((notification) => (
                  <Alert key={notification} severity="warning" variant="outlined">
                    {notification}
                  </Alert>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Thao tác nhanh
              </Typography>
              <Stack spacing={1.5}>
                <Button variant="contained" onClick={() => navigate("/tasks")}>
                  Vào trang nhiệm vụ
                </Button>
                <Button variant="outlined" onClick={() => navigate("/reports")}>Vào trang báo cáo</Button>
                {user.role === Role.ADMIN && (
                  <Button variant="outlined" color="error" onClick={() => navigate("/admin")}>
                    Vào quản trị tài khoản
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default Dashboard;
