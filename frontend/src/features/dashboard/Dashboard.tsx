import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAppSelector } from "../../app/store";
import { Role } from "../../types/role";
import { ROLE_CAPABILITY_MAP } from "../authorization/roleCapabilities";
import { sendZaloNotification } from "../notifications/zaloService";
import { getDeadlineState, getVisibleTasksByRole } from "../tasks/taskData";
import { useTasksRealtime } from "../tasks/useTasksRealtime";
import { ROLE_CONFIG_MAP } from "./roleDashboardConfig";
import { useDashboardStats } from "./useDashboardStats";

const DEADLINE_LABEL_MAP = {
  QUA_HAN: "Quá hạn chưa xong",
  SAP_DEN_HAN: "Đến hạn <= 3 ngày",
  BINH_THUONG: "Bình thường",
} as const;

const KPI_STYLES = [
  { accent: "#2563eb", note: "Theo bộ lọc hiện tại" },
  { accent: "#dc2626", note: "Đã quá hạn & chưa hoàn thành" },
  { accent: "#d97706", note: "Chưa quá hạn" },
  { accent: "#ca8a04", note: "Sắp đến hạn" },
  { accent: "#0f766e", note: "Theo trạng thái công việc" },
] as const;

const toDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
};

const getRemainingDays = (dueDate: string) => {
  const due = toDate(dueDate);
  const today = new Date();
  const diffMs = due.getTime() - today.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

const Dashboard = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const userId = user?.id;
  const userName = user?.name;
  const userRole = user?.role;
  const { error: statsError } = useDashboardStats(user?.role);
  const { tasks: realtimeTasks } = useTasksRealtime({ enabled: Boolean(user) });
  const [zaloFeedback, setZaloFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const notifiedTaskIdsRef = useRef<Set<string>>(new Set());
  const [departmentFilter, setDepartmentFilter] = useState<string>("TAT_CA");
  const [monthFilter, setMonthFilter] = useState<string>("TAT_CA");

  const overdueEmployeeTasks = useMemo(() => {
    if (userRole !== Role.NHAN_VIEN || !userName) {
      return [];
    }

    return realtimeTasks.filter(
      (task) => task.assignee === userName && getDeadlineState(task) === "QUA_HAN"
    );
  }, [realtimeTasks, userName, userRole]);

  const visibleTasks = useMemo(() => {
    if (!user) {
      return [];
    }

    return getVisibleTasksByRole(realtimeTasks, user.role).filter((task) => task.status !== "DA_HUY");
  }, [realtimeTasks, user]);

  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    visibleTasks.forEach((task) => {
      if (task.department) {
        set.add(task.department);
      }
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
  }, [visibleTasks]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    visibleTasks.forEach((task) => {
      const date = toDate(task.dueDate);
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      set.add(`${year}-${month}`);
    });

    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [visibleTasks]);

  const filteredTasks = useMemo(() => {
    return visibleTasks.filter((task) => {
      const matchDepartment = departmentFilter === "TAT_CA" || task.department === departmentFilter;
      if (!matchDepartment) {
        return false;
      }

      if (monthFilter === "TAT_CA") {
        return true;
      }

      const taskDate = toDate(task.dueDate);
      const taskMonth = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, "0")}`;
      return taskMonth === monthFilter;
    });
  }, [departmentFilter, monthFilter, visibleTasks]);

  const taskStatusCount = useMemo(() => {
    return filteredTasks.reduce(
      (acc, task) => {
        if (task.status === "HOAN_THANH") {
          acc.completed += 1;
        } else {
          acc.processing += 1;
        }
        return acc;
      },
      { processing: 0, completed: 0 }
    );
  }, [filteredTasks]);

  const deadlineCount = useMemo(() => {
    return filteredTasks.reduce(
      (acc, task) => {
        const state = getDeadlineState(task);
        if (state === "QUA_HAN") {
          acc.overdue += 1;
        } else if (state === "SAP_DEN_HAN") {
          acc.today += 1;
        } else {
          acc.normal += 1;
        }
        return acc;
      },
      { overdue: 0, today: 0, normal: 0 }
    );
  }, [filteredTasks]);

  const kpiItems = useMemo(
    () => [
      { label: "Tổng nhiệm vụ", value: filteredTasks.length },
      { label: DEADLINE_LABEL_MAP.QUA_HAN, value: deadlineCount.overdue },
      { label: "Đến hạn hôm nay", value: deadlineCount.today },
      { label: DEADLINE_LABEL_MAP.SAP_DEN_HAN, value: deadlineCount.today },
      { label: "Đang thực hiện", value: taskStatusCount.processing },
    ],
    [deadlineCount.overdue, deadlineCount.today, filteredTasks.length, taskStatusCount.processing]
  );

  const warningDistributionData = useMemo(
    () => [
      { name: DEADLINE_LABEL_MAP.BINH_THUONG, value: deadlineCount.normal, color: "#173f7a" },
      { name: DEADLINE_LABEL_MAP.QUA_HAN, value: deadlineCount.overdue, color: "#2f7ea3" },
      { name: "Đến hạn hôm nay", value: deadlineCount.today, color: "#80c9d4" },
    ],
    [deadlineCount.normal, deadlineCount.overdue, deadlineCount.today]
  );

  const statusData = useMemo(
    () => [
      { name: "Đang thực hiện", value: taskStatusCount.processing, color: "#173f7a" },
      { name: "Đã hoàn thành", value: taskStatusCount.completed, color: "#2f8faf" },
    ],
    [taskStatusCount.completed, taskStatusCount.processing]
  );

  const departmentWarningData = useMemo(() => {
    const byDepartment = new Map<string, { overdue: number; today: number }>();

    filteredTasks.forEach((task) => {
      const current = byDepartment.get(task.department) ?? { overdue: 0, today: 0 };
      const deadline = getDeadlineState(task);
      if (deadline === "QUA_HAN") {
        current.overdue += 1;
      }
      if (deadline === "SAP_DEN_HAN") {
        current.today += 1;
      }
      byDepartment.set(task.department, current);
    });

    return Array.from(byDepartment.entries())
      .map(([department, value]) => ({
        department,
        overdue: value.overdue,
        today: value.today,
        total: value.overdue + value.today,
      }))
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredTasks]);

  const recentTasks = useMemo(() => {
    return [...filteredTasks]
      .sort((a, b) => toDate(b.dueDate).getTime() - toDate(a.dueDate).getTime())
      .slice(0, 10);
  }, [filteredTasks]);

  const urgentTasks = useMemo(() => {
    return filteredTasks
      .filter((task) => task.status !== "HOAN_THANH")
      .filter((task) => getDeadlineState(task) === "QUA_HAN" || getDeadlineState(task) === "SAP_DEN_HAN")
      .sort((a, b) => getRemainingDays(a.dueDate) - getRemainingDays(b.dueDate))
      .slice(0, 10);
  }, [filteredTasks]);

  useEffect(() => {
    if (!userId || !userName || userRole !== Role.NHAN_VIEN) {
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
          userId,
          userName,
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
  }, [overdueEmployeeTasks, userId, userName, userRole]);

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
    <Stack spacing={1.5}>
      <Box sx={{ py: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: "#0a2d66", mb: 1.5 }}>
          Dashboard
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="department-filter-label">Đơn vị</InputLabel>
            <Select
              labelId="department-filter-label"
              label="Đơn vị"
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
            >
              <MenuItem value="TAT_CA">(Tất cả)</MenuItem>
              {departmentOptions.map((department) => (
                <MenuItem key={department} value={department}>
                  {department}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="month-filter-label">Tháng</InputLabel>
            <Select
              labelId="month-filter-label"
              label="Tháng"
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
            >
              <MenuItem value="TAT_CA">(Tất cả)</MenuItem>
              {monthOptions.map((month) => (
                <MenuItem key={month} value={month}>
                  {month}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            size="small"
            variant="contained"
            onClick={() => {
              setDepartmentFilter("TAT_CA");
              setMonthFilter("TAT_CA");
            }}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              bgcolor: "#0f3d7a",
              "&:hover": { bgcolor: "#0a2d66" },
            }}
          >
            Làm mới
          </Button>
        </Stack>
      </Box>


      {statsError && <Alert severity="error" sx={{ mb: 1 }}>{statsError}</Alert>}
      {zaloFeedback && <Alert severity={zaloFeedback.type} sx={{ mb: 1 }}>{zaloFeedback.message}</Alert>}

      <Grid container spacing={1}>
        {kpiItems.map((item, idx) => {
          const kpiStyle = KPI_STYLES[idx] ?? KPI_STYLES[0];

          return (
            <Grid item xs={12} sm={6} md={2.4} key={item.label}>
              <Card sx={{ borderRadius: 2, height: "100%", border: "1px solid #d8e2f2", borderLeft: `4px solid ${kpiStyle.accent}` }}>
                <CardContent sx={{ py: 1.2, px: 1.5, "&:last-child": { pb: 1.2 } }}>
                  <Typography fontSize={12} color="#617796" fontWeight={700}>
                    {item.label}
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="#0a2d66">
                    {item.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Grid container spacing={1}>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, border: "1px solid #d8e2f2" }}>
            <CardContent sx={{ pb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={800} color="#0a2d66" mb={1}>
                Phân bố theo cảnh báo
              </Typography>
              <Box sx={{ width: "100%", height: 200 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={warningDistributionData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={80}
                      paddingAngle={2}
                      label={({ value }) => value}
                      labelLine={false}
                    >
                      {warningDistributionData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={1}>
                {warningDistributionData.map((item) => (
                  <Stack key={item.name} direction="row" spacing={0.5} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: item.color }} />
                    <Typography variant="caption" color="#526983">
                      {item.name}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, border: "1px solid #d8e2f2" }}>
            <CardContent sx={{ pb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={800} color="#0a2d66" mb={1}>
                Trạng thái nhiệm vụ
              </Typography>
              <Box sx={{ width: "100%", height: 200 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={82}
                      paddingAngle={2}
                      label={({ value }) => value}
                      labelLine={false}
                    >
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={1}>
                {statusData.map((item) => (
                  <Stack key={item.name} direction="row" spacing={0.5} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: item.color }} />
                    <Typography variant="caption" color="#526983">
                      {item.name}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, border: "1px solid #d8e2f2" }}>
            <CardContent sx={{ pb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={800} color="#0a2d66" mb={1}>
                Cảnh báo theo đơn vị
              </Typography>
              <Box sx={{ width: "100%", height: 200 }}>
                <ResponsiveContainer>
                  <BarChart data={departmentWarningData} margin={{ top: 8, right: 8, left: -12, bottom: 40 }}>
                    <XAxis
                      dataKey="department"
                      tick={{ fontSize: 11, fill: "#4f6481" }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "#4f6481" }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="overdue" fill="#173f7a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="today" fill="#80c9d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={1}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, border: "1px solid #d8e2f2" }}>
            <CardContent sx={{ pb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={800} color="#0a2d66" mb={1}>
                Hoạt động gần đây
              </Typography>
              <TableContainer sx={{ maxHeight: 280, borderRadius: 1, border: "1px solid #e0e6f2" }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, bgcolor: "#edf2fb", fontSize: 12 }}>Tên nhiệm vụ</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: "#edf2fb", fontSize: 12 }}>Đơn vị</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentTasks.map((task) => (
                      <TableRow key={task.id} hover>
                        <TableCell sx={{ fontSize: 12, color: "#8b1f1f", fontWeight: 700 }}>{task.title}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{task.department}</TableCell>
                      </TableRow>
                    ))}
                    {!recentTasks.length && (
                      <TableRow>
                        <TableCell colSpan={2} sx={{ textAlign: "center", py: 2, fontSize: 12, color: "#617796" }}>
                          Không có dữ liệu
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, border: "1px solid #d8e2f2" }}>
            <CardContent sx={{ pb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={800} color="#0a2d66" mb={1}>
                Nhiệm vụ gần hạn
              </Typography>
              <TableContainer sx={{ maxHeight: 280, borderRadius: 1, border: "1px solid #e0e6f2" }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, bgcolor: "#edf2fb", fontSize: 12 }}>Tên nhiệm vụ</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: "#edf2fb", fontSize: 12, minWidth: 80 }}>Còn lại</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {urgentTasks.map((task) => {
                      const remaining = getRemainingDays(task.dueDate);
                      const remainingLabel = remaining < 0 ? `Quá ${Math.abs(remaining)}` : `${remaining}`;

                      return (
                        <TableRow key={task.id} hover>
                          <TableCell sx={{ fontSize: 12, fontWeight: 600, color: "#0a2d66" }}>
                            {task.title}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12, color: remaining < 0 ? "#b91c1c" : "#c06a00", fontWeight: 700 }}>
                            {remainingLabel}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!urgentTasks.length && (
                      <TableRow>
                        <TableCell colSpan={2} sx={{ textAlign: "center", py: 2, fontSize: 12, color: "#617796" }}>
                          Không có nhiệm vụ gần hạn
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default Dashboard;
