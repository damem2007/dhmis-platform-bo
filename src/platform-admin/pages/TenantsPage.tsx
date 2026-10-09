import { Field } from "../components/Fields";
import type { PlatformPageModel } from "../types";

export function TenantsPage({ model }: { model: PlatformPageModel }) {
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
  </>);
}
