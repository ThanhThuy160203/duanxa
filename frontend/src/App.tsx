import { Provider } from "react-redux";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { store } from "./app/store";
import AppRouter from "./routes/AppRouter";
import "./App.css";

const theme = createTheme({
  palette: {
    primary: {
      main: "#0f62fe",
      dark: "#0b4fd6",
    },
    secondary: {
      main: "#fb6f92",
    },
    success: {
      main: "#1f9d8b",
    },
    warning: {
      main: "#d6861c",
    },
    error: {
      main: "#d43f57",
    },
    background: {
      default: "#f4f6fb",
      paper: "#ffffff",
    },
    text: {
      primary: "#17223b",
      secondary: "#5f6b85",
    },
  },
  typography: {
    fontFamily: "'Be Vietnam Pro', 'Segoe UI', sans-serif",
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 14,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(23, 34, 59, 0.08)",
          boxShadow: "0 8px 24px rgba(23, 34, 59, 0.06)",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 600,
          textTransform: "none",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
  },
});

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppRouter />
      </ThemeProvider>
    </Provider>
  );
}

export default App;