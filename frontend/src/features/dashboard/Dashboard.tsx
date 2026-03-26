import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Chip,
  Divider,
  FormControl,
  FormHelperText,
  InputLabel,
  IconButton,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import StarBorderIcon from "@mui/icons-material/StarBorder";
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
import { fetchDepartments, type DepartmentOption } from "../users/userService";
import {
  DEADLINE_STATE_COLOR_MAP,
  DEADLINE_STATE_SHORT_LABEL_MAP,
  getDeadlineState,
  type TaskRecord,
  type TaskStatus,
} from "../tasks/taskData";

type RoleFunctionAction = {
  key: string;
  label: string;
  to: string;
  color: string;
  hoverBg: string;
  canUse: (capabilities: RoleCapabilities) => boolean;
};

type SummaryCardKey = "total" | "overdue" | "due-today" | "due-soon" | "in-progress";

const SUMMARY_CARD_DESCRIPTIONS: Record<SummaryCardKey, string> = {
  total: "Danh sách nhiệm vụ đang hiển thị theo quyền hiện tại.",
  overdue: "Những nhiệm vụ đã quá hạn nhưng chưa được hoàn thành.",
  "due-today": "Nhiệm vụ phải hoàn thành trong hôm nay nhưng chưa xong.",
  "due-soon": "Các nhiệm vụ sẽ đến hạn trong 3 ngày tới.",
  "in-progress": "Tổng nhiệm vụ đang xử lý hoặc chờ duyệt.",
};

const SUMMARY_CARD_EMPTY_STATE: Record<SummaryCardKey, string> = {
  total: "Không có nhiệm vụ nào trong bộ lọc hiện tại.",
  overdue: "Không có nhiệm vụ quá hạn trong bộ lọc hiện tại.",
  "due-today": "Không có nhiệm vụ đến hạn hôm nay.",
  "due-soon": "Không có nhiệm vụ nào sắp đến hạn (≤ 3 ngày).",
  "in-progress": "Không có nhiệm vụ nào đang thực hiện.",
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

const formatDateString = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("vi-VN");
};

const getPriorityChipProps = (label?: string) => {
  if (!label) {
    return { text: "Không rõ", color: "default" as const };
  }

  const normalized = label.trim().toLowerCase();
  if (normalized.includes("cao")) {
    return { text: "Cao", color: "error" as const };
  }
  if (normalized.includes("trung")) {
    return { text: "Trung bình", color: "warning" as const };
  }
  if (normalized.includes("thuong") || normalized.includes("thường")) {
    return { text: "Thường xuyên", color: "info" as const };
  }
  return { text: label, color: "default" as const };
};

