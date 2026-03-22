import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import { ManagerDashboardClient } from './client';

export default async function ManagerDashboardPage() {
  const user = await requireRole(['admin', 'manager']);
  const supabase = await createServerSupabaseClient();
  const branchId = user.branch_id;

  const today = new Date().toISOString().split('T')[0];

  // Fetch dashboard data
  const [ordersRes, paymentsRes, expensesRes, tablesRes, lowStockRes] = await Promise.all([
    supabase.from('orders').select('id, status, total, payment_status, created_at')
      .eq('branch_id', branchId)
      .gte('created_at', today + 'T00:00:00')
      .order('created_at', { ascending: false }),
    supabase.from('payments').select('id, amount, method, created_at')
      .eq('branch_id', branchId)
      .gte('created_at', today + 'T00:00:00'),
    supabase.from('expenses').select('id, amount, created_at')
      .eq('branch_id', branchId)
      .gte('created_at', today + 'T00:00:00'),
    supabase.from('restaurant_tables').select('id, table_number, status')
      .eq('branch_id', branchId)
      .eq('is_active', true),
    supabase.from('inventory_items').select('id, name, current_quantity, reorder_level')
      .eq('branch_id', branchId)
      .eq('is_active', true),
  ]);

  const orders = ordersRes.data || [];
  const payments = paymentsRes.data || [];
  const expenses = expensesRes.data || [];
  const tables = tablesRes.data || [];
  const inventoryItems = lowStockRes.data || [];

  const todaySales = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const todayExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const todayOrders = orders.length;
  const activeOrders = orders.filter(o => !['closed', 'cancelled', 'voided', 'paid'].includes(o.status)).length;
  const avgOrderValue = todayOrders > 0 ? todaySales / todayOrders : 0;
  const lowStockItems = inventoryItems.filter(i => Number(i.current_quantity) <= Number(i.reorder_level));
  const occupiedTables = tables.filter(t => t.status !== 'available').length;

  const paymentBreakdown = {
    cash: payments.filter(p => p.method === 'cash').reduce((s, p) => s + Number(p.amount), 0),
    card: payments.filter(p => p.method === 'card').reduce((s, p) => s + Number(p.amount), 0),
    mpesa: payments.filter(p => p.method === 'mpesa').reduce((s, p) => s + Number(p.amount), 0),
  };

  return (
    <ManagerDashboardClient
      todaySales={todaySales}
      todayExpenses={todayExpenses}
      todayOrders={todayOrders}
      activeOrders={activeOrders}
      avgOrderValue={avgOrderValue}
      lowStockCount={lowStockItems.length}
      occupiedTables={occupiedTables}
      totalTables={tables.length}
      paymentBreakdown={paymentBreakdown}
      lowStockItems={lowStockItems}
    />
  );
}
