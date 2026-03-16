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
import { HIGHLIGHT_TONE_COLORS, ROLE_CONFIG_MAP } from "./roleDashboardConfig";
import { getHighlightDetail, getHighlightValue } from "./highlightUtils";
import { Role, ROLE_LABEL_MAP } from "../../types/role";
import { useDashboardStats } from "./useDashboardStats";

const Dashboard = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const { stats, loading: statsLoading, error: statsError } = useDashboardStats(user?.role);

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
