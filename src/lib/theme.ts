import { alpha, createTheme, PaletteMode } from "@mui/material/styles";

export const brandColors = {
  gold: "#FFBB00",
  violet: "#5D05FF",
};

export function createAppTheme(mode: PaletteMode) {
  const isDark = mode === "dark";

  return createTheme({
    cssVariables: true,
    palette: {
      mode,
      primary: {
        main: brandColors.gold,
        light: "#FFD75C",
        dark: "#D99A00",
        contrastText: "#1C1500",
      },
      secondary: {
        main: brandColors.violet,
        light: "#8A54FF",
        dark: "#4200C2",
        contrastText: "#FFFFFF",
      },
      background: {
        default: isDark ? "#09070F" : "#F6F3EF",
        paper: isDark ? "#12101A" : "#FFFCF8",
      },
      text: {
        primary: isDark ? "#F7F2EB" : "#18161F",
        secondary: isDark ? "#B8B0C8" : "#6A6376",
      },
      divider: isDark
        ? "rgba(247, 242, 235, 0.08)"
        : "rgba(24, 22, 31, 0.08)",
      success: {
        main: "#18B56A",
      },
      warning: {
        main: "#F59E0B",
      },
      error: {
        main: "#E25C50",
      },
      info: {
        main: "#3498FF",
      },
    },
    shape: {
      borderRadius: 4,
    },
    spacing: 4,
    typography: {
      fontFamily:
        'var(--font-manrope), "SF Pro Display", "Avenir Next", "Segoe UI", sans-serif',
      h1: {
        fontSize: "3rem",
        lineHeight: 1.04,
        fontWeight: 800,
        letterSpacing: "-0.06em",
      },
      h2: {
        fontSize: "2.15rem",
        lineHeight: 1.08,
        fontWeight: 800,
        letterSpacing: "-0.05em",
      },
      h3: {
        fontSize: "1.25rem",
        lineHeight: 1.15,
        fontWeight: 700,
        letterSpacing: "-0.03em",
      },
      h4: {
        fontSize: "1rem",
        lineHeight: 1.2,
        fontWeight: 700,
        letterSpacing: "-0.02em",
      },
      body1: {
        lineHeight: 1.65,
      },
      body2: {
        lineHeight: 1.55,
      },
      button: {
        textTransform: "none",
        fontWeight: 700,
        letterSpacing: "-0.02em",
      },
      overline: {
        fontWeight: 700,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            background: isDark
              ? "radial-gradient(circle at top, rgba(93, 5, 255, 0.18), transparent 30%), radial-gradient(circle at bottom right, rgba(255, 187, 0, 0.08), transparent 25%), #09070F"
              : "radial-gradient(circle at top, rgba(93, 5, 255, 0.07), transparent 26%), radial-gradient(circle at bottom right, rgba(255, 187, 0, 0.10), transparent 22%), #F6F3EF",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            borderRadius: 24,
            border: `1px solid ${
              isDark ? "rgba(247, 242, 235, 0.08)" : "rgba(24, 22, 31, 0.07)"
            }`,
            boxShadow: isDark
              ? "0 24px 60px rgba(0, 0, 0, 0.28)"
              : "0 24px 60px rgba(24, 22, 31, 0.08)",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: isDark
              ? alpha("#151220", 0.86)
              : alpha("#FFFCF8", 0.9),
            backdropFilter: "blur(22px)",
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 18,
            paddingInline: 18,
            minHeight: 42,
          },
          containedPrimary: {
            boxShadow: isDark
              ? "0 14px 30px rgba(255, 187, 0, 0.22)"
              : "0 14px 30px rgba(255, 187, 0, 0.18)",
          },
          outlined: {
            borderColor: isDark
              ? "rgba(247,242,235,0.12)"
              : "rgba(24,22,31,0.10)",
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 600,
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            backgroundColor: brandColors.violet,
            height: 3,
            borderRadius: 999,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 42,
            paddingInline: 10,
            fontWeight: 700,
            color: isDark ? "#B8B0C8" : "#6A6376",
            "&.Mui-selected": {
              color: brandColors.violet,
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            border: `1px solid ${
              isDark ? "rgba(247,242,235,0.08)" : "rgba(24,22,31,0.08)"
            }`,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 18,
            backgroundColor: isDark
              ? alpha("#FFFFFF", 0.02)
              : alpha("#FFFFFF", 0.78),
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            width: "min(520px, 100vw)",
            borderTopLeftRadius: 28,
            borderBottomLeftRadius: 28,
            backgroundColor: isDark ? "#100D18" : "#FFFDF9",
          },
        },
      },
      MuiSkeleton: {
        defaultProps: {
          animation: "wave",
        },
      },
    },
  });
}
