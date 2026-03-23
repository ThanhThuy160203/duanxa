import { Box, CircularProgress, Stack, Typography } from "@mui/material";

const FlashScreen = () => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        background:
          "radial-gradient(circle at 15% 20%, rgba(15,98,254,0.18), transparent 45%), radial-gradient(circle at 85% 80%, rgba(251,111,146,0.2), transparent 40%), linear-gradient(160deg, #f8fbff 0%, #eef4ff 55%, #fdf7fb 100%)",
      }}
    >
      <Stack
        spacing={2}
        alignItems="center"
        sx={{
          px: 4,
          py: 4,
          borderRadius: 4,
          background: "rgba(255, 255, 255, 0.82)",
          border: "1px solid rgba(23, 34, 59, 0.08)",
          backdropFilter: "blur(6px)",
        }}
      >
        <Box
          component="img"
          src="/logo-daklak.png"
          alt="Logo Dak Lak"
          sx={{ width: 108, height: 108, objectFit: "contain", borderRadius: "50%" }}
        />
        <CircularProgress thickness={4} />
        <Typography variant="h6" fontWeight={700} textAlign="center">
          Hệ thống quản lý nhiệm vụ
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Đang chuẩn bị trang đăng nhập...
        </Typography>
      </Stack>
    </Box>
  );
};

export default FlashScreen;
