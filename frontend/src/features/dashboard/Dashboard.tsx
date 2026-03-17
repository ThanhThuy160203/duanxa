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
import { ROLE_CAPABILITY_MAP } from "../authorization/roleCapabilities";
import { sendZaloNotification } from "../notifications/zaloService";
import { HIGHLIGHT_TONE_COLORS, ROLE_CONFIG_MAP } from "./roleDashboardConfig";
import { getHighlightDetail, getHighlightValue } from "./highlightUtils";
import { Role, ROLE_LABEL_MAP } from "../../types/role";
import { useDashboardStats } from "./useDashboardStats";
import { useTasksRealtime } from "../tasks/useTasksRealtime";
import { getDeadlineState } from "../tasks/taskData";

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
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {capability.canReceiveTask && <Chip label="Nhận nhiệm vụ" color="info" variant="outlined" />}
            {capability.canAssignTask && <Chip label="Giao nhiệm vụ" color="primary" variant="outlined" />}
            {capability.canReassignTask && <Chip label="Giao lại" color="primary" variant="outlined" />}
            {capability.canEvaluateTask && <Chip label="Đánh giá/Phản hồi" color="success" variant="outlined" />}
            {capability.canCancelTask && <Chip label="Hủy nhiệm vụ" color="error" variant="outlined" />}
            {capability.canExportReport && <Chip label="Xuất báo cáo chi tiết" color="secondary" variant="outlined" />}
            {capability.canWarnPerformance && <Chip label="Cảnh báo hiệu suất" color="warning" variant="outlined" />}
            {capability.canClassifyTaskSource && <Chip label="Phân loại nguồn giao" color="warning" variant="outlined" />}
            {capability.canManageAccounts && <Chip label="Quản trị tài khoản" color="error" variant="outlined" />}
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
