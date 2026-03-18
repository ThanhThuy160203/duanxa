import { useState, type ChangeEvent, type FormEvent } from "react";
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import { setUser } from "./authSlice";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../app/store";
import { loginUser } from "../users/userService";

type LoginFormValues = {
  email: string;
  password: string;
};

const Login = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [values, setValues] = useState<LoginFormValues>({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof LoginFormValues) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const profile = await loginUser(values.email, values.password);
      dispatch(setUser(profile));
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể đăng nhập.");
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
        background: "radial-gradient(circle at top, #e0edff, #f4f6fb)",
        p: 2,
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 420, borderRadius: 4, boxShadow: 12 }}>
        <CardContent>
          <Stack spacing={3} component="form" onSubmit={handleSubmit}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Đăng nhập hệ thống
              </Typography>
              <Typography color="text.secondary">
                Quản lý nhiệm vụ và báo cáo theo từng cấp quyền.
              </Typography>
            </Box>

            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Email"
                type="email"
                value={values.email}
                onChange={handleChange("email")}
                required
                fullWidth
              />
              <TextField
                label="Mật khẩu"
                type="password"
                value={values.password}
                onChange={handleChange("password")}
                required
                fullWidth
              />
            </Stack>

            <Stack spacing={1.5}>
              <Button type="submit" variant="contained" size="large" disabled={submitting}>
                {submitting ? "Đang kiểm tra..." : "Đăng nhập"}
              </Button>
              <Button variant="text" onClick={() => navigate("/register")}>Đăng ký tài khoản mới</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
