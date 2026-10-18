# ColdChain 3.0 Design System: Cryogenic Intelligence & Cryptographic Proof

<!-- impeccable:design-schema 1 -->

## Design Philosophy
ColdChain 3.0 is an industrial-grade cyber-physical operations platform monitoring life-critical temperature-sensitive supply chains (biologics, mRNA vaccines, specialty perishables) backed by AI anomaly detection and EVM blockchain consensus.

The aesthetic fuses **Aerospace Mission Control** with **Pristine Cryogenic Laboratory**:
1. **Luminescent Telemetry**: Dark obsidian canvas minimizes eye strain in 24/7 logistics control rooms, while icy cryo-cyan and thermal-reactive indicators make excursions instantaneously noticeable within milliseconds.
2. **Cryptographic Authority**: Blockchain anchors, Merkle roots, and public verification seals carry visual weight—embossed shields, monospace verification badges, and verified tamper-evident stamps.
3. **Information Density with Breathability**: High-throughput telemetry and batch records are formatted with meticulous typographic hierarchy, tabular numbers, and clean grid rhythm.
4. **Delightful Tactile Micro-Interactions**: Smooth glass cards, magnetic hover states, subtle gradient borders, and live telemetry pulses give the interface an alive, responsive heartbeat.

---

## Color Tokens

### Backgrounds & Surfaces
- `--bg-canvas`: `#070a12` (deep oceanic void)
- `--bg-surface`: `rgba(15, 23, 42, 0.75)` (frosted obsidian glass)
- `--bg-surface-elevated`: `rgba(30, 41, 59, 0.8)` (elevated card / popover)
- `--bg-surface-hover`: `rgba(30, 41, 59, 0.95)`
- `--bg-input`: `rgba(15, 23, 42, 0.9)`

### Borders & Dividers
- `--border-subtle`: `rgba(255, 255, 255, 0.07)`
- `--border-medium`: `rgba(56, 189, 248, 0.18)`
- `--border-focus`: `rgba(6, 182, 212, 0.5)`
- `--border-glow`: `0 0 0 1px rgba(6, 182, 212, 0.3), 0 0 20px -4px rgba(6, 182, 212, 0.25)`

### Brand Accents
- `--cyan-500`: `#06b6d4` (Primary Cryo Voltage)
- `--cyan-400`: `#22d3ee`
- `--cyan-glow`: `rgba(6, 182, 212, 0.25)`
- `--blue-500`: `#0284c7`
- `--indigo-500`: `#6366f1` (Ledger & Blockchain)
- `--indigo-glow`: `rgba(99, 102, 241, 0.25)`

### Semantic Status Colors
- **Normal / Intact**:
  - `--status-normal-bg`: `rgba(16, 185, 129, 0.12)`
  - `--status-normal-border`: `rgba(16, 185, 129, 0.3)`
  - `--status-normal-text`: `#34d399`
  - `--status-normal-solid`: `#10b981`
- **Warning / Fluctuation**:
  - `--status-warn-bg`: `rgba(245, 158, 11, 0.12)`
  - `--status-warn-border`: `rgba(245, 158, 11, 0.3)`
  - `--status-warn-text`: `#fbbf24`
  - `--status-warn-solid`: `#f59e0b`
- **Critical Excursion / Anomaly**:
  - `--status-alert-bg`: `rgba(244, 63, 94, 0.14)`
  - `--status-alert-border`: `rgba(244, 63, 94, 0.35)`
  - `--status-alert-text`: `#fb7185`
  - `--status-alert-solid`: `#f43f5e`
- **Info / In-Transit**:
  - `--status-info-bg`: `rgba(14, 165, 233, 0.12)`
  - `--status-info-border`: `rgba(14, 165, 233, 0.3)`
  - `--status-info-text`: `#38bdf8`

### Typography & Ink
- `--text-white`: `#ffffff`
- `--text-primary`: `#f1f5f9`
- `--text-secondary`: `#94a3b8`
- `--text-muted`: `#64748b`
- `--text-dim`: `#475569`

---

## Typography

- **Primary Sans**: `'Plus Jakarta Sans', system-ui, -apple-system, sans-serif`
  - Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold)
- **Monospace**: `'JetBrains Mono', 'Fira Code', ui-monospace, monospace`
  - Numerics: `font-variant-numeric: tabular-nums lining-nums` for aligned telemetry readings, ISO-8601 timestamps, GPS coordinates, and hash digests.

### Typographic Scale
- `display-hero`: 36px / 1.15 / -0.03em tracking / 800 weight
- `heading-1`: 28px / 1.2 / -0.02em tracking / 700 weight
- `heading-2`: 22px / 1.25 / -0.01em tracking / 700 weight
- `heading-3`: 18px / 1.3 / 0 tracking / 600 weight
- `body-lg`: 16px / 1.5 / 0 tracking / 400 weight
- `body-base`: 14px / 1.5 / 0 tracking / 400 weight
- `body-sm`: 13px / 1.4 / 0 tracking / 400 weight
- `caption`: 11px / 1.3 / 0.04em tracking / 600 weight / uppercase

---

## Layout & Spatial System

- **Sidebar Width**: 260px fixed desktop navigation
- **Header Height**: 64px sticky blur bar
- **Main Container**: `max-width: 1480px`, fluid padding `24px` to `36px`
- **Grid Gap System**:
  - Micro: `8px`
  - Small: `12px`
  - Medium: `20px`
  - Large: `28px`
  - X-Large: `36px`
- **Border Radii**:
  - Badge / Pill: `9999px`
  - Small control / Button: `10px`
  - Card / Panel: `16px`
  - Hero container: `20px`

---

## Motion & Transitions
- Base easing: `cubic-bezier(0.16, 1, 0.3, 1)` (smooth deceleration)
- Fast micro-hover: `150ms ease`
- Panel expand / modal: `250ms cubic-bezier(0.16, 1, 0.3, 1)`
- Live heartbeat pulse: `pulse-beacon 2s infinite ease-in-out`
- Border glow transition on card hover
