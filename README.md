# Karibu Café - Operations Platform

A production-ready Progressive Web App for café operations including POS, kitchen display, inventory, attendance, expenses, reconciliation, and reporting.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Recharts
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, RLS)
- **Hosting**: Vercel + Supabase

## Test Accounts

| Role    | Email                      | Password     |
|---------|----------------------------|--------------|
| Admin   | admin@karibucafe.co.ke     | karibu2024!  |
| Manager | manager@karibucafe.co.ke   | karibu2024!  |
| Waiter  | waiter@karibucafe.co.ke    | karibu2024!  |
| Kitchen | kitchen@karibucafe.co.ke   | karibu2024!  |
| Staff   | staff@karibucafe.co.ke     | karibu2024!  |

## Features

### Waiter POS (tablet-first)
- Floor/table view with live status
- Category-filtered menu grid
- Modifier selection with price adjustments
- Free-text item notes
- Add items to existing open orders
- Send to kitchen / request bill

### Kitchen Display System
- Realtime order updates via Supabase Realtime
- Item-level preparation status tracking
- Elapsed time with color-coded urgency (green → yellow → red)
- Modifiers and notes displayed prominently
- Touch-friendly status transitions
- Dark mode optimized

### Manager Dashboard
- Today's KPIs: sales, orders, average order, table occupancy
- Payment method breakdown (pie chart)
- Revenue vs expenses (bar chart)
- Low stock alerts

### Menu Management
- Categories CRUD with sort ordering
- Items CRUD with price, availability toggle, tax flag
- Branch-wide and item-specific modifiers

### Inventory & Stock
- 5 inventory categories: raw ingredients, finished goods, consumables, cutlery/small assets, packaged retail
- Stock adjustment with ledger (manual, waste/spoilage, stock count, purchase receipt)
- Low stock filtering and alerts
- Inventory value calculations

### Suppliers
- Full CRUD with contact details
- Linked to inventory items and purchase orders

### Fixed Assets
- Separate from inventory (not mixed)
- Status tracking (active, maintenance, retired, disposed)
- Condition ratings, serial numbers, purchase values

### Expenses
- Category-based expense recording
- Payment method tracking
- Date-filtered history

### Cash Reconciliation
- Expected cash from paid cash orders
- Actual cash counted entry
- Discrepancy calculation
- Session close with notes and audit trail

### Reports
- Date-range filtered
- Sales trend line chart
- Top selling items bar chart
- Revenue, orders, average order, expenses KPIs
- Gross profit summary

### Attendance
- Staff check-in / check-out
- Automatic hours calculation
- History view

### User Management
- Role assignment (admin, manager, waiter, kitchen, staff)
- Branch-scoped access

### Audit Log
- Tracks critical system changes
- User, action, entity, timestamp

### Public QR Menu
- No authentication required
- Browse by category, search
- Item detail overlay
- Warm café-themed design

## Database Schema

24 tables with full RLS:

**Core**: branches, profiles, user_roles, tax_settings
**Operations**: restaurant_tables, menu_categories, menu_items, menu_item_modifiers
**Orders**: orders, order_items, order_item_modifiers, order_status_history, payments
**Supply Chain**: suppliers, purchase_orders, purchase_order_items, inventory_items, inventory_transactions
**Assets**: fixed_assets
**Finance**: expense_categories, expenses, reconciliation_sessions
**HR**: attendance_logs
**System**: audit_logs

### Key DB Features
- All tables have RLS enabled with role-based policies
- `updated_at` auto-triggers on all relevant tables
- Auto-profile creation on auth signup
- Order total auto-recalculation trigger
- Receipt number auto-generation
- Attendance hours auto-calculation
- Realtime enabled on orders, order_items, restaurant_tables

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/          # Login page
│   ├── dashboard/
│   │   ├── admin/             # Admin (redirects to manager)
│   │   ├── kitchen/           # KDS - realtime order display
│   │   ├── manager/           # Manager dashboard + all management pages
│   │   │   ├── assets/        # Fixed assets
│   │   │   ├── audit/         # Audit log viewer
│   │   │   ├── expenses/      # Expense tracking
│   │   │   ├── inventory/     # Stock management
│   │   │   ├── menu/          # Menu CRUD
│   │   │   ├── reconciliation/# Cash reconciliation
│   │   │   ├── reports/       # Sales & financial reports
│   │   │   ├── suppliers/     # Supplier management
│   │   │   ├── tables/        # Table management
│   │   │   └── users/         # User & role management
│   │   ├── staff/             # Attendance check-in/out
│   │   └── waiter/            # POS ordering interface
│   └── menu/[branchId]/[tableToken]/  # Public QR menu
├── components/
│   ├── shared/                # Dashboard shell, StatCard, EmptyState, etc.
│   └── ui/                    # Button, Card, Dialog, Tabs, Select, Toast
├── hooks/                     # useSupabase, useUser
├── lib/
│   ├── auth/                  # Session helpers, role checks
│   ├── supabase/              # Client, server, middleware
│   └── utils/                 # cn, formatCurrency, formatDate, getStatusColor
└── types/                     # Full TypeScript types for all tables
```

## Deployment

### 1. Environment Variables

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://tqcjstbnfnaatlkcovfs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Local Development
```bash
npm install
npm run dev
```

### 3. Deploy to Vercel

**Option A: Vercel CLI**
```bash
npx vercel --yes
# Set environment variables in Vercel dashboard
```

**Option B: Git Integration**
1. Push to GitHub
2. Import in Vercel dashboard
3. Set environment variables
4. Deploy

### Environment Variables for Vercel
- `NEXT_PUBLIC_SUPABASE_URL` → `https://tqcjstbnfnaatlkcovfs.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → (the anon key from Supabase)

## Architecture Decisions

1. **Supabase-first**: All business logic in PostgreSQL (RLS, triggers, functions) rather than a custom backend
2. **Branch-ready schema**: All operational tables have `branch_id` even for single-location MVP
3. **Price snapshots**: Order items capture price at time of sale, not referencing current menu price
4. **Separate fixed assets**: Not mixed with inventory — different lifecycle and tracking needs
5. **Cutlery as count-tracked**: Not auto-consumed on sale — manually adjusted
6. **Realtime for KDS**: Supabase Realtime subscriptions on orders and order_items
7. **RLS everywhere**: No frontend-only security — all access enforced at database level
8. **Configurable tax**: Tax rates in `tax_settings` table, not hardcoded
9. **Audit-friendly**: Status history tables, created_by/updated_by fields, audit_logs table
