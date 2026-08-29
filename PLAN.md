# SayCle — Frontend Development Plan

> Fokus: dashboard frontend untuk Admin/Operator, Officer/Kurir, dan Mitra.  
> Stack: Laravel 12 + Inertia 2 + React 19 + TypeScript + Tailwind 4 + shadcn/ui + Radix + Lucide.  
> Peta: Leaflet + OpenStreetMap. Routing: OSRM. Hero fx: ReactBits (Waves, decorative only).  
> PWA-ready.

---

## Design Anti-Slop Guardrails (wajib di setiap fase)

Setiap fase wajib menjalankan loop `impeccable critique` sebelum dianggap selesai.  
`critique` tidak cuma di akhir sesi, tapi di akhir **setiap fase** sebagai gate.

### Aturan visual (dari DESIGN.md + impeccable skill)

| Aturan | Detail |
|---|---|
| **Palette** | Off-white `#f4f3ed` bg, compost green `#18352a`/`#2f6848` ink/field, squash orange `#e88c12` CTA-only. No warm-paper AI default. No gradient text. |
| **Typography** | Instrument Sans body. Display heading `-0.04em` floor tracking. Eyebrow uppercase `.2em` — **only when sequence carries meaning**, not reflex on every section. |
| **Cards** | `rounded-[2rem]` max. No nested cards. No identical card grids. Vary structure. |
| **Motion** | Purposeful, not decorative. `prefers-reduced-motion` fallback wajib. Waves decorative-only, `aria-hidden`. |
| **Contrast** | Body text ≥4.5:1. Muted text bump toward ink. No gray-on-tint. |
| **Tables/Data** | shadcn `Table`, `DataTable` pattern. No hand-rolled grids. |
| **Maps** | Leaflet container with min-height. Overlay panel, not full-bleed blocking. |
| **Forms** | shadcn `Input`, `Select`, `Checkbox`, `Textarea`, `Form` + Zod. Field labels with `htmlFor`. Error summary with `role="alert"`. |
| **Navigation** | shadcn `Sidebar` (admin/officer), `Sheet` (mobile). Breadcrumbs. `cmdk` command palette optional. |
| **Bans** | No side-stripe borders. No glassmorphism default. No hero-metric template. No numbered eyebrow reflex. No sketch SVG. No `repeating-linear-gradient` stripes. No ghost-card (1px border + wide shadow). No `border-radius: 32px+`. |

### Critique loop per fase

```
Build fase → npm run build → impeccable detect.mjs → critique (designer) → fix batch → re-critique → ship gate
```

**Ship gate:** `critique` disposition = `ship` atau semua P0/P1 resolved. P2 boleh ship dengan catatan.

---

## Fase 1 — Auth & Role Foundation (Frontend)

### Goal

Login/register page berfungsi untuk 3 role. Middleware role mengarahkan ke dashboard masing-masing. Mitra registration form dengan kapasitas min/ideal/max.

### Scope frontend

| Item | Komponen shadcn | Detail |
|---|---|---|
| Login page | `Card`, `Input`, `Button`, `Label` | Email + password. Redirect by role. |
| Register mitra | `Card`, `Input`, `Select`, `Textarea`, `Button` | Fields: nama, alamat, kapasitas min/ideal/max (kg/minggu), frekuensi penerimaan, grade preference. |
| Register officer/admin | `Card`, `Input`, `Select`, `Button` | Admin-only invite flow atau seeded. |
| Role redirect | — | Admin→`/dashboard`, Officer→`/officer`, Mitra→`/partner`. |
| Layout shell | `AppLayout` (existing) + `Sidebar` | Role-based nav items. |
| Nav items | `nav-main.tsx` (existing pattern) | Admin: Stock, Partners, Contracts, Routes, Tasks, Prices, Stats. Officer: Tasks, Routes, Weighing. Mitra: Deliveries, Contract, Billing. |

### Komponen reusable baru

- `RoleBadge` — badge dengan warna per role.
- `CapacityInput` — 3 field min/ideal/max dengan validasi min ≤ ideal ≤ max.
- `GradeSelect` — select 3 grade (Layak/Kurang Layak/Tidak Layak).

