'use client';
import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/components/ui/core';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/dialog-tabs';
import { PageHeader, LoadingState, StatCard } from '@/components/shared';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, ShoppingCart, Receipt, Package } from 'lucide-react';

export default function ReportsPage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [totals, setTotals] = useState({ sales: 0, orders: 0, expenses: 0, avgOrder: 0 });

  const load = async () => {
    if (!user?.branch_id) return;
    setLoading(true);

    // Get payments for the period
    const { data: payments } = await supabase.from('payments').select('amount, method, created_at')
      .eq('branch_id', user.branch_id).eq('status', 'paid')
      .gte('created_at', dateFrom + 'T00:00:00').lte('created_at', dateTo + 'T23:59:59');

    // Get orders with items
    const { data: orderItems } = await supabase.from('order_items').select('name, quantity, total_price, order_id, orders!inner(branch_id, created_at, status)')
      .eq('orders.branch_id', user.branch_id)
      .gte('orders.created_at', dateFrom + 'T00:00:00').lte('orders.created_at', dateTo + 'T23:59:59')
      .in('orders.status', ['paid', 'closed', 'served', 'billed']);

    // Get expenses
    const { data: expenses } = await supabase.from('expenses').select('amount')
      .eq('branch_id', user.branch_id)
      .gte('expense_date', dateFrom).lte('expense_date', dateTo);

    const allPayments = payments || [];
    const totalSales = allPayments.reduce((s, p) => s + Number(p.amount), 0);
    const totalExpenses = (expenses || []).reduce((s, e) => s + Number(e.amount), 0);
    const orderCount = new Set(allPayments.map(p => p.created_at?.split('T')[0])).size || 1;

    setTotals({
      sales: totalSales, orders: allPayments.length,
      expenses: totalExpenses, avgOrder: allPayments.length > 0 ? totalSales / allPayments.length : 0,
    });

    // Daily sales trend
    const dailyMap = new Map<string, number>();
    allPayments.forEach(p => {
      const day = p.created_at.split('T')[0];
      dailyMap.set(day, (dailyMap.get(day) || 0) + Number(p.amount));
    });
    setSalesData(Array.from(dailyMap.entries()).sort().map(([date, amount]) => ({
      date: new Date(date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }), amount,
    })));

    // Top items
    const itemMap = new Map<string, { name: string; qty: number; revenue: number }>();
    (orderItems || []).forEach((oi: any) => {
      const existing = itemMap.get(oi.name) || { name: oi.name, qty: 0, revenue: 0 };
      existing.qty += Number(oi.quantity);
      existing.revenue += Number(oi.total_price);
      itemMap.set(oi.name, existing);
    });
    setTopItems(Array.from(itemMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10));

    setLoading(false);
  };

  useEffect(() => { load(); }, [user, dateFrom, dateTo]);

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Reports" description="Sales, expenses, and operational metrics" />

      {/* Date filter */}
      <div className="flex items-end gap-4 mb-6">
        <div><Label className="text-xs">From</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="mt-1" /></div>
        <div><Label className="text-xs">To</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="mt-1" /></div>
        <Button variant="outline" onClick={load}>Apply</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Sales" value={formatCurrency(totals.sales)} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard title="Orders" value={totals.orders} icon={<ShoppingCart className="h-5 w-5" />} />
        <StatCard title="Avg. Order" value={formatCurrency(totals.avgOrder)} />
        <StatCard title="Expenses" value={formatCurrency(totals.expenses)} icon={<Receipt className="h-5 w-5" />} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Sales trend */}
        <Card>
          <CardHeader><CardTitle className="text-base">Sales Trend</CardTitle></CardHeader>
          <CardContent>
            {salesData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesData}>
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Line type="monotone" dataKey="amount" stroke="hsl(24, 70%, 35%)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-sm text-muted-foreground py-8 text-center">No data for this period</p>}
          </CardContent>
        </Card>

        {/* Top items */}
        <Card>
          <CardHeader><CardTitle className="text-base">Top Selling Items</CardTitle></CardHeader>
          <CardContent>
            {topItems.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topItems} layout="vertical">
                    <XAxis type="number" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" fontSize={11} width={120} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="revenue" fill="hsl(24, 70%, 35%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-sm text-muted-foreground py-8 text-center">No data for this period</p>}
          </CardContent>
        </Card>
      </div>

      {/* Profit summary */}
      <Card>
        <CardHeader><CardTitle className="text-base">Profit Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-8 text-center">
            <div><p className="text-sm text-muted-foreground">Revenue</p><p className="text-xl font-bold text-success">{formatCurrency(totals.sales)}</p></div>
            <div><p className="text-sm text-muted-foreground">Expenses</p><p className="text-xl font-bold text-destructive">{formatCurrency(totals.expenses)}</p></div>
            <div><p className="text-sm text-muted-foreground">Gross Profit</p>
              <p className={cn('text-xl font-bold', totals.sales - totals.expenses >= 0 ? 'text-success' : 'text-destructive')}>
                {formatCurrency(totals.sales - totals.expenses)}
              </p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
