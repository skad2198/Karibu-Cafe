'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/components/ui/core';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/dialog-tabs';
import { PageHeader, LoadingState, StatCard, EmptyState } from '@/components/shared';
import { useToast } from '@/components/ui/toast';
import { useLang } from '@/lib/i18n/context';
import { formatCDF, formatDate, formatDateTime, cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, ShoppingCart, Receipt, Clock, Download, Users } from 'lucide-react';
import type { AttendanceLog } from '@/types';

interface AttendanceLogWithProfile extends AttendanceLog {
  profile?: { full_name: string; email: string };
}

export default function ReportsPage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const { t } = useLang();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(true);

  // Shared date range
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  // Financial data
  const [salesData, setSalesData] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [totals, setTotals] = useState({ sales: 0, orders: 0, expenses: 0, avgOrder: 0 });

  // Attendance data
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLogWithProfile[]>([]);
  const [attendanceTotals, setAttendanceTotals] = useState({ totalHours: 0, presentDays: 0, staffCount: 0 });

  const loadFinancial = useCallback(async () => {
    if (!user?.branch_id) return;
    setLoading(true);

    const { data: payments } = await supabase.from('payments').select('amount, method, created_at')
      .eq('branch_id', user.branch_id).eq('status', 'paid')
      .gte('created_at', dateFrom + 'T00:00:00').lte('created_at', dateTo + 'T23:59:59');

    const { data: orderItems } = await supabase
      .from('order_items')
      .select('name, quantity, total_price, order_id, orders!inner(branch_id, created_at, status)')
      .eq('orders.branch_id', user.branch_id)
      .gte('orders.created_at', dateFrom + 'T00:00:00')
      .lte('orders.created_at', dateTo + 'T23:59:59')
      .in('orders.status', ['paid', 'closed', 'served', 'billed']);

    const { data: expenses } = await supabase.from('expenses').select('amount')
      .eq('branch_id', user.branch_id)
      .gte('expense_date', dateFrom).lte('expense_date', dateTo);

    const allPayments = payments || [];
    const totalSales = allPayments.reduce((s, p) => s + Number(p.amount), 0);
    const totalExpenses = (expenses || []).reduce((s, e) => s + Number(e.amount), 0);

    setTotals({
      sales: totalSales, orders: allPayments.length,
      expenses: totalExpenses, avgOrder: allPayments.length > 0 ? totalSales / allPayments.length : 0,
    });

    const dailyMap = new Map<string, number>();
    allPayments.forEach(p => {
      const day = p.created_at.split('T')[0];
      dailyMap.set(day, (dailyMap.get(day) || 0) + Number(p.amount));
    });
    setSalesData(Array.from(dailyMap.entries()).sort().map(([date, amount]) => ({
      date: new Date(date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }), amount,
    })));

    const itemMap = new Map<string, { name: string; qty: number; revenue: number }>();
    (orderItems || []).forEach((oi: any) => {
      const existing = itemMap.get(oi.name) || { name: oi.name, qty: 0, revenue: 0 };
      existing.qty += Number(oi.quantity);
      existing.revenue += Number(oi.total_price);
      itemMap.set(oi.name, existing);
    });
    setTopItems(Array.from(itemMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10));

    setLoading(false);
  }, [supabase, user, dateFrom, dateTo]);

  const loadAttendance = useCallback(async () => {
    if (!user?.branch_id) return;
    setAttendanceLoading(true);

    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*, profile:profiles!attendance_logs_user_id_fkey(full_name, email)')
      .eq('branch_id', user.branch_id)
      .gte('check_in', dateFrom + 'T00:00:00')
      .lte('check_in', dateTo + 'T23:59:59')
      .order('check_in', { ascending: false });

    if (error) {
      toast({ title: 'Failed to load attendance', description: error.message, variant: 'error' });
    } else {
      const logs = (data || []) as AttendanceLogWithProfile[];
      setAttendanceLogs(logs);

      const totalHours = logs.reduce((s, l) => s + Number(l.total_hours || 0), 0);
      const uniqueDays = new Set(logs.map(l => l.check_in.split('T')[0])).size;
      const uniqueStaff = new Set(logs.map(l => l.user_id)).size;
      setAttendanceTotals({ totalHours, presentDays: uniqueDays, staffCount: uniqueStaff });
    }

    setAttendanceLoading(false);
  }, [supabase, user, dateFrom, dateTo]);

  useEffect(() => { loadFinancial(); }, [loadFinancial]);
  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  // CSV download helper
  const downloadCSV = (rows: string[][], filename: string) => {
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAttendanceCSV = async (period: 'weekly' | 'monthly') => {
    if (!user?.branch_id) return;

    const now = new Date();
    let from: string;
    let to: string = now.toISOString().split('T')[0];

    if (period === 'weekly') {
      const d = new Date(now); d.setDate(d.getDate() - 6);
      from = d.toISOString().split('T')[0];
    } else {
      from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }

    const { data } = await supabase
      .from('attendance_logs')
      .select('*, profile:profiles!attendance_logs_user_id_fkey(full_name, email)')
      .eq('branch_id', user.branch_id)
      .gte('check_in', from + 'T00:00:00')
      .lte('check_in', to + 'T23:59:59')
      .order('check_in', { ascending: false });

    const logs = (data || []) as AttendanceLogWithProfile[];
    const headers = [t.reports.staffName, t.reports.checkIn, t.reports.checkOut, t.reports.hours, 'Email'];
    const rows = logs.map(l => [
      l.profile?.full_name || '',
      formatDateTime(l.check_in),
      l.check_out ? formatDateTime(l.check_out) : t.reports.activeNow,
      l.total_hours != null ? Number(l.total_hours).toFixed(2) : '',
      l.profile?.email || '',
    ]);

    downloadCSV([headers, ...rows], `attendance-${period}-${from}-to-${to}.csv`);
    toast({ title: 'Report downloaded', variant: 'success' });
  };

  if (loading && attendanceLoading) return <LoadingState />;

  return (
    <div>
      <PageHeader title={t.reports.title} description={t.reports.description} />

      {/* Date filter */}
      <div className="flex items-end gap-4 mb-6 flex-wrap">
        <div>
          <Label className="text-xs">{t.reports.from}</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">{t.reports.to}</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="mt-1" />
        </div>
        <Button variant="outline" onClick={() => { loadFinancial(); loadAttendance(); }}>
          {t.reports.apply}
        </Button>
      </div>

      <Tabs defaultValue="financial">
        <TabsList className="mb-6">
          <TabsTrigger value="financial">{t.reports.financial}</TabsTrigger>
          <TabsTrigger value="attendance">{t.reports.attendanceTab}</TabsTrigger>
        </TabsList>

        {/* ── Financial Tab ── */}
        <TabsContent value="financial">
          {loading ? <LoadingState /> : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard title={t.reports.totalSales} value={formatCDF(totals.sales)} icon={<TrendingUp className="h-5 w-5" />} />
                <StatCard title={t.reports.ordersCount} value={totals.orders} icon={<ShoppingCart className="h-5 w-5" />} />
                <StatCard title={t.reports.avgOrder} value={formatCDF(totals.avgOrder)} />
                <StatCard title={t.common.expenses} value={formatCDF(totals.expenses)} icon={<Receipt className="h-5 w-5" />} />
              </div>

              <div className="grid lg:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">{t.reports.salesTrend}</CardTitle></CardHeader>
                  <CardContent>
                    {salesData.length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={salesData}>
                            <XAxis dataKey="date" fontSize={11} />
                            <YAxis fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                            <Tooltip formatter={(v: number) => formatCDF(v)} />
                            <Line type="monotone" dataKey="amount" stroke="hsl(24, 70%, 35%)" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : <p className="text-sm text-muted-foreground py-8 text-center">{t.reports.noData}</p>}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">{t.reports.topItems}</CardTitle></CardHeader>
                  <CardContent>
                    {topItems.length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topItems} layout="vertical">
                            <XAxis type="number" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                            <YAxis type="category" dataKey="name" fontSize={11} width={120} />
                            <Tooltip formatter={(v: number) => formatCDF(v)} />
                            <Bar dataKey="revenue" fill="hsl(24, 70%, 35%)" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : <p className="text-sm text-muted-foreground py-8 text-center">{t.reports.noData}</p>}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base">{t.reports.profitSummary}</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-8 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">{t.reports.revenue}</p>
                      <p className="text-xl font-bold text-success">{formatCDF(totals.sales)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t.common.expenses}</p>
                      <p className="text-xl font-bold text-destructive">{formatCDF(totals.expenses)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t.reports.grossProfit}</p>
                      <p className={cn('text-xl font-bold', totals.sales - totals.expenses >= 0 ? 'text-success' : 'text-destructive')}>
                        {formatCDF(totals.sales - totals.expenses)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── Attendance Tab ── */}
        <TabsContent value="attendance">
          {attendanceLoading ? <LoadingState /> : (
            <>
              {/* Summary stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <StatCard
                  title={t.reports.totalHours}
                  value={`${attendanceTotals.totalHours.toFixed(1)}h`}
                  icon={<Clock className="h-5 w-5" />}
                />
                <StatCard
                  title={t.reports.presentDays}
                  value={attendanceTotals.presentDays}
                  icon={<Receipt className="h-5 w-5" />}
                />
                <StatCard
                  title={t.nav.users}
                  value={attendanceTotals.staffCount}
                  icon={<Users className="h-5 w-5" />}
                />
              </div>

              {/* Download buttons */}
              <div className="flex gap-3 mb-6 flex-wrap">
                <Button variant="outline" onClick={() => downloadAttendanceCSV('weekly')}>
                  <Download className="h-4 w-4 mr-2" />
                  {t.reports.downloadWeekly}
                </Button>
                <Button variant="outline" onClick={() => downloadAttendanceCSV('monthly')}>
                  <Download className="h-4 w-4 mr-2" />
                  {t.reports.downloadMonthly}
                </Button>
              </div>

              {/* Attendance table */}
              {attendanceLogs.length === 0 ? (
                <EmptyState
                  icon={<Clock className="h-8 w-8 text-muted-foreground" />}
                  title={t.reports.noAttendance}
                  description={t.reports.noAttendanceDesc}
                />
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">{t.reports.staffName}</th>
                        <th className="text-left p-3 font-medium">{t.common.date}</th>
                        <th className="text-left p-3 font-medium">{t.reports.checkIn}</th>
                        <th className="text-left p-3 font-medium">{t.reports.checkOut}</th>
                        <th className="text-right p-3 font-medium">{t.reports.hours}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {attendanceLogs.map(l => (
                        <tr key={l.id} className="hover:bg-muted/30">
                          <td className="p-3 font-medium">{l.profile?.full_name || '—'}</td>
                          <td className="p-3 text-muted-foreground">{formatDate(l.check_in)}</td>
                          <td className="p-3">{formatDateTime(l.check_in)}</td>
                          <td className="p-3">
                            {l.check_out
                              ? formatDateTime(l.check_out)
                              : <span className="text-success font-medium">{t.reports.activeNow}</span>
                            }
                          </td>
                          <td className="p-3 text-right font-mono">
                            {l.total_hours != null ? `${Number(l.total_hours).toFixed(1)}h` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
