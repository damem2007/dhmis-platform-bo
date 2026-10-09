import { useEffect, useState, type FormEvent } from "react";
import { Field } from "../components/Fields";
import { LocationAutocomplete } from "../components/LocationAutocomplete";
import { api } from "../lib/api";
import type { Organization, PlatformPageModel } from "../types";
import { BrandLoader } from "../components/BrandLoader";

type TenantLocation = {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  osm_place_id: string;
  timezone: string;
  chairs: string[];
  opening_hour: number;
  closing_hour: number;
  updated_at: string;
};

function TenantLocationsEditor({ organizationId, region }: { organizationId: string; region: string }) {
  const [locations, setLocations] = useState<TenantLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void api<TenantLocation[]>(`/platform/organizations/${organizationId}/locations`)
      .then((result) => { if (!cancelled) setLocations(result); })
      .catch((reason) => { if (!cancelled) setMessage(reason instanceof Error ? reason.message : "Locations could not be loaded"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [organizationId]);

  async function saveLocation(event: FormEvent<HTMLFormElement>, location: TenantLocation) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(location.id);
    setMessage("");
    try {
      const updated = await api<TenantLocation>(
        `/platform/organizations/${organizationId}/locations/${location.id}`,
        {
          name: form.get("location_name"),
          address: form.get("location_address"),
          latitude: form.get("location_latitude") ? Number(form.get("location_latitude")) : null,
          longitude: form.get("location_longitude") ? Number(form.get("location_longitude")) : null,
          osm_place_id: form.get("location_osm_place_id") || "",
          timezone: form.get("timezone"),
          chairs: String(form.get("chairs") || "").split(",").map((chair) => chair.trim()).filter(Boolean),
          opening_hour: Number(form.get("opening_hour")),
          closing_hour: Number(form.get("closing_hour")),
        },
        "PUT",
      );
      setLocations((current) => current.map((item) => item.id === updated.id ? updated : item));
      setMessage("Location updated.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Location could not be updated");
    } finally {
      setBusy(null);
    }
  }

  async function addLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy("new");
    setMessage("");
    try {
      const created = await api<TenantLocation>(
        `/platform/organizations/${organizationId}/locations`,
        {
          name: form.get("location_name"),
          address: form.get("location_address"),
          latitude: form.get("location_latitude") ? Number(form.get("location_latitude")) : null,
          longitude: form.get("location_longitude") ? Number(form.get("location_longitude")) : null,
          osm_place_id: form.get("location_osm_place_id") || "",
          timezone: form.get("timezone") || "America/Vancouver",
          chairs: String(form.get("chairs") || "Op 1, Op 2, Op 3").split(",").map((chair) => chair.trim()).filter(Boolean),
          opening_hour: Number(form.get("opening_hour") || 8),
          closing_hour: Number(form.get("closing_hour") || 18),
        },
        "POST",
      );
      setLocations((current) => [...current, created]);
      setAdding(false);
      setMessage("Location added. You can now activate the tenant.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Location could not be added");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <section className="tenant-locations-editor"><h3>Locations</h3><p className="muted"><BrandLoader size={36} /> Loading...</p></section>;
  return (
    <section className="tenant-locations-editor">
      <div className="platform-card-header">
        <div><h3>Locations</h3><p className="muted">Edit the address used by the storefront map. Search uses the configured location provider.</p></div>
        <div className="flex items-center gap-3">
          {message && <span className="muted text-sm" role="status">{message}</span>}
          <button type="button" className="btn-secondary" onClick={() => setAdding((current) => !current)}>{adding ? "Cancel" : "Add location"}</button>
        </div>
      </div>
      {!locations.length && !adding && <p className="muted">No locations have been added yet. Add the first location to complete onboarding.</p>}
      {adding && (
        <form className="tenant-location-editor" onSubmit={(event) => void addLocation(event)}>
          <div className="prototype-form-grid">
            <Field label="Location name"><input className="field" name="location_name" placeholder="Vancouver clinic" required /></Field>
            <Field label="Address"><LocationAutocomplete region={region} inputName="location_address" required /></Field>
            <Field label="Timezone"><input className="field" name="timezone" defaultValue="America/Vancouver" required /></Field>
            <Field label="Operatories (comma separated)"><input className="field" name="chairs" defaultValue="Op 1, Op 2, Op 3" required /></Field>
            <Field label="Opening hour"><input className="field" name="opening_hour" type="number" min="0" max="23" defaultValue="8" required /></Field>
            <Field label="Closing hour"><input className="field" name="closing_hour" type="number" min="1" max="24" defaultValue="18" required /></Field>
          </div>
          <div className="tenant-location-actions"><button className="btn" disabled={Boolean(busy)} aria-busy={busy === "new"}>{busy === "new" ? "Adding location…" : "Add location"}</button></div>
        </form>
      )}
      {locations.map((location) => {
        const mapUrl = location.latitude != null && location.longitude != null
          ? `https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.01}%2C${location.latitude - 0.01}%2C${location.longitude + 0.01}%2C${location.latitude + 0.01}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`
          : "";
        return (
          <details className="tenant-location-editor" key={`${location.id}-${location.updated_at}`} open={locations.length === 1}>
            <summary><strong>{location.name}</strong><span>{location.address || "Address not set"}</span><span className="location-caret" aria-hidden="true">⌄</span></summary>
            <form onSubmit={(event) => void saveLocation(event, location)}>
              <div className="prototype-form-grid">
                <Field label="Location name"><input className="field" name="location_name" defaultValue={location.name} required /></Field>
                <Field label="Address"><LocationAutocomplete region={region} inputName="location_address" initialValue={location.address} initialLatitude={location.latitude} initialLongitude={location.longitude} initialPlaceId={location.osm_place_id} /></Field>
                <Field label="Timezone"><input className="field" name="timezone" defaultValue={location.timezone} required /></Field>
                <Field label="Operatories (comma separated)"><input className="field" name="chairs" defaultValue={location.chairs.join(", ")} required /></Field>
                <Field label="Opening hour"><input className="field" name="opening_hour" type="number" min="0" max="23" defaultValue={location.opening_hour} required /></Field>
                <Field label="Closing hour"><input className="field" name="closing_hour" type="number" min="1" max="24" defaultValue={location.closing_hour} required /></Field>
              </div>
              {mapUrl && <iframe className="tenant-location-map" title={`Map of ${location.name}`} src={mapUrl} loading="lazy" />}
              <div className="tenant-location-actions"><button className="btn" disabled={Boolean(busy)} aria-busy={busy === location.id}>{busy === location.id ? "Saving location…" : "Save location"}</button></div>
            </form>
          </details>
        );
      })}
    </section>
  );
}

function TenantDetailPage({
  organization,
  actionBusy,
  configureRouting,
  activateTenant,
  onBack,
}: {
  organization: Organization;
  actionBusy: string | null;
  configureRouting: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  activateTenant: (organizationId: string) => Promise<void>;
  onBack: () => void;
}) {
  const surfaces = [
    organization.front_office_enabled && "Front Office",
    organization.booking_enabled && "Booking",
    organization.patient_portal_enabled && "Patient Portal",
  ].filter(Boolean).join(" · ");

  return (
    <section className="tenant-detail-page">
      <div className="tenant-detail-header">
        <div>
          <button type="button" className="tenant-detail-back" onClick={onBack}>← Back to tenants</button>
          <p className="tenant-detail-eyebrow">Tenant workspace</p>
          <h1>{organization.name}</h1>
          <p className="muted">/{organization.slug} · {organization.id}</p>
        </div>
        <div className="tenant-detail-actions">
          {organization.status === "migrated" && (
            <button
              type="button"
              className="btn"
              disabled={Boolean(actionBusy)}
              aria-busy={actionBusy === `activate:${organization.id}`}
              onClick={() => void activateTenant(organization.id)}
            >
              {actionBusy === `activate:${organization.id}` ? "Activating…" : "Activate tenant"}
            </button>
          )}
          <span className="tenant-status-badge">{organization.status.replaceAll("_", " ")}</span>
        </div>
      </div>

      <div className="tenant-detail-summary">
        <article><span>Region</span><strong>{organization.region}</strong></article>
        <article><span>Plan</span><strong>{organization.commercial?.plan_code || "Unconfigured"}</strong><small>{organization.commercial?.subscription_status || "No subscription"}</small></article>
        <article><span>Enabled surfaces</span><strong>{surfaces || "None configured"}</strong></article>
      </div>

      {organization.last_error && <p className="tenant-detail-error" role="alert">{organization.last_error}</p>}

      <div className="tenant-detail-grid">
        <section className="panel tenant-detail-card">
          <div className="platform-card-header">
            <div><h2>Routing and surfaces</h2><p className="muted">Control how this tenant is reached and which experiences are enabled.</p></div>
          </div>
          <form key={`routing-${organization.id}`} className="space-y-3" onSubmit={(event) => void configureRouting(event)}>
            <div className="prototype-form-grid">
              <Field label="Routing slug"><input className="field" name="slug" defaultValue={organization.slug} required /></Field>
              <Field label="Custom domains (hostname|surface, one per line)"><textarea className="field" name="domains" defaultValue={organization.domains.map((domain) => `${domain.hostname}|${domain.surface}`).join("\n")} /></Field>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label><input type="checkbox" name="front_office" defaultChecked={organization.front_office_enabled} /> Front Office</label>
              <label><input type="checkbox" name="booking" defaultChecked={organization.booking_enabled} /> Booking</label>
              <label><input type="checkbox" name="portal" defaultChecked={organization.patient_portal_enabled} /> Patient Portal</label>
            </div>
            <div className="tenant-detail-form-actions">
              <button className="btn" disabled={Boolean(actionBusy)} aria-busy={actionBusy === "routing"}>{actionBusy === "routing" ? "Saving routing…" : "Save routing"}</button>
            </div>
          </form>
        </section>

        <section className="panel tenant-detail-card tenant-detail-locations">
          <TenantLocationsEditor organizationId={organization.id} region={organization.region} />
        </section>
      </div>
    </section>
  );
}

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

  useEffect(() => {
    const onHistoryChange = () => setSelectedId(new URLSearchParams(window.location.search).get("tenant") || "");
    window.addEventListener("popstate", onHistoryChange);
    return () => window.removeEventListener("popstate", onHistoryChange);
  }, [setSelectedId]);

  function openTenant(organizationId: string) {
    setSelectedId(organizationId);
    const url = new URL(window.location.href);
    url.searchParams.set("tenant", organizationId);
    window.history.pushState({ tenant: organizationId }, "", url);
  }

  function closeTenant() {
    setSelectedId("");
    const url = new URL(window.location.href);
    url.searchParams.delete("tenant");
    window.history.pushState({}, "", url);
  }

  return (<>
{page === "tenants" && (
  <>
    {selected ? (
      <TenantDetailPage
        organization={selected}
        actionBusy={actionBusy}
        configureRouting={configureRouting}
        activateTenant={activateTenant}
        onBack={closeTenant}
      />
    ) : (
    <section className="panel overflow-auto">
      <div className="platform-table-filters platform-tenant-filters"><input className="field" type="search" value={tenantSearch} onChange={(event) => { setTenantSearch(event.target.value); setTenantPage(1); }} placeholder="Search organization, slug or region…" aria-label="Search tenants" /><select className="field" value={tenantStatusFilter} onChange={(event) => { setTenantStatusFilter(event.target.value); setTenantPage(1); }} aria-label="Filter tenant status"><option value="all">All statuses</option><option value="pending">Pending</option><option value="schema_created">Schema created</option><option value="migrated">Migrated</option><option value="active">Active</option><option value="failed">Failed</option><option value="suspended">Suspended</option><option value="disabled">Disabled</option></select><select className="field" value={tenantPlanFilter} onChange={(event) => { setTenantPlanFilter(event.target.value); setTenantPage(1); }} aria-label="Filter tenant plan"><option value="all">All plans</option>{overviewPlanOptions.map((plan) => <option key={plan} value={plan}>{plan === "unconfigured" ? "Unconfigured" : plan}</option>)}</select><button type="button" className="btn" onClick={() => void load(1)}>Filter</button></div>
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
                    onClick={() => openTenant(organization.id)}
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
    )}
  </>
)}
  </>);
}
