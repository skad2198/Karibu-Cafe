'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/core';
import { LoadingState, EmptyState, StatusBadge } from '@/components/shared';
import { useToast } from '@/components/ui/toast';
import { ChefHat, Clock, Check, Flame, Bell } from 'lucide-react';
import { cn, elapsedTimeString, formatTime } from '@/lib/utils';
import type { Order, OrderItem, OrderItemModifier } from '@/types';

interface KitchenOrder extends Order {
  items: (OrderItem & { modifiers?: OrderItemModifier[] })[];
  table?: { table_number: string };
}

export default function KitchenDisplayPage() {
  const supabase = useSupabase();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [now, setNow] = useState(Date.now());

  // Tick every 30s to update elapsed time
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Load active orders
  const loadOrders = async () => {
    if (!user?.branch_id) return;
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        table:restaurant_tables(table_number),
        items:order_items(*, modifiers:order_item_modifiers(*))
      `)
      .eq('branch_id', user.branch_id)
      .in('status', ['submitted', 'accepted_by_kitchen', 'preparing', 'ready'])
      .order('submitted_at', { ascending: true });

    if (data) {
      setOrders(data.map(o => ({
        ...o,
        table: Array.isArray(o.table) ? o.table[0] : o.table,
        items: (o.items || []).map((i: any) => ({ ...i, modifiers: i.modifiers || [] })),
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user?.branch_id) return;

    const channel = supabase.channel('kitchen-orders')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `branch_id=eq.${user.branch_id}`,
      }, () => {
        loadOrders();
        // Play notification sound for new orders
        try {
          audioRef.current?.play().catch(() => {});
        } catch {}
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'order_items',
      }, () => loadOrders())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, user]);

  // Update item status
  const updateItemStatus = async (itemId: string, newStatus: 'preparing' | 'ready' | 'served') => {
    await supabase.from('order_items').update({ status: newStatus }).eq('id', itemId);
    toast({ title: `Item marked as ${newStatus}`, variant: 'success' });
    loadOrders();
  };

  // Accept / complete order
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    await supabase.from('orders').update({ status: newStatus, updated_by: user?.id }).eq('id', orderId);
    await supabase.from('order_status_history').insert({
      order_id: orderId, to_status: newStatus, changed_by: user?.id,
    });

    // If marking all items ready
    if (newStatus === 'ready') {
      await supabase.from('order_items')
        .update({ status: 'ready' })
        .eq('order_id', orderId)
        .neq('status', 'cancelled');
    }

    loadOrders();
  };

  if (userLoading || loading) return <LoadingState />;

  const getElapsedColor = (submittedAt: string | null) => {
    if (!submittedAt) return '';
    const mins = Math.floor((Date.now() - new Date(submittedAt).getTime()) / 60000);
    if (mins >= 15) return 'text-destructive';
    if (mins >= 10) return 'text-warning';
    return 'text-muted-foreground';
  };

  return (
    <div className="min-h-screen">
      {/* Hidden audio for notifications */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=" type="audio/wav" />
      </audio>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ChefHat className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold">Kitchen Display</h1>
          <Badge variant="secondary">{orders.length} active</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={loadOrders}>
          Refresh
        </Button>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={<ChefHat className="h-8 w-8 text-muted-foreground" />}
          title="No active orders"
          description="New orders will appear here in real-time"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map(order => (
            <div
              key={order.id}
              className={cn(
                'rounded-xl border-2 bg-card overflow-hidden',
                order.status === 'submitted' && 'border-info/60 shadow-md',
                order.status === 'preparing' && 'border-warning/60',
                order.status === 'ready' && 'border-success/60',
              )}
            >
              {/* Header */}
              <div className={cn(
                'px-4 py-3 flex items-center justify-between',
                order.status === 'submitted' && 'bg-info/10',
                order.status === 'preparing' && 'bg-warning/10',
                order.status === 'ready' && 'bg-success/10',
              )}>
                <div>
                  <span className="text-xl font-bold">{order.table?.table_number || 'N/A'}</span>
                  <span className="text-sm text-muted-foreground ml-2">#{order.order_number}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className={cn('h-4 w-4', getElapsedColor(order.submitted_at))} />
                  <span className={cn('text-sm font-mono font-medium', getElapsedColor(order.submitted_at))}>
                    {order.submitted_at ? elapsedTimeString(order.submitted_at) : '--'}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="p-4 space-y-3">
                {order.items
                  .filter(item => item.status !== 'cancelled')
                  .map(item => (
                    <div key={item.id} className="flex items-start gap-3">
                      {/* Item status button */}
                      <button
                        onClick={() => {
                          if (item.status === 'new') updateItemStatus(item.id, 'preparing');
                          else if (item.status === 'preparing') updateItemStatus(item.id, 'ready');
                        }}
                        className={cn(
                          'mt-0.5 h-7 w-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors touch-target',
                          item.status === 'new' && 'border-info text-info hover:bg-info/10',
                          item.status === 'preparing' && 'border-warning bg-warning/20 text-warning hover:bg-warning/30',
                          item.status === 'ready' && 'border-success bg-success text-success-foreground',
                        )}
                        disabled={item.status === 'ready'}
                      >
                        {item.status === 'ready' ? (
                          <Check className="h-4 w-4" />
                        ) : item.status === 'preparing' ? (
                          <Flame className="h-3.5 w-3.5" />
                        ) : null}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-base">{item.quantity}x</span>
                          <span className={cn(
                            'font-medium',
                            item.status === 'ready' && 'line-through opacity-50'
                          )}>
                            {item.name}
                          </span>
                        </div>
                        {/* Modifiers */}
                        {item.modifiers && item.modifiers.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.modifiers.map((m: any) => (
                              <span key={m.id} className="text-xs bg-warning/20 text-warning px-1.5 py-0.5 rounded font-medium">
                                {m.name}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Notes */}
                        {item.notes && (
                          <p className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded mt-1 font-medium">
                            📝 {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Actions */}
              <div className="px-4 pb-4 flex gap-2">
                {order.status === 'submitted' && (
                  <Button
                    size="touch"
                    className="flex-1"
                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                  >
                    <Flame className="h-4 w-4 mr-2" />
                    Start Preparing
                  </Button>
                )}
                {order.status === 'preparing' && (
                  <Button
                    size="touch"
                    variant="success"
                    className="flex-1"
                    onClick={() => updateOrderStatus(order.id, 'ready')}
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Order Ready
                  </Button>
                )}
                {order.status === 'ready' && (
                  <Button
                    size="touch"
                    variant="outline"
                    className="flex-1"
                    onClick={() => updateOrderStatus(order.id, 'served')}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Mark Served
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
