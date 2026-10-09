import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        overview: 'index.html',
        tenants: 'admin/tenants/index.html',
        onboarding: 'admin/onboarding/index.html',
        billingPlans: 'admin/billing-plans/index.html',
        jobs: 'admin/jobs/index.html',
        incidents: 'admin/incidents/index.html',
        support: 'admin/support/index.html',
        platformAudit: 'admin/platform-audit/index.html',
        featureFlags: 'admin/feature-flags/index.html',
        settings: 'admin/settings/index.html',
        settingsIntegrations: 'admin/settings/integrations/index.html',
        settingsStaff: 'admin/settings/staff/index.html',
        settingsTemplates: 'admin/settings/templates/index.html',
        settingsAudit: 'admin/settings/audit/index.html',
        settingsRoles: 'admin/settings/roles/index.html',
        integrationsAlias: 'admin/integrations/index.html',
        recoveryAlias: 'admin/recovery/index.html',
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    allowedHosts: ['.dhmis.local'],
    proxy: {
      '/v1': process.env.VITE_API_PROXY || 'http://127.0.0.1:5137',
      '/health': process.env.VITE_API_PROXY || 'http://127.0.0.1:5137',
    },
  },
});
