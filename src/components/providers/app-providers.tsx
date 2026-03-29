"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { PaletteMode } from "@mui/material/styles";
import { createAppTheme } from "@/lib/theme";

type AppProvidersProps = {
  children: React.ReactNode;
};

type ColorModeContextValue = {
  mode: PaletteMode;
  toggleMode: () => void;
};

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

export function useAppColorMode() {
  const context = useContext(ColorModeContext);

  if (!context) {
    throw new Error("useAppColorMode must be used within AppProviders");
  }

  return context;
}

export function AppProviders({ children }: AppProvidersProps) {
  const queryClientRef = useRef<QueryClient | null>(null);
  const [mode, setMode] = useState<PaletteMode>("dark");
  const [hydrated, setHydrated] = useState(false);

  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          retry: 1,
        },
      },
    });
  }

  useEffect(() => {
    const storedMode = window.localStorage.getItem("rolezito-workspace-mode");

    if (storedMode === "light" || storedMode === "dark") {
      setMode(storedMode);
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem("rolezito-workspace-mode", mode);
  }, [hydrated, mode]);

  const theme = createAppTheme(mode);

  return (
    <ColorModeContext.Provider
      value={{
        mode,
        toggleMode: () => {
          setMode((current) => (current === "dark" ? "light" : "dark"));
        },
      }}
    >
      <AppRouterCacheProvider options={{ enableCssLayer: true }}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <QueryClientProvider client={queryClientRef.current}>
            {children}
          </QueryClientProvider>
        </ThemeProvider>
      </AppRouterCacheProvider>
    </ColorModeContext.Provider>
  );
}
