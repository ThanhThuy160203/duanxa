import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate, useParams } from "react-router-dom";
import { ROLE_CONFIG_MAP, HIGHLIGHT_TONE_COLORS } from "./roleDashboardConfig";
import { Role } from "../../types/role";

const RoleDashboardDetail = () => {
  const { roleId } = useParams<{ roleId: string }>();
  const navigate = useNavigate();

  const normalizedRole = roleId?.toUpperCase() as Role | undefined;
  const config = normalizedRole ? ROLE_CONFIG_MAP[normalizedRole] : undefined;

  if (!config) {
    return (
      <Box textAlign="center" py={10} px={2}>
        <Typography variant="h3" fontWeight={600} gutterBottom>
          Không tìm thấy cấp
        </Typography>
        <Typography color="text.secondary" maxWidth={480} mx="auto" mb={4}>
          Vui lòng kiểm tra lại đường dẫn hoặc quay lại bảng điều khiển để chọn vai trò phù hợp.
        </Typography>
        <Button variant="contained" onClick={() => navigate("/dashboard")}>Quay lại dashboard</Button>
      </Box>
    );
  }

  return (
    <Stack spacing={4} sx={{ width: "100%" }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ alignSelf: "flex-start" }}>
        Quay lại
      </Button>

      <Stack spacing={1}>
        <Chip
          label={config.role}
          color={HIGHLIGHT_TONE_COLORS[config.highlights[0]?.tone ?? "default"]}
          sx={{ alignSelf: "flex-start" }}
        />
        <Typography variant="h4" fontWeight={700}>
          {config.name}
        </Typography>
        <Typography color="text.secondary">{config.description}</Typography>
      </Stack>

      <Grid container spacing={2}>
        {config.highlights.map((highlight) => (
          <Grid item xs={12} sm={6} md={4} key={highlight.label}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {highlight.label}
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                  {highlight.value}
                </Typography>
                {highlight.detail && (
                  <Typography variant="body2" color="text.secondary">
                    {highlight.detail}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Nhiệm vụ & quyền hạn
              </Typography>
              <Stack component="ul" spacing={1} sx={{ pl: 3, m: 0 }}>
                {config.responsibilities.map((item) => (
                  <Typography component="li" key={item} variant="body1">
                    {item}
                  </Typography>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Bộ lọc báo cáo
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {config.filters.map((filter) => (
                  <Chip key={filter} label={filter} variant="outlined" />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Thông báo nổi bật
              </Typography>
              <Stack spacing={1.5}>
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
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Hành động nhanh
              </Typography>
              <Stack spacing={2}>
                {config.actions.map((action, index) => (
                  <Box key={action.label}>
                    <Typography fontWeight={600}>{action.label}</Typography>
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      {action.description}
                    </Typography>
                    <Button
                      variant={action.primary ? "contained" : "outlined"}
                      disabled={!action.to}
                      onClick={() => action.to && navigate(action.to)}
                    >
                      {action.to ? "Đi tới" : "Đang thiết kế"}
                    </Button>
                    {index < config.actions.length - 1 && <Divider sx={{ mt: 2 }} />}
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default RoleDashboardDetail;
