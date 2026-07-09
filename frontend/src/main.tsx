import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import "./index.css";
import { RouterProvider } from "react-router-dom";
import { router } from "@/pages/routes/router.tsx";
import { AuthProvider } from "@/hooks/AuthProvider";
import { ThemeProvider } from "@/components/provider/theme";
import { RoleThemeWrapper } from "@/components/provider/RoleThemeWrapper";
import { SpeedInsights } from "@vercel/speed-insights/react";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
    <StrictMode>
      <AuthProvider>
        <RoleThemeWrapper>
          <RouterProvider router={router} />
          <Toaster />
          <SpeedInsights />
        </RoleThemeWrapper>
      </AuthProvider>
    </StrictMode>
  </ThemeProvider>,
);