### Backend dependency

- `users.role` enum: `admin`, `officer`, `partner`.
- Middleware `role:admin`, `role:officer`, `role:partner`.
- Register mitra → create `partners` record + user.

### Ship gate

- [ ] Login + redirect by role works.
- [ ] Mitra register form validasi min ≤ ideal ≤ max.
- [ ] Sidebar nav per role.
- [ ] `impeccable critique` = ship.

---

## Fase 2 — Admin Dashboard Shell + Stock Management

### Goal

Admin dashboard dengan overview + stock management per grade. Landing dashboard menampilkan stock saat ini per grade, total mitra, total pendapatan ringkasan.

### Scope frontend

| Page | Route | Komponen shadcn | Detail |
|---|---|---|---|
| Admin overview | `/dashboard` | `Card`, `Table`, `Badge`, `Chart` (recharts) | KPI cards: stock per grade, mitra aktif, pendapatan, pengeluaran. |
| Stock management | `/stock` | `Table`, `Badge`, `Input`, `Dialog` | Tabel stock per grade. Tambah/edit stock manual. In/out log. |
| Price per grade | `/prices` | `Table`, `Input`, `Button` | Set harga beli + harga jual per grade. |

### Komponen reusable baru

- `StatCard` — KPI card dengan icon, nilai, label, trend. **Bukan hero-metric template** — compact, data-dense, no gradient.
- `GradeBadge` — badge warna per grade (green=Layak, amber=Kurang, brown=Tidak Layak).
- `StockTable` — tabel dengan grade, kg, tujuan, timestamp.
- `PriceEditor` — inline edit harga per grade.

### Library tambahan

- `recharts` — chart stock trend, revenue. Lightweight, React-native.
- shadcn `Table` + `DataTable` pattern (TanStack Table optional kalau perlu sorting/filtering).

### Backend dependency

- `stock` table (grade, kg, type, updated_at).
- `prices` table (grade, buy_price, sell_price).
- API: `GET /stock`, `POST /stock/adjust`, `GET /prices`, `POST /prices`.

### Ship gate

- [ ] Overview KPI terender dengan data real/mock.
- [ ] Stock table per grade + manual adjust.
- [ ] Price editor per grade.
- [ ] Responsive: mobile stack, desktop grid.
- [ ] `impeccable critique` = ship.

---

## Fase 3 — Partner & Contract Management (Admin)

### Goal

Admin bisa CRUD mitra + kontrak. Setiap kontrak: kapasitas min/ideal/max, frekuensi, harga per grade, jadwal.

### Scope frontend

| Page | Route | Komponen | Detail |
|---|---|---|---|
| Partner list | `/partners` | `Table`, `Badge`, `Dialog` | Tabel mitra: nama, alamat, grade pref, status. |
| Partner detail | `/partners/{id}` | `Card`, `Table`, `Tabs` | Profil + kontrak + alokasi + history. |
| Contract editor | `/partners/{id}/contract` | `Card`, `Input`, `Select`, `Button` | Kapasitas min/ideal/max, frekuensi, harga per grade, jadwal. |
| Contract list | `/contracts` | `Table`, `Badge` | Semua kontrak aktif, status alokasi. |

### Komponen reusable baru

- `PartnerCard` — compact partner info card.
- `ContractForm` — form min/ideal/max + grade + schedule.
- `AllocationStatus` — badge: Defisit/Normal/Surplus/Overcapacity.
- `FrequencySelect` — harian/mingguan/bulanan.

### Ship gate

- [ ] Partner CRUD works.
- [ ] Contract form dengan validasi min ≤ ideal ≤ max.
- [ ] Allocation status badge per kontrak.
- [ ] `impeccable critique` = ship.

---

## Fase 4 — Allocation Engine Dashboard (Admin)

### Goal

Visualisasi alokasi otomatis. Admin lihat hasil alokasi engine: defisit/normal/surplus per grade, distribusi ke mitra, overcapacity handling.

### Scope frontend

