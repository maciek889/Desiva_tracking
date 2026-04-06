# Dashboard Redesign — Design Spec

**Date:** 2026-04-06
**Scope:** Redesign the Statistics (Statystyki) dashboard in the Desiva order-tracking app into a practical management view for a metal furniture manufacturing company.

---

## 1. Schema Change

Add one nullable field to the `Order` model:

```prisma
dueDate DateTime?
```

- Nullable so existing orders are unaffected.
- "Overdue" is defined as: `dueDate < now() AND status != 'completed'`.
- The order creation form and edit modal must include a date picker for this field.
- No other schema changes. No new indexes needed for current data volumes.

---

## 2. API Contract

### Request

```
GET /api/stats?from=2026-03-01&to=2026-03-31&search=kowalski
```

| Param    | Type   | Default       | Description                                          |
|----------|--------|---------------|------------------------------------------------------|
| `from`   | string | 30 days ago   | ISO date string, filters on `order.createdAt >= from` |
| `to`     | string | now           | ISO date string, filters on `order.createdAt <= to`   |
| `search` | string | empty         | Filters by order name, client name, or order ID (case-insensitive) |

All params optional. Auth required: Admin only.

### Response

```json
{
  "period": { "from": "2026-03-01", "to": "2026-03-31" },

  "kpis": {
    "activeOrders": 12,
    "completedOrders": 8,
    "overdueOrders": 3,
    "totalRevenue": 45000,
    "totalLaborCost": 12400,
    "laborMargin": 32600,
    "laborMarginPercent": 72.4,
    "avgCompletionDays": 6.2
  },

  "stageBreakdown": [
    {
      "stageId": "s6",
      "name": "Spawanie",
      "type": "factory",
      "orderCount": 4,
      "totalTime": 320,
      "totalCost": 1280
    }
  ],

  "workerUtilization": [
    {
      "userId": "u3",
      "login": "Marta",
      "totalTime": 480,
      "totalCost": 2800,
      "orderCount": 6,
      "hourlyRate": 35
    }
  ],

  "topCategories": [
    {
      "categoryId": "c1",
      "name": "Lazienka",
      "orderCount": 5,
      "revenue": 18000
    }
  ],

  "topClients": [
    {
      "client": "Jan Kowalski",
      "orderCount": 3,
      "revenue": 7200
    }
  ],

  "overdueOrders": [
    {
      "id": "000000000001",
      "name": "Regal lazienkowy",
      "client": "Jan Kowalski",
      "dueDate": "2026-03-15",
      "stageName": "Spawanie",
      "daysOverdue": 22
    }
  ],

  "trends": [
    { "date": "2026-03-01", "created": 2, "completed": 1, "revenue": 4300 },
    { "date": "2026-03-02", "created": 0, "completed": 0, "revenue": 0 }
  ]
}
```

**Notes:**
- `stageBreakdown` — `orderCount` is current queue size (unscoped by date); `totalTime`/`totalCost` are scoped to time entries within the date range.
- `workerUtilization` — scoped to time entries within the date range.
- `topCategories` — aggregated from orders matching the date/search filter.
- `topClients` — top 10 by revenue, aggregated from filtered orders. Limited in the query to avoid loading all clients.
- `overdueOrders` — always unscoped by date range (overdue is overdue regardless of creation date).
- `trends` — daily buckets within the date range for the chart.
- All monetary values in PLN as raw numbers (formatted on client).
- All time values in minutes.

---

## 3. Dashboard Layout

### 3.1 Control Bar (sticky below header)

- **Left:** Search input, debounced 300ms. Filters by order name, client, or ID.
- **Center:** Preset buttons — Dzis / 7 dni / 30 dni / Ten miesiac. Active preset gets visual highlight.
- **Right:** Custom date range — two date inputs (from/to). Picking custom dates clears the active preset; selecting a preset clears custom dates.

### 3.2 KPI Cards Row (4 cards, equal width)

| Card               | Value                              | Accent  |
|--------------------|------------------------------------|---------|
| Aktywne zamowienia | count                              | neutral |
| Zrealizowane       | count in period                    | green   |
| Przeterminowane    | count, clickable (scrolls to list) | red     |
| Marza robocizny    | laborMarginPercent headline, laborMargin PLN below | neutral |

### 3.3 Secondary KPI Row (3 cards)

| Card                | Value                  |
|---------------------|------------------------|
| Przychod            | totalRevenue in PLN    |
| Koszt robocizny     | totalLaborCost in PLN  |
| Sr. czas realizacji | avgCompletionDays, days|

