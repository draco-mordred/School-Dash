import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

export const shouldRenderVercelMonitoring = (isProduction: boolean) => isProduction;

export const VercelMonitoring = () => {
  if (!shouldRenderVercelMonitoring(import.meta.env.PROD)) {
    return null;
  }

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
};
