import { Field } from "../components/Fields";
import type { PlatformPageModel } from "../types";

export function OverviewPage({ model }: { model: PlatformPageModel }) {
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
  </>);
}
