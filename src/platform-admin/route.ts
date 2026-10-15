import type { PlatformPage } from "./pageRegistry";

/** Resolve a platform surface from the URL, including static-host deep links. */
export function platformPageFromPath(pathname: string, fallback: PlatformPage = "overview"): PlatformPage {
  if (pathname.startsWith("/admin/billing-plans")) return "billing-plans";
  if (pathname.startsWith("/admin/support/activity")) return "support-activity";
  if (pathname.startsWith("/admin/support") || pathname.startsWith("/admin/recovery")) return "support";
  if (pathname.startsWith("/admin/tenants")) return "tenants";
  if (pathname.startsWith("/admin/onboarding")) return "onboarding";
  if (pathname.startsWith("/admin/jobs")) return "jobs";
  if (pathname.startsWith("/admin/incidents")) return "incidents";
  if (pathname.startsWith("/admin/platform-audit")) return "platform-audit";
  if (pathname.startsWith("/admin/feature-flags")) return "feature-flags";
  if (pathname.startsWith("/admin/settings/integrations") || pathname.startsWith("/admin/integrations")) return "settings-integrations";
  if (pathname.startsWith("/admin/settings/staff")) return "settings-staff";
  if (pathname.startsWith("/admin/settings/templates")) return "settings-templates";
  if (pathname.startsWith("/admin/settings/audit")) return "settings-audit";
  if (pathname.startsWith("/admin/settings/roles")) return "settings-roles";
  if (pathname.startsWith("/admin/settings/notifications")) return "settings-notifications";
  if (pathname.startsWith("/admin/settings")) return "settings-practice";
  return fallback;
}
