export function shouldShowAdminDashboardSkeleton(
  globalLoading: boolean,
  isAdmin: boolean,
  adminLoading: boolean,
  adminDashboardData: unknown,
) {
  if (globalLoading) return true;
  if (!isAdmin) return false;

  return adminLoading && !adminDashboardData;
}
