import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from './api';

export type ApprovalNotification = {
  request_id?: string;
  id?: string;
  kind: string;
  title: string;
  detail: string;
  status: string;
  severity?: 'danger' | 'warning' | 'info';
  created_at: string;
  counted?: boolean;
  seen?: boolean;
};

export type ApprovalNotificationFeed = { items: ApprovalNotification[]; unread_count: number };
type SystemNotificationFeed = { items: ApprovalNotification[]; unread_count: number; page: number; pages: number };

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
      <div><strong>Notifications</strong><small>{feed.unread_count ? `${feed.unread_count} need your attention` : 'Nothing needs your attention'}</small></div>
      {feed.items.slice(0, 8).map((item) => <button key={`${item.kind}-${item.request_id || item.id}`} type="button" role="menuitem" className={`${item.kind === 'waiting' ? 'is-waiting' : ''} ${item.severity ? `is-${item.severity}` : ''}`} onClick={() => item.request_id ? void openApprovals() : setOpen(false)}><strong>{item.title}</strong><small>{item.detail}</small></button>)}
      {!feed.items.length && <p>No notifications.</p>}
      <div className="approval-bell-pagination"><button type="button" disabled={systemPage <= 1} onClick={() => setSystemPage((page) => page - 1)}>Previous</button><span>Page {systemPage} of {systemPages}</span><button type="button" disabled={systemPage >= systemPages} onClick={() => setSystemPage((page) => page + 1)}>Next</button></div>
      <button type="button" role="menuitem" className="approval-bell-open" onClick={() => void openApprovals()}>Open approvals</button>
    </div>}
  </div>;
}
