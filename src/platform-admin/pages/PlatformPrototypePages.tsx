import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api } from "../lib/api";
import { RolesAccess } from "../components/RolesAccess";
import type { PlatformPage } from "../pageRegistry";

type PrototypePage = Exclude<PlatformPage, "overview" | "tenants" | "onboarding" | "support" | "settings-integrations">;
type Page<T> = { page: number; page_size: number; total: number; items: T[] };
const Badge = ({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "danger" | "info" }) => <span className={`prototype-badge prototype-badge-${tone}`}>{children}</span>;
const ErrorMessage = ({ message }: { message: string }) => message ? <p className="prototype-callout" role="status">{message}</p> : null;
function Pager<T>({ data, load }: { data: Page<T>; load: (page: number) => void }) { const first = data.total ? (data.page - 1) * data.page_size + 1 : 0; const last = Math.min(data.total, data.page * data.page_size); return <div className="prototype-pagination"><span>{first}–{last} of {data.total}</span><button className="btn-secondary" disabled={data.page === 1} onClick={() => load(data.page - 1)}>Previous</button><button className="btn-secondary" disabled={last >= data.total} onClick={() => load(data.page + 1)}>Next</button></div>; }
const Kpi = ({ label, value, detail, definition }: { label: string; value: ReactNode; detail: string; definition?: string }) => <article className="prototype-kpi"><span>{label}{definition && <span className="prototype-kpi-info" title={definition}>i</span>}</span><strong>{value}</strong><small>{detail}</small><button type="button" className="prototype-link" onClick={() => undefined}>View breakdown</button></article>;
const PageHeader = ({ title, description, children }: { title: string; description: string; children?: ReactNode }) => <div className="prototype-page-header"><div><h1>{title}</h1><p className="muted">{description}</p></div>{children && <div className="prototype-header-controls">{children}</div>}</div>;
const FilterBar = ({ children, onSubmit }: { children: ReactNode; onSubmit?: (event: FormEvent<HTMLFormElement>) => void }) => <form className="prototype-filter-bar" onSubmit={onSubmit}>{children}</form>;

type Financial = {
  organization_id: string;
  organization_name: string;
  slug: string;
  plan_code: string;
  subscription_status: string;
  locations: number;
  staff_seats: number;
  invoiced_cents: number;
  paid_cents: number;
  open_invoices: number;
};
function Billing() {
  const [data, setData] = useState<Page<Financial>>({ page: 1, page_size: 25, total: 0, items: [] }); const [search, setSearch] = useState(""); const [message, setMessage] = useState("");
  async function load(page = 1) { try { setData(await api<Page<Financial>>(`/platform/financial-operations/query?page=${page}&page_size=25&search=${encodeURIComponent(search)}`)); } catch (e) { setMessage(e instanceof Error ? e.message : "Financial operations could not be loaded"); } }
  useEffect(() => { void load(); }, []);
  const sums = data.items.reduce((a, row) => ({ invoiced: a.invoiced + row.invoiced_cents, paid: a.paid + row.paid_cents, open: a.open + row.open_invoices }), { invoiced: 0, paid: 0, open: 0 });
  return <><ErrorMessage message={message} /><section className="platform-kpis"><article><span>Tenant accounts</span><strong>{data.total}</strong><small>Commercial accounts</small></article><article><span>Invoiced on page</span><strong>${(sums.invoiced / 100).toLocaleString()}</strong><small>Financial Operations records</small></article><article><span>Paid on page</span><strong>${(sums.paid / 100).toLocaleString()}</strong><small>Recorded payments</small></article><article><span>Open invoices</span><strong>{sums.open}</strong><small>Across listed tenants</small></article></section><section className="panel overflow-auto"><div className="prototype-section-head"><div><h2>Tenant financial operations</h2><p>Commercial standing and privacy-safe tenant aggregates.</p></div><form className="prototype-filter-bar" onSubmit={(e) => { e.preventDefault(); void load(); }}><input className="field" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tenants…" /><button className="btn-secondary">Search</button></form></div><table><thead><tr><th>Tenant</th><th>Plan</th><th>Locations</th><th>Staff</th><th>Subscription</th><th>Invoiced</th><th>Paid</th><th>Open</th></tr></thead><tbody>{data.items.map((r) => <tr key={r.organization_id}><td><strong>{r.organization_name}</strong><div className="muted text-xs">/{r.slug}</div></td><td>{r.plan_code}</td><td>{r.locations}</td><td>{r.staff_seats}</td><td><Badge tone={r.subscription_status === "active" ? "good" : "warn"}>{r.subscription_status.replaceAll("_", " ")}</Badge></td><td>${(r.invoiced_cents / 100).toFixed(2)}</td><td>${(r.paid_cents / 100).toFixed(2)}</td><td>{r.open_invoices}</td></tr>)}</tbody></table>{!data.items.length && <p className="p-4 muted">No tenant financial accounts match this filter.</p>}<Pager data={data} load={(page) => void load(page)} /></section></>;
}

