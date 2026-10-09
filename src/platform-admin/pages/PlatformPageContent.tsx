import { OverviewPage } from "./OverviewPage";
import { TenantsPage } from "./TenantsPage";
import { OnboardingPage } from "./OnboardingPage";
import { SupportPage } from "./SupportPage";
import { SettingsIntegrationsPage } from "./SettingsIntegrationsPage";
import { PlatformPrototypePage } from "./PlatformPrototypePages";
import { PLATFORM_PROTOTYPE_PAGES } from "../pageRegistry";
import type { PlatformPage } from "../pageRegistry";
import type { PlatformPageModel } from "../types";

export function PlatformPageContent({ model }: { model: PlatformPageModel }) {
  const { page } = model;
  if (page === "overview") return <OverviewPage model={model} />;
  if (page === "tenants") return <TenantsPage model={model} />;
  if (page === "onboarding") return <OnboardingPage model={model} />;
  if (page === "support") return <SupportPage model={model} />;
  if (page === "settings-integrations") return <SettingsIntegrationsPage model={model} />;
  if (PLATFORM_PROTOTYPE_PAGES.includes(page as typeof PLATFORM_PROTOTYPE_PAGES[number])) {
    return <PlatformPrototypePage page={page as Exclude<PlatformPage, "overview" | "tenants" | "onboarding" | "support" | "settings-integrations">} />;
  }
  return null;
}
