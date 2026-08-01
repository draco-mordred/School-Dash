import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import "./index.css";
import { RouterProvider } from "react-router-dom";
import { router } from "@/pages/routes/router.tsx";
import { AuthProvider } from "@/hooks/AuthProvider";
import { ThemeProvider } from "@/components/provider/theme";
import { RoleThemeWrapper } from "@/components/provider/RoleThemeWrapper";
import { VercelMonitoring } from "@/components/provider/VercelMonitoring";
import { OfflineModeProvider } from "@/components/provider/OfflineModeProvider";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  }).catch(() => {
    /* ignore service-worker cleanup failures */
  });

  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* Ignore service worker registration issues in production or restricted browsers */
      });
    });
  }
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
    <StrictMode>
      <AuthProvider>
        <OfflineModeProvider>
          <VercelMonitoring />
          <RoleThemeWrapper>
            <RouterProvider router={router} />
            <Toaster />
          </RoleThemeWrapper>
        </OfflineModeProvider>
      </AuthProvider>
    </StrictMode>
  </ThemeProvider>,
);

