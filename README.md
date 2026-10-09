# DHMIS Platform Admin

The control-plane administration React application for platform operators.

## Installation

Requirements: Node.js 20+ and a running DHMIS Backend.

```bash
cd platform-admin
npm install
cp .env.example .env.local
npm run dev
```

Set VITE_API_BASE_URL in .env.local. The app is served under the frozen /admin/ entry points. Build the production bundle with npm run build; preview it with npm run preview.
