import RefreshIcon from "@mui/icons-material/Refresh";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useMemo, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { useAppSelector } from "../../app/store";
import { ROLE_CAPABILITY_MAP, type DeadlineFilter, type TimeFilter } from "../authorization/roleCapabilities";
import { TASK_SOURCES, filterTasks, getDeadlineState, getVisibleTasksByRole } from "../tasks/taskData";
import { useTasksRealtime } from "../tasks/useTasksRealtime";
import { exportTasksToCsv } from "./reportExport";

const STATUS_CHART_COLORS = {
  done: "#1f9d8b",
  reviewing: "#0f62fe",
  processing: "#ffb020",
  new: "#f06292",
  cancelled: "#d43f57",
};

const DEADLINE_CHART_COLORS = {
  QUA_HAN: "#d43f57",
  SAP_DEN_HAN: "#ffb020",
  BINH_THUONG: "#1f9d8b",
};

const Reports = () => {
  const user = useAppSelector((state) => state.auth.user);
  const role = user?.role;
  const capability = role ? ROLE_CAPABILITY_MAP[role] : undefined;
  
  const [isEnabled, setIsEnabled] = useState(true);
  const { tasks, loading, error } = useTasksRealtime({ enabled: isEnabled });

  const [periodFilter, setPeriodFilter] = useState<TimeFilter>("THANG");
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>("TOAN_BO");
  const [sourceFilter, setSourceFilter] = useState<string>("TOAN_BO");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const sourceOptions = capability?.visibleSources ?? TASK_SOURCES;
  const normalizedSourceFilter = useMemo(() => {
    if (sourceFilter === "TOAN_BO") {
      return "TOAN_BO";
    }

    return sourceOptions.includes(sourceFilter) ? sourceFilter : "TOAN_BO";
  }, [sourceFilter, sourceOptions]);

  const reportTasks = useMemo(() => {
    if (!role) {
      return [];
    }

    const visible = getVisibleTasksByRole(tasks, role);
    const byTimeAndDeadline = filterTasks(visible, periodFilter, deadlineFilter);

    if (normalizedSourceFilter === "TOAN_BO") {
      return byTimeAndDeadline;
    }

    return byTimeAndDeadline.filter((task) => task.source === normalizedSourceFilter);
  }, [deadlineFilter, normalizedSourceFilter, periodFilter, role, tasks]);

  const completed = reportTasks.filter((task) => task.completionRate >= 90).length;
  const progress = reportTasks.length > 0 ? Math.round((completed / reportTasks.length) * 100) : 0;

  const statusChartData = useMemo(() => {
    if (!reportTasks.length) {
      return [];
    }

    const counters = {
      done: 0,
      reviewing: 0,
      processing: 0,
      new: 0,
      cancelled: 0,
    };

    reportTasks.forEach((task) => {
      switch (task.status) {
        case "HOAN_THANH":
          counters.done += 1;
          break;
        case "CHO_DUYET":
          counters.reviewing += 1;
          break;
        case "DANG_XU_LY":
          counters.processing += 1;
          break;
        case "MOI_NHAN":
          counters.new += 1;
          break;
        case "DA_HUY":
          counters.cancelled += 1;
          break;
        default:
          counters.processing += 1;
      }
    });

    return [
      { name: "Hoàn thành", value: counters.done, color: STATUS_CHART_COLORS.done },
      { name: "Chờ duyệt", value: counters.reviewing, color: STATUS_CHART_COLORS.reviewing },
      { name: "Đang xử lý", value: counters.processing, color: STATUS_CHART_COLORS.processing },
      { name: "Mới nhận", value: counters.new, color: STATUS_CHART_COLORS.new },
      { name: "Đã hủy", value: counters.cancelled, color: STATUS_CHART_COLORS.cancelled },
    ].filter((item) => item.value > 0);
  }, [reportTasks]);

  const deadlineChartData = useMemo(() => {
    if (!reportTasks.length) {
      return [];
    }

    const counters = {
      QUA_HAN: 0,
      SAP_DEN_HAN: 0,
      BINH_THUONG: 0,
    } as Record<"QUA_HAN" | "SAP_DEN_HAN" | "BINH_THUONG", number>;

    reportTasks.forEach((task) => {
      const state = getDeadlineState(task);
      counters[state] += 1;
    });

    return [
      { name: "Quá hạn", key: "QUA_HAN", value: counters.QUA_HAN, color: DEADLINE_CHART_COLORS.QUA_HAN },
      { name: "Sắp đến hạn", key: "SAP_DEN_HAN", value: counters.SAP_DEN_HAN, color: DEADLINE_CHART_COLORS.SAP_DEN_HAN },
      { name: "Bình thường", key: "BINH_THUONG", value: counters.BINH_THUONG, color: DEADLINE_CHART_COLORS.BINH_THUONG },
    ].filter((item) => item.value > 0);
  }, [reportTasks]);

  const employeeRanking = useMemo(() => {
    if (!reportTasks.length) {
      return [];
    }

    const employeeScores: Record<string, { totalScore: number; count: number }> = {};

    reportTasks.forEach((task) => {
      if (!employeeScores[task.assignee]) {
        employeeScores[task.assignee] = { totalScore: 0, count: 0 };
      }
      employeeScores[task.assignee].totalScore += task.completionRate;
      employeeScores[task.assignee].count += 1;
    });

    return Object.entries(employeeScores)
      .map(([name, { totalScore, count }]) => ({
        name,
        score: Math.round(totalScore / count),
        level: Math.round(totalScore / count) >= 90 ? "Tốt" : Math.round(totalScore / count) < 70 ? "Cần cải thiện" : "Khá",
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [reportTasks]);

  const departmentRanking = useMemo(() => {
    if (!reportTasks.length) {
      return [];
    }

    const deptScores: Record<string, { totalScore: number; count: number }> = {};

    reportTasks.forEach((task) => {
      if (!deptScores[task.department]) {
        deptScores[task.department] = { totalScore: 0, count: 0 };
      }
      deptScores[task.department].totalScore += task.completionRate;
      deptScores[task.department].count += 1;
    });

    return Object.entries(deptScores)
      .map(([name, { totalScore, count }]) => ({
        name,
        score: Math.round(totalScore / count),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [reportTasks]);

  const handleExport = (mode: "chi-tiet" | "theo-phong" | "theo-ca-nhan") => {
    if (!user) {
      return;
    }

    const period = periodFilter.toLowerCase();
    exportTasksToCsv(reportTasks, mode, `bao-cao-${mode}-${user.role.toLowerCase()}-${period}.csv`);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Disable để tắt subscription
    setIsEnabled(false);
    
    // Chờ 300ms rồi enable lại để trigger API call mới
    await new Promise(resolve => setTimeout(resolve, 300));
    setIsEnabled(true);
    setLastUpdated(new Date());
    
    // Chờ dữ liệu tải xong
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsRefreshing(false);
  };

  const formattedLastUpdate = lastUpdated.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" gutterBottom>
          Trung tâm báo cáo chi tiết
        </Typography>
        <Typography color="text.secondary">
          Dữ liệu được cập nhật tự động. Đã cập nhật lúc {formattedLastUpdate}
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="report-period-label">Chu kỳ</InputLabel>
                <Select
                  labelId="report-period-label"
                  label="Chu kỳ"
                  value={periodFilter}
                  onChange={(event) => setPeriodFilter(event.target.value as TimeFilter)}
                >
                  <MenuItem value="THANG">Tháng</MenuItem>
                  <MenuItem value="QUY">Quý</MenuItem>
                  <MenuItem value="NAM">Năm</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="report-deadline-label">Mức độ</InputLabel>
                <Select
                  labelId="report-deadline-label"
                  label="Mức độ"
                  value={deadlineFilter}
                  onChange={(event) => setDeadlineFilter(event.target.value as DeadlineFilter)}
                >
                  <MenuItem value="TOAN_BO">Toàn bộ</MenuItem>
                  <MenuItem value="SAP_DEN_HAN">Sắp đến hạn</MenuItem>
                  <MenuItem value="QUA_HAN">Quá hạn</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="report-source-label">Nguồn giao</InputLabel>
                <Select
                  labelId="report-source-label"
                  label="Nguồn giao"
                  value={normalizedSourceFilter}
                  onChange={(event) => setSourceFilter(event.target.value)}
                >
                  <MenuItem value="TOAN_BO">Toàn bộ</MenuItem>
                  {sourceOptions.map((sourceOption) => (
                    <MenuItem key={sourceOption} value={sourceOption}>
                      {sourceOption}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                <Typography color="text.secondary" variant="body2">
                  Tổng nhiệm vụ trong báo cáo
                </Typography>
                <Button
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  sx={{ minWidth: "auto", p: 0.5 }}
                >
                  {isRefreshing ? "..." : "Cập nhật"}
                </Button>
              </Stack>
              <Typography variant="h4" fontWeight={700}>
                {reportTasks.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {loading ? "Đang tải dữ liệu..." : "Dữ liệu realtime"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                Nhiệm vụ hoàn thành tốt
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {completed}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                Tỷ lệ hoàn thành
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {progress}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={6}>
          <Card sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent sx={{ height: 360, display: "flex", flexDirection: "column" }}>
              <Typography variant="h6" gutterBottom>
                Phân bố trạng thái nhiệm vụ
              </Typography>
              <Box sx={{ flex: 1, minHeight: 260 }}>
                {statusChartData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                      >
                        {statusChartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value} nhiệm vụ`} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Stack height="100%" alignItems="center" justifyContent="center" spacing={1}>
                    <Typography color="text.secondary">Chưa có dữ liệu trong bộ lọc hiện tại.</Typography>
                  </Stack>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={6}>
          <Card sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent sx={{ height: 360, display: "flex", flexDirection: "column" }}>
              <Typography variant="h6" gutterBottom>
                Tình trạng đến hạn xử lý
              </Typography>
              <Box sx={{ flex: 1, minHeight: 260 }}>
                {deadlineChartData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deadlineChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,34,59,0.15)" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value: number) => `${value} nhiệm vụ`} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {deadlineChartData.map((entry) => (
                          <Cell key={entry.key} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Stack height="100%" alignItems="center" justifyContent="center" spacing={1}>
                    <Typography color="text.secondary">Không có nhiệm vụ nào trong bộ lọc hiện tại.</Typography>
                  </Stack>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {capability?.canViewPersonalResult && <Chip label="Kết quả cá nhân" color="success" variant="outlined" />}
            {capability?.canViewDepartmentResult && <Chip label="Kết quả phòng" color="info" variant="outlined" />}
            {capability?.canViewMultiDepartmentResult && <Chip label="Kết quả liên phòng" color="info" variant="outlined" />}
            {capability?.canViewGlobalResult && <Chip label="Kết quả toàn xã" color="primary" variant="outlined" />}
            {capability?.canClassifyTaskSource && <Chip label="Phân loại nguồn giao" color="warning" variant="outlined" />}
          </Stack>
          <Stack direction="row" spacing={1.5} mt={2} flexWrap="wrap" useFlexGap>
            <Button variant="contained" disabled={!capability?.canExportReport} onClick={() => handleExport("chi-tiet")}>Xuất báo cáo chi tiết</Button>
            <Button variant="outlined" disabled={!capability?.canExportReport} onClick={() => handleExport("theo-phong")}>Xuất theo phòng</Button>
            <Button variant="outlined" disabled={!capability?.canExportReport} onClick={() => handleExport("theo-ca-nhan")}>Xuất theo cá nhân</Button>
          </Stack>
        </CardContent>
      </Card>

      {(capability?.canViewEmployeeRanking || capability?.canViewDepartmentRanking) && (
        <Grid container spacing={2}>
          {capability.canViewEmployeeRanking && (
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 3, height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Xếp hạng nhân viên
                  </Typography>
                  <Stack spacing={1.2}>
                    {employeeRanking.map((item) => (
                      <Stack key={item.name} direction="row" justifyContent="space-between" alignItems="center">
                        <Typography>{item.name}</Typography>
                        <Chip
                          label={`${item.score} điểm`}
                          size="small"
                          color={item.score >= 90 ? "success" : item.score < 70 ? "error" : "warning"}
                          variant="outlined"
                        />
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )}

          {capability.canViewDepartmentRanking && (
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 3, height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Xếp hạng phòng ban
                  </Typography>
                  <Stack spacing={1.2}>
                    {departmentRanking.map((item) => (
                      <Stack key={item.name} direction="row" justifyContent="space-between" alignItems="center">
                        <Typography>{item.name}</Typography>
                        <Chip label={`${item.score} điểm`} size="small" color="primary" variant="outlined" />
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {capability?.canWarnPerformance && (
        <Stack spacing={1}>
          {employeeRanking.length > 0 && (
            <>
              {employeeRanking.some((e) => e.score < 70) && (
                <Alert severity="error" variant="outlined">
                  Cảnh báo: Nhân viên {employeeRanking.find((e) => e.score < 70)?.name} đang ở mức hoàn thành thấp dưới 70%.
                </Alert>
              )}
              {employeeRanking.length > 0 && employeeRanking[0].score >= 90 && (
                <Alert severity="success" variant="outlined">
                  Khen thưởng: Nhân viên {employeeRanking[0].name} duy trì mức hoàn thành tốt trên 90%.
                </Alert>
              )}
            </>
          )}
        </Stack>
      )}
    </Stack>
  );
};

export default Reports;
