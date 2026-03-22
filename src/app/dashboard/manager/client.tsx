'use client';

import { StatCard, PageHeader, StatusBadge } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/core';
import {
  DollarSign, ShoppingCart, TrendingUp, AlertTriangle,
  CreditCard, Banknote, Smartphone, UtensilsCrossed,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Props {
  todaySales: number;
  todayExpenses: number;
  todayOrders: number;
  activeOrders: number;
  avgOrderValue: number;
  lowStockCount: number;
  occupiedTables: number;
  totalTables: number;
  paymentBreakdown: { cash: number; card: number; mpesa: number };
  lowStockItems: Array<{ id: string; name: string; current_quantity: number; reorder_level: number }>;
}

const COLORS = ['hsl(24, 70%, 35%)', 'hsl(210, 70%, 50%)', 'hsl(142, 71%, 35%)'];

export function ManagerDashboardClient({
  todaySales, todayExpenses, todayOrders, activeOrders,
  avgOrderValue, lowStockCount, occupiedTables, totalTables,
  paymentBreakdown, lowStockItems,
}: Props) {
  const pieData = [
    { name: 'Cash', value: paymentBreakdown.cash },
    { name: 'Card', value: paymentBreakdown.card },
    { name: 'M-Pesa', value: paymentBreakdown.mpesa },
  ].filter(d => d.value > 0);

  return (
    <div>
      <PageHeader title="Dashboard" description="Today's overview" />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(todaySales)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="Orders"
          value={todayOrders}
          description={`${activeOrders} active`}
          icon={<ShoppingCart className="h-5 w-5" />}
        />
        <StatCard
          title="Avg. Order"
          value={formatCurrency(avgOrderValue)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Tables"
          value={`${occupiedTables} / ${totalTables}`}
          description="occupied"
          icon={<UtensilsCrossed className="h-5 w-5" />}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Payment breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="flex items-center gap-6">
                <div className="w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-primary" />
                    <span className="text-sm">Cash: {formatCurrency(paymentBreakdown.cash)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-info" />
                    <span className="text-sm">Card: {formatCurrency(paymentBreakdown.card)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-success" />
                    <span className="text-sm">M-Pesa: {formatCurrency(paymentBreakdown.mpesa)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No payments recorded today</p>
            )}
          </CardContent>
        </Card>

        {/* Revenue vs Expenses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Sales', amount: todaySales },
                  { name: 'Expenses', amount: todayExpenses },
                  { name: 'Profit', amount: todaySales - todayExpenses },
                ]}>
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="amount" fill="hsl(24, 70%, 35%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low stock alerts */}
      {lowStockCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Low Stock Alerts ({lowStockCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm font-medium">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-destructive font-medium">
                      {Number(item.current_quantity).toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">/ {Number(item.reorder_level).toFixed(1)} min</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
