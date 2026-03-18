import { useState } from "react";
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
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Role, ROLE_LABEL_MAP } from "../../types/role";
import { registerUser } from "../users/userService";

type RegisterFormValues = {
  name: string;
  email: string;
  department: string;
  password: string;
  confirmPassword: string;
  desiredRole: Role;
};

const REGISTER_ROLE_OPTIONS: Role[] = [
  Role.NHAN_VIEN,
  Role.TRUONG_PHONG,
  Role.PCT,
  Role.TONG_HOP,
  Role.CHU_TICH,
];

const Register = () => {
  const navigate = useNavigate();
  const [values, setValues] = useState<RegisterFormValues>({
    name: "",
    email: "",
    department: "",
    password: "",
    confirmPassword: "",
    desiredRole: REGISTER_ROLE_OPTIONS[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (field: "name" | "email" | "department" | "password" | "confirmPassword") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (values.password !== values.confirmPassword) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }

    setSubmitting(true);

    try {
      await registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
        department: values.department,
        desiredRole: values.desiredRole,
      });
      setSuccess("Đăng ký thành công. Vui lòng đợi quản trị viên phê duyệt.");
      setValues((prev) => ({ ...prev, password: "", confirmPassword: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể đăng ký.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #faf5ff, #e0f2ff)",
        p: 2,
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 520, borderRadius: 4, boxShadow: 10 }}>
        <CardContent>
          <Stack spacing={3} component="form" onSubmit={handleSubmit}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Đăng ký tài khoản mới
              </Typography>
              <Typography color="text.secondary">
                Thông tin sẽ được lưu vào Firestore và chờ quản trị viên duyệt.
              </Typography>
            </Box>

            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              {success && <Alert severity="success">{success}</Alert>}
              <TextField label="Họ và tên" value={values.name} onChange={handleChange("name")} required fullWidth />
              <TextField label="Email" type="email" value={values.email} onChange={handleChange("email")} required fullWidth />
              <TextField label="Phòng ban" value={values.department} onChange={handleChange("department")} fullWidth />
              <FormControl fullWidth>
                <InputLabel id="desired-role-label">Vai trò mong muốn</InputLabel>
                <Select
                  labelId="desired-role-label"
                  label="Vai trò mong muốn"
                  value={values.desiredRole}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      desiredRole: event.target.value as Role,
                    }))
                  }
                >
                  {REGISTER_ROLE_OPTIONS.map((role) => (
                    <MenuItem key={role} value={role}>
                      {ROLE_LABEL_MAP[role]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Mật khẩu"
                type="password"
                value={values.password}
                onChange={handleChange("password")}
                required
                fullWidth
              />
              <TextField
                label="Nhập lại mật khẩu"
                type="password"
                value={values.confirmPassword}
                onChange={handleChange("confirmPassword")}
                required
                fullWidth
              />
            </Stack>

            <Stack spacing={1.5}>
              <Button type="submit" variant="contained" size="large" disabled={submitting}>
                {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
              </Button>
              <Button variant="text" onClick={() => navigate("/login")}>Quay lại đăng nhập</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Register;
