'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from '@/components/ui/core';
import { LoadingState, EmptyState, PageHeader, StatCard, StatusBadge } from '@/components/shared';
import { useToast } from '@/components/ui/toast';
import { useLang } from '@/lib/i18n/context';
import {
  Banknote, CreditCard, Smartphone, Check, Receipt, ShoppingBag,
  ChefHat, Plus, Minus, X, Lock, Coffee, Printer,
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Order, OrderItem, MenuItem, MenuCategory, MenuItemModifier } from '@/types';

type PayMethod = 'cash' | 'card' | 'mpesa';

interface BilledOrder extends Order {
  items: (OrderItem & { order_item_modifiers?: { id: string; name: string }[] })[];
  table?: { table_number: string };
}

interface CartItem {
  tempId: string;
  menuItem: MenuItem;
  quantity: number;
  modifiers: MenuItemModifier[];
  notes: string;
  unitPrice: number;
}

// ── Receipt printer ───────────────────────────────────────────────────────────
function printReceipt({
  orderNumber, tableLabel, items, total, method, branchName, t,
}: {
  orderNumber: number | string;
  tableLabel: string;
  items: { name: string; quantity: number; unitPrice: number; modifiers?: string[] }[];
  total: number;
  method: string;
  branchName: string;
  t: ReturnType<typeof useLang>['t'];
}) {
  const win = window.open('', '_blank', 'width=360,height=640');
  if (!win) return;
  const rows = items.map(i => `
    <tr>
      <td style="padding:2px 0">${i.quantity}× ${i.name}${i.modifiers?.length ? `<br/><small style="color:#666">${i.modifiers.join(', ')}</small>` : ''}</td>
      <td style="text-align:right;padding:2px 0">${formatCurrency(i.unitPrice * i.quantity)}</td>
    </tr>`).join('');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t.cashier.receiptTitle}</title>
  <style>
    body{font-family:monospace;font-size:13px;margin:0;padding:16px;max-width:300px}
    h2{text-align:center;margin:0 0 4px;font-size:15px}
    p{text-align:center;margin:0 0 12px;font-size:11px;color:#555}
    table{width:100%;border-collapse:collapse}
    .divider{border-top:1px dashed #999;margin:8px 0}
    .total{font-weight:bold;font-size:15px}
    .center{text-align:center}
  </style></head><body>
  <h2>${branchName}</h2>
  <p>${t.cashier.receiptDate}: ${new Date().toLocaleString()}</p>
  <p>${t.cashier.receiptOrderNo}: #${orderNumber} &nbsp;|&nbsp; ${t.cashier.receiptTable}: ${tableLabel}</p>
  <div class="divider"></div>
  <table>${rows}</table>
  <div class="divider"></div>
  <table><tr class="total"><td>${t.cashier.receiptTotal}</td><td style="text-align:right">${formatCurrency(total)}</td></tr></table>
  <p style="margin-top:8px">${t.cashier.receiptPayMethod}: ${method.toUpperCase()}</p>
  <div class="divider"></div>
  <p class="center" style="margin-top:12px;font-size:13px">${t.cashier.receiptThankYou}</p>
  <script>window.onload=()=>{window.print();window.close();}<\/script>
  </body></html>`);
  win.document.close();
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CashierPage() {
  const supabase = useSupabase();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const { t } = useLang();

  const [tab, setTab] = useState<'bills' | 'takeaway' | 'reconciliation'>('bills');
  const [loading, setLoading] = useState(true);

  // ── Bills queue state ────────────────────────────────────────────────────
  const [billedOrders, setBilledOrders] = useState<BilledOrder[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<Record<string, PayMethod>>({});

  // ── Takeaway state ───────────────────────────────────────────────────────
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [modifiers, setModifiers] = useState<MenuItemModifier[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCat, setSelectedCat] = useState('all');
  const [customerName, setCustomerName] = useState('');
  const [takeawayMethod, setTakeawayMethod] = useState<PayMethod>('cash');
  const [taxRate, setTaxRate] = useState(0.16);
  const [submittingTakeaway, setSubmittingTakeaway] = useState(false);

  // ── Reconciliation state ─────────────────────────────────────────────────
  const [expectedCash, setExpectedCash] = useState(0);
  const [totalCard, setTotalCard] = useState(0);
  const [totalMpesa, setTotalMpesa] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [actualCash, setActualCash] = useState('');
  const [reconcileNotes, setReconcileNotes] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [savingReconciliation, setSavingReconciliation] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadBilledOrders = useCallback(async () => {
    if (!user?.branch_id) return;
    const { data } = await supabase
      .from('orders')
      .select('*, table:restaurant_tables(table_number), items:order_items(*, order_item_modifiers(*))')
      .eq('branch_id', user.branch_id)
      .eq('status', 'billed')
      .order('updated_at', { ascending: true });
    setBilledOrders((data || []).map((o: any) => ({
      ...o,
      table: Array.isArray(o.table) ? o.table[0] : o.table,
      items: (o.items || []).map((i: any) => ({ ...i, order_item_modifiers: i.order_item_modifiers || [] })),
    })));
  }, [supabase, user]);

  const loadMenuData = useCallback(async () => {
    if (!user?.branch_id) return;
    const [cRes, mRes, modRes, taxRes] = await Promise.all([
      supabase.from('menu_categories').select('*').eq('branch_id', user.branch_id).eq('is_active', true).order('sort_order'),
      supabase.from('menu_items').select('*').eq('branch_id', user.branch_id).eq('is_active', true).eq('is_available', true).order('sort_order'),
      supabase.from('menu_item_modifiers').select('*').eq('branch_id', user.branch_id).eq('is_active', true).order('sort_order'),
      supabase.from('tax_settings').select('rate').eq('branch_id', user.branch_id).eq('is_active', true).single(),
    ]);
    setCategories(cRes.data || []);
    setMenuItems(mRes.data || []);
    setModifiers(modRes.data || []);
    if (taxRes.data) setTaxRate(Number(taxRes.data.rate));
  }, [supabase, user]);

  const loadReconciliation = useCallback(async () => {
    if (!user?.branch_id) return;
    const [pRes, eRes, sRes] = await Promise.all([
      supabase.from('payments').select('amount, method').eq('branch_id', user.branch_id).gte('created_at', today + 'T00:00:00').eq('status', 'paid'),
      supabase.from('expenses').select('amount').eq('branch_id', user.branch_id).gte('created_at', today + 'T00:00:00'),
      supabase.from('reconciliation_sessions').select('*').eq('branch_id', user.branch_id).order('session_date', { ascending: false }).limit(10),
    ]);
    const payments = pRes.data || [];
    setExpectedCash(payments.filter(p => p.method === 'cash').reduce((s, p) => s + Number(p.amount), 0));
    setTotalCard(payments.filter(p => p.method === 'card').reduce((s, p) => s + Number(p.amount), 0));
    setTotalMpesa(payments.filter(p => p.method === 'mpesa').reduce((s, p) => s + Number(p.amount), 0));
    setTotalSales(payments.reduce((s, p) => s + Number(p.amount), 0));
    setTotalExpenses((eRes.data || []).reduce((s, e) => s + Number(e.amount), 0));
    setSessions(sRes.data || []);
  }, [supabase, user, today]);

  useEffect(() => {
    if (!user?.branch_id) return;
    Promise.all([loadBilledOrders(), loadMenuData(), loadReconciliation()]).then(() => setLoading(false));
  }, [user, loadBilledOrders, loadMenuData, loadReconciliation]);

  // Realtime: refresh billed orders
  useEffect(() => {
    if (!user?.branch_id) return;
    const channel = supabase.channel('cashier-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `branch_id=eq.${user.branch_id}` }, loadBilledOrders)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, user, loadBilledOrders]);

  // ── Bills queue actions ──────────────────────────────────────────────────
  const getOrderTotal = (order: BilledOrder) => {
    const fromItems = order.items.reduce((s, i) => s + Number(i.total_price || 0), 0);
    return Number(order.total) > 0 ? Number(order.total) : fromItems;
  };

  const collectPayment = async (order: BilledOrder) => {
    if (!user) return;
    const method = payMethod[order.id] || 'cash';
    const amount = getOrderTotal(order);
    setProcessing(order.id);
    try {
      const { error: payErr } = await supabase.from('payments').insert({
        order_id: order.id, branch_id: user.branch_id, amount, method, status: 'paid', received_by: user.id,
      });
      if (payErr) throw payErr;

      const { error: orderErr } = await supabase.from('orders')
        .update({ status: 'paid', payment_status: 'paid', completed_at: new Date().toISOString(), updated_by: user.id })
        .eq('id', order.id);
      if (orderErr) throw orderErr;

      await supabase.from('order_status_history').insert({ order_id: order.id, from_status: 'billed', to_status: 'paid', changed_by: user.id });

      if (order.table_id) {
        await supabase.from('restaurant_tables').update({ status: 'cleaning' }).eq('id', order.table_id);
      }

      // Print receipt
      printReceipt({
        orderNumber: order.order_number,
        tableLabel: order.table?.table_number ?? t.cashier.takeawayLabel,
        items: order.items.map(i => ({
          name: i.name, quantity: i.quantity, unitPrice: Number(i.unit_price),
          modifiers: (i.order_item_modifiers || []).map((m: any) => m.name),
        })),
        total: amount, method, branchName: 'Karibu Café', t,
      });

      toast({ title: `#${order.order_number} ${t.cashier.collect} — ${method.toUpperCase()}`, variant: 'success' });
      loadReconciliation();
    } catch (err: any) {
      toast({ title: t.cashier.paymentFailed, description: err.message, variant: 'error' });
    } finally {
      setProcessing(null);
    }
  };

  // ── Takeaway cart actions ────────────────────────────────────────────────
  const cartTotal = cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0);

  const addToCart = (item: MenuItem) => {
    const adj = modifiers.filter(m => m.menu_item_id === item.id).reduce((s, m) => s, 0);
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id && c.modifiers.length === 0);
      if (existing) return prev.map(c => c.tempId === existing.tempId ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { tempId: Math.random().toString(36).slice(2), menuItem: item, quantity: 1, modifiers: [], notes: '', unitPrice: Number(item.base_price) }];
    });
  };

  const updateQty = (tempId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.tempId !== tempId) return c;
      const newQty = c.quantity + delta;
      return newQty <= 0 ? c : { ...c, quantity: newQty };
    }));
  };

  const removeFromCart = (tempId: string) => setCart(prev => prev.filter(c => c.tempId !== tempId));

  const submitTakeaway = async () => {
    if (!user || cart.length === 0) return;
    setSubmittingTakeaway(true);
    try {
      // Create order
      const { data: newOrder, error: orderErr } = await supabase.from('orders').insert({
        branch_id: user.branch_id,
        order_type: 'takeaway',
        status: 'submitted',
        payment_status: 'paid',
        notes: customerName || null,
        created_by: user.id,
        updated_by: user.id,
        submitted_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      }).select().single();
      if (orderErr) throw orderErr;

      // Insert items
      for (const cartItem of cart) {
        const taxAmt = cartItem.menuItem.is_taxable
          ? Number((cartItem.unitPrice * cartItem.quantity * taxRate).toFixed(2)) : 0;
        const { data: orderItem, error: itemErr } = await supabase.from('order_items').insert({
          order_id: newOrder.id,
          menu_item_id: cartItem.menuItem.id,
          name: cartItem.menuItem.name,
          quantity: cartItem.quantity,
          unit_price: cartItem.unitPrice,
          total_price: cartItem.unitPrice * cartItem.quantity,
          tax_rate: cartItem.menuItem.is_taxable ? taxRate : 0,
          tax_amount: taxAmt,
          status: 'new',
          notes: cartItem.notes || null,
          created_by: user.id,
        }).select().single();
        if (itemErr) throw itemErr;

        if (cartItem.modifiers.length > 0) {
          await supabase.from('order_item_modifiers').insert(
            cartItem.modifiers.map(m => ({ order_item_id: orderItem.id, modifier_id: m.id, name: m.name, price_adjustment: m.price_adjustment }))
          );
        }
      }

      // Record payment
      const { error: payErr } = await supabase.from('payments').insert({
        order_id: newOrder.id, branch_id: user.branch_id, amount: cartTotal,
        method: takeawayMethod, status: 'paid', received_by: user.id,
      });
      if (payErr) throw payErr;

      await supabase.from('order_status_history').insert({ order_id: newOrder.id, to_status: 'submitted', changed_by: user.id });

      // Print receipt
      printReceipt({
        orderNumber: newOrder.order_number,
        tableLabel: customerName || t.cashier.takeawayLabel,
        items: cart.map(c => ({ name: c.menuItem.name, quantity: c.quantity, unitPrice: c.unitPrice })),
        total: cartTotal, method: takeawayMethod, branchName: 'Karibu Café', t,
      });

      toast({ title: t.cashier.orderCreated, variant: 'success' });
      setCart([]);
      setCustomerName('');
      loadReconciliation();
    } catch (err: any) {
      toast({ title: t.cashier.paymentFailed, description: err.message, variant: 'error' });
    } finally {
      setSubmittingTakeaway(false);
    }
  };

  // ── Reconciliation actions ───────────────────────────────────────────────
  const closeSession = async () => {
    if (!user?.branch_id) return;
    setSavingReconciliation(true);
    const actual = parseFloat(actualCash) || 0;
    const discrepancy = actual - expectedCash;
    const { error } = await supabase.from('reconciliation_sessions').insert({
      branch_id: user.branch_id, session_date: today, expected_cash: expectedCash,
      actual_cash: actual, discrepancy, total_card: totalCard, total_mpesa: totalMpesa,
      total_sales: totalSales, total_expenses: totalExpenses,
      status: 'closed', notes: reconcileNotes || null,
      closed_by: user.id, closed_at: new Date().toISOString(), created_by: user.id,
    });
    if (error) {
      toast({ title: 'Failed to close session', description: error.message, variant: 'error' });
    } else {
      toast({ title: t.cashier.reconciliationClosed, variant: 'success' });
      setActualCash(''); setReconcileNotes('');
      loadReconciliation();
    }
    setSavingReconciliation(false);
  };

  if (userLoading || loading) return <LoadingState />;

  const methodOptions: { value: PayMethod; label: string; icon: React.ReactNode }[] = [
    { value: 'cash', label: t.cashier.cash, icon: <Banknote className="h-4 w-4" /> },
    { value: 'card', label: t.cashier.card, icon: <CreditCard className="h-4 w-4" /> },
    { value: 'mpesa', label: t.cashier.mpesa, icon: <Smartphone className="h-4 w-4" /> },
  ];

  const filteredItems = selectedCat === 'all' ? menuItems : menuItems.filter(i => i.category_id === selectedCat);
  const discrepancy = (parseFloat(actualCash) || 0) - expectedCash;

  const tabs = [
    { key: 'bills', label: t.cashier.billsTab, icon: <Receipt className="h-4 w-4" /> },
    { key: 'takeaway', label: t.cashier.takeawayTab, icon: <ShoppingBag className="h-4 w-4" /> },
    { key: 'reconciliation', label: t.cashier.reconciliationTab, icon: <Lock className="h-4 w-4" /> },
  ] as const;

  return (
    <div>
      <PageHeader title={t.cashier.title} />

      {/* Tab bar */}
      <div className="flex gap-1 border-b mb-6 -mt-2">
        {tabs.map(tb => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              tab === tb.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tb.icon} {tb.label}
          </button>
        ))}
      </div>

      {/* ── Bills Queue tab ─────────────────────────────────────────────── */}
      {tab === 'bills' && (
        billedOrders.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-8 w-8 text-muted-foreground" />}
            title={t.cashier.noBills}
            description={t.cashier.noBillsDesc}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {billedOrders.map(order => {
              const total = getOrderTotal(order);
              const method = payMethod[order.id] || 'cash';
              const isPaying = processing === order.id;
              return (
                <Card key={order.id} className="border-warning/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {order.table?.table_number ?? t.cashier.takeawayLabel}
                      </CardTitle>
                      <span className="text-sm text-muted-foreground">#{order.order_number}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Items */}
                    <div className="space-y-1 text-sm">
                      {order.items.map(item => (
                        <div key={item.id} className="flex justify-between gap-2">
                          <span className="text-muted-foreground">
                            {item.quantity}× {item.name}
                            {item.order_item_modifiers && item.order_item_modifiers.length > 0 && (
                              <span className="text-xs opacity-60 ml-1">
                                ({item.order_item_modifiers.map((m: any) => m.name).join(', ')})
                              </span>
                            )}
                          </span>
                          <span className="shrink-0">{formatCurrency(Number(item.total_price))}</span>
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
                          onClick={() => setPayMethod(prev => ({ ...prev, [order.id]: opt.value }))}
                          className={cn(
                            'flex-1 flex items-center justify-center gap-1.5 rounded-md border py-2 text-sm font-medium transition-colors',
                            method === opt.value ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'
                          )}
                        >
                          {opt.icon} {opt.label}
                        </button>
                      ))}
                    </div>
                    {/* Collect button */}
                    <Button className="w-full" size="touch" onClick={() => collectPayment(order)} disabled={isPaying}>
                      <Check className="h-4 w-4 mr-2" />
                      {isPaying ? t.cashier.processing : `${t.cashier.collect} ${formatCurrency(total)}`}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* ── Takeaway tab ────────────────────────────────────────────────── */}
      {tab === 'takeaway' && (
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-12rem)]">
          {/* Menu panel */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Customer name */}
            <div className="mb-3">
              <Input
                placeholder={t.cashier.customerNamePlaceholder}
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="max-w-xs"
              />
            </div>
            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
              <Button variant={selectedCat === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCat('all')} className="shrink-0">
                {t.common.all}
              </Button>
              {categories.map(cat => (
                <Button key={cat.id} variant={selectedCat === cat.id ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCat(cat.id)} className="shrink-0">
                  {cat.name}
                </Button>
              ))}
            </div>
            {/* Menu grid */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="rounded-lg border bg-card p-4 text-left hover:border-primary/50 hover:shadow-sm transition-all active:scale-[0.98] touch-target"
                  >
                    <p className="font-medium text-sm line-clamp-2">{item.name}</p>
                    <p className="text-primary font-bold mt-1">{formatCurrency(Number(item.base_price))}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cart panel */}
          <div className="w-full lg:w-80 xl:w-96 border rounded-lg bg-card flex flex-col shrink-0">
            <div className="p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                {t.cashier.takeawayLabel}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {cart.length === 0 ? (
                <EmptyState
                  icon={<Coffee className="h-6 w-6 text-muted-foreground" />}
                  title={t.cashier.noItemsInCart}
                  description={t.cashier.noItemsInCartDesc}
                />
              ) : (
                cart.map(item => (
                  <div key={item.tempId} className="flex items-start gap-2 py-2 border-b">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.menuItem.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <button onClick={() => updateQty(item.tempId, -1)} className="h-7 w-7 rounded border flex items-center justify-center hover:bg-accent">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQty(item.tempId, 1)} className="h-7 w-7 rounded border flex items-center justify-center hover:bg-accent">
                          <Plus className="h-3 w-3" />
                        </button>
                        <button onClick={() => removeFromCart(item.tempId)} className="ml-auto text-destructive hover:text-destructive/80">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="font-medium text-sm">{formatCurrency(item.unitPrice * item.quantity)}</p>
                  </div>
                ))
              )}
            </div>
            {/* Cart footer */}
            <div className="border-t p-4 space-y-3">
              {cart.length > 0 && (
                <>
                  <div className="flex justify-between text-sm font-bold">
                    <span>{t.common.total}</span>
                    <span className="text-lg">{formatCurrency(cartTotal)}</span>
                  </div>
                  {/* Payment method */}
                  <div className="flex gap-2">
                    {methodOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setTakeawayMethod(opt.value)}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-1 rounded-md border py-2 text-xs font-medium transition-colors',
                          takeawayMethod === opt.value ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'
                        )}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                  <Button onClick={submitTakeaway} className="w-full" size="touch" disabled={submittingTakeaway}>
                    <ChefHat className="h-4 w-4 mr-2" />
                    {submittingTakeaway ? t.cashier.processing : t.cashier.payAndSend}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reconciliation tab ───────────────────────────────────────────── */}
      {tab === 'reconciliation' && (
        <div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard title={t.cashier.expectedCash} value={formatCurrency(expectedCash)} />
            <StatCard title={t.cashier.cardTotal} value={formatCurrency(totalCard)} />
            <StatCard title={t.cashier.mpesaTotal} value={formatCurrency(totalMpesa)} />
            <StatCard title={t.cashier.totalSales} value={formatCurrency(totalSales)} />
          </div>

          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">{t.cashier.closeRegister}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>{t.cashier.actualCash}</Label>
                  <Input type="number" step="0.01" value={actualCash} onChange={e => setActualCash(e.target.value)} className="mt-1 text-lg" placeholder="0.00" />
                </div>
                <div>
                  <Label>{t.cashier.discrepancy}</Label>
                  <div className={cn('mt-1 text-2xl font-bold', discrepancy === 0 ? 'text-success' : discrepancy > 0 ? 'text-info' : 'text-destructive')}>
                    {actualCash ? formatCurrency(discrepancy) : '—'}
                  </div>
                  {discrepancy !== 0 && actualCash && (
                    <p className="text-xs text-muted-foreground">{discrepancy > 0 ? t.cashier.over : t.cashier.short}</p>
                  )}
                </div>
              </div>
              <div>
                <Label>{t.common.notes}</Label>
                <Textarea value={reconcileNotes} onChange={e => setReconcileNotes(e.target.value)} className="mt-1" rows={2} />
              </div>
              <Button onClick={closeSession} disabled={savingReconciliation || !actualCash} size="touch">
                <Lock className="h-4 w-4 mr-2" />
                {savingReconciliation ? t.cashier.closing : t.cashier.closeRegister}
              </Button>
            </CardContent>
          </Card>

          {sessions.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">{t.cashier.recentSessions}</h3>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3">{t.common.date}</th>
                      <th className="text-right p-3">{t.cashier.expectedCash}</th>
                      <th className="text-right p-3">{t.cashier.actualCash}</th>
                      <th className="text-right p-3">{t.cashier.discrepancy}</th>
                      <th className="text-center p-3">{t.common.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sessions.map(s => (
                      <tr key={s.id}>
                        <td className="p-3">{formatDate(s.session_date)}</td>
                        <td className="p-3 text-right">{formatCurrency(Number(s.expected_cash))}</td>
                        <td className="p-3 text-right">{formatCurrency(Number(s.actual_cash))}</td>
                        <td className={cn('p-3 text-right font-medium', Number(s.discrepancy) === 0 ? 'text-success' : 'text-destructive')}>
                          {formatCurrency(Number(s.discrepancy))}
                        </td>
                        <td className="p-3 text-center"><StatusBadge status={s.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
