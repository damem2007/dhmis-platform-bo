import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { Field } from "../components/Fields";
import { api } from "../lib/api";
import type { PlatformPageModel } from "../types";

type TicketEvent = { kind: string; actor_id?: string; at: string; note?: string; status?: string; previous_status?: string; priority?: string; assignee_id?: string | null };
type SupportTicket = {
  id: string;
  organization_id: string;
  organization_name?: string;
  source?: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  updated_at?: string;
  assignee_id?: string | null;
  assignee_name?: string | null;
  resolution_code?: string | null;
  resolution_note?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  events?: TicketEvent[];
};
type SupportAssignee = { id: string; name: string; email: string; role: string };
type TicketUpdate = { action?: "assign" | "unassign" | "status" | "note" | "resolve" | "close" | "reopen"; status?: string; priority?: string; note?: string; resolution_code?: string; resolution_note?: string; assignee_id?: string };

const statusLabel = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const statusTone = (status: string) => ["resolved", "closed"].includes(status) ? "good" : status === "urgent" ? "danger" : status === "pending" ? "warn" : "neutral";
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" }) : "—";
const formatDateTime = (value?: string | null) => value ? new Date(value).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" }) : "—";

function TicketBadge({ children, tone = "neutral" }: { children: string; tone?: string }) {
  return <span className={`prototype-badge support-badge-${tone}`}>{children}</span>;
}