type JobsData = {
  worker: {
    name: string;
    type: string;
    status: string;
    schedule: string;
    next_scheduled_execution: string;
    max_concurrent_jobs: number;
    lifecycle_actions: string[];
  };
  queue: {
    name: string;
    counts: Record<string, number>;
    backlog: number;
    oldest_due_at: string | null;
    health: string;
  };
  recent: {
    id: string;
    organization_name: string;
    kind: string;
    status: string;
    attempts: number;
    due_at: string | null;
    updated_at: string;
  }[];
};

function normalizeJobsData(payload: unknown): JobsData {
  const candidate = payload && typeof payload === "object" && "data" in payload
    ? (payload as { data?: unknown }).data
    : payload;
  if (Array.isArray(candidate)) {
    return {
      worker: { name: "notifications worker", type: "worker", status: "unknown", schedule: "—", next_scheduled_execution: "", max_concurrent_jobs: 0, lifecycle_actions: [] },
      queue: { name: "platform notification outbox", counts: {}, backlog: candidate.length, oldest_due_at: null, health: "healthy" },
      recent: candidate as JobsData["recent"],
    };
  }
  if (!candidate || typeof candidate !== "object") throw new Error("The jobs service returned an invalid response");
  const value = candidate as Partial<JobsData>;
  return {
    worker: value.worker ?? { name: "notifications worker", type: "worker", status: "unknown", schedule: "—", next_scheduled_execution: "", max_concurrent_jobs: 0, lifecycle_actions: [] },
    queue: value.queue ?? { name: "platform notification outbox", counts: {}, backlog: 0, oldest_due_at: null, health: "unknown" },
    recent: Array.isArray(value.recent) ? value.recent : [],
  };
}
function Jobs() {
  const [data, setData] = useState<JobsData | null>(null);
  const [message, setMessage] = useState("");
  const [queue, setQueue] = useState("all");
  const [status, setStatus] = useState("all");
  const [jobScope, setJobScope] = useState<"all" | "mine">("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  useEffect(() => {
    let active = true;
    api<unknown>("/platform/jobs?include_tenants=false")
      .then((payload) => { if (active) setData(normalizeJobsData(payload)); })
      .catch((e) => { if (active) setMessage(e instanceof Error ? e.message : "Job status could not be loaded"); });
    return () => { active = false; };
  }, []);
  if (!data) return <ErrorMessage message={message || "Loading worker and queue status…"} />;
  const rows = data.recent.filter((row) => {
    const matchesQueue = queue === "all" || row.kind === queue;
    const matchesStatus = status === "all" || row.status === status;
    const matchesScope = jobScope === "all" || ["pending", "retry", "processing", "queued"].includes(row.status.toLowerCase());
    return matchesQueue && matchesStatus && matchesScope;
  });
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const visible = rows.slice((Math.min(page, pages) - 1) * pageSize, Math.min(page, pages) * pageSize);
  const setNotice = (label: string) => setMessage(`${label} is not exposed by the current queue service.`);
  return <>
    <PageHeader title="Jobs & queues" description="Background processing across every tenant.">
      <div className="prototype-segmented scope-toggle" aria-label="Job scope"><button type="button" className={jobScope === "all" ? "active" : ""} aria-pressed={jobScope === "all"} onClick={() => { setJobScope("all"); setPage(1); }}>All jobs</button><button type="button" className={jobScope === "mine" ? "active" : ""} aria-pressed={jobScope === "mine"} title="Show jobs currently queued or processing" onClick={() => { setJobScope("mine"); setPage(1); }}>My queue</button></div>
      <label className="prototype-inline-field">Queue<select className="field" value={queue} onChange={(event) => { setQueue(event.target.value); setPage(1); }}><option value="all">All queues</option>{Array.from(new Set(data.recent.map((row) => row.kind))).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label className="prototype-inline-field">Status<select className="field" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="all">All statuses</option>{Array.from(new Set(data.recent.map((row) => row.status))).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <button type="button" className="btn-secondary" onClick={() => setNotice("Retry all failed")}>Retry all failed</button>
    </PageHeader>
    {message && <ErrorMessage message={message} />}
    {jobScope === "mine" && <p className="prototype-data-note"><strong>My queue</strong> showing queued and processing jobs assigned to active workers.</p>}
    <section className="platform-kpis"><Kpi label="Queue backlog" value={data.queue.backlog} detail="Pending and retry" definition="Pending and retry records across control-plane and tenant queues." /><Kpi label="Processing" value={data.queue.counts.processing || 0} detail="Picked up by workers" /><Kpi label="Failed, 24h" value={data.queue.counts.failed || 0} detail="Recorded failures" /><Kpi label="Avg duration, 24h" value="—" detail="Duration telemetry is not provided by this API" /></section>
    <p className="prototype-callout">Queue health is loaded from the live platform notification outbox. Tenant fan-out is available through the control-plane API but is not required to render this page.</p>
    <section className="platform-card mb-4 overflow-auto"><div className="platform-card-header"><h2>Queue health</h2><span className="muted">{data.queue.name}</span></div><table><thead><tr><th>Queue</th><th>Backlog</th><th>Oldest item</th><th>Health</th><th>Actions</th></tr></thead><tbody><tr><td><code>{data.queue.name}</code></td><td>{data.queue.backlog}</td><td>{data.queue.oldest_due_at ? new Date(data.queue.oldest_due_at).toLocaleString() : "—"}</td><td><Badge tone={data.queue.health === "healthy" ? "good" : "warn"}>{data.queue.health}</Badge></td><td><button type="button" className="btn-secondary" onClick={() => setNotice("Pause queue")}>Pause</button> <button type="button" className="btn-secondary" onClick={() => setNotice("View dead-letter")}>View dead-letter</button></td></tr></tbody></table></section>
    <section className="platform-card overflow-auto"><div className="platform-card-header"><h2>Recent jobs</h2><span className="muted">{rows.length} matching records</span></div><table><thead><tr><th>Job</th><th>Queue</th><th>Tenant</th><th>Status</th><th>Attempts</th><th>Enqueued</th><th>Duration</th><th>Actions</th></tr></thead><tbody>{visible.map((row) => <tr key={`${row.id}-${row.organization_name}`}><td><code>{row.id.slice(0, 12)}</code></td><td>{row.kind}</td><td>{row.organization_name}</td><td><Badge tone={row.status === "sent" ? "good" : row.status === "failed" ? "danger" : "info"}>{row.status}</Badge></td><td>{row.attempts}</td><td>{new Date(row.updated_at).toLocaleString()}</td><td>—</td><td>{row.status === "failed" && <button type="button" className="btn-secondary" onClick={() => setNotice("Retry job")}>Retry</button>} <button type="button" className="btn-secondary" onClick={() => setNotice("View payload")}>View payload</button></td></tr>)}</tbody></table>{!visible.length && <p className="p-4 muted">No queue records match the selected filters.</p>}<div className="prototype-pagination"><span>{rows.length ? `${(Math.min(page, pages) - 1) * pageSize + 1}–${Math.min(Math.min(page, pages) * pageSize, rows.length)} of ${rows.length}` : "0–0 of 0"}</span><button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><button className="btn-secondary" disabled={page >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}>Next</button></div></section>
  </>;
}

type Integration = {
  capability: string;
  registered_providers: string[];
  configured: boolean;
  provider_name: string;
  ready: boolean;
  sandbox_only: boolean;
  state: string;
};
function useIntegrations() { const [items, setItems] = useState<Integration[]>([]); const [message, setMessage] = useState(""); const load = async () => setItems(await api<Integration[]>("/platform/integrations/status")); useEffect(() => { void load().catch((e) => setMessage(e instanceof Error ? e.message : "Integration status could not be loaded")); }, []); return { items, message, setMessage, load }; }
function Incidents() {
  const { items, message } = useIntegrations();
  const [view, setView] = useState<"open" | "resolved">("open");
  const [page, setPage] = useState(1);
  const affected = items.filter((i) => i.state === "unavailable" || !i.ready);
  const resolved = items.filter((i) => i.ready && i.configured);
  const rows = view === "open" ? affected : resolved;
  const pageSize = 8;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const visible = rows.slice((Math.min(page, pages) - 1) * pageSize, Math.min(page, pages) * pageSize);
  return <>
    <PageHeader title="Incidents" description="Platform-wide service health and incident response.">
      <div className="prototype-segmented"><button type="button" className={view === "open" ? "active" : ""} onClick={() => { setView("open"); setPage(1); }}>Open</button><button type="button" className={view === "resolved" ? "active" : ""} onClick={() => { setView("resolved"); setPage(1); }}>Resolved</button></div>
    </PageHeader>
    <ErrorMessage message={message} />
    <p className="prototype-callout">Platform views show service health only. Patient clinical and financial records are never displayed here.</p>
    <section className="platform-kpis"><Kpi label="Open incidents" value={affected.length} detail="Unavailable or unready integrations" /><Kpi label="Configured capabilities" value={items.filter((i) => i.configured).length} detail="Provider defaults configured" /><Kpi label="Ready capabilities" value={items.filter((i) => i.ready).length} detail="Operational registry state" /><Kpi label="Sandbox-only" value={items.filter((i) => i.sandbox_only).length} detail="Development adapters" /></section>
    {view === "open" && affected[0] && <section className="platform-card mb-4"><div className="platform-card-header"><div><h2>{affected[0].capability.replaceAll("_", " ")} unavailable</h2><p className="muted">{affected[0].provider_name || "No provider selected"} · {affected[0].state}</p></div><Badge tone="danger">Incident</Badge></div><div className="platform-card-body"><ol className="tl"><li><strong>Detected</strong><p className="muted text-sm">Provider registry reported an unavailable capability.</p></li><li><strong>Current state</strong><p className="muted text-sm">Registered providers: {affected[0].registered_providers.join(", ") || "none"}.</p></li><li><strong>Next action</strong><p className="muted text-sm">Review provider configuration and queue health.</p></li></ol><a className="btn" href="/admin/settings/integrations/">Review integration</a></div></section>}
    <section className="platform-card overflow-auto"><div className="platform-card-header"><h2>{view === "open" ? "Open incidents" : "Resolved incidents"}</h2><span className="muted">{rows.length} records</span></div><table><thead><tr><th>Capability</th><th>Provider</th><th>Severity</th><th>Status</th><th>Registered providers</th><th>Actions</th></tr></thead><tbody>{visible.map((i) => <tr key={i.capability}><td><strong>{i.capability.replaceAll("_", " ")}</strong></td><td>{i.provider_name || "Not configured"}</td><td><Badge tone={view === "open" ? "danger" : "good"}>{view === "open" ? "Incident" : "Resolved"}</Badge></td><td>{i.state}</td><td>{i.registered_providers.join(", ") || "—"}</td><td><a className="btn-secondary" href="/admin/settings/integrations/">Review</a></td></tr>)}</tbody></table>{!visible.length && <p className="p-4 muted">No {view} incidents are reported by the current provider registry.</p>}<div className="prototype-pagination"><span>{rows.length ? `${(Math.min(page, pages)-1)*pageSize+1}–${Math.min(Math.min(page,pages)*pageSize,rows.length)} of ${rows.length}` : "0–0 of 0"}</span><button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((v) => Math.max(1,v-1))}>Previous</button><button className="btn-secondary" disabled={page >= pages} onClick={() => setPage((v) => Math.min(pages,v+1))}>Next</button></div></section>
  </>;
}
function Flags() {
  const { items, message, setMessage, load } = useIntegrations();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Record<string, string>>({});
  useEffect(() => { setSelected(Object.fromEntries(items.map((i) => [i.capability, i.provider_name || i.registered_providers[0] || ""]))); }, [items]);
  async function save(item: Integration) {
    try {
      const result = await api<{ status?: string; request?: { id: string } } | Integration>("/platform/adapter-defaults", {
        region: "*", capability: item.capability, provider_name: selected[item.capability], active: true,
        reason: reasons[item.capability], approval_request_id: pending[item.capability] || null,
      }, "PUT");
      if ('status' in result && result.status === 'approval_required' && result.request) {
        setPending({ ...pending, [item.capability]: result.request.id });
        setMessage("Adapter default change sent for approval. It has not changed yet.");
        window.dispatchEvent(new Event('dhmis:rbac-updated'));
      } else {
        const next = { ...pending }; delete next[item.capability]; setPending(next);
        setMessage("Approved integration default applied.");
        await load();
      }
    } catch (e) { setMessage(e instanceof Error ? e.message : "Configuration failed"); }
  }
  return <><ErrorMessage message={message} /><section className="panel overflow-auto"><div className="prototype-section-head"><div><h2>Integration configuration</h2><p>Choose an installed global provider default. A different Platform Super Admin must approve the change before it can be applied.</p></div></div><table><thead><tr><th>Capability</th><th>Provider</th><th>State</th><th>Environment</th><th>Reason and action</th></tr></thead><tbody>{items.map((i) => <tr key={i.capability}><td><strong>{i.capability.replaceAll("_", " ")}</strong></td><td><select className="field" value={selected[i.capability] || ""} onChange={(e) => setSelected({ ...selected, [i.capability]: e.target.value })}>{i.registered_providers.map((p) => <option key={p}>{p}</option>)}</select></td><td><Badge tone={i.ready ? "good" : "warn"}>{i.configured ? i.state : "registered"}</Badge></td><td>{i.sandbox_only ? "Sandbox" : "Live-capable"}</td><td><input className="field mb-2" value={reasons[i.capability] || ''} minLength={8} placeholder="Reason for this change" onChange={(e) => setReasons({ ...reasons, [i.capability]: e.target.value })} />{pending[i.capability] && <a className="mb-2 block text-xs font-semibold text-[var(--sage-deep)]" href="/admin/settings/roles/?tab=approvals">Approval {pending[i.capability].slice(0, 8)} · review status</a>}<button className="btn-secondary" disabled={!selected[i.capability] || (reasons[i.capability] || '').trim().length < 8} onClick={() => void save(i)}>{pending[i.capability] ? 'Execute approved change' : 'Submit for approval'}</button></td></tr>)}</tbody></table></section></>;
}

