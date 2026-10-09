import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { PlatformPage } from "./pageRegistry";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  region: string;
  status: string;
  database_alias: string;
  front_office_enabled: boolean;
  booking_enabled: boolean;
  patient_portal_enabled: boolean;
  last_error: string;
  domains: { hostname: string; surface: string }[];
  commercial: { account_status: string; plan_code: string; subscription_status: string } | null;
};

export type AdapterDefault = { id: string; region: string; capability: string; provider_name: string; active: boolean };
export type IntegrationRequest = { id: string; organization_id: string; capability: string; provider_name: string; reason: string; status: string; requested_by: string; created_at: string };
export type IntegrationStatus = { capability: string; registered_providers: string[]; configured: boolean; provider_name: string; ready: boolean; sandbox_only: boolean; state: string };
export type PlatformRegion = { code: string; name: string; enabled: boolean; locale: string; currency: string };
export type Challenge = { challenge_token: string; enrollment_required: boolean };
export type PlatformProfile = { id: string; name: string; email: string; role: string; role_id?: string | null; is_bootstrap_operator?: boolean; mfa_enabled: boolean };
export type OrganizationPage = { page: number; page_size: number; total: number; items: Organization[] };
export type PlatformEnrollment = { secret?: string; qr: string };
export type AdminState =
  | { type: "login" }
  | { type: "bootstrap" }
  | { type: "invite"; token: string }
  | { type: "reset"; token: string }
  | { type: "mfa"; challenge: Challenge; platformEnrollment?: PlatformEnrollment }
  | { type: "ready"; organizations: Organization[]; adapterDefaults: AdapterDefault[]; integrationRequests: IntegrationRequest[]; integrationStatus: IntegrationStatus[]; regions: PlatformRegion[] }
  | { type: "loading" }
  | { type: "error"; message: string };
export type Notice = { message: string; state: AdminState["type"] };
export type AccountView = "profile" | "password" | "mfa" | null;
export type PlatformAction = { title: string; detail: string; href: string; severity: string };
export type PlatformPageModel = {
  page: PlatformPage;
  meta: { title: string; description: string };
  state: Extract<AdminState, { type: "ready" }>;
  load: (page?: number, pageSize?: number) => Promise<void>;
  selected?: Organization;
  selectedId: string;
  setSelectedId: Dispatch<SetStateAction<string>>;
  configureRouting: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  recoverAdministrator: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  provision: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  tenantSearch: string;
  setTenantSearch: Dispatch<SetStateAction<string>>;
  tenantStatusFilter: string;
  setTenantStatusFilter: Dispatch<SetStateAction<string>>;
  tenantPlanFilter: string;
  setTenantPlanFilter: Dispatch<SetStateAction<string>>;
  filteredOrganizations: Organization[];
  tenantTotal: number;
  tenantPage: number;
  setTenantPage: Dispatch<SetStateAction<number>>;
  tenantPageSize: number;
  setTenantPageSize: Dispatch<SetStateAction<number>>;
  overviewDateRange: string;
  setOverviewDateRange: Dispatch<SetStateAction<string>>;
  overviewStatusFilter: string;
  setOverviewStatusFilter: Dispatch<SetStateAction<string>>;
  overviewPlanFilter: string;
  setOverviewPlanFilter: Dispatch<SetStateAction<string>>;
  overviewRowsPerPage: number;
  setOverviewRowsPerPage: Dispatch<SetStateAction<number>>;
  overviewTablePage: number;
  setOverviewTablePage: Dispatch<SetStateAction<number>>;
  overviewStatusOptions: string[];
  overviewPlanOptions: string[];
  overviewOrganizations: Organization[];
  overviewPageOrganizations: Organization[];
  overviewPage: number;
  overviewPageCount: number;
  activeTenants: number;
  attentionTenants: number;
  platformActions: PlatformAction[];
  onboardingRange: string;
  setOnboardingRange: Dispatch<SetStateAction<string>>;
  onboardingFunnel: [string, string | number][];
  onboardingSearch: string;
  setOnboardingSearch: Dispatch<SetStateAction<string>>;
  onboardingStageFilter: string;
  setOnboardingStageFilter: Dispatch<SetStateAction<string>>;
  onboardingStageOptions: string[];
  filteredOnboardingOrganizations: Organization[];
  onboardingOrganizations: Organization[];
  onboardingPageSize: number;
  onboardingPages: number;
  currentOnboardingPage: number;
  setOnboardingPage: Dispatch<SetStateAction<number>>;
  supportScope: "all" | "mine";
  setSupportScope: Dispatch<SetStateAction<"all" | "mine">>;
  integrationApprovals: Record<string, string>;
  currentIntegrationRequestPage: number;
  integrationRequestPages: number;
  integrationRequestPageSize: number;
  pagedIntegrationRequests: IntegrationRequest[];
  setIntegrationRequestPage: Dispatch<SetStateAction<number>>;
  decideIntegration: (event: FormEvent<HTMLFormElement>, requestId: string) => Promise<void>;
};
export type { PlatformPage };
