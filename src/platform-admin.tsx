import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import PlatformAdminApp, { type PlatformPage } from './platform-admin/PlatformAdminApp';
import { installFormEnhancements } from './formEnhancements';
import './styles/global.css';
import { platformPageFromPath } from './platform-admin/route';

installFormEnhancements();

function PlatformAdminRoot() {
  const fallback = (document.body.dataset.platformPage || 'overview') as PlatformPage;
  const [page, setPage] = useState<PlatformPage>(() => platformPageFromPath(window.location.pathname, fallback));
  useEffect(() => {
    const syncRoute = () => setPage(platformPageFromPath(window.location.pathname, fallback));
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('pageshow', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('pageshow', syncRoute);
    };
  }, [fallback]);
  return <React.StrictMode><PlatformAdminApp page={page} /></React.StrictMode>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <PlatformAdminRoot />,
);
