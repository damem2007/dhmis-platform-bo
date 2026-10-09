import { Field } from "../components/Fields";
import type { PlatformPageModel } from "../types";

export function SettingsIntegrationsPage({ model }: { model: PlatformPageModel }) {
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
  </>);
}
