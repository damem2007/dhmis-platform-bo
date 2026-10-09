import { useEffect, useState, useRef, type FormEvent } from "react";
import { api, setToken } from "../shared/api";
import { Field, Title } from "../shared/Fields";
import { isSandboxEnvironment } from "../shared/environment";
import QRCode from "qrcode";
import { PlatformPrototypePage } from "./PlatformPrototypePages";
import { ApprovalBell, type ApprovalNotificationFeed } from "../shared/ApprovalBell";
import { BrandLoader } from "../shared/BrandLoader";
import {
  Home,
  Calendar,
  Users,
  FileText,
  HeartPulse,
  ShieldCheck,
  BarChart3,
  Settings,
  Building2,
  Globe2,
  ChevronDown,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Clock,
  type LucideIcon,
} from "lucide-react";
import {nameInitials} from "../shared/LogoMark";
import {
  PLATFORM_PAGE_META,
  PLATFORM_PAGE_TITLES,
  PLATFORM_PROTOTYPE_PAGES,
  PLATFORM_SETTINGS_NAV,
  type PlatformPage,
} from './pageRegistry';

type Organization = {
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
  commercial: {
    account_status: string;
    plan_code: string;
    subscription_status: string;
  } | null;
};
type AdapterDefault = {
  id: string;
  region: string;
  capability: string;
  provider_name: string;
  active: boolean;
};
type IntegrationRequest = {
  id: string;
  organization_id: string;
  capability: string;
  provider_name: string;
  reason: string;
  status: string;
  requested_by: string;
  created_at: string;
};
type IntegrationStatus = {
  capability: string;
  registered_providers: string[];
  configured: boolean;
  provider_name: string;
  ready: boolean;
  sandbox_only: boolean;
  state: string;
};
type PlatformRegion = {
  code: string;
  name: string;
  enabled: boolean;
  locale: string;
  currency: string;
};
type Challenge = { challenge_token: string; enrollment_required: boolean };
type OrganizationPage = { page: number; page_size: number; total: number; items: Organization[] };
type platformEnrollment= {secret?: string, qr: string}
type AdminState =
  | { type: "login" }
  | { type: "bootstrap" }
  | { type: "invite"; token: string }
  | { type: "reset"; token: string }
  | { type: "mfa"; challenge: Challenge; platformEnrollment?: platformEnrollment }
  | {
      type: "ready";
      organizations: Organization[];
      adapterDefaults: AdapterDefault[];
      integrationRequests: IntegrationRequest[];
      integrationStatus: IntegrationStatus[];
      regions: PlatformRegion[];
    }
  | { type: "loading" }
  | { type: "error"; message: string };
type Notice ={
  message: string;
  state: AdminState["type"];
}
export type { PlatformPage } from './pageRegistry';

const platformSessionKey = "dhmis.platform.access-token";

export default function PlatformAdminApp({ page }: { page: PlatformPage }) {
  const [state, setState] = useState<AdminState>(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("invite")) return { type: "invite", token: query.get("invite")! };
    if (query.get("reset")) return { type: "reset", token: query.get("reset")! };
    return window.sessionStorage.getItem(platformSessionKey)
      ? { type: "loading" }
      : { type: "login" };
  });
  const [notice, setNotice] = useState<Notice|null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [tenantSearch, setTenantSearch] = useState("");
  const [overviewDateRange, setOverviewDateRange] = useState("Last 24 hours");
  const [overviewStatusFilter, setOverviewStatusFilter] = useState("all");
  const [overviewPlanFilter, setOverviewPlanFilter] = useState("all");
  const [overviewRowsPerPage, setOverviewRowsPerPage] = useState(10);
  const [overviewTablePage, setOverviewTablePage] = useState(1);
  const [tenantPage, setTenantPage] = useState(1);
  const [tenantTotal, setTenantTotal] = useState(0);
  const [approvalFeed, setApprovalFeed] = useState<ApprovalNotificationFeed>({ items: [], unread_count: 0 });
  const [integrationApprovals, setIntegrationApprovals] = useState<Record<string, string>>({});
  const [integrationRequestPage, setIntegrationRequestPage] = useState(1);
  const integrationRequestPageSize = 5;
  const [onboardingPage, setOnboardingPage] = useState(1);
  const [onboardingRange, setOnboardingRange] = useState("Last 7 days");
  const [supportScope, setSupportScope] = useState<"all" | "mine">("all");
  //const [user, setUser] = useState<User | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setOverviewTablePage(1);
  }, [tenantSearch, overviewStatusFilter, overviewPlanFilter, overviewRowsPerPage]);
  useEffect(() => {
    function dismiss(event: MouseEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (
        event instanceof MouseEvent
        && accountRef.current?.contains(event.target as Node)
      ) return;
      setAccountOpen(false);
    }
    document.addEventListener("mousedown", dismiss);
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("mousedown", dismiss);
      document.removeEventListener("keydown", dismiss);
    };
  }, []);
  useEffect(() => { accountRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus(); }, [accountOpen]);
  /**
   * Dummy Admin User
   */
  const providerName = "Admin User";
  const initials = nameInitials(providerName);

