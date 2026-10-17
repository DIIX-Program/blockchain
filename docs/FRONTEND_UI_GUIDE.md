# Frontend Web Dashboard & Traceability UI Guide (Task 05)

This document specifies the React + TypeScript frontend web application for the **Smart Cold-Chain Traceability System**, built using Vite, CSS Design Tokens, and Lucide Icons.

---

## 1. UI Direction & Design System

The frontend is crafted to look sleek, responsive, and enterprise-grade:
- **Palette**: Dark slate backgrounds (`#0a0e17`), deep navy cards (`#121826`), vibrant cyan (`#06b6d4`), and status-aware semantic indicators:
  - Normal / Compliant: Emerald Green (`#10b981`)
  - In Transit / Pending: Amber Gold (`#f59e0b`)
  - Excursion / Alert: Rose Red (`#f43f5e`)
  - Information / Telemetry: Sky Blue (`#38bdf8`)
- **Typography**: Google Fonts [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) for user interfaces and [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) for cryptographic hashes, timestamps, and sequence numbers.
- **Glassmorphism & Micro-animations**: Subtle backdrop blur (`16px`), glowing card hover borders, and rotating pulse status indicators.

---

## 2. Page Directory & Route Architecture

| Route Path | Page Component | Access Guard | Description |
| :--- | :--- | :--- | :--- |
| `/login` | `LoginPage` | Public | Authentication with 1-click RBAC demo accounts (ADMIN, PRODUCER, etc.) |
| `/` | `DashboardPage` | Protected | Multi-tier operations dashboard: metrics, system health, live batches & alerts |
| `/products` | `ProductsPage` | Protected | Catalog of cold-chain products, temperature SLA thresholds, and registration modal |
| `/products/:id`| `ProductDetailPage`| Protected | Detailed product dossier and linked production batches |
| `/batches` | `BatchesPage` | Protected | Searchable batch registry, status filtering, and creation modal |
| `/batches/:id` | `BatchDetailPage` | Protected | Master dossier with 4 tabs: Telemetry Chart, Timeline, Alerts, Blockchain Anchor |
| `/sensors` | `SensorMonitoringPage`| Protected | Fleet-wide IoT sensor surveillance with interactive time-series chart |
| `/alerts` | `AlertsPage` | Protected | AI Anomaly Incident center with Acknowledge and Resolve workflows |
| `/anchors` | `AnchorsPage` | Protected | Blockchain proof explorer and Cryptographic Tamper-Verification tool |
| `/admin` | `ManagementPage` | Protected (Roles)| Telemetry device registration and RBAC user permissions manager |
| `/trace/:batchNumber` | `PublicTracePage` | Public (Zero Auth)| Consumer QR code public verification portal (standalone responsive view) |

---

## 3. Core Component Library

### 3.1 `Layout.tsx` (Application Shell)
- Collapsible sidebar with navigation links and active route highlighting.
- Top bar with live UTC clock and ledger connectivity pill.
- User profile card with role badge and logout button.

### 3.2 `TemperatureChart.tsx` (SVG Time-Series Visualizer)
- Pure SVG implementation (100% dependency-free, zero runtime bugs).
- Highlights the target safe temperature band (e.g. 2.0°C to 8.0°C) as a shaded green zone with dashed max/min boundary lines.
- Renders temperature profile curve with floating interactive tooltips showing timestamp, temperature, relative humidity, coordinates, and simulated flag.
- Renders glowing red ring markers for points that breach permitted thresholds.

### 3.3 `Timeline.tsx` (Custody Handover Milestones)
- Chronological vertical timeline connecting milestones from Manufacture ➔ Dispatch ➔ Custody Handover ➔ Warehouse ➔ Final Delivery.
- Shows releasing and receiving organizations, responsible operators, and mined blockchain transaction hashes.

### 3.4 `StatusBadge.tsx`
- Renders uniform badge tags across the application for:
  - Batches: `CREATED`, `IN_TRANSIT`, `STORED`, `DELIVERED`, `REJECTED`.
  - Alerts: `OPEN`, `ACKNOWLEDGED`, `RESOLVED`.
  - Severity: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`.
  - Anchors: `CONFIRMED`, `PENDING`, `FAILED`.

---

## 4. Running the Web Application

To start the Vite development server locally:
```bash
npm run dev:web
```
Or from the `apps/web` workspace:
```bash
npm --prefix apps/web run dev
```

The application will be accessible at:
- Web App: `http://localhost:5173`
- Demo Public QR Code Portal: `http://localhost:5173/trace/BATCH-VAX-2026-001`

### 1-Click Demo Accounts (Pre-configured on Login Screen):
1. **System Administrator**: `admin@coldchain.internal` / `password123`
2. **Pharma Producer**: `producer@vaxlab.com` / `password123`
3. **Logistics Driver**: `driver@coldtrans.com` / `password123`
4. **Warehouse Operator**: `operator@biodepot.com` / `password123`
5. **Auditor / QA Inspector**: `auditor@regulator.gov` / `password123`
