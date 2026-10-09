import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from '../lib/api';

export type ApprovalNotification = {
  request_id?: string;
  id?: string;
  kind: string;
  title: string;
  detail: string;
  status: string;
  severity?: 'danger' | 'warning' | 'info';
  cta_label?: string;
  created_at: string;
  counted?: boolean;
  seen?: boolean;
};

export type ApprovalNotificationFeed = { items: ApprovalNotification[]; unread_count: number };
type SystemNotificationFeed = { items: ApprovalNotification[]; unread_count: number; page: number; pages: number };

function notificationCta(item: ApprovalNotification) {
  if (item.cta_label) return item.cta_label;
  if (item.request_id) {
    return item.kind === 'action' ? 'Review action' : item.kind === 'waiting' ? 'View request' : 'View outcome';
  }
  const kind = item.kind.replace(/^system:/, '').toLowerCase();
  if (kind.includes('payment') || kind.includes('billing')) return 'Review payment';
  if (kind.includes('appointment') || kind.includes('schedule')) return 'View appointment';
  if (kind.includes('patient')) return 'View patient item';
  if (kind.includes('invitation')) return 'View invitation';
  if (kind.includes('password') || kind.includes('recovery')) return 'Review recovery';
  return 'View notification';
}

function relativeTime(value: string) {
  const age = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(age / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function notificationGlyph(item: ApprovalNotification) {
  if (item.severity === 'danger') return '!';
  if (item.kind.includes('payment') || item.kind.includes('billing')) return '$';
  if (item.kind.includes('appointment') || item.kind.includes('schedule')) return '⌚';
  return '•';
}

export function ApprovalBell({ domain, approvalsHref }: { domain: 'tenant' | 'platform'; approvalsHref: string }) {
  const [feed, setFeed] = useState<ApprovalNotificationFeed>({ items: [], unread_count: 0 });
  const [systemPage, setSystemPage] = useState(1);
  const [systemPages, setSystemPages] = useState(1);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const prefix = domain === 'platform' ? '/platform/rbac' : '/rbac';

  async function load() {
    const systemPath = domain === 'platform' ? '/platform/notifications' : '/notifications/feed';
    const [approvals, system] = await Promise.all([
      api<ApprovalNotificationFeed>(`${prefix}/notifications`).catch(() => ({ items: [], unread_count: 0 })),
      api<SystemNotificationFeed>(`${systemPath}?page=${systemPage}&size=10`).catch(() => ({ items: [], unread_count: 0, page: systemPage, pages: 0 })),
    ]);
    const approvalItems = approvals.items.map((item) => ({
      ...item,
      severity: item.status === 'rejected' || item.status === 'conflicted' || item.status === 'expired' ? 'danger' as const : item.kind === 'action' || item.kind === 'waiting' ? 'warning' as const : 'info' as const,
    }));
    const systemItems = system.items.map((item) => ({ ...item, kind: `system:${item.kind}` }));
    setSystemPages(Math.max(1, system.pages || 1));
    setFeed({ items: [...approvalItems, ...systemItems], unread_count: approvals.unread_count + system.unread_count });
  }
  async function openApprovals() {
    try { await api(`${prefix}/notifications/seen`, {}); } catch { /* Keep navigation available. */ }
    window.location.assign(approvalsHref);
  }

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener('focus', refresh);
    window.addEventListener('dhmis:rbac-updated', refresh);
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('dhmis:rbac-updated', refresh); };
  }, [prefix, systemPage, domain]);
  useEffect(() => {
    function dismiss(event: MouseEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return;
      if (event instanceof MouseEvent && root.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', dismiss);
    document.addEventListener('keydown', dismiss);
    return () => { document.removeEventListener('mousedown', dismiss); document.removeEventListener('keydown', dismiss); };
  }, []);

  return <div className="approval-bell" ref={root}>
    <button type="button" aria-label={`Approvals and notifications${feed.unread_count ? `, ${feed.unread_count} need attention` : ''}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <Bell size={17} aria-hidden="true" />
      {feed.unread_count > 0 && <span aria-hidden="true">{feed.unread_count > 99 ? '99+' : feed.unread_count}</span>}
    </button>
    {open && <div className="approval-bell-menu" role="menu">
      <div className="approval-bell-menu-header"><strong>Notifications</strong><small>{feed.unread_count ? `${feed.unread_count} need your attention` : 'Nothing needs your attention'}</small></div>
      {feed.items.slice(0, 8).map((item) => <button key={`${item.kind}-${item.request_id || item.id}`} type="button" role="menuitem" className={`${item.kind === 'waiting' ? 'is-waiting' : ''} ${item.severity ? `is-${item.severity}` : ''}`} onClick={() => item.request_id ? void openApprovals() : setOpen(false)}><span className="approval-bell-icon" aria-hidden="true">{notificationGlyph(item)}</span><span className="approval-bell-copy"><strong>{item.title}</strong><small>{item.detail}</small><time dateTime={item.created_at}>{relativeTime(item.created_at)}</time><span className="approval-bell-cta">{notificationCta(item)} <span aria-hidden="true">→</span></span></span></button>)}
      {!feed.items.length && <p>No notifications.</p>}
      <div className="approval-bell-pagination"><button type="button" disabled={systemPage <= 1} onClick={() => setSystemPage((page) => page - 1)}>Previous</button><span>Page {systemPage} of {systemPages}</span><button type="button" disabled={systemPage >= systemPages} onClick={() => setSystemPage((page) => page + 1)}>Next</button></div>
      <button type="button" role="menuitem" className="approval-bell-open" onClick={() => void openApprovals()}>Open approvals</button>
    </div>}
  </div>;
}
