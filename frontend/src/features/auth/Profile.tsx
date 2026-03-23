import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useAppSelector } from "../../app/store";
import { ROLE_LABEL_MAP } from "../../types/role";


const formatStatus = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "Hoạt động";
    case "PENDING":
      return "Đang chờ phê duyệt";
    case "DISABLED":
      return "Bị khóa";
    default:
      return status;
  }
};

const Profile = () => {
  const user = useAppSelector((state) => state.auth.user);

  if (!user) {
    return null;
  }


  return (
    <Stack spacing={3}>
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Hồ sơ cá nhân
              </Typography>
              <Typography color="text.secondary">Thông tin được đồng bộ từ backend API</Typography>
            </Box>
            <Chip label={formatStatus(user.status)} color={user.status === "ACTIVE" ? "success" : "warning"} />
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Họ và tên
              </Typography>
              <Typography fontWeight={600} variant="h6">
                {user.name}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Vai trò
              </Typography>
              <Typography fontWeight={600} variant="h6">
                {ROLE_LABEL_MAP[user.role]}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Email đăng nhập
              </Typography>
              <Typography fontWeight={600}>{user.email}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Phòng ban
              </Typography>
              <Typography fontWeight={600}>{user.department ?? "Chưa cập nhật"}</Typography>
            </Grid>
            {user.managedDepartments && user.managedDepartments.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Phòng ban phụ trách
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                  {user.managedDepartments.map((dept) => (
                    <Chip key={dept} label={dept} size="small" />
                  ))}
                </Stack>
              </Grid>
            )}
            {user.parentName && (
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Được tạo bởi
                </Typography>
                <Typography fontWeight={600}>{user.parentName}</Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

    </Stack>
  );
};

export default Profile;
