export type PlatformPage =
  | "overview"
  | "tenants"
  | "onboarding"
  | "billing-plans"
  | "jobs"
  | "incidents"
  | "support"
  | "platform-audit"
  | "feature-flags"
  | "settings-practice"
  | "settings-integrations"
  | "settings-staff"
  | "settings-templates"
  | "settings-audit"
  | "settings-roles";

export const PLATFORM_PAGE_TITLES: Record<PlatformPage, string> = {
  overview: 'DHMIS · Platform Overview',
  tenants: 'DHMIS · Platform Tenants',
  onboarding: 'DHMIS · Tenant Onboarding',
  'billing-plans': 'DHMIS · Billing & Plans',
  jobs: 'DHMIS · Jobs & Queues',
  incidents: 'DHMIS · Incidents',
  support: 'DHMIS · Platform Support',
  'platform-audit': 'DHMIS · Platform Audit',
  'feature-flags': 'DHMIS · Feature Flags',
  'settings-practice': 'DHMIS · Practice Policy',
  'settings-integrations': 'DHMIS · Platform Integrations',
  'settings-staff': 'DHMIS · Staff & Invitations',
  'settings-templates': 'DHMIS · Message Templates',
  'settings-audit': 'DHMIS · Audit Trail',
  'settings-roles': 'DHMIS · Roles & Access',
};

export const PLATFORM_PAGE_META: Record<PlatformPage, { title: string; description: string }> = {
  overview: { title: 'Platform overview', description: 'All tenants · production control plane' },
  tenants: { title: 'Tenants', description: 'Provisioned organizations, routing, status and enabled surfaces.' },
  onboarding: { title: 'Onboarding', description: 'New tenants from signup to first booking.' },
  'billing-plans': { title: 'Billing & plans', description: 'Platform commercial configuration and subscription status.' },
  jobs: { title: 'Jobs & queues', description: 'Background processing across every tenant.' },
  incidents: { title: 'Incidents', description: 'Platform-wide service health and incident response.' },
  support: { title: 'Support', description: 'Tenant support queue and audited administrator recovery.' },
  'platform-audit': { title: 'Platform audit', description: 'Security and control-plane activity across the platform.' },
  'feature-flags': { title: 'Feature flags', description: 'Platform and tenant capability rollout controls.' },
  'settings-practice': { title: 'Practice policy', description: 'Platform policy defaults inherited by newly provisioned tenants.' },
  'settings-integrations': { title: 'Integrations', description: 'Provider defaults and tenant customization requests.' },
  'settings-staff': { title: 'Staff & invitations', description: 'Platform operator access and invitations.' },
  'settings-templates': { title: 'Message templates', description: 'Platform-owned operational communication templates.' },
  'settings-audit': { title: 'Audit trail', description: 'Auditable platform configuration changes.' },
  'settings-roles': { title: 'Roles & access', description: 'Platform authorization roles and maker-checker policy.' },
};

export const PLATFORM_SETTINGS_NAV: Array<[PlatformPage, string, string]> = [
  ['settings-practice', 'Practice policy', '/admin/settings/'],
  ['settings-integrations', 'Integrations', '/admin/settings/integrations/'],
  ['settings-staff', 'Staff & invitations', '/admin/settings/staff/'],
  ['settings-templates', 'Message templates', '/admin/settings/templates/'],
  ['settings-audit', 'Audit trail', '/admin/settings/audit/'],
  ['settings-roles', 'Roles & access', '/admin/settings/roles/'],
];

export const PLATFORM_PROTOTYPE_PAGES: Exclude<PlatformPage, 'overview' | 'tenants' | 'onboarding' | 'support' | 'settings-integrations'>[] = [
  'billing-plans', 'jobs', 'incidents', 'platform-audit', 'feature-flags',
  'settings-practice', 'settings-staff', 'settings-templates', 'settings-audit', 'settings-roles',
];