const formatDateForInput = (value?: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

const MONTH_FILTER_OPTIONS = [1, 2, 12].map((month) => ({
  value: String(month),
  label: `Tháng ${month}`,
}));

const normalizeDepartmentName = (value?: string) => value?.trim().toLowerCase() ?? "";

const isTaskInSelectedMonth = (dueDate: string, selectedMonth: string) => {
  if (selectedMonth === "all") return true;
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getMonth() + 1 === Number(selectedMonth);
};

const Dashboard = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const [unitFilter, setUnitFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [refreshToken, setRefreshToken] = useState(0);
  const { loading, error, tasks, users } = useDashboardStats(user?.role, refreshToken);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [departmentsError, setDepartmentsError] = useState<string | null>(null);
  const [zaloFeedback, setZaloFeedback] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);
  const [selectedSummaryKey, setSelectedSummaryKey] = useState<SummaryCardKey | null>(null);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<TaskRecord | null>(null);
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
  const [reassignDepartment, setReassignDepartment] = useState("");
  const [reassignAssignee, setReassignAssignee] = useState("");
  const [reassignDueDate, setReassignDueDate] = useState("");
  const notifiedTaskIdsRef = useRef<Set<string>>(new Set());

  const allTasks = tasks;
  const assigneeOptionsByDepartment = useMemo(() => {
    const map = new Map<string, { label: string; assignees: string[] }>();
    users.forEach((profile) => {
      if (!profile.department) return;
      const label = profile.department.trim();
      const key = normalizeDepartmentName(label);
      const entry = map.get(key) ?? { label, assignees: [] };
      if (profile.name && !entry.assignees.includes(profile.name)) {
        entry.assignees.push(profile.name);
      }
      map.set(key, entry);
    });
    return map;
  }, [users]);

  const departmentOptionsForAssign = useMemo(() => {
    if (departments.length) {
      return departments;
    }
    return Array.from(assigneeOptionsByDepartment.values()).map((entry) => ({
      code: entry.label,
      name: entry.label,
    }));
  }, [assigneeOptionsByDepartment, departments]);

  const availableAssignees = useMemo(() => {
    if (!reassignDepartment) {
      return users.map((profile) => profile.name).filter(Boolean);
    }
    const entry = assigneeOptionsByDepartment.get(normalizeDepartmentName(reassignDepartment));
    return entry?.assignees ?? [];
  }, [assigneeOptionsByDepartment, reassignDepartment, users]);

  const isReassignFormValid = Boolean(reassignDepartment && reassignAssignee && reassignDueDate);
  const filteredTasks = useMemo(() => {
    const shouldFilterUnit = unitFilter !== "all";
    const shouldFilterMonth = timeFilter !== "all";

    if (!shouldFilterUnit && !shouldFilterMonth) {
      return allTasks;
    }

    return allTasks.filter((task) => {
      const matchesUnit = shouldFilterUnit
        ? normalizeDepartmentName(task.department) === normalizeDepartmentName(unitFilter)
        : true;
      const matchesMonth = shouldFilterMonth
        ? isTaskInSelectedMonth(task.dueDate, timeFilter)
        : true;
      return matchesUnit && matchesMonth;
    });
  }, [allTasks, timeFilter, unitFilter]);

  const filteredStats = useMemo(() => {
    let tasksCompleted = 0;
    let tasksOverdue = 0;

    filteredTasks.forEach((task) => {
      if (task.status === "HOAN_THANH") {
        tasksCompleted += 1;
      }
      if (getDeadlineState(task) === "QUA_HAN") {
        tasksOverdue += 1;
      }
    });

    return {
      visibleTasks: filteredTasks.length,
      tasksCompleted,
      tasksOverdue,
    };
  }, [filteredTasks]);
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
    let cancelled = false;

    const loadDepartments = async () => {
      try {
        setDepartmentsLoading(true);
        const data = await fetchDepartments();
        if (cancelled) return;
        setDepartments(data);
        setDepartmentsError(null);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to fetch departments", err);
        setDepartmentsError("Không thể tải danh sách đơn vị.");
      } finally {
        if (!cancelled) {
          setDepartmentsLoading(false);
        }
      }
    };

    loadDepartments();

    return () => {
      cancelled = true;
    };
  }, []);

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
  const handleManualRefresh = () => setRefreshToken((token) => token + 1);
  const handleSummaryCardClick = (key: SummaryCardKey) => setSelectedSummaryKey(key);
  const handleSummaryCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, key: SummaryCardKey) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSummaryCardClick(key);
    }
  };
  const handleCloseSummaryDialog = () => setSelectedSummaryKey(null);
  const handleNavigateToTasks = (key: SummaryCardKey) => {
    const params = new URLSearchParams();
    params.set("dashboardFilter", key);
    navigate(`/tasks?${params.toString()}`);
    setSelectedSummaryKey(null);
  };
  const handleCloseTaskDetail = () => setSelectedTaskDetail(null);

  useEffect(() => {
    if (!selectedTaskDetail) {
      setIsReassignDialogOpen(false);
      return;
    }
    setReassignDepartment(selectedTaskDetail.department ?? "");
    setReassignAssignee(selectedTaskDetail.assignee ?? "");
    setReassignDueDate(formatDateForInput(selectedTaskDetail.dueDate));
  }, [selectedTaskDetail]);

  const handleOpenReassignDialog = () => {
    if (!selectedTaskDetail) return;
    setIsReassignDialogOpen(true);
  };
  const handleCloseReassignDialog = () => setIsReassignDialogOpen(false);

  const handleConfirmReassign = () => {
    setIsReassignDialogOpen(false);
    if (reassignAssignee && reassignDepartment) {
      setZaloFeedback({
        type: "success",
        message: `Đã chuẩn bị giao lại cho ${reassignAssignee} (${reassignDepartment}).`,
      });
    }
  };

  const activeTasks = Math.max(filteredStats.visibleTasks - filteredStats.tasksCompleted, 0);

  const dueTodayCount = useMemo(
    () =>
      filteredTasks.filter((task) => daysUntilDue(task) === 0 && task.status !== "HOAN_THANH").length,
    [filteredTasks]
  );

  const dueSoonCount = useMemo(
    () =>
      filteredTasks.filter((task) => {
        const diff = daysUntilDue(task);
        return diff > 0 && diff <= 3 && task.status !== "HOAN_THANH";
      }).length,
    [filteredTasks]
  );

  const summaryCards = useMemo<Array<{ key: SummaryCardKey; label: string; value: number; subLabel: string; accent: string }>>(
    () => [
      {
        key: "total",
        label: "Tổng nhiệm vụ",
        value: filteredStats.visibleTasks,
        subLabel: "Theo bộ lọc hiện tại",
        accent: "#1e3a8a",
      },
      {
        key: "overdue",
        label: "Quá hạn chưa xong",
        value: filteredStats.tasksOverdue,
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
    [activeTasks, dueSoonCount, dueTodayCount, filteredStats.tasksOverdue, filteredStats.visibleTasks]
  );

  const summaryModalCard = selectedSummaryKey
    ? summaryCards.find((card) => card.key === selectedSummaryKey)
    : undefined;

  const summaryModalTasks = useMemo(() => {
    if (!selectedSummaryKey) return [];

    const filtered = filteredTasks.filter((task) => {
      const diff = daysUntilDue(task);
      switch (selectedSummaryKey) {
        case "overdue":
          return getDeadlineState(task) === "QUA_HAN" && task.status !== "HOAN_THANH";
        case "due-today":
          return diff === 0 && task.status !== "HOAN_THANH";
        case "due-soon":
          return diff > 0 && diff <= 3 && task.status !== "HOAN_THANH";
        case "in-progress":
          return !["HOAN_THANH", "DA_HUY"].includes(task.status);
        case "total":
        default:
          return true;
      }
    });

    return filtered.sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  }, [filteredTasks, selectedSummaryKey]);

  const distributionData = useMemo(() => {
    let normal = 0;
    let overdue = 0;
    let dueSoon = 0;
    let completed = 0;

    filteredTasks.forEach((task) => {
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
  }, [filteredTasks]);

  const statusPieData = useMemo(
    () => [
      { name: "Đang thực hiện", value: activeTasks, color: "#0f3360" },
      { name: "Đã hoàn thành", value: filteredStats.tasksCompleted, color: "#299d66" },
    ],
    [activeTasks, filteredStats.tasksCompleted]
  );

  const departmentAlertData = useMemo(() => {
    const map = new Map<string, { department: string; overdue: number; dueSoon: number }>();

    filteredTasks.forEach((task) => {
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
  }, [filteredTasks]);

  const recentActivities = useMemo(
    () =>
      [...filteredTasks]
        .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
        .slice(0, 10),
    [filteredTasks]
  );

  const upcomingTasks = useMemo(
    () =>
      filteredTasks
        .filter((task) => {
          if (task.status === "HOAN_THANH") return false;
          const diff = daysUntilDue(task);
          return diff >= 0 && diff <= 3;
        })
        .sort((a, b) => daysUntilDue(a) - daysUntilDue(b)),
    [filteredTasks]
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
    <>
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
                  {departmentsLoading && (
                    <MenuItem disabled value="__loading">
                      Đang tải danh sách...
                    </MenuItem>
                  )}
                  {departments.map((department) => (
                    <MenuItem key={department.code ?? department.name} value={department.name}>
                      {department.name}
                    </MenuItem>
                  ))}
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
                  {MONTH_FILTER_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="contained"
                color="primary"
                sx={{ px: 4, borderRadius: 999 }}
                onClick={handleManualRefresh}
                disabled={loading}
              >
                Làm mới
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {loading && <LinearProgress color="primary" sx={{ borderRadius: 999 }} />}
      {error && <Alert severity="error">{error}</Alert>}
      {zaloFeedback && <Alert severity={zaloFeedback.type}>{zaloFeedback.message}</Alert>}
      {departmentsError && <Alert severity="warning">{departmentsError}</Alert>}

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
              role="button"
              tabIndex={0}
              aria-label={`${card.label} - xem danh sách nhiệm vụ`}
              onClick={() => handleSummaryCardClick(card.key)}
              onKeyDown={(event) => handleSummaryCardKeyDown(event, card.key)}
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
                cursor: "pointer",
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

    <Dialog
      open={Boolean(selectedSummaryKey)}
      onClose={handleCloseSummaryDialog}
      fullWidth
      maxWidth="md"
      aria-labelledby="summary-task-dialog-title"
    >
      <DialogTitle id="summary-task-dialog-title">
        {summaryModalCard?.label ?? "Nhiệm vụ"} ({summaryModalTasks.length})
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" mb={2}>
          {selectedSummaryKey ? SUMMARY_CARD_DESCRIPTIONS[selectedSummaryKey] : ""}
        </Typography>
        {summaryModalTasks.length ? (
          <TableContainer sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider", maxHeight: 520 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Thao tác</TableCell>
                  <TableCell>Cảnh báo</TableCell>
                  <TableCell>Tên nhiệm vụ</TableCell>
                  <TableCell>Đơn vị</TableCell>
                  <TableCell>Phụ trách</TableCell>
                  <TableCell>Hạn</TableCell>
                  <TableCell>Số hiệu</TableCell>
                  <TableCell>Ngày VB</TableCell>
                  <TableCell>Ưu tiên</TableCell>
                  <TableCell>Hoàn thành</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell>Còn lại</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summaryModalTasks.map((task) => {
                  const deadlineState = getDeadlineState(task);
                  const diff = daysUntilDue(task);
                  const remainingLabel = diff > 0 ? `Còn ${diff} ngày` : diff === 0 ? "Đến hạn hôm nay" : `Quá ${Math.abs(diff)} ngày`;
                  const remainingColor = diff < 0 ? "error.main" : diff === 0 ? "warning.main" : "text.secondary";
                  const rowBg =
                    deadlineState === "QUA_HAN"
                      ? alpha("#dc2626", 0.08)
                      : deadlineState === "SAP_DEN_HAN"
                        ? alpha("#fbbf24", 0.18)
                        : "transparent";
                  const dueDateLabel = formatDateString(task.dueDate) ?? task.dueDate;
                  const documentDateLabel = formatDateString(task.documentDate) ?? "—";
                  const { text: priorityText, color: priorityColor } = getPriorityChipProps(task.priorityLabel);
                  return (
                    <TableRow key={task.id} sx={{ backgroundColor: rowBg }} hover>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Nhắc cảnh báo">
                            <IconButton size="small">
                              <NotificationsNoneIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Ghim nhiệm vụ">
                            <IconButton size="small">
                              <PushPinOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Theo dõi">
                            <IconButton size="small">
                              <StarBorderIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Button size="small" onClick={() => setSelectedTaskDetail(task)}>
                            Xem
                          </Button>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={DEADLINE_STATE_SHORT_LABEL_MAP[deadlineState]}
                          size="small"
                          color={DEADLINE_STATE_COLOR_MAP[deadlineState]}
                          variant="filled"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={700}>{task.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {task.id}
                        </Typography>
                      </TableCell>
                      <TableCell>{task.department || "-"}</TableCell>
                      <TableCell>{task.assignee || "-"}</TableCell>
                      <TableCell>
                        <Typography fontWeight={600}>{dueDateLabel}</Typography>
                      </TableCell>
                      <TableCell>{task.documentCode || "—"}</TableCell>
                      <TableCell>{documentDateLabel}</TableCell>
                      <TableCell>
                        <Chip label={priorityText} size="small" color={priorityColor} variant="outlined" />
                      </TableCell>
                      <TableCell sx={{ minWidth: 120 }}>
                        <Stack spacing={0.5}>
                          <Typography fontWeight={600}>{task.completionRate}%</Typography>
                          <LinearProgress
                            variant="determinate"
                            value={task.completionRate}
                            sx={{ height: 6, borderRadius: 999 }}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={STATUS_LABEL_MAP[task.status]}
                          size="small"
                          color={STATUS_CHIP_COLOR[task.status]}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color={remainingColor} fontWeight={600}>
                          {remainingLabel}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {selectedSummaryKey ? SUMMARY_CARD_EMPTY_STATE[selectedSummaryKey] : ""}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseSummaryDialog}>Đóng</Button>
        {selectedSummaryKey && (
          <Button variant="contained" onClick={() => handleNavigateToTasks(selectedSummaryKey)}>
            Xem trong trang nhiệm vụ
          </Button>
        )}
      </DialogActions>
    </Dialog>

    <Dialog
      open={Boolean(selectedTaskDetail)}
      onClose={handleCloseTaskDetail}
      fullWidth
      maxWidth="sm"
      aria-labelledby="task-detail-dialog-title"
    >
      {selectedTaskDetail && (
        <>
          <DialogTitle id="task-detail-dialog-title">
            {selectedTaskDetail.title}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={DEADLINE_STATE_SHORT_LABEL_MAP[getDeadlineState(selectedTaskDetail)]}
                  color={DEADLINE_STATE_COLOR_MAP[getDeadlineState(selectedTaskDetail)]}
                  size="small"
                />
                <Chip
                  label={STATUS_LABEL_MAP[selectedTaskDetail.status]}
                  color={STATUS_CHIP_COLOR[selectedTaskDetail.status]}
                  size="small"
                />
                <Chip
                  label={selectedTaskDetail.priorityLabel || "Không rõ ưu tiên"}
                  size="small"
                  variant="outlined"
                />
              </Stack>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Cơ quan giao
                  </Typography>
                  <Typography fontWeight={600}>{selectedTaskDetail.source}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Số hiệu văn bản
                  </Typography>
                  <Typography fontWeight={600}>{selectedTaskDetail.documentCode || "—"}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Ngày ban hành
                  </Typography>
                  <Typography fontWeight={600}>{formatDateString(selectedTaskDetail.documentDate) ?? "—"}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Đơn vị chủ trì
                  </Typography>
                  <Typography fontWeight={600}>{selectedTaskDetail.department}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Người phụ trách
                  </Typography>
                  <Typography fontWeight={600}>{selectedTaskDetail.assignee}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Hạn xử lý
                  </Typography>
                  <Typography fontWeight={600}>{formatDateString(selectedTaskDetail.dueDate) ?? selectedTaskDetail.dueDate}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Ngày hoàn thành
                  </Typography>
                  <Typography fontWeight={600}>{selectedTaskDetail.feedback || "Chưa xong"}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Mức độ ưu tiên
                  </Typography>
                  <Typography fontWeight={600}>{selectedTaskDetail.priorityLabel || "Không xác định"}</Typography>
                </Grid>
              </Grid>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
            <Stack direction="row" spacing={1}>
              <Button color="error" variant="contained">
                Xóa
              </Button>
              <Button variant="outlined">Ghim việc</Button>
              <Button variant="outlined" onClick={handleOpenReassignDialog}>
                Giao lại
              </Button>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => navigate(`/tasks/${selectedTaskDetail.id}`)}>
                Sửa chi tiết
              </Button>
              <Button variant="outlined" color="inherit" onClick={handleCloseTaskDetail}>
                Đóng
              </Button>
              <Button variant="contained" color="success">
                Báo cáo Hoàn thành
              </Button>
            </Stack>
          </DialogActions>
        </>
      )}
    </Dialog>

    <Dialog
      open={isReassignDialogOpen}
      onClose={handleCloseReassignDialog}
      fullWidth
      maxWidth="sm"
      aria-labelledby="reassign-dialog-title"
    >
      <DialogTitle id="reassign-dialog-title">Giao lại nhiệm vụ</DialogTitle>
      <DialogContent dividers>
        {selectedTaskDetail ? (
          <Stack spacing={3}>
            <Box
              p={2}
              borderRadius={2}
              sx={{ backgroundColor: alpha("#0f172a", 0.04) }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Nhiệm vụ đang giao lại
              </Typography>
              <Typography fontWeight={700}>{selectedTaskDetail.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedTaskDetail.department || "Chưa rõ đơn vị"} • Hạn hiện tại {formatDateString(selectedTaskDetail.dueDate) ?? selectedTaskDetail.dueDate}
              </Typography>
            </Box>

            <FormControl fullWidth>
              <InputLabel id="reassign-department-label">Đơn vị tiếp nhận</InputLabel>
              <Select
                labelId="reassign-department-label"
                value={reassignDepartment}
                label="Đơn vị tiếp nhận"
                onChange={(event) => setReassignDepartment(event.target.value)}
              >
                <MenuItem value="">
                  <em>Chọn đơn vị</em>
                </MenuItem>
                {departmentOptionsForAssign.map((dept) => (
                  <MenuItem key={dept.code ?? dept.name} value={dept.name}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Danh sách được đồng bộ từ Nhaplieu.xlsx</FormHelperText>
            </FormControl>

            <FormControl fullWidth disabled={!reassignDepartment}>
              <InputLabel id="reassign-assignee-label">Người phụ trách chính</InputLabel>
              <Select
                labelId="reassign-assignee-label"
                value={reassignAssignee}
                label="Người phụ trách chính"
                onChange={(event) => setReassignAssignee(event.target.value)}
              >
                <MenuItem value="">
                  <em>Chọn Phụ trách</em>
                </MenuItem>
                {availableAssignees.map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {reassignDepartment
                  ? availableAssignees.length
                    ? "Người thuộc đơn vị đã chọn"
                    : "Chưa có dữ liệu người phụ trách trong bảng Nhaplieu.xlsx"
                  : "Chọn đơn vị trước để lọc danh sách"}
              </FormHelperText>
            </FormControl>

            <TextField
              label="Hạn xử lý mới"
              type="date"
              value={reassignDueDate}
              onChange={(event) => setReassignDueDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Định dạng ngày theo nguồn dữ liệu (YYYY-MM-DD)"
              fullWidth
            />
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Vui lòng chọn một nhiệm vụ để giao lại.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseReassignDialog}>Hủy</Button>
        <Button
          variant="contained"
          onClick={handleConfirmReassign}
          disabled={!isReassignFormValid}
        >
          Xác nhận giao lại
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default Dashboard;