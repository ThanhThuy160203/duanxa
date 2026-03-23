import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import SpeedIcon from "@mui/icons-material/Speed";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    Grid,
    LinearProgress,
    Stack,
    Typography
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ROLE_LABEL_MAP } from "../../types/role";
import {
    DEADLINE_STATE_COLOR_MAP,
    DEADLINE_STATE_SHORT_LABEL_MAP,
    TASK_STATUS_CHIP_COLOR_MAP,
    TASK_STATUS_LABEL_MAP,
    getDeadlineState,
    type TaskStatus
} from "./taskData";
import { useTasksRealtime } from "./useTasksRealtime";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const formatDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  return dateFormatter.format(date);
};

const describeRemainingDays = (dueDate: string) => {
  const due = new Date(dueDate);
  const today = new Date();
  const diff = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) {
    return `Đã quá hạn ${Math.abs(diff)} ngày`;
  }
  if (diff === 0) {
    return "Đến hạn hôm nay";
  }
  if (diff === 1) {
    return "Còn 1 ngày";
  }
  return `Còn ${diff} ngày`;
};

const STATUS_FLOW: TaskStatus[] = ["MOI_NHAN", "DANG_XU_LY", "CHO_DUYET", "HOAN_THANH"];

const truncate = (value: string, maxLength = 120) => {
  if (!value) {
    return "";
  }
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
};

