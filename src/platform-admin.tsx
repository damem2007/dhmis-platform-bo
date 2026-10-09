import React from 'react';
import ReactDOM from 'react-dom/client';
import PlatformAdminApp, { type PlatformPage } from './platform-admin/PlatformAdminApp';
import './styles/global.css';

const page = (document.body.dataset.platformPage || 'overview') as PlatformPage;
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><PlatformAdminApp page={page} /></React.StrictMode>,
);