//header helper
  async function load(requestedPage = tenantPage) {
    setState({ type: "loading" });
    try {
      const [organizationResult, adapterDefaults, integrationRequests, integrationStatus, regions, approvals] =
        await Promise.all([
          page === "tenants"
            ? api<OrganizationPage>(`/platform/organizations/query?page=${requestedPage}&page_size=25&search=${encodeURIComponent(tenantSearch)}`)
            : api<Organization[]>("/platform/organizations"),
          api<AdapterDefault[]>("/platform/adapter-defaults"),
          api<IntegrationRequest[]>("/platform/integration-requests"),
          api<IntegrationStatus[]>("/platform/integrations/status"),
          api<PlatformRegion[]>("/platform/regions").catch(() => []),
          api<ApprovalNotificationFeed>("/platform/rbac/notifications").catch(() => ({ items: [], unread_count: 0 })),
        ]);
      setApprovalFeed(approvals);
      setState({
        type: "ready",
        organizations: Array.isArray(organizationResult) ? organizationResult : organizationResult.items,
        adapterDefaults,
        integrationRequests,
        integrationStatus,
        regions,
      });
      if (!Array.isArray(organizationResult)) {
        setTenantPage(organizationResult.page);
        setTenantTotal(organizationResult.total);
      }
    } catch (reason) {
      setState({
        type: "error",
        message:
          reason instanceof Error ? reason.message : "Platform request failed",
      });
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const challenge = await api<Challenge>("/platform/auth/login", {
        email: form.get("email"),
        password: form.get("password"),
      });
      if (challenge.enrollment_required) {
        const setup = await api<{ secret: string, uri: string }>(
          "/platform/auth/mfa/setup",
          { challenge_token: challenge.challenge_token },
        );
        setState({ type: "mfa", challenge, platformEnrollment: {secret: setup.secret, qr: await QRCode.toDataURL(setup.uri) }});
      } else setState({ type: "mfa", challenge });
    } catch (reason) {
      setNotice({message: reason instanceof Error ? reason.message : "Sign in failed", state: "login"});
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.type !== "mfa") return;
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{ access_token: string }>(
        "/platform/auth/mfa/verify",
        {
          challenge_token: state.challenge.challenge_token,
          code: form.get("code"),
        },
      );
      setToken(result.access_token);
      window.sessionStorage.setItem(platformSessionKey, result.access_token);
      await load();
    } catch (reason) {
      setNotice({
        message: reason instanceof Error ? reason.message : "Verification failed",
        state: "mfa"
    });
    }
  }

  async function bootstrap(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/v1/platform/auth/bootstrap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bootstrap-Key": String(form.get("key")),
      },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    //console.log("Bootstrap response:", response);
    const result = await response.json();
    if (!response.ok)
      return setNotice({
        message: typeof result.detail === "string" ? result.detail : "Bootstrap failed",
        state: "bootstrap"
  });
    setNotice({message: "Platform operator created. Sign in to continue.", state:"bootstrap"});
    setState({ type: "login" });
  }

  async function acceptInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.type !== "invite") return;
    const form = new FormData(event.currentTarget);
    try {
      await api("/platform/auth/invites/accept", {
        token: state.token,
        password: form.get("password"),
      });
      window.history.replaceState({}, "", "/admin/");
      setState({ type: "login" });
      setNotice({ message: "Platform account created. Sign in to enroll MFA.", state: "login" });
    } catch (reason) {
      setNotice({ message: reason instanceof Error ? reason.message : "Invitation could not be accepted", state: "invite" });
    }
  }

  async function completePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.type !== "reset") return;
    const form = new FormData(event.currentTarget);
    try {
      await api("/platform/auth/password-reset/complete", {
        token: state.token,
        password: form.get("password"),
      });
      window.history.replaceState({}, "", "/admin/");
      setState({ type: "login" });
      setNotice({ message: "Password updated. Sign in with the new password.", state: "login" });
    } catch (reason) {
      setNotice({ message: reason instanceof Error ? reason.message : "Password could not be updated", state: "reset" });
    }
  }

  async function provision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{
        slug: string;
        invitation?: { token: string };
      }>("/platform/organizations", {
        name: form.get("name"),
        slug: form.get("slug"),
        region: form.get("region"),
        location_name: form.get("location"),
        admin_name: form.get("admin_name"),
        admin_email: form.get("admin_email"),
        visibility: "organization",
        branding: {},
        domains: [],
        front_office_enabled: form.get("front_office") === "on",
        booking_enabled: form.get("booking") === "on",
        patient_portal_enabled: form.get("portal") === "on",
      });
      setNotice({
        message: `Tenant /${result.slug} provisioned. Initial invitation: ${result.invitation?.token || "already existed"}`,
        state: "ready"});
      await load();
    } catch (reason) {
      setNotice({
        message: reason instanceof Error ? reason.message : "Provisioning failed",
        state:"ready"
    });
    }
  }

  async function configureRouting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.type !== "ready") return;
    const form = new FormData(event.currentTarget);
    const organization = state.organizations.find(
      (item) => item.id === selectedId,
    );
    if (!organization) return;
    const domains = String(form.get("domains") || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [hostname, surface = "public"] = line
          .split("|")
          .map((part) => part.trim());
        return { hostname, surface };
      });
    try {
      await api(
        `/platform/organizations/${organization.id}/routing`,
        {
          slug: form.get("slug"),
          domains,
          front_office_enabled: form.get("front_office") === "on",
          booking_enabled: form.get("booking") === "on",
          patient_portal_enabled: form.get("portal") === "on",
        },
        "PUT",
      );
      setNotice({message:"Tenant routing updated.", state:"ready"});
      await load();
    } catch (reason) {
      setNotice({
        message:reason instanceof Error ? reason.message : "Routing update failed",
        state: "ready"
    });
    }
  }

  async function recoverAdministrator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;
    const form = new FormData(event.currentTarget);
    try {
      await api(`/platform/organizations/${selectedId}/recovery`, {
        staff_email: form.get("email"),
        action: form.get("action"),
        reason: form.get("reason"),
      });
      setNotice({message: "Audited administrator recovery action completed.", state: "ready"});
    } catch (reason) {
      setNotice({
        message: reason instanceof Error ? reason.message : "Recovery action failed",
      state: "ready"});
    }
  }

  async function decideIntegration(
    event: FormEvent<HTMLFormElement>,
    requestId: string,
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    try {
      const result = await api<{ status?: string; request?: { id: string } }>(
        `/platform/integration-requests/${requestId}`,
        {
          status: submitter?.value,
          reason: form.get("reason"),
          approval_request_id: integrationApprovals[requestId] || null,
        },
        "PUT",
      );
      if (result.status === 'approval_required' && result.request) {
        setIntegrationApprovals({ ...integrationApprovals, [requestId]: result.request.id });
        setNotice({ message: "Integration activation sent for approval. The provider override is unchanged.", state: "ready" });
        window.dispatchEvent(new Event('dhmis:rbac-updated'));
        return;
      }
      const next = { ...integrationApprovals }; delete next[requestId]; setIntegrationApprovals(next);
      setNotice({message: "Integration customization decision recorded and audited.", state: "ready"});
      await load();
    } catch (reason) {
      setNotice({message: reason instanceof Error ? reason.message : "Decision failed", state: "ready"});
    }
  }

  async function logout() {
    try {
      await api("/platform/auth/logout", {});
    } finally {
      window.sessionStorage.removeItem(platformSessionKey);
    }
    setToken("");
    setState({ type: "login" });
  }
  useEffect(() => {
    document.title = PLATFORM_PAGE_TITLES[page];
    const storedToken = window.sessionStorage.getItem(platformSessionKey);
    if (storedToken) {
      setToken(storedToken);
      void load();
    }
    const unauthorized = () => {
      window.sessionStorage.removeItem(platformSessionKey);
      setToken("");
      setState({ type: "login" });
    };
    window.addEventListener("dhmis:unauthorized", unauthorized);
    return () => window.removeEventListener("dhmis:unauthorized", unauthorized);
  }, [page]);

  if (state.type === "loading")
    return <div className="platform-auth-shell"><div className="platform-auth-card-wrap"><BrandLoader size={100} /></div></div>;
  if (state.type === "error")
    return (
      <main className="platform-auth-shell">
        <div className="platform-auth-intro">
          <h1>DHMIS Platform Administration</h1>
          <p>Separate control-plane access for authorized platform operators.</p>
          <p className="platform-auth-security">Control-plane access · MFA required</p>
        </div>
        <div className="platform-auth-card-wrap">
          <div className="platform-auth-card">
        <p className="panel" role="alert">
          {state.message}
        </p>
        <button
          className="btn platform-auth-primary mt-3"
          onClick={() => setState({ type: "login" })}
        >
          Return to sign in
        </button>
          </div>
        </div>
      </main>
    );
  if (
    state.type === "login" ||
    state.type === "bootstrap" ||
    state.type === "invite" ||
    state.type === "reset"
  )
    return (
      <main className="platform-auth-shell">
        <div className="platform-auth-intro">
          <h1>Sign in to your platform workspace.</h1>
          <p>Tenant operations, integrations, support and platform governance in one connected control plane.</p>
          <p className="platform-auth-security">Control-plane access · MFA required</p>
        </div>
        <div className="platform-auth-card-wrap">
        <div className="platform-auth-card">
          <h2>Platform administration</h2>
          <p className="platform-auth-description">Authorized platform operators only.</p>
          {notice?.state === state.type && (
            <p className="platform-auth-notice" role="status">
              {notice.message}
            </p>
          )}
          <form
            className="platform-auth-form"
            onSubmit={
              state.type === "login"
                ? login
                : state.type === "bootstrap"
                  ? bootstrap
                  : state.type === "invite"
                    ? acceptInvitation
                    : completePasswordReset
            }
          >
            {state.type === "bootstrap" && (
              <>
                <Field label="Bootstrap key">
                  <input
                    className="field"
                    name="key"
                    type="password"
                    required
                  />
                </Field>
                <Field label="Name">
                  <input className="field" name="name" required />
                </Field>
              </>
            )}
            {(state.type === "login" || state.type === "bootstrap") && <Field label="Email">
              <input className="field" name="email" type="email" required />
            </Field>}
            <Field label={state.type === "invite" || state.type === "reset" ? "New password" : "Password"}>
              <input
                className="field"
                name="password"
                type="password"
                minLength={state.type === "login" ? 1 : 12}
                required
              />
            </Field>
            <button className="btn platform-auth-primary">
              {state.type === "login"
                ? "Continue to MFA"
                : state.type === "bootstrap"
                  ? "Create first operator"
                  : state.type === "invite"
                    ? "Create platform account"
                    : "Update password"}
            </button>
          </form>
          
          {(state.type === "login" || state.type === "bootstrap") && <button
            className="platform-auth-toggle"
            onClick={() =>
              setState({ type: state.type === "login" ? "bootstrap" : "login" })
            }
          >
            {state.type === "login"
              ? "First-time platform bootstrap"
              : "Return to sign in"}
          </button>}
        </div>
        </div>
      </main>
    );
  if (state.type === "mfa")
    return (
      <main className="platform-auth-shell">
        <div className="platform-auth-intro">
          <h1>Secure your platform workspace.</h1>
          <p>Verify your identity before accessing control-plane operations.</p>
          <p className="platform-auth-security">MFA required for every platform operator</p>
        </div>
        <div className="platform-auth-card-wrap">
        <form className="platform-auth-card platform-auth-form" onSubmit={verify}>
          <h2>Platform MFA</h2>
          <p className="platform-auth-description">Multi-Factor Authentication Layer</p>
          {state.platformEnrollment && (
            <>
              <p className="muted text-sm">
                Scan this QR code in your authenticator app, then enter its
                six-digit code.
              </p>
              <img
                src={state.platformEnrollment.qr}
                width="220"
                height="220"
                alt="Authenticator enrollment QR code"
              />
              <details>
                <summary className="text-sm">Manual setup key</summary>
                <code data-testid="mfa-secret" className="break-all text-sm">
                  {state.platformEnrollment.secret}
                </code>
              </details>
            </>
          )}
          <Field label="Six-digit code">
            <input
              className="field"
              name="code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              required
            />
          </Field>
          <button className="btn platform-auth-primary">Verify</button>
          {notice?.state === "mfa" && <p role="alert">{notice.message}</p>}
        </form>
        </div>
      </main>
    );

  const selected = state.organizations.find(
    (organization) => organization.id === selectedId,
  );
  const activeTenants = state.organizations.filter((organization) => organization.status === "active").length;
  const attentionTenants = state.organizations.filter((organization) => organization.last_error || organization.status !== "active").length;
  const pendingRequests = state.integrationRequests.filter((request) => request.status === "pending").length;
  const integrationRequestPages = Math.max(1, Math.ceil(state.integrationRequests.length / integrationRequestPageSize));
  const currentIntegrationRequestPage = Math.min(integrationRequestPage, integrationRequestPages);
  const pagedIntegrationRequests = state.integrationRequests.slice(
    (currentIntegrationRequestPage - 1) * integrationRequestPageSize,
    currentIntegrationRequestPage * integrationRequestPageSize,
  );
  const onboardingPageSize = 10;
  const onboardingPages = Math.max(1, Math.ceil(state.organizations.length / onboardingPageSize));
  const currentOnboardingPage = Math.min(onboardingPage, onboardingPages);
  const onboardingOrganizations = state.organizations.slice((currentOnboardingPage - 1) * onboardingPageSize, currentOnboardingPage * onboardingPageSize);
  const onboardingFunnel = [
    ["Signed up", "—"],
    ["Organization created", state.organizations.length],
    ["Location added", "—"],
    ["Staff invited", "—"],
    ["Patient added", "—"],
    ["First appointment booked", "—"],
    ["Activated (2+ visits)", activeTenants],
  ];
  const filteredOrganizations = state.organizations.filter((organization) =>
    `${organization.name} ${organization.slug} ${organization.region}`.toLowerCase().includes(tenantSearch.toLowerCase()),
  );
  const overviewOrganizations = filteredOrganizations.filter((organization) =>
    (overviewStatusFilter === "all" || organization.status === overviewStatusFilter)
    && (overviewPlanFilter === "all" || (organization.commercial?.plan_code || "unconfigured") === overviewPlanFilter),
  );
  const overviewStatusOptions = Array.from(new Set(state.organizations.map((organization) => organization.status))).sort();
  const overviewPlanOptions = Array.from(new Set(state.organizations.map((organization) => organization.commercial?.plan_code || "unconfigured"))).sort();
  const overviewPageCount = Math.max(1, Math.ceil(overviewOrganizations.length / overviewRowsPerPage));
  const overviewPage = Math.min(overviewTablePage, overviewPageCount);
  const overviewPageOrganizations = overviewOrganizations.slice((overviewPage - 1) * overviewRowsPerPage, overviewPage * overviewRowsPerPage);
  const platformActions = [
    ...approvalFeed.items.filter((item) => item.kind === 'action').map((item) => ({ title: item.title, detail: item.detail, href: '/admin/settings/roles/?tab=approvals', severity: 'Approval' })),
    ...(pendingRequests ? [{ title: `${pendingRequests} integration request${pendingRequests === 1 ? '' : 's'} awaiting decision`, detail: 'Review provider requests against platform integration policy.', href: '/admin/settings/integrations/', severity: 'Watch' }] : []),
    ...(attentionTenants ? [{ title: `${attentionTenants} tenant${attentionTenants === 1 ? '' : 's'} need attention`, detail: 'Review provisioning errors or inactive tenant states.', href: '/admin/tenants/', severity: 'Incident' }] : []),
  ];
  const meta = PLATFORM_PAGE_META[page];
  const matchedPage = [
    "overview",
    "onboarding",
    "jobs",
    "incidents",
    "support",
    "settings-practice",
    "settings-integrations",
    "settings-staff",
    "settings-templates",
    "settings-audit",
    "settings-roles",
  ].includes(page);

  return (
    <div className="platform-admin app">
      {isSandboxEnvironment && (
        <div className="platform-sandbox sand">
          <span><strong>Development sandbox</strong> · Synthetic records · no live payments, claims, or signatures</span>
          <span className="platform-sandbox-actions">
            <button type="button" onClick={() => void load()}>Refresh</button>
            <span aria-hidden="true">·</span>
            <button type="button" onClick={() => void logout()}>Sign out</button>
          </span>
        </div>
      )}
      <header className="platform-topbar top">
        <div className="platform-brand">
          <strong>DHMIS</strong>
          <span>DHMIS Platform · Production ▾</span>
        </div>
        <label className="platform-topbar-search">
          <input
            className="field q max-w-md"
            type="search"
            value={tenantSearch}
            onChange={(event) => setTenantSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && page === "tenants") void load(1);
            }}
            placeholder="Search tenants…"
            aria-label="Search tenants"
          />
        </label>
        <div className="platform-topbar-spacer" />
        <div className="platform-topbar-actions">
        <ApprovalBell
          domain="platform"
          approvalsHref="/admin/settings/roles/?tab=approvals"
        />
        <div className="h-6 w-px bg-[var(--border)]" />
          <div className="staff-help" ref={accountRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              onClick={() => {
                setAccountOpen((current) => !current);
              }}
              className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-[var(--paper)]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--sage-tint)] text-xs font-medium text-[var(--sage-deep)]">
                {initials}
              </span>
              <span className="hidden text-left text-xs leading-tight sm:block">
                <span className="block font-medium">{providerName}</span>
                <span className="block text-[var(--ink-muted)]">platform admin</span>
              </span>
              <ChevronDown
                size={14}
                className="text-[var(--ink-faint)]"
                aria-hidden="true"
              />
            </button>
            {accountOpen && (
              <div className="staff-help-menu" role="menu">
                <small>
                  {/*providerName} · {role}*/}
                </small>
                <button
                  role="menuitem"
                  onClick={() => {
                    setAccountOpen(false);
                  //  onAccountSection?.("profile");
                  }}
                >
                  My profile
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setAccountOpen(false);
                    //onAccountSection?.("password");
                  }}
                >
                  Change password
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setAccountOpen(false);
                    //onAccountSection?.("security");
                  }}
                >
                  Security &amp; MFA
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setAccountOpen(false);
                    void logout();
                  }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      

      <div className="platform-layout lay">
        <aside
          className="platform-sidebar side"
          aria-label="Platform administration"
        >
          <p>Platform</p>
          <a
            aria-current={page === "overview" ? "page" : undefined}
            href="/admin/"
          >
            Overview
          </a>
          <p>Customers</p>
          <button type="button" className="platform-nav-inert">Tenants</button>
          <a
            aria-current={page === "onboarding" ? "page" : undefined}
            href="/admin/onboarding/"
          >
            Onboarding
          </a>
          <button type="button" className="platform-nav-inert">Billing &amp; plans</button>
          <p>Operations</p>
          <a
            aria-current={page === "jobs" ? "page" : undefined}
            href="/admin/jobs/"
          >
            Jobs &amp; queues
          </a>
          <a
            aria-current={page === "incidents" ? "page" : undefined}
            href="/admin/incidents/"
          >
            Incidents
          </a>
          <a
            aria-current={page === "support" ? "page" : undefined}
            href="/admin/support/"
          >
            Support
          </a>
          <p>Security</p>
          <button type="button" className="platform-nav-inert">Platform audit</button>
          <button type="button" className="platform-nav-inert">Feature flags</button>
          <p>Admin</p>
          <a
            aria-current={page.startsWith("settings-") ? "page" : undefined}
            href="/admin/settings/"
          >
            Settings
          </a>
          {page.startsWith("settings-") && PLATFORM_SETTINGS_NAV.map(([key, label, href]) => (
            <a
              key={key}
              className="sub"
              aria-current={page === key ? "page" : undefined}
              href={href}
            >
              {label}
            </a>
          ))}
        </aside>
        <main className="min-w-0 p-5 lg:p-7">
          {!matchedPage && (
            <div className="platform-page-heading mb-6 flex items-center justify-between gap-3">
              <Title title={meta.title} description={meta.description} />
            </div>
          )}
          {notice?.state === "ready" && (
            <p className="panel mb-5 break-all" role="status">
              {notice.message}
            </p>
          )}

          {page === "overview" && (
            <>
              <div className="prototype-page-header">
                <div>
                  <h1>{meta.title}</h1>
                  <p className="muted">{meta.description}</p>
                </div>
                <div className="prototype-header-controls">
                  <label className="platform-date-range">
                    <span>Date range</span>
                    <select
                      className="field"
                      value={overviewDateRange}
                      onChange={(event) => setOverviewDateRange(event.target.value)}
                      aria-label="Date range"
                    >
                      <option>Last 24 hours</option>
                      <option>Last 7 days</option>
                      <option>Last 30 days</option>
                    </select>
                  </label>
                  <a className="btn" href="/admin/onboarding/">
                    + New tenant
                  </a>
                </div>
              </div>
              <p className="platform-overview-note">
                Platform views show tenant and system health only. Patient clinical and financial records are never displayed here.
              </p>
              <section className="platform-kpis" aria-label="Platform status">
                <article>
                  <span>Active tenants</span>
                  <strong>{activeTenants}</strong>
                  <small>{state.organizations.length} provisioned in the control plane</small>
                </article>
                <article>
                  <span>Monthly recurring revenue</span>
                  <strong>—</strong>
                  <small>Revenue telemetry is not provided by this API</small>
                </article>
                <article>
                  <span>Uptime, 30 days</span>
                  <strong>—</strong>
                  <small>Availability telemetry is not provided by this API</small>
                </article>
                <article>
                  <span>Failed jobs, 24h</span>
                  <strong>—</strong>
                  <small>Queue metrics are available from Jobs &amp; queues</small>
                </article>
              </section>
              <div className="platform-overview-grid">
                <section className="platform-card" aria-labelledby="platform-action-centre">
                  <div className="platform-card-header">
                    <h2 id="platform-action-centre">Action centre</h2>
                    <span className="muted">{platformActions.length} open</span>
                  </div>
                  {platformActions.length === 0 ? (
                    <p className="muted platform-card-empty">No platform actions require attention.</p>
                  ) : (
                    <div>
                      {platformActions.map((action) => (
                        <article key={action.title} className="platform-action-item">
                          <div>
                            <strong>{action.title}</strong>
                            <p className="muted">{action.detail}</p>
                          </div>
                          <span className={`prototype-badge ${action.severity === "Incident" ? "prototype-badge-danger" : action.severity === "Approval" ? "prototype-badge-info" : "prototype-badge-warn"}`}>
                            {action.severity}
                          </span>
                          <span className="prototype-badge prototype-badge-info">Open</span>
                          <a className="btn" href={action.href}>Review</a>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section className="platform-card" aria-labelledby="platform-restricted-actions">
                  <div className="platform-card-header">
                    <h2 id="platform-restricted-actions">Restricted actions</h2>
                    <span className="prototype-badge">Audited</span>
                  </div>
                  <div className="platform-card-body">
                    <p className="muted platform-restricted-copy">
                      Cross-tenant administrator recovery is a fail-safe for locked-out owners. Support-initiated resets stay inside the support user&apos;s own tenant.
                    </p>
                    <form className="platform-restricted-form" onSubmit={recoverAdministrator}>
                      <div className="platform-restricted-fields">
                        <Field label="Tenant">
                          <select
                            className="field"
                            value={selectedId}
                            onChange={(event) => setSelectedId(event.target.value)}
                            required
                          >
                            <option value="">Select tenant…</option>
                            {state.organizations.map((organization) => (
                              <option key={organization.id} value={organization.id}>{organization.name}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="User email">
                          <input className="field" name="email" type="email" placeholder="owner@clinic.example" required />
                        </Field>
                      </div>
                      <Field label="Reason (required)">
                        <input className="field" name="reason" minLength={10} placeholder="Owner locked out, verified by phone" required />
                      </Field>
                      <input type="hidden" name="action" value="password_reset" />
                      <button className="btn" disabled={!selectedId}>Send one-time reset link</button>
                    </form>
                  </div>
                </section>
              </div>

              <section className="platform-card platform-tenants-card" aria-labelledby="platform-tenants">
                <div className="platform-card-header platform-tenants-header">
                  <h2 id="platform-tenants">Tenants</h2>
                  <div className="platform-table-filters">
                    <input
                      className="field"
                      type="search"
                      value={tenantSearch}
                      onChange={(event) => setTenantSearch(event.target.value)}
                      placeholder="Search tenants…"
                      aria-label="Search tenants in overview"
                    />
                    <select className="field" value={overviewStatusFilter} onChange={(event) => setOverviewStatusFilter(event.target.value)} aria-label="Filter tenant status">
                      <option value="all">All statuses</option>
                      {overviewStatusOptions.map((status) => <option key={status} value={status}>{status.replace(/(^|[-_])\w/g, (match) => match.replace(/[-_]/, "").toUpperCase())}</option>)}
                    </select>
                    <select className="field" value={overviewPlanFilter} onChange={(event) => setOverviewPlanFilter(event.target.value)} aria-label="Filter tenant plan">
                      <option value="all">All plans</option>
                      {overviewPlanOptions.map((plan) => <option key={plan} value={plan}>{plan === "unconfigured" ? "Unconfigured" : plan}</option>)}
                    </select>
                  </div>
                </div>
                <div className="overflow-auto">
                  <table className="platform-overview-table">
                    <thead>
                      <tr><th>Tenant</th><th>Plan</th><th>Locations</th><th>Staff seats</th><th>Status</th><th>Health</th><th>Last active</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {overviewPageOrganizations.map((organization) => {
                        const statusTone = organization.status === "active" ? "good" : organization.status === "suspended" ? "danger" : "warn";
                        const healthTone = organization.last_error ? "warn" : "good";
                        return (
                          <tr key={organization.id}>
                            <td><strong className="platform-tenant-name">{organization.name}</strong><small className="muted">/{organization.slug}</small></td>
                            <td>{organization.commercial?.plan_code || "Unconfigured"}</td>
                            <td>—</td>
                            <td>—</td>
                            <td><span className={`prototype-badge prototype-badge-${statusTone}`}>{organization.status}</span></td>
                            <td><span className={`prototype-badge prototype-badge-${healthTone}`}>{organization.last_error ? "Degraded" : "Healthy"}</span></td>
                            <td>—</td>
                            <td><button className="btn-secondary" onClick={() => setSelectedId(organization.id)}>Open tenant</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {overviewOrganizations.length === 0 && <p className="muted platform-card-empty">No tenants match the current filters.</p>}
                  {overviewOrganizations.length > 0 && (
                    <div className="platform-table-footer">
                      <span>Showing <strong>{(overviewPage - 1) * overviewRowsPerPage + 1}–{Math.min(overviewPage * overviewRowsPerPage, overviewOrganizations.length)}</strong> of <strong>{overviewOrganizations.length}</strong> loaded tenants</span>
                      <span className="platform-table-pagination">
                        <label>Rows per page <select className="field" value={overviewRowsPerPage} onChange={(event) => setOverviewRowsPerPage(Number(event.target.value))} aria-label="Rows per page"><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label>
                        <button type="button" className="btn-secondary" disabled={overviewPage <= 1} onClick={() => setOverviewTablePage((current) => Math.max(1, current - 1))}>Prev</button>
                        <span>Page {overviewPage} of {overviewPageCount}</span>
                        <button type="button" className="btn-secondary" disabled={overviewPage >= overviewPageCount} onClick={() => setOverviewTablePage((current) => Math.min(overviewPageCount, current + 1))}>Next</button>
                      </span>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {page === "tenants" && (
            <>
              <section className="panel overflow-auto">
                <table>
                  <thead>
                    <tr>
                      <th>Organization</th>
                      <th>Region</th>
                      <th>Status</th>
                      <th>Plan</th>
                      <th>Surfaces</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrganizations.map((organization) => (
                      <tr key={organization.id}>
                        <td>
                          <strong>{organization.name}</strong>
                          <p className="muted text-xs">
                            /{organization.slug} · {organization.id}
                          </p>
                        </td>
                        <td>{organization.region}</td>
                        <td>
                          {organization.status}
                          {organization.last_error && (
                            <p className="text-xs text-[var(--danger)]">
                              {organization.last_error}
                            </p>
                          )}
                        </td>
                        <td>
                          {organization.commercial?.plan_code || "Unconfigured"}
                          <p className="muted text-xs">
                            {organization.commercial?.subscription_status}
                          </p>
                        </td>
                        <td>
                          {[
                            organization.front_office_enabled && "Front",
                            organization.booking_enabled && "Booking",
                            organization.patient_portal_enabled && "Portal",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </td>
                        <td>
                          <button
                            className="btn-secondary"
                            onClick={() => setSelectedId(organization.id)}
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="prototype-pagination">
                  <span>
                    {tenantTotal ? (tenantPage - 1) * 25 + 1 : 0}–
                    {Math.min(tenantTotal, tenantPage * 25)} of {tenantTotal}
                  </span>
                  <button
                    className="btn-secondary"
                    disabled={tenantPage === 1}
                    onClick={() => void load(tenantPage - 1)}
                  >
                    Previous
                  </button>
                  <button
                    className="btn-secondary"
                    disabled={tenantPage * 25 >= tenantTotal}
                    onClick={() => void load(tenantPage + 1)}
                  >
                    Next
                  </button>
                </div>
              </section>
              {selected && (
                <form
                  key={`routing-${selected.id}`}
                  className="panel mt-5 space-y-3"
                  onSubmit={configureRouting}
                >
                  <h2 className="font-semibold">Routing · {selected.name}</h2>
                  <Field label="Slug">
                    <input
                      className="field"
                      name="slug"
                      defaultValue={selected.slug}
                      required
                    />
                  </Field>
                  <Field label="Custom domains (hostname|surface, one per line)">
                    <textarea
                      className="field"
                      name="domains"
                      defaultValue={selected.domains
                        .map((domain) => `${domain.hostname}|${domain.surface}`)
                        .join("\n")}
                    />
                  </Field>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label>
                      <input
                        type="checkbox"
                        name="front_office"
                        defaultChecked={selected.front_office_enabled}
                      />{" "}
                      Front Office
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        name="booking"
                        defaultChecked={selected.booking_enabled}
                      />{" "}
                      Booking
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        name="portal"
                        defaultChecked={selected.patient_portal_enabled}
                      />{" "}
                      Patient Portal
                    </label>
                  </div>
                  <button className="btn">Save routing</button>
                </form>
              )}
            </>
          )}

          {page === "onboarding" && (
            <>
              <div className="prototype-page-header"><div><h1>Onboarding</h1><p className="muted">New tenants from signup to first booking.</p></div><div className="prototype-header-controls"><label className="prototype-inline-field">Date range<select className="field" value={onboardingRange} onChange={(event) => setOnboardingRange(event.target.value)}><option>Last 7 days</option><option>Last 30 days</option><option>Last 90 days</option></select></label><button type="button" className="btn" onClick={() => document.getElementById("new-tenant-form")?.scrollIntoView({ behavior: "smooth" })}>+ New tenant</button></div></div>
              <section className="platform-kpis"><article className="prototype-kpi"><span>New signups</span><strong>—</strong><small>Signup telemetry is not available from this API</small></article><article className="prototype-kpi"><span>In setup</span><strong>{state.organizations.filter((o) => o.status !== "active").length}</strong><small>Provisioning or inactive tenants</small></article><article className="prototype-kpi"><span>Activated</span><strong>{activeTenants}</strong><small>Active tenants</small></article><article className="prototype-kpi"><span>Median time to first use</span><strong>—</strong><small>Activation timing is not provided</small></article></section>
              <div className="g2 mb-5"><section className="platform-card"><div className="platform-card-header"><h2>Activation funnel</h2><span className="muted">Live provisioning states</span></div><div className="sc"><table><thead><tr><th>Stage</th><th>Tenants</th><th>Conversion</th></tr></thead><tbody>{onboardingFunnel.map(([stage, count], index) => <tr key={stage}><td>{stage}</td><td>{count}</td><td>{index === 0 || count === "—" ? "—" : "—"}</td></tr>)}</tbody></table></div><p className="p-4 muted text-sm">Booking and patient activation telemetry is not available from the control-plane API.</p></section><section className="platform-card"><div className="platform-card-header"><h2>Needs attention</h2><span className="muted">{attentionTenants}</span></div><div className="platform-card-body">{state.organizations.filter((o) => o.last_error || o.status !== "active").slice(0, 5).map((o) => <div className="ai" key={o.id}><div><strong>{o.name}</strong><p className="muted text-sm">{o.last_error || `Status: ${o.status}`}</p></div><span className="prototype-badge prototype-badge-warn">Open</span><a className="btn-secondary" href="/admin/tenants/">Review</a></div>)}{attentionTenants === 0 && <p className="muted">No onboarding blockers reported.</p>}</div></section></div>
              <form id="new-tenant-form" className="platform-card frm" onSubmit={provision}>
                <div className="prototype-section-head" style={{ gridColumn: "1 / -1" }}><div><h2>New tenant</h2><p className="muted text-sm">Provision the organization, first location and organization-scoped administrator.</p></div></div>
                <Field label="Organization name">
                  <input className="field" name="name" required />
                </Field>
                <Field label="Routing slug">
                  <input
                    className="field"
                    name="slug"
                    pattern="[a-z0-9-]+"
                    required
                  />
                </Field>
                <Field label="Region">
                  <select className="field" name="region" defaultValue="CA" required>
                    {(state.type === "ready" ? state.regions.filter((region) => region.enabled) : []).map((region) => (
                      <option key={region.code} value={region.code}>{region.code} · {region.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="First location">
                  <input className="field" name="location" required />
                </Field>
                <Field label="Administrator name">
                  <input className="field" name="admin_name" required />
                </Field>
                <Field label="Administrator email">
                  <input
                    className="field"
                    name="admin_email"
                    type="email"
                    required
                  />
                </Field>
                <div className="space-y-1 text-sm">
                  <label className="block">
                    <input type="checkbox" name="front_office" defaultChecked />{" "}
                    Front Office
                  </label>
                  <label className="block">
                    <input type="checkbox" name="booking" defaultChecked />{" "}
                    Booking
                  </label>
                  <label className="block">
                    <input type="checkbox" name="portal" defaultChecked />{" "}
                    Patient Portal
                  </label>
                </div>
                <button className="btn self-end">Provision tenant</button>
              </form>
              <section className="platform-card mt-5 overflow-auto"><div className="platform-card-header"><h2>Tenants in onboarding</h2><span className="muted">{state.organizations.length} records</span></div><table><thead><tr><th>Tenant</th><th>Plan</th><th>Stage</th><th>Signed up</th><th>CSM</th><th>Last activity</th><th>Blocker</th><th>Actions</th></tr></thead><tbody>{onboardingOrganizations.map((o) => <tr key={o.id}><td><strong>{o.name}</strong></td><td>{o.commercial?.plan_code || "—"}</td><td>{o.status}</td><td>—</td><td>—</td><td>—</td><td>{o.last_error || "—"}</td><td><a className="btn-secondary" href="/admin/tenants/">Open tenant</a></td></tr>)}</tbody></table>{!state.organizations.length && <p className="p-4 muted">No tenants have entered onboarding.</p>}<div className="prototype-pagination"><span>{state.organizations.length ? `${(currentOnboardingPage - 1) * onboardingPageSize + 1}–${Math.min(currentOnboardingPage * onboardingPageSize, state.organizations.length)} of ${state.organizations.length}` : "0–0 of 0"}</span><button type="button" className="btn-secondary" disabled={currentOnboardingPage <= 1} onClick={() => setOnboardingPage((v) => Math.max(1, v - 1))}>Previous</button><button type="button" className="btn-secondary" disabled={currentOnboardingPage >= onboardingPages} onClick={() => setOnboardingPage((v) => Math.min(onboardingPages, v + 1))}>Next</button></div></section>
            </>
          )}

          {page === "support" && (
            <>
              <div className="prototype-page-header"><div><h1>Support</h1><p className="muted">Tenant support queue and audited administrator recovery.</p></div><div className="prototype-segmented scope-toggle" aria-label="Ticket scope"><button type="button" className={supportScope === "all" ? "active" : ""} aria-pressed={supportScope === "all"} onClick={() => setSupportScope("all")}>All tickets</button><button type="button" className={supportScope === "mine" ? "active" : ""} aria-pressed={supportScope === "mine"} onClick={() => setSupportScope("mine")}>My queue</button></div></div>
              <section className="platform-kpis"><article className="prototype-kpi"><span>Open tickets</span><strong>—</strong><small>Support ticket feed is not available</small></article><article className="prototype-kpi"><span>Unassigned</span><strong>—</strong><small>Support assignment telemetry unavailable</small></article><article className="prototype-kpi"><span>SLA at risk</span><strong>—</strong><small>SLA telemetry unavailable</small></article><article className="prototype-kpi"><span>Resolved today</span><strong>—</strong><small>Resolution telemetry unavailable</small></article></section>
              <div className="g2"><section className="platform-card overflow-auto"><div className="platform-card-header"><h2>Ticket queue</h2><div className="prototype-filter-bar"><input className="field" placeholder="Search tickets…" disabled /><select className="field" disabled><option>All statuses</option></select><select className="field" disabled><option>All priorities</option></select></div></div><p className="p-4 muted">Support ticket feed is not available from the current control-plane API.</p></section>
              <form className="platform-card" onSubmit={recoverAdministrator}>
                <div className="platform-card-header"><h2>Restricted actions</h2><span className="prototype-badge">Audited</span></div><div className="platform-card-body">
                <p className="muted text-sm">
                  Cross-tenant administrator recovery is reserved for verified
                  lockouts. Tenant authorization approval remains inside the
                  tenant.
                </p>
                <Field label="Tenant">
                  <select
                    className="field"
                    value={selectedId}
                    onChange={(event) => setSelectedId(event.target.value)}
                    required
                  >
                    <option value="">Select tenant…</option>
                    {state.organizations.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Administrator email">
                  <input className="field" name="email" type="email" required />
                </Field>
                <input type="hidden" name="action" value="password_reset" />
                <Field label="Reason (required)">
                  <textarea
                    className="field"
                    name="reason"
                    minLength={10}
                    required
                  />
                </Field>
                <button className="btn" disabled={!selectedId}>
                  Send one-time reset link
                </button>
                </div>
              </form>
              </div>
            </>
          )}

          {page === "settings-integrations" && (
            <>
            <div className="prototype-page-header">
              <div>
                <h1>{meta.title}</h1>
                <p className="muted">{meta.description}</p>
              </div>
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              <section className="panel overflow-auto">
                <div className="prototype-section-head">
                  <div>
                    <h2>Operational state</h2>
                    <p>Live registry and selected-provider readiness.</p>
                  </div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Capability</th>
                      <th>Provider</th>
                      <th>State</th>
                      <th>Environment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.integrationStatus.map((row) => (
                      <tr key={row.capability}>
                        <td>
                          <strong>{row.capability.replaceAll("_", " ")}</strong>
                        </td>
                        <td>{row.provider_name || "Not configured"}</td>
                        <td>
                          <span
                            className={`prototype-badge prototype-badge-${row.ready ? "good" : "warn"}`}
                          >
                            {row.state}
                          </span>
                        </td>
                        <td>{row.sandbox_only ? "Sandbox" : "Live-capable"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              <section className="panel overflow-auto">
                <h2 className="mb-3 font-semibold">
                  Integration customization requests
                </h2>
                {state.integrationRequests.length === 0 ? (
                  <p className="muted text-sm">No integration requests.</p>
                ) : (
                  <div className="space-y-3">
                    {pagedIntegrationRequests.map((request) => (
                      <form
                        key={request.id}
                        className="rounded-md border border-[var(--border)] p-3"
                        onSubmit={(event) =>
                          void decideIntegration(event, request.id)
                        }
                      >
                        <div className="flex justify-between gap-3">
                          <div>
                            <strong>
                              {request.capability} · {request.provider_name}
                            </strong>
                            <p className="muted text-xs">
                              Tenant {request.organization_id}
                            </p>
                          </div>
                          <span>{request.status}</span>
                        </div>
                        <p className="my-2 text-sm">{request.reason}</p>
                        {request.status === "pending" && (
                          <>
                            <Field label="Decision reason">
                              <input
                                className="field"
                                name="reason"
                                minLength={10}
                                required
                              />
                            </Field>
                            {integrationApprovals[request.id] && (
                              <a
                                className="mt-2 block text-xs font-semibold text-[var(--sage-deep)]"
                                href="/admin/settings/roles/?tab=approvals"
                              >
                                Approval{" "}
                                {integrationApprovals[request.id].slice(0, 8)} ·
                                review status
                              </a>
                            )}
                            <div className="mt-2 flex gap-2">
                              <button
                                className="btn"
                                name="decision"
                                value="approved"
                              >
                                {integrationApprovals[request.id]
                                  ? "Execute approved activation"
                                  : "Submit approval"}
                              </button>
                              {!integrationApprovals[request.id] && (
                                <button
                                  className="btn-secondary"
                                  name="decision"
                                  value="rejected"
                                >
                                  Reject
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </form>
                    ))}
                    {state.integrationRequests.length > 0 && <div className="prototype-pagination"><span>{(currentIntegrationRequestPage - 1) * integrationRequestPageSize + 1}–{Math.min(currentIntegrationRequestPage * integrationRequestPageSize, state.integrationRequests.length)} of {state.integrationRequests.length}</span><button type="button" className="btn-secondary" disabled={currentIntegrationRequestPage <= 1} onClick={() => setIntegrationRequestPage((value) => Math.max(1, value - 1))}>Previous</button><button type="button" className="btn-secondary" disabled={currentIntegrationRequestPage >= integrationRequestPages} onClick={() => setIntegrationRequestPage((value) => Math.min(integrationRequestPages, value + 1))}>Next</button></div>}
                  </div>
                )}
              </section>
            </div>
            </>
          )}

          {PLATFORM_PROTOTYPE_PAGES.includes(page as typeof PLATFORM_PROTOTYPE_PAGES[number]) && (
            <PlatformPrototypePage
              page={
                page as Exclude<
                  PlatformPage,
                  | "overview"
                  | "tenants"
                  | "onboarding"
                  | "support"
                  | "settings-integrations"
                >
              }
            />
          )}
        </main>
      </div>
    </div>
  );
}