const TaskDetail = () => {
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId: string }>();
  const { tasks, loading, error } = useTasksRealtime();

  const task = useMemo(() => tasks.find((item) => item.id === taskId), [tasks, taskId]);

  if (loading && !task) {
    return (
      <Stack spacing={2} alignItems="center" py={8}>
        <CircularProgress />
        <Typography>Đang tải dữ liệu nhiệm vụ...</Typography>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack spacing={2} py={6}>
        <Alert severity="error">{error}</Alert>
        <Button variant="outlined" onClick={() => navigate(-1)}>
          Quay lại
        </Button>
      </Stack>
    );
  }

  if (!task) {
    return (
      <Stack spacing={2} py={6}>
        <Alert severity="warning">Không tìm thấy nhiệm vụ phù hợp.</Alert>
        <Button variant="outlined" onClick={() => navigate(-1)}>
          Quay lại danh sách
        </Button>
      </Stack>
    );
  }

  const deadlineState = getDeadlineState(task);
  const statusLabel = TASK_STATUS_LABEL_MAP[task.status];
  const statusColor = TASK_STATUS_CHIP_COLOR_MAP[task.status];
  const deadlineLabel = DEADLINE_STATE_SHORT_LABEL_MAP[deadlineState];
  const deadlineColor = DEADLINE_STATE_COLOR_MAP[deadlineState];
  const remainingLabel = describeRemainingDays(task.dueDate);
  const roleLabel = ROLE_LABEL_MAP[task.assigneeRole] ?? task.assigneeRole;
  const effectiveStatusIndex = Math.max(STATUS_FLOW.findIndex((step) => step === task.status), 0);

  const summaryHighlights = [
    {
      label: "Hạn xử lý",
      value: formatDate(task.dueDate),
      hint: remainingLabel,
      icon: <CalendarMonthIcon fontSize="small" />,
    },
    {
      label: "Tiến độ",
      value: `${task.completionRate}%`,
      hint: task.completionRate >= 90 ? "Sẵn sàng báo cáo" : "Đang cập nhật",
      icon: <SpeedIcon fontSize="small" />,
    },
    {
      label: "Cảnh báo hạn",
      value: deadlineLabel,
      hint: deadlineState === "QUA_HAN" ? "Cần xử lý gấp" : remainingLabel,
      icon: <WarningAmberIcon fontSize="small" />,
    },
  ];

  const infoRows = [
    { label: "Mã nhiệm vụ", value: task.id },
    { label: "Người phụ trách", value: task.assignee },
    { label: "Vai trò nhận", value: roleLabel },
    { label: "Đơn vị", value: task.department },
    { label: "Nguồn giao", value: task.source },
    { label: "Hạn xử lý", value: formatDate(task.dueDate) },
  ];

  const progressRows = [
    { label: "Trạng thái", value: statusLabel },
    { label: "Thời gian còn lại", value: remainingLabel },
    { label: "Điểm đánh giá", value: task.evaluationScore ? `${task.evaluationScore}/100` : "Chưa đánh giá" },
    { label: "Nhận xét thẩm định", value: task.evaluationComment ?? "Chưa có" },
  ];

  const describeStatusStep = (step: TaskStatus) => {
    switch (step) {
      case "MOI_NHAN":
        return `Được phân công bởi ${task.source}.`;
      case "DANG_XU_LY":
        return `Đang triển khai với mức hoàn thành ${task.completionRate}%.`;
      case "CHO_DUYET":
        return task.feedback ? `Phản hồi gửi lên: ${truncate(task.feedback, 100)}` : "Chờ phản hồi hoàn thành.";
      case "HOAN_THANH":
        return task.evaluationScore ? `Điểm đánh giá ${task.evaluationScore}/100.` : "Chờ duyệt và chấm điểm.";
      default:
        return "";
    }
  };

  const isCancelled = task.status === "DA_HUY" || Boolean(task.cancelledReason);

  return (
    <Stack spacing={3} sx={{ px: { xs: 0, md: 1 }, pb: 4 }}>
      <Box
        sx={{
          borderRadius: 3,
          p: { xs: 2, md: 3 },
          background: "linear-gradient(135deg, #0f4c81 0%, #1a73e8 60%, #2dc7ff 100%)",
          color: "#fff",
          boxShadow: `0 24px 60px ${alpha("#0f4c81", 0.35)}`,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2.5}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
        >
          <Box>
            <Typography variant="overline" sx={{ opacity: 0.85 }}>
              {task.id} • {task.department}
            </Typography>
            <Typography variant="h4" fontWeight={800} gutterBottom>
              {task.title}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={task.source} variant="outlined" sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)" }} />
              <Chip label={statusLabel} color={statusColor} />
              <Chip label={deadlineLabel} color={deadlineColor} />
            </Stack>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} width={{ xs: "100%", md: "auto" }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(-1)}
              sx={{
                color: "#0f4c81",
                bgcolor: "#fff",
                fontWeight: 600,
                flex: 1,
                "&:hover": { bgcolor: "rgba(255,255,255,0.9)" },
              }}
            >
              Quay lại
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate(`/tasks?taskId=${encodeURIComponent(task.id)}`)}
              sx={{
                borderColor: "rgba(255,255,255,0.7)",
                color: "#fff",
                fontWeight: 600,
                flex: 1,
                "&:hover": {
                  borderColor: "#fff",
                  bgcolor: "rgba(255,255,255,0.1)",
                },
              }}
            >
              Mở biểu mẫu thao tác
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Grid container spacing={1.5}>
        {summaryHighlights.map((item) => (
          <Grid item xs={12} md={4} key={item.label}>
            <Card sx={{ borderRadius: 3, height: "100%", border: "1px solid", borderColor: "divider" }}>
              <CardContent sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: "rgba(15,76,129,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "primary.main",
                  }}
                >
                  {item.icon}
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {item.label}
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    {item.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.hint}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Thông tin phân công
              </Typography>
              <Grid container spacing={2}>
                {infoRows.map((row) => (
                  <Grid item xs={12} sm={6} key={row.label}>
                    <Typography variant="caption" color="text.secondary">
                      {row.label}
                    </Typography>
                    <Typography variant="body1" fontWeight={600} color="text.primary">
                      {row.value || "Chưa cập nhật"}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Tiến độ & đánh giá
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Tiến độ cập nhật realtime
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={task.completionRate}
                  sx={{ height: 8, borderRadius: 999, bgcolor: "grey.200" }}
                />
                <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {task.completionRate}% hoàn thành
                  </Typography>
                  <Chip label={remainingLabel} size="small" variant="outlined" />
                </Stack>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1.25}>
                {progressRows.map((row) => (
                  <Box key={row.label}>
                    <Typography variant="caption" color="text.secondary">
                      {row.label}
                    </Typography>
                    <Typography variant="body1" fontWeight={600} color="text.primary">
                      {row.value}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Lộ trình trạng thái
              </Typography>
              <Stack spacing={2} mt={1}>
                {STATUS_FLOW.map((step, index) => {
                  const reached = index <= effectiveStatusIndex;
                  return (
                    <Stack direction="row" spacing={2} alignItems="flex-start" key={step}>
                      <Box sx={{ position: "relative" }}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            bgcolor: reached ? "primary.main" : "grey.200",
                            color: reached ? "#fff" : "text.secondary",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                          }}
                        >
                          {index + 1}
                        </Box>
                        {index < STATUS_FLOW.length - 1 && (
                          <Box
                            sx={{
                              position: "absolute",
                              left: 15,
                              top: 32,
                              bottom: -16,
                              width: 2,
                              bgcolor: reached ? "primary.main" : "grey.200",
                            }}
                          />
                        )}
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {TASK_STATUS_LABEL_MAP[step]}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {describeStatusStep(step)}
                        </Typography>
                      </Box>
                    </Stack>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Phản hồi & ghi chú
              </Typography>
              {isCancelled && task.cancelledReason && (
                <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
                  Nhiệm vụ đã bị hủy: {task.cancelledReason}
                </Alert>
              )}
              <Box sx={{ border: "1px dashed", borderColor: "divider", borderRadius: 2, p: 2, mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Phản hồi người thực hiện
                </Typography>
                <Typography variant="body1" color="text.primary">
                  {task.feedback || "Chưa có phản hồi từ người thực hiện."}
                </Typography>
              </Box>
              <Box sx={{ borderRadius: 2, p: 2, bgcolor: "grey.50" }}>
                <Typography variant="caption" color="text.secondary">
                  Nhận xét thẩm định
                </Typography>
                <Typography variant="body1" color="text.primary" gutterBottom>
                  {task.evaluationComment || "Chưa có nhận xét."}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Điểm đánh giá hiện tại: {task.evaluationScore ? `${task.evaluationScore}/100` : "chưa cập nhật"}.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default TaskDetail;
