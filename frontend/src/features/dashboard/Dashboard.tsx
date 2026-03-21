import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from "recharts";
import type { TooltipProps } from "recharts";
import { useAppSelector } from "../../app/store";
import { ROLE_CAPABILITY_MAP, type RoleCapabilities } from "../authorization/roleCapabilities";
import { sendZaloNotification } from "../notifications/zaloService";
import { ROLE_CONFIG_MAP } from "./roleDashboardConfig";
import { Role, ROLE_LABEL_MAP } from "../../types/role";
import { useDashboardStats } from "./useDashboardStats";
import { getDeadlineState, type TaskRecord, type TaskStatus } from "../tasks/taskData";

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

const STATUS_LABEL_MAP: Record<TaskStatus, string> = {
  MOI_NHAN: "Mới nhận",
  DANG_XU_LY: "Đang xử lý",
  CHO_DUYET: "Chờ duyệt",
  HOAN_THANH: "Hoàn thành",
  DA_HUY: "Đã hủy",
};

const STATUS_CHIP_COLOR: Record<
  TaskStatus,
  "default" | "primary" | "secondary" | "success" | "warning" | "error"
> = {
  MOI_NHAN: "primary",
  DANG_XU_LY: "warning",
  CHO_DUYET: "secondary",
  HOAN_THANH: "success",
  DA_HUY: "error",
};

const formatNumber = (value: number) => value.toLocaleString("vi-VN");