| Page | Route | Komponen | Detail |
|---|---|---|---|
| Allocation overview | `/allocation` | `Card`, `Table`, `Chart`, `Badge` | Status per grade. Mitra allocation breakdown. |
| Allocation detail | `/allocation/{grade}` | `Table`, `ProgressBar`, `Badge` | Per-mitra: minimum, ideal, allocated, surplus/defisit. |
| Overcapacity approval | `/allocation/overcapacity` | `Card`, `Table`, `Button`, `Dialog` | Mitra overcapacity darurat → approve/reject. |
| Kompos cadangan | `/allocation/fallback` | `Table`, `Badge` | Mitra kompos cadangan status. |

### Komponen reusable baru

- `AllocationBar` — progress bar visual: minimum/ideal/maximum/allocated.
- `GradeAllocationPanel` — panel per grade dengan status + mitra list.
- `OvercapacityDialog` — konfirmasi overcapacity darurat.

### Library tambahan

- `recharts` — stacked bar allocation per mitra.

### Backend dependency

- Allocation engine (FR-07): minimum proporsional, ideal proporsional, surplus overcapacity, kompos cadangan.
- API: `GET /allocation/run`, `GET /allocation/{grade}`, `POST /allocation/overcapacity/approve`.

### Ship gate

- [ ] Allocation overview per grade.
- [ ] AllocationBar visualizes min/ideal/max/allocated.
- [ ] Overcapacity approval dialog.
- [ ] `impeccable critique` = ship.

---

## Fase 5 — Smart Route Optimization (Admin)

### Goal

Admin lihat peta dengan titik pickup, hasil VRP clustering ke kendaraan, rute per kendaraan, review + adjust sebelum assign ke officer.

### Scope frontend

| Page | Route | Komponen | Detail |
|---|---|---|---|
| Route planner | `/routes` | `Card`, `Map`, `Table`, `Button` | Peta Leaflet + marker pickup. Panel rute per kendaraan. |
| Route detail | `/routes/{vehicle}` | `Card`, `Table`, `Map`, `Badge` | Urutan pickup, jarak, durasi estimasi OSRM. |
| Route assign | `/routes/assign` | `Table`, `Select`, `Button` | Assign rute ke officer. |
| Vehicle list | `/vehicles` | `Table`, `Input` | Kapasitas kendaraan, status aktif. |

### Komponen reusable baru

- `RouteMap` — Leaflet map dengan markers + polyline rute per warna kendaraan.
- `VehicleRouteCard` — urutan pickup, total jarak, durasi.
- `RouteOptimizerPanel` — trigger optimize, status, review.

### Library tambahan

- `leaflet` + `react-leaflet` — peta.
- `leaflet-routing-machine` optional — OSRM integration.
- shadcn `ScrollArea` untuk panel rute.

### Backend dependency

- OSRM API integration (jarak jalan + durasi normal).
- VRP: cluster pickup → kendaraan by capacity + distance.
- API: `POST /routes/optimize`, `GET /routes`, `POST /routes/assign`.

### Ship gate

- [ ] Map renders pickup markers + vehicle routes.
- [ ] Route per vehicle dengan urutan + jarak + durasi.
- [ ] Admin can review + adjust before assign.
- [ ] Assign to officer.
- [ ] `impeccable critique` = ship.

---

## Fase 6 — Officer Dashboard (Kurir)

### Goal

Officer lihat tugas hari ini, rute pickup, form timbang 3 grade per supplier, bayar supplier, serah-terima gudang, pengiriman ke mitra.

### Scope frontend

| Page | Route | Komponen | Detail |
|---|---|---|---|
| Officer overview | `/officer` | `Card`, `List`, `Badge` | Tugas hari ini: pickup list + delivery list. |
| Pickup task | `/officer/pickup/{id}` | `Card`, `Input`, `Button`, `Map` | Detail supplier, lokasi, form timbang 3 grade, bayar, foto bukti. |
| Weighing form | (component) | `Input`, `Button`, `GradeBadge` | 3 field kg: Layak, Kurang Layak, Tidak Layak. |
| Payment | (component) | `Input`, `Button`, `Dialog` | Input nominal, konfirmasi bayar, bukti. |
| Warehouse handover | `/officer/warehouse` | `Card`, `Table`, `Button` | Checklist serah-terima per grade. |
| Delivery task | `/officer/delivery/{id}` | `Card`, `Map`, `Table`, `Button` | Rute ke mitra, konfirmasi serah-terima. |

