import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "@/lib/api";

export default function SetupRouteGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "configured" | "needs-setup">("loading");

  useEffect(() => {
    let isMounted = true;

    const checkStatus = async () => {
      try {
        const response = await api.get("/setup/status");
        if (!isMounted) return;
        setStatus(response.data?.configured ? "configured" : "needs-setup");
      } catch {
        if (!isMounted) return;
        setStatus("needs-setup");
      }
    };

    void checkStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Checking setup status...
      </div>
    );
  }

  if (status === "configured") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
