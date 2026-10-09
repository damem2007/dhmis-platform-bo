import { Field } from "../components/Fields";
import type { PlatformPageModel } from "../types";

export function TenantsPage({ model }: { model: PlatformPageModel }) {
  const {
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
  } = model;
  return (<>
{page === "tenants" && (
  <>
    <section className="panel overflow-auto">
      <div className="platform-table-filters platform-tenant-filters"><input className="field" type="search" value={tenantSearch} onChange={(event) => { setTenantSearch(event.target.value); setTenantPage(1); }} placeholder="Search organization, slug or region…" aria-label="Search tenants" /><select className="field" value={tenantStatusFilter} onChange={(event) => { setTenantStatusFilter(event.target.value); setTenantPage(1); }} aria-label="Filter tenant status"><option value="all">All statuses</option><option value="active">Active</option><option value="provisioning">Provisioning</option><option value="suspended">Suspended</option><option value="disabled">Disabled</option></select><select className="field" value={tenantPlanFilter} onChange={(event) => { setTenantPlanFilter(event.target.value); setTenantPage(1); }} aria-label="Filter tenant plan"><option value="all">All plans</option>{overviewPlanOptions.map((plan) => <option key={plan} value={plan}>{plan === "unconfigured" ? "Unconfigured" : plan}</option>)}</select><button type="button" className="btn" onClick={() => void load(1)}>Filter</button></div>
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
                <div className="flex flex-wrap gap-2">
                  {organization.status === "migrated" && (
                    <button
                      type="button"
                      className="btn"
                      disabled={Boolean(actionBusy)}
                      aria-busy={actionBusy === `activate:${organization.id}`}
                      onClick={() => void activateTenant(organization.id)}
                    >
                      {actionBusy === `activate:${organization.id}` ? "Activating…" : "Activate"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setSelectedId(organization.id)}
                  >
                    Manage
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="prototype-pagination">
        <span>{tenantTotal ? (tenantPage - 1) * tenantPageSize + 1 : 0}–{Math.min(tenantTotal, tenantPage * tenantPageSize)} of {tenantTotal}</span>
        <label className="label">Rows per page<select className="field" value={tenantPageSize} onChange={(event) => { const nextSize = Number(event.target.value); setTenantPageSize(nextSize); setTenantPage(1); void load(1, nextSize); }}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label>
        <button
          className="btn-secondary"
          disabled={tenantPage === 1}
          onClick={() => void load(tenantPage - 1)}
        >
          Previous
        </button>
        <button
          className="btn-secondary"
          disabled={tenantPage * tenantPageSize >= tenantTotal}
          onClick={() => void load(tenantPage + 1)}
        >
          Next
        </button>
      </div>
    </section>
    {selected && (
      <div
        className="rbac-modal-backdrop"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedId("");
        }}
      >
        <div className="rbac-modal tenant-manage-modal" role="dialog" aria-modal="true" aria-labelledby="tenant-manage-title">
          <div className="platform-card-header">
            <div>
              <h2 id="tenant-manage-title">Manage · {selected.name}</h2>
              <p className="muted">Update routing, custom domains and enabled surfaces.</p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setSelectedId("")}>Close</button>
          </div>
          <form key={`routing-${selected.id}`} className="space-y-3" onSubmit={configureRouting}>
            <Field label="Slug">
              <input className="field" name="slug" defaultValue={selected.slug} required />
            </Field>
            <Field label="Custom domains (hostname|surface, one per line)">
              <textarea className="field" name="domains" defaultValue={selected.domains.map((domain) => `${domain.hostname}|${domain.surface}`).join("\n")} />
            </Field>
            <div className="flex flex-wrap gap-4 text-sm">
              <label><input type="checkbox" name="front_office" defaultChecked={selected.front_office_enabled} /> Front Office</label>
              <label><input type="checkbox" name="booking" defaultChecked={selected.booking_enabled} /> Booking</label>
              <label><input type="checkbox" name="portal" defaultChecked={selected.patient_portal_enabled} /> Patient Portal</label>
            </div>
            <div className="rbac-modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setSelectedId("")}>Cancel</button>
              <button className="btn" disabled={Boolean(actionBusy)} aria-busy={actionBusy === "routing"}>{actionBusy === "routing" ? "Saving routing…" : "Save routing"}</button>
            </div>
          </form>
        </div>
      </div>
    )}
  </>
)}
  </>);
}