### Komponen reusable baru

- `WeighingForm` — 3 input kg + foto + submit.
- `PaymentConfirm` — nominal + konfirmasi + bukti upload.
- `TaskCard` — compact tugas card dengan status + deadline.
- `HandoverChecklist` — checklist per grade dengan qty.

### Ship gate

- [ ] Tugas hari ini terender.
- [ ] Pickup form dengan 3 grade weighing.
- [ ] Payment + bukti.
- [ ] Warehouse handover checklist.
- [ ] Delivery confirmation.
- [ ] Mobile-first: semua form usable di HP.
- [ ] `impeccable critique` = ship.

---

## Fase 7 — Mitra Dashboard

### Goal

Mitra register (Fase 1) → dashboard: status pengiriman, kontrak + alokasi, total bayar.

### Scope frontend

| Page | Route | Komponen | Detail |
|---|---|---|---|
| Mitra overview | `/partner` | `Card`, `Table`, `Badge`, `Chart` | Status pengiriman, alokasi saat ini, tagihan. |
| Deliveries | `/partner/deliveries` | `Table`, `Badge`, `Map` | Riwayat + status pengiriman. |
| Contract | `/partner/contract` | `Card`, `Table` | Kontrak aktif: min/ideal/max, harga per grade, jadwal. |
| Billing | `/partner/billing` | `Table`, `Card` | Total yang perlu dibayarkan, riwayat. |

### Komponen reusable baru

- `DeliveryStatusTimeline` — timeline status pengiriman.
- `ContractSummary` — card kontrak aktif.
- `BillingSummary` — total + breakdown per grade.

### Ship gate

- [ ] Overview: status pengiriman + alokasi + tagihan.
- [ ] Deliveries table + map.
- [ ] Contract summary.
- [ ] Billing total.
- [ ] `impeccable critique` = ship.

---

## Fase 8 — Statistics & Impact Dashboard (Admin)

### Goal

Dashboard statistik: pendapatan, pengeluaran, margin, sampah terolah per grade, emisi karbon (opsional konservatif), total mitra/pemasok.

### Scope frontend

| Page | Route | Komponen | Detail |
|---|---|---|---|
| Stats overview | `/stats` | `Card`, `Chart`, `Table` | KPI + chart trend. |
| Revenue | `/stats/revenue` | `Chart`, `Table` | Pendapatan, pengeluaran, margin per transaksi. |
| Impact | `/stats/impact` | `Card`, `Chart`, `Badge` | kg sampah terolah per grade+tujuan. Emisi karbon opsional. |
| Partners/Suppliers | `/stats/partners` | `Table`, `Badge` | Total mitra/pemasok SME + hambatan akses. |

### Komponen reusable baru

- `TrendChart` — recharts line/area chart untuk revenue/stock trend.
- `ImpactDonut` — donut chart sampah per grade.
- `MarginCard` — pendapatan vs pengeluaran vs margin.

### Ship gate

- [ ] Stats overview dengan chart real.
- [ ] Impact: kg per grade, no fake carbon claims.
- [ ] `impeccable critique` = ship.

---

## Fase 9 — PWA

### Goal

SayCle installable di HP. Offline-capable report form. Install prompt.

### Scope

| Item | Detail |
|---|---|
| `manifest.json` | Name, icons, theme color, display standalone. |
| Service worker | `vite-plugin-pwa` atau manual SW. Cache app shell. |
| Install prompt | `beforeinstallprompt` event + custom button. |
| Offline report | Form cache + background sync (nice-to-have). |

### Ship gate

- [ ] Lighthouse PWA pass.
- [ ] Installable di Android Chrome.
- [ ] `impeccable critique` = ship.

---

## Komponen Reusable Library (cross-fase)

### shadcn (existing + tambah)

