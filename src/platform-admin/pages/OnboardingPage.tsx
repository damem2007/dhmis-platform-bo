import { Field } from "../components/Fields";
import type { PlatformPageModel } from "../types";

export function OnboardingPage({ model }: { model: PlatformPageModel }) {
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
  const onboardingStage = (organization: (typeof state.organizations)[number]) => organization.status === "active" ? "Activated" : organization.status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  return (<>
{page === "onboarding" && (
  <>
    <div className="prototype-page-header"><div><h1>Onboarding</h1><p className="muted">New tenants from signup to first booking.</p></div><div className="prototype-header-controls"><label className="prototype-inline-field">Date range<select className="field" value={onboardingRange} onChange={(event) => setOnboardingRange(event.target.value)}><option>Last 7 days</option><option>Last 30 days</option><option>Last 90 days</option></select></label><button type="button" className="btn" onClick={() => document.getElementById("new-tenant-form")?.scrollIntoView({ behavior: "smooth" })}>+ New tenant</button></div></div>
    <section className="platform-kpis"><article className="prototype-kpi"><span>New signups</span><strong>—</strong><small>Signup telemetry is not available from this API</small></article><article className="prototype-kpi"><span>In setup</span><strong>{state.organizations.filter((o) => o.status !== "active").length}</strong><small>Provisioning or inactive tenants</small></article><article className="prototype-kpi"><span>Activated</span><strong>{activeTenants}</strong><small>Active tenants</small></article><article className="prototype-kpi"><span>Median time to first use</span><strong>—</strong><small>Activation timing is not provided</small></article></section>
    <div className="g2 mb-5"><section className="platform-card"><div className="platform-card-header"><h2>Activation funnel</h2><span className="muted">Live provisioning states</span></div><div className="sc"><table><thead><tr><th>Stage</th><th>Tenants</th><th>Conversion</th></tr></thead><tbody>{onboardingFunnel.map(([stage, count], index) => <tr key={stage}><td>{stage}</td><td>{count}</td><td>{index === 0 || count === "—" ? "—" : "—"}</td></tr>)}</tbody></table></div><p className="p-4 muted text-sm">Booking and patient activation telemetry is not available from the control-plane API.</p></section><section className="platform-card"><div className="platform-card-header"><h2>Needs attention</h2><span className="muted">{attentionTenants}</span></div><div className="platform-card-body">{state.organizations.filter((o) => o.last_error || o.status !== "active").slice(0, 5).map((o) => <div className="ai" key={o.id}><div><strong>{o.name}</strong><p className="muted text-sm">{o.last_error || `Status: ${o.status}`}</p></div><span className="prototype-badge prototype-badge-warn">Open</span><a className="btn-secondary" href="/admin/tenants/">Review</a></div>)}{attentionTenants === 0 && <p className="muted">No onboarding blockers reported.</p>}</div></section></div>
    <form id="new-tenant-form" className="platform-card frm platform-new-tenant-form" onSubmit={provision}>
      <div className="prototype-section-head platform-new-tenant-header" style={{ gridColumn: "1 / -1" }}><div><h2>New tenant</h2><p className="muted text-sm">Provision the organization, first location and organization-scoped administrator.</p></div></div>
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
      <fieldset className="platform-checkbox-grid">
        <legend>Capabilities</legend>
        <label>
          <input type="checkbox" name="front_office" defaultChecked />{" "}
          Front Office
        </label>
        <label>
          <input type="checkbox" name="booking" defaultChecked />{" "}
          Booking
        </label>
        <label>
          <input type="checkbox" name="portal" defaultChecked />{" "}
          Patient Portal
        </label>
      </fieldset>
      <div className="platform-form-actions"><button className="btn">Provision tenant</button></div>
    </form>
    <section className="platform-card mt-5 overflow-auto"><div className="platform-card-header platform-onboarding-header"><div><h2>Tenants in onboarding</h2><span className="muted">{filteredOnboardingOrganizations.length} matching records</span></div><form className="prototype-filter-bar" onSubmit={(event) => event.preventDefault()}><input className="field" value={onboardingSearch} onChange={(event) => setOnboardingSearch(event.target.value)} placeholder="Search tenants…" aria-label="Search onboarding tenants" /><select className="field" value={onboardingStageFilter} onChange={(event) => setOnboardingStageFilter(event.target.value)} aria-label="Onboarding stage"><option value="all">All stages</option>{onboardingStageOptions.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select></form></div><table><thead><tr><th>Tenant</th><th>Plan</th><th>Stage</th><th>Signed up</th><th>CSM</th><th>Last activity</th><th>Blocker</th><th>Actions</th></tr></thead><tbody>{onboardingOrganizations.map((o) => <tr key={o.id}><td><strong>{o.name}</strong></td><td>{o.commercial?.plan_code || "—"}</td><td><span className="prototype-badge">{onboardingStage(o)}</span></td><td>—</td><td>—</td><td>—</td><td>{o.last_error || "—"}</td><td><a className="btn-secondary" href="/admin/tenants/">Open tenant</a></td></tr>)}</tbody></table>{!filteredOnboardingOrganizations.length && <p className="p-4 muted">No onboarding tenants match this filter.</p>}<p className="p-4 muted text-sm">Signup dates, CSM ownership, last activity, booking and patient activation telemetry are not available from the control-plane API.</p><div className="prototype-pagination"><span>{filteredOnboardingOrganizations.length ? `${(currentOnboardingPage - 1) * onboardingPageSize + 1}–${Math.min(currentOnboardingPage * onboardingPageSize, filteredOnboardingOrganizations.length)} of ${filteredOnboardingOrganizations.length}` : "0–0 of 0"}</span><button type="button" className="btn-secondary" disabled={currentOnboardingPage <= 1} onClick={() => setOnboardingPage((v) => Math.max(1, v - 1))}>Previous</button><button type="button" className="btn-secondary" disabled={currentOnboardingPage >= onboardingPages} onClick={() => setOnboardingPage((v) => Math.min(onboardingPages, v + 1))}>Next</button></div></section>
  </>
)}
  </>);
}