type AuditRow = {
  id: string;
  created_at: string;
  actor_id: string;
  action: string;
  organization_id: string | null;
  reason: string;
};
function Audit({ showHeader = true }: { showHeader?: boolean }) { const [data, setData] = useState<Page<AuditRow>>({ page: 1, page_size: 25, total: 0, items: [] }); const [search, setSearch] = useState(""); const [message, setMessage] = useState(""); async function load(page = 1) { try { setData(await api<Page<AuditRow>>(`/platform/audit/query?page=${page}&page_size=25&search=${encodeURIComponent(search)}`)); } catch (e) { setMessage(e instanceof Error ? e.message : "Audit trail could not be loaded"); } } useEffect(() => { void load(); }, []); return <><ErrorMessage message={message} />{showHeader && <PageHeader title="Audit trail" description="Auditable platform configuration changes." />}<FilterBar onSubmit={(e) => { e.preventDefault(); void load(); }}><input className="field" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search actor, action or reason…" /><select className="field" disabled><option>All actions</option></select><select className="field" disabled><option>All outcomes</option></select><button className="btn-secondary">Filter</button></FilterBar><section className="panel overflow-auto mt-4"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Organization</th><th>Reason</th></tr></thead><tbody>{data.items.map((r) => <tr key={r.id}><td>{new Date(r.created_at).toLocaleString()}</td><td>{r.actor_id}</td><td><strong>{r.action}</strong></td><td>{r.organization_id || "Platform"}</td><td>{r.reason || "—"}</td></tr>)}</tbody></table>{!data.items.length && <p className="p-4 muted">No platform audit events match this filter.</p>}<Pager data={data} load={(page) => void load(page)} /></section></>; }

type Defaults = {
  default_visibility: string;
  default_policy: {
    cancellation_notice_hours: number;
    cancellation_fee_cents: number;
    buffer_minutes: number;
    reminder_hours: number;
  };
};
function Practice() { const [value, setValue] = useState<Defaults | null>(null); const [message, setMessage] = useState(""); useEffect(() => { api<Defaults>("/platform/settings/defaults").then(setValue).catch((e) => setMessage(e instanceof Error ? e.message : "Defaults could not be loaded")); }, []); async function save(e: FormEvent) { e.preventDefault(); if (!value) return; try { setValue(await api<Defaults>("/platform/settings/defaults", value, "PUT")); setMessage("Defaults saved for future tenants."); } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Save failed"); } } if (!value) return <ErrorMessage message={message || "Loading platform practice defaults…"} />; const field = (key: keyof Defaults["default_policy"], label: string, divisor = 1) => <label className="label">{label}<input className="field" type="number" value={value.default_policy[key] / divisor} onChange={(e) => setValue({ ...value, default_policy: { ...value.default_policy, [key]: Math.round(Number(e.target.value) * divisor) } })} /></label>; return <><ErrorMessage message={message} /><PageHeader title="Practice policy" description="Platform defaults inherited by newly provisioned tenants." /><section className="panel max-w-5xl"><form onSubmit={save}><div className="prototype-form-grid"><label className="label">Patient visibility<select className="field" value={value.default_visibility} onChange={(e) => setValue({ ...value, default_visibility: e.target.value })}><option value="organization">Across organization</option><option value="location">Assigned locations</option></select></label>{field("cancellation_notice_hours", "Cancellation notice (hours)")}{field("cancellation_fee_cents", "Cancellation fee (CAD)", 100)}{field("buffer_minutes", "Schedule buffer (minutes)")}{field("reminder_hours", "Reminder lead (hours)")}</div><p className="mt-4 muted text-sm">New organizations receive these values. Existing tenant policy remains tenant-owned.</p><button className="btn mt-4">Save changes</button></form></section></>; }

type Access = {
  id: string;
  kind: "user" | "invitation";
  name: string;
  email: string;
  role: string;
  status: string;
  mfa_enabled: boolean;
  created_at?: string;
  expires?: number | null;
};

function PlatformStaff() {
  const [data, setData] = useState<Page<Access>>({ page: 1, page_size: 25, total: 0, items: [] });
  const [message, setMessage] = useState("");
  const [resetUser, setResetUser] = useState<Access | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const load = async (page = 1) => setData(await api<Page<Access>>(`/platform/access/query?page=${page}&page_size=25&search=${encodeURIComponent(search)}${status === "all" ? "" : `&status=${status}`}`));
  useEffect(() => { void load().catch((e) => setMessage(e instanceof Error ? e.message : "Access could not be loaded")); }, []);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/platform/invites", { name: form.get("name"), email: form.get("email"), role: "platform_admin" });
      setMessage("Invitation queued for provider delivery.");
      event.currentTarget.reset();
      await load();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Invitation failed");
    }
  }

  async function invitationAction(row: Access, action: "resend" | "revoke") {
    try {
      await api(`/platform/invites/${row.id}/${action}`, {});
      setMessage(action === "resend" ? "Replacement invitation queued for provider delivery." : "Invitation revoked.");
      await load(data.page);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Invitation update failed");
    }
  }

  async function toggleUser(row: Access) {
    try {
      await api(`/platform/users/${row.id}/status`, { active: row.status !== "active" }, "PUT");
      setMessage("Platform access updated.");
      await load(data.page);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Access update failed");
    }
  }

  async function sendReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetUser) return;
    const form = new FormData(event.currentTarget);
    try {
      await api(`/platform/users/${resetUser.id}/password-reset`, { reason: form.get("reason") });
      setMessage(`Password-reset email queued for ${resetUser.name}. Existing sessions were revoked.`);
      setResetUser(null);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Password reset could not be queued");
    }
  }

  return <>
    <ErrorMessage message={message} />
    <PageHeader title="Staff & invitations" description="Invite platform operators and review control-plane access." />
    <section className="platform-card mb-4">
      <div className="platform-card-body"><div className="prototype-section-head"><div><h2>Invite a platform operator</h2><p>The active platform email provider delivers the one-time setup link.</p></div></div>
      <form className="prototype-controls" onSubmit={invite}>
        <label className="label">Name<input className="field" name="name" required /></label>
        <label className="label">Email<input className="field" name="email" type="email" required /></label>
        <label className="label">Role<select className="field" name="role" disabled><option>Platform administrator</option></select></label>
        <label className="label">Locations<select className="field" name="locations" disabled><option>Platform</option></select></label>
        <button className="btn self-end">Send invitation</button>
      </form>
      </div>
    </section>
    {resetUser && <form className="panel mb-4 max-w-3xl space-y-3" onSubmit={sendReset}>
      <div className="prototype-section-head"><div><h2>Reset {resetUser.name}'s password</h2><p>This revokes current sessions and emails a one-time reset link.</p></div></div>
      <label className="label">Reason<textarea className="field" name="reason" minLength={10} maxLength={1000} required /></label>
      <div className="flex gap-2"><button className="btn">Send password-reset email</button><button className="btn-secondary" type="button" onClick={() => setResetUser(null)}>Cancel</button></div>
    </form>}
    <section className="platform-card overflow-auto">
      <div className="platform-card-header"><h2>Invitations &amp; access</h2><FilterBar onSubmit={(event) => { event.preventDefault(); void load(1); }}><input className="field" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search staff…" aria-label="Search staff" /><select className="field" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status filter"><option value="all">All statuses</option><option value="pending">Pending</option><option value="active">Active</option><option value="expired">Expired</option><option value="revoked">Revoked</option><option value="disabled">Disabled</option></select><button className="btn-secondary">Filter</button></FilterBar></div>
      <table><thead><tr><th>Staff</th><th>Role</th><th>Locations</th><th>Status</th><th>Sent</th><th>Expires</th><th>Actions</th></tr></thead>
      <tbody>{data.items.map((row) => <tr key={`${row.kind}-${row.id}`}><td><strong>{row.name}</strong><div className="muted text-xs">{row.email}</div></td><td>{row.role.replaceAll("_", " ")}</td><td>Platform</td><td><Badge tone={row.status === "active" ? "good" : row.status === "pending" ? "info" : row.status === "expired" || row.status === "revoked" ? "danger" : "neutral"}>{row.status}</Badge></td><td>{row.created_at ? new Date(row.created_at).toLocaleDateString() : "—"}</td><td>{row.expires ? new Date(row.expires * 1000).toLocaleDateString() : "—"}</td><td>{row.kind === "user" ? <div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={() => void toggleUser(row)}>{row.status === "active" ? "Disable" : "Enable"}</button>{row.status === "active" && <button className="btn-secondary" onClick={() => setResetUser(row)}>Send password reset</button>}</div> : <>{["pending", "expired"].includes(row.status) && <button className="btn-secondary" onClick={() => void invitationAction(row, "resend")}>Resend</button>} {row.status === "pending" && <button className="btn-secondary" onClick={() => void invitationAction(row, "revoke")}>Revoke</button>}</>}</td></tr>)}</tbody></table>
      <Pager data={data} load={(page) => void load(page)} />
      <p className="prototype-callout">Password reset is available to platform administrators and Technical Support. It sends a one-time link and records the action in the audit trail.</p>
    </section>
  </>;
}