| Komponen | Fase | Status |
|---|---|---|
| `Button`, `Card`, `Badge`, `Input`, `Label` | existing | ✅ |
| `Table`, `Dialog`, `Sheet`, `Sidebar` | existing | ✅ |
| `Select`, `Checkbox`, `Textarea`, `Tabs` | add Fase 1 | ⬜ |
| `ScrollArea`, `Progress`, `Tooltip` | add Fase 4-5 | ⬜ |
| `AlertDialog`, `Command` (cmdk) | add Fase 5 | ⬜ |
| `Avatar`, `Skeleton` | existing | ✅ |

### Library tambahan

| Library | Fase | Kegunaan | Alasan |
|---|---|---|---|
| `recharts` | 2, 4, 8 | Chart stock/revenue/allocation/impact | React-native, lightweight, shadcn-compatible |
| `leaflet` + `react-leaflet` | 5, 6, 7 | Peta pickup/rute/delivery | PRD wajib Leaflet+OSM |
| `@tanstack/react-table` | 2, 3, 4, 7 | DataTable sorting/filter | shadcn DataTable pattern |
| `zod` | 1+ | Form validation | shadcn Form pattern |
| `react-hook-form` | 1+ | Form state | shadcn Form pattern |
| `date-fns` | 5, 6, 7 | Date formatting | Scheduling, delivery |
| `vite-plugin-pwa` | 9 | PWA | Vite-native PWA |

### Custom components (folder `resources/js/components/`)

```
components/
  ui/            ← shadcn (existing)
  grade-badge.tsx
  role-badge.tsx
  stat-card.tsx
  stock-table.tsx
  allocation-bar.tsx
  contract-form.tsx
  weighing-form.tsx
  task-card.tsx
  route-map.tsx
  delivery-timeline.tsx
  capacity-input.tsx
  grade-select.tsx
  payment-confirm.tsx
  handover-checklist.tsx
```

---

## Build Order (dependency graph)

```
Phase 1 (Auth+Role) ─┬─> Phase 2 (Admin Shell+Stock)
                     ├─> Phase 6 (Officer)
                     └─> Phase 7 (Mitra)

Phase 2 ─> Phase 3 (Partners+Contracts)
         └> Phase 4 (Allocation Engine) ─> Phase 5 (Route Optimization)

Phase 5 ─> Phase 6 (Officer route tasks)

Phase 4 + Phase 6 ─> Phase 8 (Statistics)

Phase 1-8 done ─> Phase 9 (PWA)
```

**Paralelisasi:**
- Phase 1 selesai → Phase 2 + Phase 7 (Mitra) bisa paralel.
- Phase 2 selesai → Phase 3 + Phase 4 bisa paralel.
- Phase 4 selesai → Phase 5.
- Phase 5 selesai → Phase 6 (Officer butuh route).

---

## Quality Gates (setiap fase)

```
1. npm run build          → must pass
2. php artisan test       → must pass (kalau ada backend dep)
3. git diff --check       → clean
4. impeccable detect.mjs  → clean
5. impeccable critique    → disposition: ship (or P0/P1 resolved)
6. Responsive check       → desktop + mobile screenshot
7. Accessibility check    → keyboard nav, focus, contrast, labels
```

---

## Catatan PRD Compliance

| PRD item | Fase | Status |
|---|---|---|
| FR-01 Form publik pemasok | Done | ✅ |
| FR-02 Sale ID + token/PIN | Done | ✅ |
| FR-03 Officer catat berat 3 grade | 6 | ⬜ |
| FR-04 Officer catat pembayaran | 6 | ⬜ |
| FR-05 Mitra min/ideal/max + frekuensi | 1+3 | ⬜ |
| FR-06 Stok+alokasi per grade | 2+4 | ⬜ |
| FR-07 Allocation engine | 4 | ⬜ |
| FR-08 Smart Route (VRP+OSRM) | 5 | ⬜ |
| FR-09 Dashboard statistik | 8 | ⬜ |
| PWA | 9 | ⬜ |
| SDG 11 framing | Landing done | ✅ |
| Bilingual ID/EN | Open | ⬜ |
