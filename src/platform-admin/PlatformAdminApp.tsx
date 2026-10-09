import { useEffect, useState, useRef, type FormEvent } from "react";
import { api, setToken } from "./lib/api";
import { Field, Title } from "./components/Fields";
import { isSandboxEnvironment } from "./lib/environment";
import QRCode from "qrcode";
import { PlatformPageContent } from "./pages/PlatformPageContent";
import { ApprovalBell, type ApprovalNotificationFeed } from "./components/ApprovalBell";
import { BrandLoader } from "./components/BrandLoader";
import { Toast } from "./components/Toast";
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
  PanelLeftClose,
  PanelLeftOpen,
  LifeBuoy,
  Sun,
  Moon,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Clock,
  type LucideIcon,
} from "lucide-react";
import {nameInitials} from "./components/LogoMark";
import {
  PLATFORM_PAGE_META,
  PLATFORM_PAGE_TITLES,
  PLATFORM_PROTOTYPE_PAGES,
  PLATFORM_SETTINGS_NAV,
  type PlatformPage,
} from './pageRegistry';
import type { AdapterDefault, AdminState, AccountView, Challenge, IntegrationRequest, IntegrationStatus, Notice, Organization, OrganizationPage, PlatformEnrollment, PlatformProfile, PlatformRegion, PlatformPageModel } from "./types";
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
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(() => new URLSearchParams(window.location.search).get("tenant") || "");
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantStatusFilter, setTenantStatusFilter] = useState("all");
  const [tenantPlanFilter, setTenantPlanFilter] = useState("all");
  const [overviewDateRange, setOverviewDateRange] = useState("Last 24 hours");
  const [overviewStatusFilter, setOverviewStatusFilter] = useState("all");
  const [overviewPlanFilter, setOverviewPlanFilter] = useState("all");
  const [overviewRowsPerPage, setOverviewRowsPerPage] = useState(10);
  const [overviewTablePage, setOverviewTablePage] = useState(1);
  const [tenantPage, setTenantPage] = useState(1);
  const [tenantPageSize, setTenantPageSize] = useState(10);
  const [tenantTotal, setTenantTotal] = useState(0);
  const [approvalFeed, setApprovalFeed] = useState<ApprovalNotificationFeed>({ items: [], unread_count: 0 });
  const [integrationApprovals, setIntegrationApprovals] = useState<Record<string, string>>({});
  const [integrationRequestPage, setIntegrationRequestPage] = useState(1);
  const integrationRequestPageSize = 5;
  const [onboardingPage, setOnboardingPage] = useState(1);
  const [onboardingRange, setOnboardingRange] = useState("Last 7 days");
  const [onboardingSearch, setOnboardingSearch] = useState("");
  const [onboardingStageFilter, setOnboardingStageFilter] = useState("all");
  const [onboardingTarget, setOnboardingTarget] = useState<Organization | null>(null);
  const [supportScope, setSupportScope] = useState<"all" | "mine">("all");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(page.startsWith("settings-"));
  const [helpOpen, setHelpOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => window.localStorage.getItem("dhmis.platform.theme") === "dark" ? "dark" : "light");
  const [showPassword, setShowPassword] = useState(false);
  //const [user, setUser] = useState<User | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountView, setAccountView] = useState<AccountView>(null);
  const [profile, setProfile] = useState<PlatformProfile | null>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setOverviewTablePage(1);
  }, [tenantSearch, tenantStatusFilter, tenantPlanFilter, overviewStatusFilter, overviewPlanFilter, overviewRowsPerPage]);
  useEffect(() => {
    setOnboardingPage(1);
  }, [onboardingSearch, onboardingStageFilter]);
  useEffect(() => {
    if (page.startsWith("settings-")) setSettingsOpen(true);
  }, [page]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("dhmis.platform.theme", theme);
  }, [theme]);
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
  useEffect(() => {
    if (state.type !== "ready" || notice?.state !== "ready") return;
    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [state.type, notice?.state, notice?.message]);
  useEffect(() => setShowPassword(false), [state.type]);
  /**
   * Dummy Admin User
   */
  const providerName = "Admin User";
  const initials = nameInitials(providerName);

//header helper
  async function load(requestedPage = tenantPage, requestedPageSize = tenantPageSize) {
    setState({ type: "loading" });
    try {
      const [organizationResult, adapterDefaults, integrationRequests, integrationStatus, regions, approvals] =
        await Promise.all([
          page === "tenants"
            ? api<OrganizationPage>(`/platform/organizations/query?page=${requestedPage}&page_size=${requestedPageSize}&search=${encodeURIComponent(tenantSearch)}${tenantStatusFilter !== "all" ? `&status=${encodeURIComponent(tenantStatusFilter)}` : ""}${tenantPlanFilter !== "all" ? `&plan=${encodeURIComponent(tenantPlanFilter)}` : ""}`)
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
        setTenantPageSize(organizationResult.page_size);
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

  async function loadProfile() {
    try { setProfile(await api<PlatformProfile>("/platform/auth/me")); }
    catch (reason) { setNotice({ message: reason instanceof Error ? reason.message : "Profile could not be loaded", state: "ready" }); }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      setProfile(await api<PlatformProfile>("/platform/auth/me", { name: form.get("name") }, "PUT"));
      setNotice({ message: "Profile updated.", state: "ready" });
      setAccountView("profile");
    } catch (reason) { setNotice({ message: reason instanceof Error ? reason.message : "Profile could not be updated", state: "ready" }); }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/platform/auth/password/change", { current_password: form.get("current_password"), new_password: form.get("new_password") });
      window.sessionStorage.removeItem(platformSessionKey); setToken(""); setAccountView(null); setState({ type: "login" });
      setNotice({ message: "Password changed. Sign in again with your new password.", state: "login" });
    } catch (reason) { setNotice({ message: reason instanceof Error ? reason.message : "Password could not be changed", state: "ready" }); }
  }

  async function resetMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/platform/auth/mfa/reset", { password: form.get("password") });
      window.sessionStorage.removeItem(platformSessionKey); setToken(""); setAccountView(null); setState({ type: "login" });
      setNotice({ message: "MFA reset. Sign in again to enroll a new authenticator.", state: "login" });
    } catch (reason) { setNotice({ message: reason instanceof Error ? reason.message : "MFA could not be reset", state: "ready" }); }
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
    if (actionBusy) return;
    setActionBusy("provision");
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{
        slug: string;
        invitation?: { token: string };
      }>("/platform/organizations", {
        organization_id: form.get("organization_id") || undefined,
        name: form.get("name"),
        slug: form.get("slug"),
        region: form.get("region"),
        location_name: form.get("location"),
        location_address: form.get("location_address"),
        location_latitude: form.get("location_latitude") ? Number(form.get("location_latitude")) : null,
        location_longitude: form.get("location_longitude") ? Number(form.get("location_longitude")) : null,
        location_osm_place_id: form.get("location_osm_place_id"),
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
      setOnboardingTarget(null);
      await load();
    } catch (reason) {
      setNotice({
        message: reason instanceof Error ? reason.message : "Provisioning failed",
        state:"ready"
    });
    } finally {
      setActionBusy(null);
    }
  }

  async function configureRouting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (actionBusy) return;
    if (state.type !== "ready") return;
    const form = new FormData(event.currentTarget);
    const organization = state.organizations.find(
      (item) => item.id === selectedId,
    );
    if (!organization) return;
    setActionBusy("routing");
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
    } finally {
      setActionBusy(null);
    }
  }

  async function activateTenant(organizationId: string) {
    if (actionBusy) return;
    setActionBusy(`activate:${organizationId}`);
    try {
      const result = await api<{ status: string; detail?: string; request?: { id: string } }>(
        `/platform/organizations/${organizationId}/activate`,
        { reason: "Activate tenant after onboarding" },
        "POST",
      );
      if (result.status === "approval_required") {
        setNotice({ message: "Activation request submitted for approval.", state: "ready" });
      } else if (result.status === "incomplete") {
        setNotice({ message: result.detail || "Complete tenant setup before activation.", state: "ready" });
      } else {
        setNotice({ message: "Tenant activated and available for routing.", state: "ready" });
      }
      await load();
    } catch (reason) {
      setNotice({
        message: reason instanceof Error ? reason.message : "Tenant activation failed",
        state: "ready",
      });
    } finally {
      setActionBusy(null);
    }
  }

  async function recoverAdministrator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (actionBusy) return;
    if (!selectedId) return;
    setActionBusy("recovery");
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
    } finally {
      setActionBusy(null);
    }
  }

  async function decideIntegration(
    event: FormEvent<HTMLFormElement>,
    requestId: string,
  ) {
    event.preventDefault();
    if (actionBusy) return;
    setActionBusy("integration");
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
    } finally {
      setActionBusy(null);
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
    return <div className="platform-loading-screen"><BrandLoader size={72} /></div>;
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
              <div className="password-field">
                <input
                  className="field"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={state.type === "login" ? "current-password" : "new-password"}
                  minLength={state.type === "login" ? 1 : 12}
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
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
  const onboardingStage = (organization: Organization) => organization.status === "active" ? "Activated" : organization.status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const onboardingStageOptions = Array.from(new Set(state.organizations.map(onboardingStage))).sort();
  const filteredOnboardingOrganizations = state.organizations.filter((organization) =>
    `${organization.name} ${organization.slug} ${organization.region}`.toLowerCase().includes(onboardingSearch.toLowerCase())
    && (onboardingStageFilter === "all" || onboardingStage(organization) === onboardingStageFilter),
  );
  const onboardingPages = Math.max(1, Math.ceil(filteredOnboardingOrganizations.length / onboardingPageSize));
  const currentOnboardingPage = Math.min(onboardingPage, onboardingPages);
  const onboardingOrganizations = filteredOnboardingOrganizations.slice((currentOnboardingPage - 1) * onboardingPageSize, currentOnboardingPage * onboardingPageSize);
  const onboardingFunnel: [string, string | number][] = [
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
  const pageModel: PlatformPageModel = {
    page, meta, state, load, selected, selectedId, setSelectedId, configureRouting, activateTenant,
    recoverAdministrator, provision, tenantSearch, setTenantSearch, tenantStatusFilter,
    setTenantStatusFilter, tenantPlanFilter, setTenantPlanFilter, filteredOrganizations,
    tenantTotal, tenantPage, setTenantPage, tenantPageSize, setTenantPageSize, overviewDateRange, setOverviewDateRange, overviewStatusFilter,
    setOverviewStatusFilter, overviewPlanFilter, setOverviewPlanFilter, overviewRowsPerPage,
    setOverviewRowsPerPage, overviewTablePage, setOverviewTablePage, overviewStatusOptions,
    overviewPlanOptions, overviewOrganizations, overviewPageOrganizations, overviewPage,
    overviewPageCount, activeTenants, attentionTenants, platformActions, onboardingRange,
    setOnboardingRange, onboardingFunnel, onboardingSearch, setOnboardingSearch,
    onboardingStageFilter, setOnboardingStageFilter, onboardingStageOptions,
    filteredOnboardingOrganizations, onboardingOrganizations, onboardingPageSize, onboardingPages,
    currentOnboardingPage, setOnboardingPage, supportScope, setSupportScope, integrationApprovals,
    currentIntegrationRequestPage, integrationRequestPages, integrationRequestPageSize,
    pagedIntegrationRequests, setIntegrationRequestPage, decideIntegration, actionBusy,
    onboardingTarget, setOnboardingTarget,
  };

  return (
    <div className={`platform-admin app${sidebarCollapsed ? " platform-sidebar-collapsed" : ""}`}>
      {state.type === "ready" && notice?.state === "ready" && <Toast message={notice.message} onDismiss={() => setNotice(null)} />}
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
          <img src="/assets/dhmis-logo-v2/svg/dhmis-lockup-admin-light.svg" alt="DHMIS Admin" />
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
        <button type="button" className="platform-theme-toggle" aria-label={`Use ${theme === "dark" ? "light" : "dark"} theme`} title={`Use ${theme === "dark" ? "light" : "dark"} theme`} onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}</button>
        <div className="staff-help">
          <button type="button" aria-haspopup="menu" aria-expanded={helpOpen} onClick={() => setHelpOpen((value) => !value)} className="platform-help-button"><LifeBuoy size={15} aria-hidden="true" /> Help</button>
          {helpOpen && <div className="staff-help-menu" role="menu"><strong>Help &amp; support</strong><span>✓ All systems operational</span><button role="menuitem" onClick={() => setHelpOpen(false)}>Contact DHMIS support</button><button role="menuitem" onClick={() => setHelpOpen(false)}>Email support</button><button role="menuitem" onClick={() => setHelpOpen(false)}>Ask my clinic administrator</button><button role="menuitem" onClick={() => setHelpOpen(false)}>Guides &amp; how-tos</button><small>Please don’t include patient names or health details in a message. We’ll attach the page and time automatically.</small></div>}
        </div>
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
                    setAccountView("profile");
                    void loadProfile();
                  }}
                >
                  My profile
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setAccountOpen(false);
                    setAccountView("password");
                  }}
                >
                  Change password
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setAccountOpen(false);
                    setAccountView("mfa");
                    void loadProfile();
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

      {accountView && <div className="platform-profile-overlay" role="dialog" aria-modal="true" aria-labelledby="platform-profile-title">
        <section className="platform-profile-panel">
          <div className="platform-profile-header"><div><h2 id="platform-profile-title">{accountView === "profile" ? "My profile" : accountView === "password" ? "Change password" : "Security & MFA"}</h2><p className="muted">Manage your platform operator account.</p></div><button type="button" className="btn-secondary" onClick={() => setAccountView(null)}>Close</button></div>
          {accountView === "profile" && <form className="platform-profile-form" onSubmit={saveProfile}><Field label="Name"><input className="field" name="name" required minLength={2} defaultValue={profile?.name || providerName} /></Field><Field label="Email"><input className="field" value={profile?.email || ""} readOnly /></Field><Field label="Role"><input className="field" value={profile?.role || "platform_admin"} readOnly /></Field><button className="btn">Save profile</button></form>}
          {accountView === "password" && <form className="platform-profile-form" onSubmit={changePassword}><p className="muted">Choose a new password with at least 12 characters. All other sessions will be signed out.</p><Field label="Current password"><input className="field" name="current_password" type="password" autoComplete="current-password" required /></Field><Field label="New password"><input className="field" name="new_password" type="password" autoComplete="new-password" minLength={12} required /></Field><button className="btn">Change password</button></form>}
          {accountView === "mfa" && <form className="platform-profile-form" onSubmit={resetMfa}><p className="muted">MFA is enrolled for this account. If you lost your authenticator, reset MFA here; you will be signed out and prompted to enroll a new authenticator at the next sign-in.</p><Field label="Current password"><input className="field" name="password" type="password" autoComplete="current-password" required /></Field><p className="muted text-sm">MFA status: {profile?.mfa_enabled === false ? "Not enrolled" : "Enrolled"}</p><button className="btn">Reset MFA and sign out</button></form>}
        </section>
      </div>}

      

      <div className="platform-layout lay">
        <aside
          className="platform-sidebar side"
          aria-label="Platform administration"
        >
          <button type="button" className="platform-sidebar-toggle" aria-label={sidebarCollapsed ? "Show navigation" : "Hide navigation"} title={sidebarCollapsed ? "Show navigation" : "Hide navigation"} onClick={() => setSidebarCollapsed((value) => !value)}>{sidebarCollapsed ? <PanelLeftOpen size={17} aria-hidden="true" /> : <PanelLeftClose size={17} aria-hidden="true" />}</button>
          <p>Platform</p>
          <a
            aria-current={page === "overview" ? "page" : undefined}
            href="/admin/"
          >
            Overview
          </a>
          <p>Customers</p>
          <a aria-current={page === "tenants" ? "page" : undefined} href="/admin/tenants/">Tenants</a>
          <a
            aria-current={page === "onboarding" ? "page" : undefined}
            href="/admin/onboarding/"
          >
            Onboarding
          </a>
          <a aria-current={page === "billing-plans" ? "page" : undefined} href="/admin/billing-plans/">Billing &amp; plans</a>
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
          <a aria-current={page === "platform-audit" ? "page" : undefined} href="/admin/platform-audit/">Platform audit</a>
          <a aria-current={page === "feature-flags" ? "page" : undefined} href="/admin/feature-flags/">Feature flags</a>
          <p>Admin</p>
          <div className="platform-settings-parent"><div className="platform-settings-link"><a aria-current={page.startsWith("settings-") ? "page" : undefined} href="/admin/settings/">Settings</a><button type="button" aria-label={settingsOpen ? "Collapse settings" : "Expand settings"} aria-expanded={settingsOpen} onClick={() => setSettingsOpen((value) => !value)}><ChevronDown size={15} aria-hidden="true" /></button></div></div>
          {(settingsOpen || page.startsWith("settings-")) && PLATFORM_SETTINGS_NAV.map(([key, label, href]) => (
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
          <PlatformPageContent model={pageModel} />
        </main>
      </div>
    </div>
  );
}