const daysUntilDue = (task: TaskRecord) => {
  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const ChartTooltip = ({ active, payload }: TooltipProps<number | string, string>) => {
  if (!active || !payload?.length) return null;

  const dataPoint = payload[0];
  if (!dataPoint || typeof dataPoint.value !== "number") return null;

  return (
    <div
      style={{
        background: "#fff",
        padding: "8px 12px",
        borderRadius: 10,
        boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 600 }}>{dataPoint.name}</div>
      <div>{formatNumber(dataPoint.value as number)} nhiệm vụ</div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const [unitFilter, setUnitFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const { stats, loading, error, tasks } = useDashboardStats(user?.role);
  const [zaloFeedback, setZaloFeedback] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);
  const notifiedTaskIdsRef = useRef<Set<string>>(new Set());

  const allTasks = tasks;
  const role = user?.role;
  const config = role ? ROLE_CONFIG_MAP[role] : undefined;
  const capability = role ? ROLE_CAPABILITY_MAP[role] : undefined;
  const roleActions = useMemo(
    () => (capability ? ROLE_FUNCTION_ACTIONS.filter((action) => action.canUse(capability)) : []),
    [capability]
  );

  const overdueEmployeeTasks = useMemo(() => {
    if (!user || user.role !== Role.NHAN_VIEN) return [];
    return allTasks.filter(
      (task) => task.assignee === user.name && getDeadlineState(task) === "QUA_HAN"
    );
  }, [allTasks, user]);

  useEffect(() => {
    if (!user || user.role !== Role.NHAN_VIEN) return;

    const tasksToNotify = overdueEmployeeTasks.filter(
      (task) => !notifiedTaskIdsRef.current.has(task.id)
    );

    if (!tasksToNotify.length) return;

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
          tasks: tasksToNotify.map((task) => ({
            id: task.id,
            title: task.title,
            dueDate: task.dueDate,
          })),
        });

        if (cancelled) return;

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
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to send Zalo notification", err);
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
  }, [overdueEmployeeTasks, user]);

  const handleRoleAction = (to: string) => navigate(to);

  const activeTasks = Math.max(stats.visibleTasks - stats.tasksCompleted, 0);

  const dueTodayCount = useMemo(
    () =>
      allTasks.filter((task) => daysUntilDue(task) === 0 && task.status !== "HOAN_THANH").length,
    [allTasks]
  );

  const dueSoonCount = useMemo(
    () =>
      allTasks.filter((task) => {
        const diff = daysUntilDue(task);
        return diff > 0 && diff <= 3 && task.status !== "HOAN_THANH";
      }).length,
    [allTasks]
  );

  const summaryCards = useMemo(
    () => [
      {
        key: "total",
        label: "Tổng nhiệm vụ",
        value: stats.visibleTasks,
        subLabel: "Theo bộ lọc hiện tại",
        accent: "#1e3a8a",
      },
      {
        key: "overdue",
        label: "Quá hạn chưa xong",
        value: stats.tasksOverdue,
        subLabel: "Đã quá hạn & chưa hoàn thành",
        accent: "#d9304f",
      },
      {
        key: "due-today",
        label: "Đến hạn hôm nay",
        value: dueTodayCount,
        subLabel: "Chưa quá hạn • ≤ 1 ngày",
        accent: "#c0841a",
      },
      {
        key: "due-soon",
        label: "Đến hạn ≤ 3 ngày",
        value: dueSoonCount,
        subLabel: "Chưa quá hạn • ≤ 3 ngày",
        accent: "#f4b400",
      },
      {
        key: "in-progress",
        label: "Đang thực hiện",
        value: activeTasks,
        subLabel: "Theo trạng thái hiển thị",
        accent: "#1f8a70",
      },
    ],
    [activeTasks, dueSoonCount, dueTodayCount, stats.tasksOverdue, stats.visibleTasks]
  );

  const distributionData = useMemo(() => {
    let normal = 0;
    let overdue = 0;
    let dueSoon = 0;
    let completed = 0;

    allTasks.forEach((task) => {
      if (task.status === "HOAN_THANH") {
        completed += 1;
        return;
      }
      const state = getDeadlineState(task);
      if (state === "QUA_HAN") overdue += 1;
      else if (state === "SAP_DEN_HAN") dueSoon += 1;
      else normal += 1;
    });

    return [
      { name: "Bình thường", value: normal, color: "#0b4fd6" },
      { name: "Quá hạn chưa xong", value: overdue, color: "#d9304f" },
      { name: "Đến hạn hôm nay", value: dueSoon, color: "#f7a600" },
      { name: "Đã hoàn thành", value: completed, color: "#1f9d8b" },
    ];
  }, [allTasks]);

  const statusPieData = useMemo(
    () => [
      { name: "Đang thực hiện", value: activeTasks, color: "#0f3360" },
      { name: "Đã hoàn thành", value: stats.tasksCompleted, color: "#299d66" },
    ],
    [activeTasks, stats.tasksCompleted]
  );

  const departmentAlertData = useMemo(() => {
    const map = new Map<string, { department: string; overdue: number; dueSoon: number }>();

    allTasks.forEach((task) => {
      if (!task.department) return;
      const state = getDeadlineState(task);
      if (state !== "QUA_HAN" && state !== "SAP_DEN_HAN") return;

      const current = map.get(task.department) ?? {
        department: task.department,
        overdue: 0,
        dueSoon: 0,
      };
      if (state === "QUA_HAN") current.overdue += 1;
      else current.dueSoon += 1;
      map.set(task.department, current);
    });

    return Array.from(map.values())
      .sort((a, b) => b.overdue + b.dueSoon - (a.overdue + a.dueSoon))
      .slice(0, 10);
  }, [allTasks]);

  const recentActivities = useMemo(
    () =>
      [...allTasks]
        .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
        .slice(0, 10),
    [allTasks]
  );

  const upcomingTasks = useMemo(
    () =>
      allTasks
        .filter((task) => {
          if (task.status === "HOAN_THANH") return false;
          const diff = daysUntilDue(task);
          return diff >= 0 && diff <= 3;
        })
        .sort((a, b) => daysUntilDue(a) - daysUntilDue(b)),
    [allTasks]
  );

  if (!user || !role || !config || !capability) {
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
    <Stack spacing={4}>
      {/* Header Card */}
      <Card sx={{ borderRadius: 3, background: "linear-gradient(120deg, #f2f6ff, #fdfbff)", border: "none" }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={3} flexWrap="wrap">
            <Box>
              <Typography variant="h4" fontWeight={800} color="#0f2a58">
                Dashboard điều hành
              </Typography>
              <Typography color="text.secondary" mt={0.5}>
                Tone xanh đậm • Cảnh báo chuẩn theo Hạn/Hoàn thành
              </Typography>
              <Stack direction="row" spacing={1.5} mt={2} alignItems="center" flexWrap="wrap">
                <Chip label={ROLE_LABEL_MAP[user.role]} color="primary" variant="outlined" />
                <Typography variant="body2" color="text.secondary">
                  {config.summary}
                </Typography>
              </Stack>
            </Box>

            <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="flex-end">
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="unit-filter-label">Đơn vị</InputLabel>
                <Select
                  labelId="unit-filter-label"
                  label="Đơn vị"
                  value={unitFilter}
                  onChange={(e) => setUnitFilter(e.target.value)}
                >
                  <MenuItem value="all">(Tất cả)</MenuItem>
                  <MenuItem value="vp">Văn phòng</MenuItem>
                  <MenuItem value="tp">Tư pháp</MenuItem>
                  <MenuItem value="noivu">Nội vụ</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="time-filter-label">Tháng (theo hạn xử lý)</InputLabel>
                <Select
                  labelId="time-filter-label"
                  label="Tháng (theo hạn xử lý)"
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                >
                  <MenuItem value="all">(Tất cả)</MenuItem>
                  <MenuItem value="current">Tháng này</MenuItem>
                  <MenuItem value="previous">Tháng trước</MenuItem>
                </Select>
              </FormControl>

              <Button variant="contained" color="primary" sx={{ px: 4, borderRadius: 999 }}>
                Làm mới
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {loading && <LinearProgress color="primary" sx={{ borderRadius: 999 }} />}
      {error && <Alert severity="error">{error}</Alert>}
      {zaloFeedback && <Alert severity={zaloFeedback.type}>{zaloFeedback.message}</Alert>}

      {/* Summary Cards – phong cách tile bo tròn */}
      <Grid container spacing={3}>
        {summaryCards.map((card) => (
          <Grid
            key={card.key}
            xs={12}
            sm={6}
            md={4}
            lg={2.3}
            sx={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Card
              sx={{
                width: "100%",
                maxWidth: 260,
                minHeight: 128,
                borderRadius: "26px",
                backgroundColor: "#fff",
                border: "none",
                boxShadow: "0 10px 28px rgba(15,23,42,0.1)",
                position: "relative",
                overflow: "hidden",
                transition: "all 0.25s ease",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  left: 0,
                  top: 16,
                  bottom: 16,
                  width: 9,
                  borderRadius: "999px",
                  backgroundColor: card.accent,
                },
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 18px 36px rgba(15,23,42,0.16)",
                },
              }}
            >
              <CardContent sx={{ pl: 3, pr: 2.4, py: 1.7 }}>
                <Typography variant="subtitle2" fontWeight={600} color="#42506b" gutterBottom sx={{ mb: 0.3 }}>
                  {card.label}
                </Typography>
                <Typography variant="h4" fontWeight={800} color="#112750" sx={{ lineHeight: 1 }}>
                  {formatNumber(card.value)}
                </Typography>
                <Typography variant="body2" color="#5f6b85" sx={{ mt: 0.4 }}>
                  {card.subLabel}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts – nhỏ gọn */}
      <Grid container spacing={2.4}>
        <Grid xs={12} md={4}>
          <Card
            sx={{
              borderRadius: "32px",
              height: "100%",
              boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
              border: "1px solid rgba(15,23,42,0.05)",
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight={700} color="#162d53">
                Phân bố theo cảnh báo
              </Typography>
              <Typography variant="caption" color="text.secondary" mb={1.5} display="block">
                Tính theo Hạn/Hoàn thành
              </Typography>
              <Box height={160}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distributionData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      {distributionData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Stack direction="row" spacing={2} flexWrap="wrap" mt={1.5} justifyContent="center">
                {distributionData.map((entry) => (
                  <Stack key={entry.name} direction="row" spacing={0.8} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: entry.color }} />
                    <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>
                      {entry.name}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} md={4}>
          <Card
            sx={{
              borderRadius: "32px",
              height: "100%",
              boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
              border: "1px solid rgba(15,23,42,0.05)",
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight={700} color="#162d53">
                Trạng thái nhiệm vụ
              </Typography>
              <Typography variant="caption" color="text.secondary" mb={1.5} display="block">
                Theo cột J
              </Typography>
              <Box height={160}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={85}
                      innerRadius={55}
                      startAngle={90}
                      endAngle={-270}
                    >
                      {statusPieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Stack direction="row" spacing={3} justifyContent="space-evenly" mt={1.5}>
                {statusPieData.map((entry) => (
                  <Box key={entry.name} textAlign="center">
                    <Typography variant="h5" fontWeight={700} color={entry.color} sx={{ fontSize: "1.4rem" }}>
                      {formatNumber(entry.value)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                      {entry.name}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} md={4}>
          <Card
            sx={{
              borderRadius: "32px",
              height: "100%",
              boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
              border: "1px solid rgba(15,23,42,0.05)",
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight={700} color="#162d53">
                Cảnh báo theo đơn vị
              </Typography>
              <Typography variant="caption" color="text.secondary" mb={1.5} display="block">
                Top 10 (Quá hạn + Đến hạn hôm nay)
              </Typography>
              <Box height={160}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentAlertData} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                    <XAxis
                      dataKey="department"
                      angle={-30}
                      textAnchor="end"
                      height={50}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      width={24}
                      tickLine={false}
                      axisLine={false}
                    />
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Bar dataKey="overdue" stackId="a" fill="#0f3c8f" maxBarSize={24} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="dueSoon" stackId="a" fill="#5cc0c0" maxBarSize={24} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent activities & Upcoming tasks */}
      <Grid container spacing={2}>
        <Grid xs={12} md={7}>
          <Card sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Hoạt động gần đây
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Chỉ 10 nhiệm vụ gần nhất (theo ngày văn bản)
              </Typography>
              <Stack divider={<Divider flexItem />} spacing={1}>
                {recentActivities.map((task) => (
                  <Box key={task.id} py={1} display="flex" gap={2} alignItems="flex-start">
                    <Stack flex={1} spacing={0.5}>
                      <Typography
                        variant="subtitle2"
                        color={getDeadlineState(task) === "QUA_HAN" ? "error.main" : "text.primary"}
                      >
                        {task.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {task.department} • {task.dueDate}
                      </Typography>
                    </Stack>
                    <Chip
                      size="small"
                      label={STATUS_LABEL_MAP[task.status]}
                      color={STATUS_CHIP_COLOR[task.status]}
                      variant="outlined"
                    />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} md={5}>
          <Card sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Nhiệm vụ gần hạn
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Chưa hoàn thành • ≤ 3 ngày
              </Typography>
              <Stack spacing={1.2}>
                {upcomingTasks.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Không có nhiệm vụ nào gần hạn.
                  </Typography>
                ) : (
                  upcomingTasks.map((task) => {
                    const diff = daysUntilDue(task);
                    return (
                      <Box
                        key={task.id}
                        p={1.5}
                        borderRadius={2}
                        sx={{ backgroundColor: alpha("#f59e0b", 0.08) }}
                      >
                        <Typography variant="subtitle2" fontWeight={600}>
                          {task.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {task.department} • {task.dueDate} •{" "}
                          {diff === 0 ? "Đến hạn hôm nay" : `Còn ${diff} ngày`}
                        </Typography>
                      </Box>
                    );
                  })
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bottom section */}
      <Grid container spacing={2}>
        <Grid xs={12} md={6}>
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

        <Grid xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: "100%" }}>
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
                      boxShadow: "0 4px 12px rgba(15,23,42,0.05)",
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
        </Grid>
      </Grid>
    </Stack>
  );
};

export default Dashboard;