### 3.4 Trends Chart (full width)

- Recharts `AreaChart` with two series: orders created (line) and orders completed (filled area).
- X-axis: dates in range. Y-axis: count.
- Tooltip showing date, counts, and revenue.

### 3.5 Two-Column Section: Stages + Workers

- **Left — Etapy produkcji:** Horizontal bar chart showing order count per stage. Highlights stages with highest queue (bottleneck detection). Color-coded by type (office vs factory).
- **Right — Wykorzystanie pracownikow:** Table with columns: worker name, total hours, total cost, order count. Sorted by hours descending.

### 3.6 Two-Column Section: Categories + Clients

- **Left — Top kategorie:** Ranked list or small bar chart showing orderCount + revenue per category.
- **Right — Top klienci:** Top 10 by revenue. Fixed height matching the left column, scrollable if content overflows. Limited to 10 in the API query to avoid full client scan.

### 3.7 Overdue Orders Table (full width, conditional)

- Only rendered if `overdueOrders.length > 0`.
- Columns: ID, Name, Client, Stage, Due Date, Days Overdue.
- Sorted by daysOverdue descending (most urgent first).
- Red-tinted row backgrounds.

---

## 4. Data Layer Implementation

All aggregation is server-side via Prisma queries. No full-table loads.

### 4.1 KPIs

- `prisma.order.count()` with `where` clauses for active, completed, and overdue counts.
- `prisma.order.aggregate()` for `_sum` on `price` (revenue) and `totalCost` (labor cost).
- Margin = revenue - labor cost, computed server-side.
- Avg completion days: query completed orders in range, compute `completedAt - createdAt` average server-side.

### 4.2 Stage Breakdown

- **`orderCount`** (queue size): `prisma.order.groupBy({ by: ['stageId'] })` where `status = 'active'` — always unscoped by date, shows the current bottleneck state.
- **`totalTime` / `totalCost`**: `prisma.timeEntry.groupBy({ by: ['stageId'] })` with `_sum` on duration and cost, scoped to time entries whose associated order was created in the date range.
- Stage names resolved via a separate `prisma.stage.findMany()`.

### 4.3 Worker Utilization

- `prisma.timeEntry.groupBy({ by: ['userId'] })` with `_sum` on duration and cost.
- Joined with user data for names and hourly rates.

### 4.4 Top Categories

- `prisma.order.groupBy({ by: ['categoryId'] })` with `_count` and `_sum` on price.
- Category names resolved via `prisma.category.findMany()`.
- Sorted by revenue descending, no limit (categories are few).

### 4.5 Top Clients

- `prisma.order.groupBy({ by: ['client'] })` with `_count` and `_sum` on price.
- Sorted by revenue descending, sliced to top 10 server-side.

### 4.6 Overdue Orders

- `prisma.order.findMany()` where `dueDate < now AND status != 'completed'`.
- Select only needed fields: id, name, client, dueDate, stage (include name).
- `daysOverdue` computed server-side.

### 4.7 Trends

- `prisma.order.findMany()` selecting only `createdAt`, `completedAt`, `price` for orders in range.
- Grouped into daily buckets in JS (Prisma/SQLite cannot do date truncation in groupBy).
- Lightweight — narrow field selection, no relations.

---

## 5. Styling

Uses the existing design system:
- `Card` component from `@/components/ui`.
- CSS variables from `globals.css` (`--bg-card`, `--border`, `--accent`, `--green`, `--red`, etc.).
- DM Sans font family.
- Same border/shadow/radius patterns as the rest of the app.
- No new design tokens needed.
- Recharts charts styled to match the app's color palette.

---

## 6. Files Changed

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `dueDate DateTime?` to Order model |
| `prisma/seed.ts` | Add sample dueDate values to demo orders |
| `src/app/api/stats/route.ts` | Full rewrite: accept query params, server-side aggregation |
| `src/app/(dashboard)/dashboard/page.tsx` | Full rewrite: new layout with control bar, KPI cards, charts, tables |
| `src/app/api/orders/route.ts` | Accept dueDate in POST (order creation) |
| `src/app/api/orders/[id]/route.ts` | Accept dueDate in PUT (order edit) |
| `src/components/OrderDetailModal.tsx` | Add dueDate field to creation/edit forms |

No new files unless a small helper component is cleaner than inlining (e.g., a `StatCard` component if repeated enough).
