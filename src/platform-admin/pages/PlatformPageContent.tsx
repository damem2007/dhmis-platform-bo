import { lazy, Suspense } from "react";
const OverviewPage = lazy(() => import("./OverviewPage").then(({ OverviewPage }) => ({ default: OverviewPage })));
const TenantsPage = lazy(() => import("./TenantsPage").then(({ TenantsPage }) => ({ default: TenantsPage })));
const OnboardingPage = lazy(() => import("./OnboardingPage").then(({ OnboardingPage }) => ({ default: OnboardingPage })));
const SupportPage = lazy(() => import("./SupportPage").then(({ SupportPage }) => ({ default: SupportPage })));
const SupportActivityPage = lazy(() => import("./SupportActivityPage").then(({ SupportActivityPage }) => ({ default: SupportActivityPage })));
const SettingsIntegrationsPage = lazy(() => import("./SettingsIntegrationsPage").then(({ SettingsIntegrationsPage }) => ({ default: SettingsIntegrationsPage })));
const PlatformPrototypePage = lazy(() => import("./PlatformPrototypePages").then(({ PlatformPrototypePage }) => ({ default: PlatformPrototypePage })));
const BillingPlansPage = lazy(() => import("./BillingPlansPage").then(({ BillingPlansPage }) => ({ default: BillingPlansPage })));
import { PLATFORM_PROTOTYPE_PAGES } from "../pageRegistry";
import type { PlatformPage } from "../pageRegistry";
import type { PlatformPageModel } from "../types";

export function PlatformPageContent({ model }: { model: PlatformPageModel }) {
  const { page } = model;
  return <Suspense fallback={<div className="panel p-8" role="status">Loading page…</div>}>
    {page === "overview" && <OverviewPage model={model} />}
    {page === "tenants" && <TenantsPage model={model} />}
    {page === "onboarding" && <OnboardingPage model={model} />}
    {page === "support" && <SupportPage model={model} />}
    {page === "support-activity" && <SupportActivityPage />}
    {page === "settings-integrations" && <SettingsIntegrationsPage model={model} />}
    {page === "billing-plans" && <BillingPlansPage />}
    {page !== "billing-plans" && PLATFORM_PROTOTYPE_PAGES.includes(page as typeof PLATFORM_PROTOTYPE_PAGES[number]) && <PlatformPrototypePage page={page as Exclude<PlatformPage, "overview" | "tenants" | "onboarding" | "support" | "support-activity" | "settings-integrations">} />}
  </Suspense>;
}
