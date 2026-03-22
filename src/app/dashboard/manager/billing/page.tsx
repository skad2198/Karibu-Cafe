'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/core';
import { LoadingState, EmptyState, PageHeader } from '@/components/shared';
import { useToast } from '@/components/ui/toast';
import { CreditCard, Banknote, Smartphone, Check, Receipt } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useLang } from '@/lib/i18n/context';
import type { Order, OrderItem } from '@/types';

type PaymentMethod = 'cash' | 'card' | 'mpesa';

interface BilledOrder extends Order {
  items: (OrderItem & { order_item_modifiers?: { name: string }[] })[];
  table?: { table_number: string };
}

export default function BillingPage() {
  const supabase = useSupabase();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const { t } = useLang();

  const [orders, setOrders] = useState<BilledOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<Record<string, PaymentMethod>>({});

  const loadBilledOrders = useCallback(async () => {
    if (!user?.branch_id) return;
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        table:restaurant_tables(table_number),
        items:order_items(*, order_item_modifiers(*))
      `)
      .eq('branch_id', user.branch_id)
      .eq('status', 'billed')
      .order('updated_at', { ascending: true });

    if (error) {
      toast({ title: 'Failed to load billed orders', description: error.message, variant: 'error' });
    } else {
      setOrders((data || []).map((o: any) => ({
        ...o,
        table: Array.isArray(o.table) ? o.table[0] : o.table,
        items: (o.items || []).map((i: any) => ({ ...i, order_item_modifiers: i.order_item_modifiers || [] })),
      })));
    }
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    loadBilledOrders();
  }, [loadBilledOrders]);

  // Realtime: refresh when orders change
  useEffect(() => {
    if (!user?.branch_id) return;
    const channel = supabase.channel('billing-orders')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `branch_id=eq.${user.branch_id}`,
      }, () => loadBilledOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, user, loadBilledOrders]);

  const getOrderTotal = (order: BilledOrder) => {
    const fromItems = order.items.reduce((sum, i) => sum + Number(i.total_price || 0), 0);
    return Number(order.total) > 0 ? Number(order.total) : fromItems;
  };

  const processPayment = async (order: BilledOrder) => {
    if (!user) return;
    const method = selectedMethod[order.id] || 'cash';
    const amount = getOrderTotal(order);

    setProcessing(order.id);
    try {
      // Record payment
      const { error: payErr } = await supabase.from('payments').insert({
        order_id: order.id,
        branch_id: user.branch_id,
        amount,
        method,
        status: 'paid',
        received_by: user.id,
      });
      if (payErr) throw payErr;

      // Mark order as paid
      const { error: orderErr } = await supabase.from('orders')
        .update({
          status: 'paid',
          payment_status: 'paid',
          completed_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('id', order.id);
      if (orderErr) throw orderErr;

      // Log status change
      await supabase.from('order_status_history').insert({
        order_id: order.id,
        from_status: 'billed',
        to_status: 'paid',
        changed_by: user.id,
      });

      // Free up table
      if (order.table_id) {
        await supabase.from('restaurant_tables')
          .update({ status: 'cleaning' })
          .eq('id', order.table_id);
      }

      toast({ title: `Order #${order.order_number} paid via ${method.toUpperCase()}`, variant: 'success' });
    } catch (err: any) {
      console.error(err);
      toast({ title: t.billing.paymentFailed, description: err.message, variant: 'error' });
    } finally {
      setProcessing(null);
    }
  };

  if (userLoading || loading) return <LoadingState />;

  const methodOptions: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { value: 'cash', label: t.cashier.cash, icon: <Banknote className="h-4 w-4" /> },
    { value: 'card', label: t.cashier.card, icon: <CreditCard className="h-4 w-4" /> },
    { value: 'mpesa', label: t.cashier.mpesa, icon: <Smartphone className="h-4 w-4" /> },
  ];

  return (
    <div>
      <PageHeader
        title={t.billing.title}
        description={orders.length > 0 ? `${orders.length} ${t.billing.pendingSuffix}` : t.billing.noBillsDesc}
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-8 w-8 text-muted-foreground" />}
          title={t.billing.noBills}
          description={t.billing.noBillsDesc}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map(order => {
            const total = getOrderTotal(order);
            const method = selectedMethod[order.id] || 'cash';
            const isPaying = processing === order.id;

            return (
              <Card key={order.id} className="border-warning/50 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {order.table?.table_number || 'Table ?'}
                    </CardTitle>
                    <span className="text-sm text-muted-foreground">#{order.order_number}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Order items */}
                  <div className="space-y-1.5 text-sm">
                    {order.items.map(item => (
                      <div key={item.id} className="flex justify-between">
                        <span className="text-muted-foreground">
                          {item.quantity}× {item.name}
                          {item.order_item_modifiers && item.order_item_modifiers.length > 0 && (
                            <span className="text-xs ml-1 opacity-70">
                              ({item.order_item_modifiers.map((m: any) => m.name).join(', ')})
                            </span>
                          )}
                        </span>
                        <span>{formatCurrency(Number(item.total_price))}</span>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="border-t pt-3 flex justify-between font-bold">
                    <span>{t.common.total}</span>
                    <span className="text-lg">{formatCurrency(total)}</span>
                  </div>

                  {/* Payment method */}
                  <div className="flex gap-2">
                    {methodOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setSelectedMethod(prev => ({ ...prev, [order.id]: opt.value }))}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-1.5 rounded-md border py-2 text-sm font-medium transition-colors',
                          method === opt.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'hover:bg-accent'
                        )}
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Collect payment button */}
                  <Button
                    className="w-full"
                    size="touch"
                    onClick={() => processPayment(order)}
                    disabled={isPaying}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {isPaying ? t.billing.processing : `${t.billing.collect} ${formatCurrency(total)}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
