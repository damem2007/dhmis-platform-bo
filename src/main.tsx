import React from 'react';
import ReactDOM from 'react-dom/client';
import PlatformAdminApp, { type PlatformPage } from './platform-admin/PlatformAdminApp';
import { installFormEnhancements } from './formEnhancements';
import './styles/global.css';

const page = (document.body.dataset.platformPage || 'overview') as PlatformPage;
installFormEnhancements();
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><PlatformAdminApp page={page} /></React.StrictMode>);
