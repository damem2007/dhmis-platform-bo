import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

type ActivityItem = {
  id: string;
  ticket_id: string;
  subject: string;
  organization_name?: string;
  kind: string;
  actor_id?: string | null;
  at?: string | null;
  note?: string | null;
  status?: string | null;
  previous_status?: string | null;
  priority?: string | null;
  assignee_id?: string | null;
};

type ActivityPage = { page: number; page_size: number; total: number; items: ActivityItem[] };

const statusLabel = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatDateTime = (value?: string | null) => value ? new Date(value).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" }) : "—";

function activityDetail(item: ActivityItem) {
  if (item.note) return item.note;
  if (item.status) return `${statusLabel(item.previous_status || "")} → ${statusLabel(item.status)}`;
  if (item.priority) return `Priority set to ${statusLabel(item.priority)}`;
  if (item.assignee_id) return "Ticket assigned";
  return "Ticket updated";
}

export function SupportActivityPage() {
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const ticketId = query.get("ticket_id") || "";
  const tenantId = query.get("tenant_id") || "";
  const [data, setData] = useState<ActivityPage>({ page: 1, page_size: 25, total: 0, items: [] });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(page = 1) {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), page_size: String(data.page_size) });
    if (ticketId) params.set("ticket_id", ticketId);
    if (tenantId) params.set("tenant_id", tenantId);
    if (search.trim()) params.set("search", search.trim());
    try {
      setData(await api<ActivityPage>(`/platform/support/activity?${params.toString()}`));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Support activity could not be loaded");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [ticketId, tenantId]);

  const pageCount = Math.max(1, Math.ceil(data.total / data.page_size));
  const canPrevious = data.page > 1;
  const canNext = data.page < pageCount;

  return <>
    <div className="prototype-page-header">
      <div><a className="billing-back" href="/admin/support/">← Support</a><h1>Support activity</h1><p className="muted">Audited ticket lifecycle events across the support pool.</p></div>
    </div>
    <section className="platform-card support-activity-card">
      <div className="platform-card-header support-activity-toolbar">
        <div><h2>Activity log</h2><p className="muted">{ticketId ? "Activity for the selected ticket." : tenantId ? "Activity for the selected tenant." : "Search and review changes made to Support tickets."}</p></div>
        <form className="prototype-filter-bar" onSubmit={(event) => { event.preventDefault(); void load(1); }}>
          <label className="sr-only" htmlFor="support-activity-search">Search activity</label>
          <input id="support-activity-search" className="field" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search activity…" />
          <button className="btn-secondary" type="submit">Search</button>
        </form>
      </div>
      <div className="p-4">
        {loading && <p className="muted" role="status">Loading activity…</p>}
        {!loading && error && <p className="text-danger" role="alert">{error}</p>}
        {!loading && !error && !data.items.length && <p className="muted">No activity matches the selected filters.</p>}
        {!loading && !error && Boolean(data.items.length) && <div className="overflow-auto"><table><thead><tr><th>When</th><th>Ticket</th><th>Tenant</th><th>Activity</th><th>Details</th><th>Actor</th></tr></thead><tbody>{data.items.map((item) => <tr key={item.id}><td>{formatDateTime(item.at)}</td><td><a href={`/admin/support/?ticket=${encodeURIComponent(item.ticket_id)}`}>{item.subject}</a></td><td>{item.organization_name || "Unknown tenant"}</td><td>{statusLabel(item.kind)}</td><td>{activityDetail(item)}</td><td>{item.actor_id || "—"}</td></tr>)}</tbody></table></div>}
      </div>
      <footer className="support-activity-pager"><span>{data.total ? `${(data.page - 1) * data.page_size + 1}–${Math.min(data.page * data.page_size, data.total)} of ${data.total}` : "0 items"}</span><div className="support-drawer-actions"><button type="button" className="btn-secondary" disabled={!canPrevious || loading} onClick={() => void load(data.page - 1)}>Previous</button><button type="button" className="btn-secondary" disabled={!canNext || loading} onClick={() => void load(data.page + 1)}>Next</button></div></footer>
    </section>
  </>;
}
