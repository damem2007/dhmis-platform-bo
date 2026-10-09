import { Field } from "../components/Fields";
import type { PlatformPageModel } from "../types";

export function SupportPage({ model }: { model: PlatformPageModel }) {
  const {
    page, meta, state, load, selected, selectedId, setSelectedId, configureRouting,
    recoverAdministrator, provision, tenantSearch, setTenantSearch, tenantStatusFilter,
    setTenantStatusFilter, tenantPlanFilter, setTenantPlanFilter, filteredOrganizations,
    tenantTotal, tenantPage, setTenantPage, overviewDateRange, setOverviewDateRange, overviewStatusFilter,
    setOverviewStatusFilter, overviewPlanFilter, setOverviewPlanFilter, overviewRowsPerPage,
    setOverviewRowsPerPage, overviewTablePage, setOverviewTablePage, overviewStatusOptions,
    overviewPlanOptions, overviewOrganizations, overviewPageOrganizations, overviewPage,
    overviewPageCount, activeTenants, attentionTenants, platformActions, onboardingRange,
    setOnboardingRange, onboardingFunnel, onboardingSearch, setOnboardingSearch,
    onboardingStageFilter, setOnboardingStageFilter, onboardingStageOptions,
    filteredOnboardingOrganizations, onboardingOrganizations, onboardingPageSize, onboardingPages,
    currentOnboardingPage, setOnboardingPage, supportScope, setSupportScope, integrationApprovals,
    currentIntegrationRequestPage, integrationRequestPages, integrationRequestPageSize,
    pagedIntegrationRequests, setIntegrationRequestPage, decideIntegration,
  } = model;
  return (<>
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
  </>);
}