type Template = { name: string; channel: string; subject: string; body: string; active: boolean };
function Templates() { const [items, setItems] = useState<Record<string, Template>>({}); const [key, setKey] = useState(""); const [message, setMessage] = useState(""); useEffect(() => { api<Record<string, Template>>("/platform/communication-templates").then((r) => { setItems(r); setKey(Object.keys(r)[0] || ""); }).catch((e) => setMessage(e instanceof Error ? e.message : "Templates could not be loaded")); }, []); const item = items[key]; if (!item) return <ErrorMessage message={message || "Loading platform message templates…"} />; const update = (patch: Partial<Template>) => setItems({ ...items, [key]: { ...item, ...patch } }); async function save() { try { update(await api<Template>(`/platform/communication-templates/${key}`, item, "PUT")); setMessage("Template saved."); } catch (e) { setMessage(e instanceof Error ? e.message : "Template save failed"); } } return <><ErrorMessage message={message} /><div className="prototype-template-layout"><aside className="panel prototype-template-list">{Object.entries(items).map(([k, t]) => <button key={k} aria-current={k === key ? "page" : undefined} onClick={() => setKey(k)}><strong>{t.name}</strong><span>{t.channel} · {t.active ? "Active" : "Inactive"}</span></button>)}</aside><section className="panel"><div className="prototype-form-grid"><label className="label">Channel<select className="field" value={item.channel} onChange={(e) => update({ channel: e.target.value })}><option value="email">Email</option><option value="sms">SMS</option></select></label><label className="label">Subject<input className="field" value={item.subject} onChange={(e) => update({ subject: e.target.value })} /></label><label className="label">State<select className="field" value={item.active ? "active" : "inactive"} onChange={(e) => update({ active: e.target.value === "active" })}><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div><label className="label">Message<textarea className="field min-h-40" value={item.body} onChange={(e) => update({ body: e.target.value })} /></label><div className="prototype-token-row"><span>{"{{patient_first_name}}"}</span><span>{"{{recipient_name}}"}</span><span>{"{{clinic_name}}"}</span><span>{"{{due_date}}"}</span><span>{"{{invitation_link}}"}</span><span>{"{{reset_link}}"}</span></div><h2 className="mt-5 font-semibold">Preview</h2><div className="prototype-email-preview"><strong>{item.subject}</strong><p className="whitespace-pre-wrap">{item.body}</p></div><button className="btn mt-4" onClick={() => void save()}>Save template</button></section></div></>; }

function Roles() { return <RolesAccess domain="platform" />; }

export function PlatformPrototypePage({ page }: { page: PrototypePage }) { switch (page) { case "billing-plans": return <Billing />; case "jobs": return <Jobs />; case "incidents": return <Incidents />; case "platform-audit": return <Audit showHeader={false} />; case "settings-audit": return <Audit />; case "feature-flags": return <Flags />; case "settings-practice": return <Practice />; case "settings-staff": return <PlatformStaff />; case "settings-templates": return <Templates />; case "settings-roles": return <Roles />; } }
