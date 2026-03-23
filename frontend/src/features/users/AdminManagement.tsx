import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
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
import type { UserProfile, UserStatus } from "../../types/user";
import { getCreatableRoles } from "./roleHierarchy";
import { useUsersRealtime } from "./useUsersRealtime";
import {
    approvePendingUser,
    createUserByHierarchy,
    deleteUserProfile,
    fetchDepartments,
    updateUserProfile,
    type DepartmentOption,
    type UpdateUserInput,
} from "./userService";

const ALL_ROLES = Object.values(Role) as Role[];

const USER_STATUS_OPTIONS: Array<{ value: UserStatus; label: string }> = [
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "DISABLED", label: "Đã khóa" },
];

const USER_STATUS_CHIP_COLOR: Record<UserStatus, "default" | "success" | "warning" | "error"> = {
  ACTIVE: "success",
  PENDING: "warning",
  DISABLED: "default",
};

type CreateAccountFormValues = {
  name: string;
  email: string;
  department: string;
  managedDepartments: string;
  password: string;
  confirmPassword: string;
  role: Role;
};

type EditAccountFormValues = {
  name: string;
  role: Role;
  department: string;
  status: UserStatus;
  password: string;
};

const AdminManagement = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const { users, loading, error } = useUsersRealtime();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const creatableRoles = useMemo(() => (user ? getCreatableRoles(user.role) : []), [user]);
  const canManageAccounts = Boolean(user && (user.role === Role.ADMIN || creatableRoles.length > 0));
  const roleOptions = user?.role === Role.ADMIN ? ALL_ROLES : creatableRoles;
  const isAdmin = user?.role === Role.ADMIN;

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
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editingValues, setEditingValues] = useState<EditAccountFormValues>({
    name: "",
    role: Role.NHAN_VIEN,
    department: "",
    status: "ACTIVE",
    password: "",
  });
  const [editingError, setEditingError] = useState<string | null>(null);
  const [editingFeedback, setEditingFeedback] = useState<string | null>(null);
  const [editingSaving, setEditingSaving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    setFormValues((prev) => ({ ...prev, role: roleOptions[0] ?? prev.role }));
  }, [roleOptions]);

  useEffect(() => {
    if (formValues.role !== Role.TRUONG_PHONG && formValues.role !== Role.NHAN_VIEN) {
      setFormValues((prev) => ({
        ...prev,
        department: "",
        managedDepartments: "",
      }));
    }
  }, [formValues.role]);

  useEffect(() => {
    const loadDepartments = async () => {
      setLoadingDepartments(true);
      try {
        const depts = await fetchDepartments();
        setDepartments(depts);
      } catch (err) {
        console.error("Failed to fetch departments:", err);
      } finally {
        setLoadingDepartments(false);
      }
    };

    loadDepartments();
  }, []);

  const pendingUsers = useMemo(() => users.filter((record) => record.status === "PENDING"), [users]);
  const activeUsers = useMemo(() => users.filter((record) => record.status === "ACTIVE"), [users]);

  const getDepartmentCodeByName = (name?: string | null) => {
    if (!name) {
      return "";
    }
    return departments.find((dept) => dept.name === name)?.code ?? "";
  };

  const getDepartmentNameByCode = (code?: string) => {
    if (!code) {
      return "";
    }
    return departments.find((dept) => dept.code === code)?.name ?? "";
  };

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

  const handleOpenEdit = (account: UserProfile) => {
    if (!isAdmin) {
      return;
    }
    setEditingUser(account);
    setEditingValues({
      name: account.name,
      role: account.role,
      status: account.status,
      department: getDepartmentCodeByName(account.department),
      password: "",
    });
    setEditingError(null);
    setEditingFeedback(null);
  };

  const handleUpdateAccount = async () => {
    if (!user || !editingUser) {
      return;
    }

    const updates: UpdateUserInput["updates"] = {};
    const trimmedName = editingValues.name.trim();
    if (trimmedName && trimmedName !== editingUser.name) {
      updates.name = trimmedName;
    }
    if (editingValues.role !== editingUser.role) {
      updates.role = editingValues.role;
    }
    if (editingValues.status !== editingUser.status) {
      updates.status = editingValues.status;
    }

    const selectedDepartmentName = getDepartmentNameByCode(editingValues.department);
    if ((selectedDepartmentName || "") !== (editingUser.department ?? "")) {
      updates.department = editingValues.department;
    }

    if (editingValues.password.trim()) {
      updates.password = editingValues.password.trim();
    }

    if (Object.keys(updates).length === 0) {
      setEditingError("Không có thay đổi nào để lưu.");
      return;
    }

    setEditingSaving(true);
    setEditingError(null);
    setEditingFeedback(null);

    try {
      await updateUserProfile({
        targetEmail: editingUser.email,
        actor: { email: user.email, name: user.name, role: user.role },
        updates,
      });
      setEditingFeedback("Đã cập nhật tài khoản.");
      setFeedback({ type: "success", message: `Đã cập nhật thông tin cho ${editingUser.name}.` });
      setEditingValues((prev) => ({ ...prev, password: "" }));
    } catch (err) {
      setEditingError(err instanceof Error ? err.message : "Không thể cập nhật tài khoản.");
    } finally {
      setEditingSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !editingUser) {
      return;
    }

    const confirmed = window.confirm(`Bạn chắc chắn muốn xoá tài khoản ${editingUser.name}?`);
    if (!confirmed) {
      return;
    }

    setDeletingAccount(true);
    setEditingError(null);
    setEditingFeedback(null);

    try {
      await deleteUserProfile({
        targetEmail: editingUser.email,
        actor: { email: user.email, name: user.name, role: user.role },
      });
      setFeedback({ type: "success", message: `Đã xoá tài khoản ${editingUser.name}.` });
      setEditingUser(null);
    } catch (err) {
      setEditingError(err instanceof Error ? err.message : "Không thể xoá tài khoản." );
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleCloseEditDialog = () => {
    setEditingUser(null);
    setEditingError(null);
    setEditingFeedback(null);
    setEditingValues({ name: "", role: Role.NHAN_VIEN, status: "ACTIVE", department: "", password: "" });
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
              {(formValues.role === Role.TRUONG_PHONG || formValues.role === Role.NHAN_VIEN) && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel id="department-select">Phòng ban</InputLabel>
                    <Select
                      labelId="department-select"
                      label="Phòng ban"
                      value={formValues.department}
                      onChange={(event) =>
                        setFormValues((prev) => ({
                          ...prev,
                          department: event.target.value,
                        }))
                      }
                      disabled={loadingDepartments}
                    >
                      {departments.map((dept) => (
                        <MenuItem key={dept.code} value={dept.code}>
                          {dept.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
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
                  <Stack key={account.email} direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
                    <Box>
                      <Typography fontWeight={600}>{account.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {ROLE_LABEL_MAP[account.role]} • {account.department ?? "Chưa rõ"}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={USER_STATUS_OPTIONS.find((option) => option.value === account.status)?.label ?? account.status}
                        size="small"
                        color={USER_STATUS_CHIP_COLOR[account.status]}
                        variant="outlined"
                      />
                      {isAdmin && (
                        <Button size="small" variant="text" onClick={() => handleOpenEdit(account)}>
                          Chỉnh sửa
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                ))}
                {activeUsers.length === 0 && !loading && <Alert severity="info">Chưa có tài khoản nào.</Alert>}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Dialog open={Boolean(editingUser)} onClose={handleCloseEditDialog} fullWidth maxWidth="sm">
        <DialogTitle>Chỉnh sửa tài khoản</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} mt={1}>
            {editingError && <Alert severity="error">{editingError}</Alert>}
            {editingFeedback && <Alert severity="success">{editingFeedback}</Alert>}
            <TextField
              label="Họ và tên"
              value={editingValues.name}
              onChange={(event) =>
                setEditingValues((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="edit-role-label">Vai trò</InputLabel>
              <Select
                labelId="edit-role-label"
                label="Vai trò"
                value={editingValues.role}
                onChange={(event) =>
                  setEditingValues((prev) => ({
                    ...prev,
                    role: event.target.value as Role,
                  }))
                }
              >
                {ALL_ROLES.map((role) => (
                  <MenuItem key={role} value={role}>
                    {ROLE_LABEL_MAP[role]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="edit-status-label">Trạng thái</InputLabel>
              <Select
                labelId="edit-status-label"
                label="Trạng thái"
                value={editingValues.status}
                onChange={(event) =>
                  setEditingValues((prev) => ({
                    ...prev,
                    status: event.target.value as UserStatus,
                  }))
                }
              >
                {USER_STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="edit-department-label">Phòng ban</InputLabel>
              <Select
                labelId="edit-department-label"
                label="Phòng ban"
                value={editingValues.department}
                onChange={(event) =>
                  setEditingValues((prev) => ({
                    ...prev,
                    department: event.target.value,
                  }))
                }
              >
                <MenuItem value="">(Không gán)</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept.code} value={dept.code}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Đặt lại mật khẩu"
              type="password"
              value={editingValues.password}
              onChange={(event) =>
                setEditingValues((prev) => ({
                  ...prev,
                  password: event.target.value,
                }))
              }
              fullWidth
              helperText="Để trống nếu không cần đặt lại"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Đóng</Button>
          <Button
            color="error"
            onClick={handleDeleteAccount}
            disabled={deletingAccount || !editingUser || editingUser.email === user.email}
          >
            {deletingAccount ? "Đang xoá..." : "Xoá tài khoản"}
          </Button>
          <Button variant="contained" onClick={handleUpdateAccount} disabled={editingSaving}>
            {editingSaving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default AdminManagement;
