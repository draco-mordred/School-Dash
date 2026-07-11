import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import "./index.css";
import { RouterProvider } from "react-router-dom";
import { router } from "@/pages/routes/router.tsx";
import { AuthProvider } from "@/hooks/AuthProvider";
import { ThemeProvider } from "@/components/provider/theme";
import { RoleThemeWrapper } from "@/components/provider/RoleThemeWrapper";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from '@vercel/speed-insights/next';

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
    <StrictMode>
      <AuthProvider>
        <Analytics />
        <SpeedInsights />
        <RoleThemeWrapper>
          <RouterProvider router={router} />
          <Toaster />
        </RoleThemeWrapper>
      </AuthProvider>
    </StrictMode>
  </ThemeProvider>,
);

