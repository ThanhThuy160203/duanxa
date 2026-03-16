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
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../app/store";
import { Role, ROLE_LABEL_MAP } from "../../types/role";
import { getCreatableRoles } from "./roleHierarchy";
import { useUsersRealtime } from "./useUsersRealtime";
import { approvePendingUser, createUserByHierarchy } from "./userService";

const ALL_ROLES = Object.values(Role) as Role[];

type CreateAccountFormValues = {
  name: string;
  email: string;
  department: string;
  managedDepartments: string;
  password: string;
  confirmPassword: string;
  role: Role;
};

const AdminManagement = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const { users, loading, error } = useUsersRealtime();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const creatableRoles = useMemo(() => (user ? getCreatableRoles(user.role) : []), [user]);
  const canManageAccounts = Boolean(user && (user.role === Role.ADMIN || creatableRoles.length > 0));
  const roleOptions = user?.role === Role.ADMIN ? ALL_ROLES : creatableRoles;

  const [formValues, setFormValues] = useState<CreateAccountFormValues>({
    name: "",
    email: "",
    department: "",
    managedDepartments: "",
    password: "",
    confirmPassword: "",
    role: roleOptions[0] ?? Role.NHAN_VIEN,
  });
  const [approvalRoleMap, setApprovalRoleMap] = useState<Record<string, Role>>({});

  useEffect(() => {
    setFormValues((prev) => ({ ...prev, role: roleOptions[0] ?? prev.role }));
  }, [roleOptions]);

  const pendingUsers = useMemo(() => users.filter((record) => record.status === "PENDING"), [users]);
  const activeUsers = useMemo(() => users.filter((record) => record.status === "ACTIVE"), [users]);

  if (!user) {
    return null;
  }

  if (!canManageAccounts) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <Typography variant="h5" gutterBottom>
          Bạn không có quyền tạo tài khoản mới
        </Typography>
        <Button variant="contained" onClick={() => navigate("/dashboard")}>
          Quay lại dashboard
        </Button>
      </Box>
    );
  }

  const handleChange = (field: keyof CreateAccountFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleCreateAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (formValues.password !== formValues.confirmPassword) {
      setFeedback({ type: "error", message: "Mật khẩu nhập lại không khớp." });
      return;
    }

    setSubmitting(true);

    try {
      await createUserByHierarchy({
        name: formValues.name,
        email: formValues.email,
        password: formValues.password,
        role: formValues.role,
        department: formValues.department,
        managedDepartments: formValues.managedDepartments
          .split(",")
          .map((dept) => dept.trim())
          .filter(Boolean),
        actor: { email: user.email, name: user.name, role: user.role },
      });
      setFeedback({ type: "success", message: "Đã tạo tài khoản mới thành công." });
      setFormValues({
        name: "",
        email: "",
        department: "",
        managedDepartments: "",
        password: "",
        confirmPassword: "",
        role: roleOptions[0] ?? Role.NHAN_VIEN,
      });
    } catch (err) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Không thể tạo tài khoản." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (email: string, requestedRole?: Role | null) => {
    if (!roleOptions.length && user.role !== Role.ADMIN) {
      setFeedback({ type: "error", message: "Bạn không có quyền phê duyệt vai trò này." });
      return;
    }

    const finalRole = approvalRoleMap[email] ?? requestedRole ?? roleOptions[0];

    if (!finalRole) {
      setFeedback({ type: "error", message: "Hãy chọn vai trò trước khi phê duyệt." });
      return;
    }

    setApproving(email);
    setFeedback(null);

    try {
      await approvePendingUser({
        email,
        finalRole,
        approver: { email: user.email, name: user.name, role: user.role },
      });
      setFeedback({ type: "success", message: "Đã phê duyệt tài khoản thành công." });
      setApprovalRoleMap((prev) => {
        const next = { ...prev };
        delete next[email];
        return next;
      });
    } catch (err) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Không thể phê duyệt." });
    } finally {
      setApproving(null);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" gutterBottom>
          Quản trị tài khoản theo phân cấp
        </Typography>
        <Typography color="text.secondary">
          {user.role === Role.ADMIN
            ? "Admin có thể cấp quyền cho mọi cấp bậc."
            : "Bạn chỉ có thể tạo và duyệt tài khoản ở cấp thấp hơn."}
        </Typography>
      </Box>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack component="form" spacing={2} onSubmit={handleCreateAccount}>
            <Typography variant="h6">Tạo tài khoản theo phân cấp</Typography>
            <Divider />
            {feedback && <Alert severity={feedback.type}>{feedback.message}</Alert>}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField label="Họ và tên" value={formValues.name} onChange={handleChange("name")} required fullWidth />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Email" type="email" value={formValues.email} onChange={handleChange("email")} required fullWidth />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Phòng ban" value={formValues.department} onChange={handleChange("department")} fullWidth />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Phòng ban phụ trách (cách nhau bằng dấu phẩy)"
                  value={formValues.managedDepartments}
                  onChange={handleChange("managedDepartments")}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="role-select">Vai trò</InputLabel>
                  <Select
                    labelId="role-select"
                    label="Vai trò"
                    value={formValues.role}
                    onChange={(event) =>
                      setFormValues((prev) => ({
                        ...prev,
                        role: event.target.value as Role,
                      }))
                    }
                  >
                    {roleOptions.map((role) => (
                      <MenuItem key={role} value={role}>
                        {ROLE_LABEL_MAP[role]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Mật khẩu tạm" type="password" value={formValues.password} onChange={handleChange("password")} required fullWidth />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Nhập lại mật khẩu"
                  type="password"
                  value={formValues.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  required
                  fullWidth
                />
              </Grid>
            </Grid>
            <Button type="submit" variant="contained" disabled={submitting || !roleOptions.length}>
              {submitting ? "Đang tạo..." : "Tạo tài khoản"}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Tài khoản đang chờ duyệt</Typography>
                {loading && <Typography variant="body2">Đang tải...</Typography>}
              </Stack>
              {error && <Alert severity="error">{error}</Alert>}
              {pendingUsers.length === 0 && !error && <Alert severity="info">Chưa có yêu cầu nào.</Alert>}
              <Stack spacing={2}>
                {pendingUsers.map((pending) => (
                  <Box key={pending.email} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
                    <Typography fontWeight={600}>{pending.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {pending.email}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      Yêu cầu: {pending.requestedRole ? ROLE_LABEL_MAP[pending.requestedRole] : "Chưa rõ"}
                    </Typography>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1.5 }}>
                      <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel id={`approve-${pending.email}`}>Vai trò phê duyệt</InputLabel>
                        <Select
                          labelId={`approve-${pending.email}`}
                          label="Vai trò phê duyệt"
                          value={approvalRoleMap[pending.email] ?? pending.requestedRole ?? roleOptions[0] ?? ""}
                          onChange={(event) =>
                            setApprovalRoleMap((prev) => ({
                              ...prev,
                              [pending.email]: event.target.value as Role,
                            }))
                          }
                        >
                          {(user.role === Role.ADMIN ? ALL_ROLES : roleOptions).map((role) => (
                            <MenuItem key={role} value={role}>
                              {ROLE_LABEL_MAP[role]}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button
                        variant="contained"
                        size="small"
                        disabled={approving === pending.email}
                        onClick={() => handleApprove(pending.email, pending.requestedRole)}
                      >
                        {approving === pending.email ? "Đang duyệt..." : "Phê duyệt"}
                      </Button>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Danh sách tài khoản đang hoạt động
              </Typography>
              {loading && <Typography variant="body2">Đang tải...</Typography>}
              <Stack spacing={1.2}>
                {activeUsers.map((account) => (
                  <Stack key={account.email} direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography fontWeight={600}>{account.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {ROLE_LABEL_MAP[account.role]} • {account.department ?? "Chưa rõ"}
                      </Typography>
                    </Box>
                    <Chip label="Hoạt động" size="small" color="success" variant="outlined" />
                  </Stack>
                ))}
                {activeUsers.length === 0 && !loading && <Alert severity="info">Chưa có tài khoản nào.</Alert>}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default AdminManagement;
