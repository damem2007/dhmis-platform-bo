import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarClock,
  ClipboardList,
  ReceiptText,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { loadPlatformNotificationFeed, type ApprovalNotification } from "../components/ApprovalBell";

type Notification = ApprovalNotification;

function category(item: Notification) {
  const text = `${item.kind} ${item.title} ${item.detail}`.toLowerCase();
  if (item.severity === "danger" || /failed|error|retry|blocked|alert/.test(text)) return "alert";
  if (/billing|invoice|subscription|plan|payment|payout|refund|deposit/.test(text)) return "billing";
  if (/due|overdue|installment|appointment|schedule|calendar/.test(text)) return "due-date";
  if (/onboard|provision|tenant|organization|invitation|invite/.test(text)) return "onboarding";
  if (/audit|auditing|audit-trail|configuration change/.test(text)) return "audit";
  if (/patient|clinical|user|staff/.test(text)) return "people";
  if (/mfa|password|security|recovery|access/.test(text)) return "security";
  return "general";
}

function icon(item: Notification): ReactNode {
  const Icon = {
    alert: AlertTriangle,
    billing: ReceiptText,
    "due-date": CalendarClock,
    onboarding: Building2,
    audit: ClipboardList,
    people: UserRound,
    security: ShieldAlert,
    general: Bell,
  }[category(item)];
  return <Icon size={18} strokeWidth={2.2} aria-hidden="true" />;
}

function cta(item: Notification) {
  if (item.cta_label) return item.cta_label;
  if (item.request_id) return item.kind === "action" ? "Review action" : item.kind === "waiting" ? "View request" : "View outcome";
  const kind = item.kind.replace(/^system:/, "").toLowerCase();
  if (kind.includes("payment") || kind.includes("billing")) return "Review payment";
  if (kind.includes("appointment") || kind.includes("schedule")) return "View appointment";
  if (kind.includes("patient")) return "View patient item";
  if (kind.includes("invitation")) return "View invitation";
  if (kind.includes("password") || kind.includes("recovery")) return "Review recovery";
  return "View notification";
}

function groupLabel(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Earlier";
  const age = Math.max(0, Date.now() - timestamp);
  if (age < 24 * 60 * 60 * 1000) return "Today";
  if (age < 7 * 24 * 60 * 60 * 1000) return "This week";
  if (age < 30 * 24 * 60 * 60 * 1000) return "Last 30 days";
  return "Earlier";
}

function relativeTime(value: string) {
  const minutes = Math.floor(Math.max(0, Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function PlatformNotificationCenter() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const result = await loadPlatformNotificationFeed(page, 10);
      setItems(result.items);
      setUnreadCount(result.unread_count);
      setPages(result.pages);
      setMessage("");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Notifications could not be loaded");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [page]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Notification[]>();
    items.forEach((item) => {
      const label = groupLabel(item.created_at);
      groups.set(label, [...(groups.get(label) || []), item]);
    });
    return [...groups.entries()];
  }, [items]);

  if (loading) return <LoadingOverlay label="Loading notifications…" />;
  return <>
    <div className="platform-page-heading mb-6 flex items-center justify-between gap-3">
      <div><h1>Notifications</h1><p className="muted">Review approvals and operational updates across the platform.</p></div>
      <button type="button" className="btn-secondary" onClick={() => void load()}>Refresh</button>
    </div>
    {message && <p className="prototype-callout" role="status">{message}</p>}
    <section className="platform-card platform-notification-center-page">
      <div className="platform-card-header"><div><h2>Notification center</h2><span className="muted">{unreadCount ? `${unreadCount} need your attention` : "All caught up"}</span></div></div>
      {!grouped.length && <p className="platform-notification-empty">No active notifications.</p>}
      <div className="platform-notification-list">
        {grouped.map(([label, group]) => <Fragment key={label}>
          <h3>{label}</h3>
          {group.map((item) => <article key={`${item.kind}-${item.request_id || item.id || item.created_at}`} className={`platform-notification-item is-${item.severity || "info"}`}>
            <span className={`approval-bell-icon is-${category(item)}`}>{icon(item)}</span>
            <div className="platform-notification-copy"><strong>{item.title}</strong><p>{item.detail}</p><time dateTime={item.created_at}>{relativeTime(item.created_at)}</time></div>
            {item.request_id ? <a href="/admin/settings/roles/?tab=approvals" className="platform-notification-cta">{cta(item)} <span aria-hidden="true">→</span></a> : item.target_url ? <a href={item.target_url} className="platform-notification-cta">{cta(item)} <span aria-hidden="true">→</span></a> : <span className="platform-notification-cta">{cta(item)} <span aria-hidden="true">→</span></span>}
          </article>)}
        </Fragment>)}
      </div>
      <div className="approval-bell-pagination"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next</button></div>
    </section>
  </>;
}
