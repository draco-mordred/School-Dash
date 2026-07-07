import { useRoleTheme } from '@/hooks/useRoleTheme';

/**
 * Component wrapper to apply role-based theming
 * Place this at the root of your app (after AuthProvider) to activate theme switching
 */
export function RoleThemeWrapper({ children }: { children: React.ReactNode }) {
  useRoleTheme();
  return <>{children}</>;
}
