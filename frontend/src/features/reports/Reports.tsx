import { useMemo, useState } from "react";
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
import { useAppSelector } from "../../app/store";
import { ROLE_CAPABILITY_MAP, type DeadlineFilter, type TimeFilter } from "../authorization/roleCapabilities";
import { exportTasksToCsv } from "./reportExport";
import { TASK_SOURCES, filterTasks, getVisibleTasksByRole } from "../tasks/taskData";
import { useTasksRealtime } from "../tasks/useTasksRealtime";

const EMPLOYEE_RANKING = [
  { name: "Nguyễn Văn A", score: 95, level: "Tốt" },
  { name: "Trần Thị B", score: 68, level: "Cần cải thiện" },
  { name: "Lê Văn C", score: 88, level: "Khá" },
];

const DEPARTMENT_RANKING = [
  { name: "Văn phòng", score: 90 },
  { name: "Nội vụ", score: 84 },
  { name: "Tư pháp", score: 75 },
];

const Reports = () => {
  const user = useAppSelector((state) => state.auth.user);
  const role = user?.role;
  const capability = role ? ROLE_CAPABILITY_MAP[role] : undefined;
  const { tasks, loading, error } = useTasksRealtime();

  const [periodFilter, setPeriodFilter] = useState<TimeFilter>("THANG");
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>("TOAN_BO");
  const [sourceFilter, setSourceFilter] = useState<string>("TOAN_BO");

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

  const handleExport = (mode: "chi-tiet" | "theo-phong" | "theo-ca-nhan") => {
    if (!user) {
      return;
    }

    const period = periodFilter.toLowerCase();
    exportTasksToCsv(reportTasks, mode, `bao-cao-${mode}-${user.role.toLowerCase()}-${period}.csv`);
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" gutterBottom>
          Trung tâm báo cáo chi tiết
        </Typography>
        <Typography color="text.secondary">
          Dữ liệu realtime từ Firebase, xuất báo cáo theo tháng/quý/năm, mức độ quá hạn/sắp đến hạn và nguồn giao nhiệm vụ.
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
              <Typography color="text.secondary" variant="body2">
                Tổng nhiệm vụ trong báo cáo
              </Typography>
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
                    {EMPLOYEE_RANKING.map((item) => (
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
                    {DEPARTMENT_RANKING.map((item) => (
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
          <Alert severity="error" variant="outlined">
            Cảnh báo: Nhân viên Trần Thị B đang ở mức hoàn thành thấp dưới 70%.
          </Alert>
          <Alert severity="success" variant="outlined">
            Khen thưởng: Nhân viên Nguyễn Văn A duy trì mức hoàn thành tốt trên 90%.
          </Alert>
        </Stack>
      )}
    </Stack>
  );
};

export default Reports;