function TicketDrawer({
  ticket,
  busy,
  onClose,
  onUpdate,
}: {
  ticket: SupportTicket;
  busy: boolean;
  onClose: () => void;
  onUpdate: (update: TicketUpdate) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [resolutionCode, setResolutionCode] = useState(ticket.resolution_code || "fixed");
  const [resolutionNote, setResolutionNote] = useState(ticket.resolution_note || "");
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [assignees, setAssignees] = useState<SupportAssignee[]>([]);
  const [assigneeLoading, setAssigneeLoading] = useState(false);
  useEffect(() => {
    const handler = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);
  useEffect(() => {
    setResolutionCode(ticket.resolution_code || "fixed");
    setResolutionNote(ticket.resolution_note || "");
  }, [ticket.id, ticket.resolution_code, ticket.resolution_note]);
  useEffect(() => {
    const term = assigneeSearch.trim();
    if (!term) {
      setAssignees([]);
      setAssigneeLoading(false);
      return;
    }
    let active = true;
    setAssigneeLoading(true);
    const timer = window.setTimeout(() => {
      void api<SupportAssignee[]>(`/platform/support/assignees?search=${encodeURIComponent(term)}`)
        .then((result) => { if (active) setAssignees(result); })
        .catch(() => { if (active) setAssignees([]); })
        .finally(() => { if (active) setAssigneeLoading(false); });
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [assigneeSearch]);
  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = note.trim();
    if (!value) return;
    await onUpdate({ action: "note", note: value });
    setNote("");
  }
  async function resolve(action: "resolve" | "close") {
    if (!resolutionNote.trim()) return;
    await onUpdate({ action, resolution_code: resolutionCode, resolution_note: resolutionNote.trim() });
  }
  const recentEvents = [...(ticket.events || [])].slice(-10).reverse();
  const activityHref = `/admin/support/activity/?ticket_id=${encodeURIComponent(ticket.id)}`;
  return <div className="support-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <aside className="support-drawer" role="dialog" aria-modal="true" aria-labelledby="support-ticket-title">
      <header className="support-drawer-head">
        <div><p className="support-drawer-eyebrow">Ticket lifecycle</p><h2 id="support-ticket-title">{ticket.subject}</h2><p className="muted">{ticket.organization_name || ticket.organization_id} · {ticket.category} · opened {formatDate(ticket.created_at)}</p></div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close ticket details">×</button>
      </header>
      <div className="support-drawer-body">
        <div className="support-ticket-summary"><TicketBadge tone={statusTone(ticket.status)}>{statusLabel(ticket.status)}</TicketBadge><span>{ticket.assignee_name ? `Assigned to ${ticket.assignee_name}` : "Unassigned"}</span><span>Updated {formatDateTime(ticket.updated_at)}</span></div>
        <section className="support-drawer-section"><h3>Conversation</h3><p className="support-ticket-description">{ticket.description}</p></section>
        <section className="support-drawer-section support-lifecycle-controls"><h3>Work this ticket</h3><label className="support-field-label">Status<select className="field" value={ticket.status} disabled={busy} onChange={(event) => void onUpdate({ action: "status", status: event.target.value })}><option value="open">Open</option><option value="in_progress">In progress</option><option value="pending">Pending</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></label><label className="support-field-label">Priority<select className="field" value={ticket.priority} disabled={busy} onChange={(event) => void onUpdate({ action: "status", priority: event.target.value })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label><div className="support-assignee-search"><label className="support-field-label">Assign to user<input className="field" value={assigneeSearch} disabled={busy} onChange={(event) => setAssigneeSearch(event.target.value)} placeholder="Search by name or email…" /></label>{assigneeLoading && <small className="muted">Searching users…</small>}{!assigneeLoading && assigneeSearch.trim() && assignees.length > 0 && <div className="support-assignee-results" role="listbox" aria-label="Support assignees">{assignees.map((user) => <button type="button" className="support-assignee-option" key={user.id} role="option" aria-selected={user.id === ticket.assignee_id} disabled={busy || user.id === ticket.assignee_id} onClick={() => { void onUpdate({ assignee_id: user.id }); setAssigneeSearch(""); }}><span><strong>{user.name}</strong><small>{user.email} · {statusLabel(user.role)}</small></span>{user.id === ticket.assignee_id && <TicketBadge tone="good">Assigned</TicketBadge>}</button>)}</div>}{!assigneeLoading && assigneeSearch.trim() && assignees.length === 0 && <small className="muted">No active users found.</small>}</div><div className="support-drawer-actions"><button type="button" className="btn" disabled={busy || Boolean(ticket.assignee_id)} onClick={() => void onUpdate({ action: "assign" })}>{ticket.assignee_id ? "Assigned" : "Assign to me"}</button>{ticket.assignee_id && <button type="button" className="btn-secondary" disabled={busy} onClick={() => void onUpdate({ action: "unassign" })}>Unassign</button>}{ticket.status !== "open" && <button type="button" className="btn-secondary" disabled={busy} onClick={() => void onUpdate({ action: "reopen" })}>Reopen</button>}</div></section>
        <section className="support-drawer-section"><h3>Resolution</h3><label className="support-field-label">Outcome<select className="field" value={resolutionCode} disabled={busy} onChange={(event) => setResolutionCode(event.target.value)}><option value="fixed">Fixed</option><option value="workaround">Workaround provided</option><option value="duplicate">Duplicate</option><option value="not_reproducible">Could not reproduce</option><option value="wont_fix">Won’t fix</option><option value="other">Other</option></select></label><label className="support-field-label">Resolution note<textarea className="field" rows={3} value={resolutionNote} disabled={busy} onChange={(event) => setResolutionNote(event.target.value)} placeholder="Explain what was done or communicated" /></label><div className="support-drawer-actions"><button type="button" className="btn" disabled={busy || !resolutionNote.trim() || ticket.status === "resolved" || ticket.status === "closed"} onClick={() => void resolve("resolve")}>Resolve ticket</button><button type="button" className="btn-secondary" disabled={busy || !resolutionNote.trim() || ticket.status === "closed"} onClick={() => void resolve("close")}>Close ticket</button></div></section>
        <section className="support-drawer-section"><h3>Internal notes</h3><form onSubmit={addNote}><textarea className="field" rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add an internal note for the next support owner" /><button className="btn-secondary" disabled={busy || !note.trim()}>{busy ? "Saving…" : "Add note"}</button></form></section>
        <section className="support-drawer-section"><div className="support-section-heading"><h3>Activity</h3><a href={activityHref}>View all activity ↗</a></div>{recentEvents.length ? <><ol className="support-event-list">{recentEvents.map((event, index) => <li key={`${event.at}-${index}`}><strong>{statusLabel(event.kind)}</strong><span>{event.note || (event.status ? `${statusLabel(event.previous_status || "")} → ${statusLabel(event.status)}` : event.priority ? `Priority set to ${statusLabel(event.priority)}` : event.assignee_id ? "Ticket assigned" : "Ticket updated")}</span><small>{formatDateTime(event.at)}</small></li>)}</ol>{(ticket.events || []).length > recentEvents.length && <small className="muted">Showing the latest {recentEvents.length} events.</small>}</> : <p className="muted">No activity recorded yet.</p>}</section>
      </div>
    </aside>
  </div>;
}

export function SupportPage({ model }: { model: PlatformPageModel }) {
  const { page, state, selectedId, setSelectedId, recoverAdministrator, actionBusy, supportScope, setSupportScope } = model;
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketStatus, setTicketStatus] = useState("all");
  const [ticketPriority, setTicketPriority] = useState("all");
  const [ticketUpdating, setTicketUpdating] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const tenantFilter = new URLSearchParams(window.location.search).get("tenant");
  const requestedTicketId = new URLSearchParams(window.location.search).get("ticket");
  const requestedReturn = new URLSearchParams(window.location.search).get("return");
  const returnTo = requestedReturn && requestedReturn.startsWith("/") && !requestedReturn.startsWith("//") ? requestedReturn : "/admin/";

  async function loadTickets() {
    const query = tenantFilter ? `?tenant_id=${encodeURIComponent(tenantFilter)}` : "";
    return api<SupportTicket[]>(`/platform/support/tickets${query}`);
  }
  useEffect(() => {
    if (page !== "support") return;
    let active = true;
    setTicketsLoading(true);
    setTicketsError("");
    void loadTickets()
      .then((result) => { if (active) { setTickets(result); const requested = requestedTicketId ? result.find((ticket) => ticket.id === requestedTicketId) : null; if (requested) setSelectedTicket(requested); } })
      .catch((error) => { if (active) setTicketsError(error instanceof Error ? error.message : "Support tickets could not be loaded"); })
      .finally(() => { if (active) setTicketsLoading(false); });
    void api<{ id: string }>("/platform/auth/me").then((profile) => { if (active) setCurrentUserId(profile.id); }).catch(() => { if (active) setCurrentUserId(null); });
    return () => { active = false; };
  }, [page, tenantFilter, requestedTicketId]);

  const scopedTickets = useMemo(() => supportScope === "mine" && currentUserId ? tickets.filter((ticket) => ticket.assignee_id === currentUserId) : supportScope === "mine" ? [] : tickets, [tickets, supportScope, currentUserId]);
  const visibleTickets = useMemo(() => scopedTickets.filter((ticket) => {
    const term = ticketSearch.trim().toLowerCase();
    const matchesSearch = !term || [ticket.subject, ticket.description, ticket.organization_name, ticket.category].some((value) => value?.toLowerCase().includes(term));
    return matchesSearch && (ticketStatus === "all" || ticket.status === ticketStatus) && (ticketPriority === "all" || ticket.priority === ticketPriority);
  }), [scopedTickets, ticketSearch, ticketStatus, ticketPriority]);
  const activeTickets = scopedTickets.filter((ticket) => !["resolved", "closed"].includes(ticket.status));
  const openTickets = activeTickets.length;
  const unassignedTickets = activeTickets.filter((ticket) => !ticket.assignee_id).length;
  const resolvedToday = scopedTickets.filter((ticket) => ticket.resolved_at && new Date(ticket.resolved_at).toDateString() === new Date().toDateString()).length;

  async function updateTicket(ticketId: string, update: TicketUpdate) {
    setTicketUpdating(ticketId);
    setTicketsError("");
    try {
      const updated = await api<SupportTicket>(`/platform/support/tickets/${ticketId}`, update, "PATCH");
      setTickets((current) => current.map((ticket) => ticket.id === ticketId ? { ...ticket, ...updated } : ticket));
      setSelectedTicket((current) => current?.id === ticketId ? { ...current, ...updated } : current);
      window.dispatchEvent(new Event("dhmis:notifications-updated"));
    } catch (error) {
      setTicketsError(error instanceof Error ? error.message : "Ticket could not be updated");
    } finally {
      setTicketUpdating(null);
    }
  }

  function openTicket(ticket: SupportTicket) { setSelectedTicket(ticket); }
  function handleTicketKey(event: KeyboardEvent<HTMLTableRowElement>, ticket: SupportTicket) {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openTicket(ticket); }
  }

  return <>{page === "support" && <>
    <div className="prototype-page-header"><div>{requestedReturn && returnTo !== "/admin/" && <a className="billing-back" href={returnTo}>← Back to originating page</a>}<h1>Support</h1><p className="muted">Tenant support queue and audited administrator recovery.</p></div><div className="support-header-actions"><a className="btn-secondary" href={tenantFilter ? `/admin/support/activity/?tenant_id=${encodeURIComponent(tenantFilter)}` : "/admin/support/activity/"}>View all activity</a><div className="prototype-segmented scope-toggle" aria-label="Ticket scope"><button type="button" className={supportScope === "all" ? "active" : ""} aria-pressed={supportScope === "all"} onClick={() => setSupportScope("all")}>All tickets</button><button type="button" className={supportScope === "mine" ? "active" : ""} aria-pressed={supportScope === "mine"} onClick={() => setSupportScope("mine")}>My queue</button></div></div></div>
    <section className="platform-kpis"><article className="prototype-kpi"><span>Open tickets</span><strong>{ticketsLoading ? "…" : openTickets}</strong><small>{tenantFilter ? "Filtered to this tenant" : "Support-owned tickets"}</small></article><article className="prototype-kpi"><span>Unassigned</span><strong>{ticketsLoading ? "…" : unassignedTickets}</strong><small>Tickets needing an owner</small></article><article className="prototype-kpi"><span>SLA at risk</span><strong>—</strong><small>SLA telemetry unavailable</small></article><article className="prototype-kpi"><span>Resolved today</span><strong>{ticketsLoading ? "…" : resolvedToday}</strong><small>Resolution activity today</small></article></section>
    <div className="g2"><section className="platform-card overflow-auto"><div className="platform-card-header"><h2>Ticket queue</h2><div className="prototype-filter-bar"><input className="field" placeholder="Search tickets…" value={ticketSearch} onChange={(event) => setTicketSearch(event.target.value)} /><select className="field" value={ticketStatus} onChange={(event) => setTicketStatus(event.target.value)}><option value="all">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="pending">Pending</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select><select className="field" value={ticketPriority} onChange={(event) => setTicketPriority(event.target.value)}><option value="all">All priorities</option><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div></div><div className="p-4">{ticketsLoading && <p className="muted" role="status">Loading support tickets…</p>}{!ticketsLoading && ticketsError && <p className="text-danger" role="alert">{ticketsError}</p>}{!ticketsLoading && !ticketsError && !visibleTickets.length && <p className="muted">No support tickets match the selected filters.</p>}{!ticketsLoading && !ticketsError && Boolean(visibleTickets.length) && <table><thead><tr><th>Subject</th><th>Tenant</th><th>Source</th><th>Category</th><th>Priority</th><th>Status</th><th>Created</th></tr></thead><tbody>{visibleTickets.map((ticket) => <tr key={ticket.id} className="support-ticket-row" tabIndex={0} onClick={() => openTicket(ticket)} onKeyDown={(event) => handleTicketKey(event, ticket)}><td><button type="button" className="support-ticket-open" onClick={(event) => { event.stopPropagation(); openTicket(ticket); }}>{ticket.subject}</button><small>{ticket.description}</small></td><td>{ticket.organization_name || ticket.organization_id}</td><td>{ticket.source || "module"}</td><td>{ticket.category}</td><td>{ticket.priority}</td><td><TicketBadge tone={statusTone(ticket.status)}>{statusLabel(ticket.status)}</TicketBadge></td><td>{formatDate(ticket.created_at)}</td></tr>)}</tbody></table>}</div></section>
    <form className="platform-card" onSubmit={recoverAdministrator}><div className="platform-card-header"><h2>Restricted actions</h2><span className="prototype-badge">Audited</span></div><div className="platform-card-body"><p className="muted text-sm">Cross-tenant administrator recovery is reserved for verified lockouts. Tenant authorization approval remains inside the tenant.</p><Field label="Tenant"><select className="field" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} required><option value="">Select tenant…</option>{state.organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></Field><Field label="Administrator email"><input className="field" name="email" type="email" required /></Field><input type="hidden" name="action" value="password_reset" /><Field label="Reason (required)"><textarea className="field" name="reason" minLength={10} required /></Field><button className="btn" disabled={!selectedId || Boolean(actionBusy)} aria-busy={actionBusy === "recovery"}>{actionBusy === "recovery" ? "Sending reset link…" : "Send one-time reset link"}</button></div></form></div>
    {selectedTicket && <TicketDrawer ticket={selectedTicket} busy={ticketUpdating === selectedTicket.id} onClose={() => setSelectedTicket(null)} onUpdate={(update) => updateTicket(selectedTicket.id, update)} />}
  </>}</>;
}
