'use client';

import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, Input, Label, Textarea, Badge } from '@/components/ui/core';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog-tabs';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/dialog-tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select-dropdown';
import { PageHeader, EmptyState, LoadingState, StatusBadge } from '@/components/shared';
import { useToast } from '@/components/ui/toast';
import { Plus, Package, AlertTriangle, ArrowUpDown, Edit } from 'lucide-react';
import { formatCurrency, cn, capitalize } from '@/lib/utils';
import type { InventoryItem, InventoryCategory, Supplier } from '@/types';

const CATEGORIES: { value: InventoryCategory; label: string }[] = [
  { value: 'raw_ingredient', label: 'Raw Ingredients' },
  { value: 'finished_good', label: 'Finished Goods' },
  { value: 'consumable', label: 'Consumables' },
  { value: 'cutlery_small_asset', label: 'Cutlery / Small Assets' },
  { value: 'packaged_retail', label: 'Packaged Retail' },
];

export default function InventoryPage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const { toast } = useToast();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);

  const [form, setForm] = useState({
    name: '', description: '', category: 'raw_ingredient' as InventoryCategory,
    unit_of_measure: 'unit', current_quantity: '0', reorder_level: '0',
    cost_per_unit: '0', supplier_id: '',
  });
  const [adjForm, setAdjForm] = useState({ quantity: '', type: 'manual_adjustment', notes: '' });

  const load = async () => {
    if (!user?.branch_id) return;
    const [iRes, sRes] = await Promise.all([
      supabase.from('inventory_items').select('*').eq('branch_id', user.branch_id).eq('is_active', true).order('name'),
      supabase.from('suppliers').select('*').eq('branch_id', user.branch_id).eq('is_active', true),
    ]);
    setItems(iRes.data || []);
    setSuppliers(sRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const openItemDialog = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setForm({
        name: item.name, description: item.description || '',
        category: item.category, unit_of_measure: item.unit_of_measure,
        current_quantity: String(item.current_quantity), reorder_level: String(item.reorder_level),
        cost_per_unit: String(item.cost_per_unit), supplier_id: item.supplier_id || '',
      });
    } else {
      setEditingItem(null);
      setForm({ name: '', description: '', category: 'raw_ingredient', unit_of_measure: 'unit', current_quantity: '0', reorder_level: '0', cost_per_unit: '0', supplier_id: '' });
    }
    setShowItemDialog(true);
  };

  const saveItem = async () => {
    if (!user?.branch_id || !form.name) return;
    const payload = {
      branch_id: user.branch_id, name: form.name, description: form.description || null,
      category: form.category, unit_of_measure: form.unit_of_measure,
      current_quantity: parseFloat(form.current_quantity) || 0,
      reorder_level: parseFloat(form.reorder_level) || 0,
      cost_per_unit: parseFloat(form.cost_per_unit) || 0,
      supplier_id: form.supplier_id && form.supplier_id !== 'none' ? form.supplier_id : null,
    };
    if (editingItem) {
      await supabase.from('inventory_items').update(payload).eq('id', editingItem.id);
      toast({ title: 'Item updated', variant: 'success' });
    } else {
      await supabase.from('inventory_items').insert(payload);
      toast({ title: 'Item created', variant: 'success' });
    }
    setShowItemDialog(false);
    load();
  };

  const openAdjustDialog = (item: InventoryItem) => {
    setAdjustItem(item);
    setAdjForm({ quantity: '', type: 'manual_adjustment', notes: '' });
    setShowAdjustDialog(true);
  };

  const saveAdjustment = async () => {
    if (!adjustItem || !adjForm.quantity || !user) return;
    const change = parseFloat(adjForm.quantity);
    const before = Number(adjustItem.current_quantity);
    const after = before + change;

    await supabase.from('inventory_transactions').insert({
      branch_id: user.branch_id, inventory_item_id: adjustItem.id,
      transaction_type: adjForm.type, quantity_change: change,
      quantity_before: before, quantity_after: after,
      notes: adjForm.notes || null, created_by: user.id,
    });
    await supabase.from('inventory_items').update({ current_quantity: after }).eq('id', adjustItem.id);

    toast({ title: 'Stock adjusted', variant: 'success' });
    setShowAdjustDialog(false);
    load();
  };

  const filteredItems = filter === 'all' ? items
    : filter === 'low_stock' ? items.filter(i => Number(i.current_quantity) <= Number(i.reorder_level))
    : items.filter(i => i.category === filter);

  const lowStockCount = items.filter(i => Number(i.current_quantity) <= Number(i.reorder_level)).length;

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Inventory" description={`${items.length} items tracked`}
        actions={<Button onClick={() => openItemDialog()}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>}
      />

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
        <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>All</Button>
        {lowStockCount > 0 && (
          <Button variant={filter === 'low_stock' ? 'destructive' : 'outline'} size="sm" onClick={() => setFilter('low_stock')}>
            <AlertTriangle className="h-3 w-3 mr-1" /> Low Stock ({lowStockCount})
          </Button>
        )}
        {CATEGORIES.map(c => (
          <Button key={c.value} variant={filter === c.value ? 'default' : 'outline'} size="sm" onClick={() => setFilter(c.value)}>
            {c.label}
          </Button>
        ))}
      </div>

      {/* Items table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Item</th>
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-right p-3 font-medium">Qty</th>
                <th className="text-right p-3 font-medium">Reorder</th>
                <th className="text-right p-3 font-medium">Unit Cost</th>
                <th className="text-right p-3 font-medium">Value</th>
                <th className="text-center p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredItems.map(item => {
                const isLow = Number(item.current_quantity) <= Number(item.reorder_level);
                return (
                  <tr key={item.id} className={cn(isLow && 'bg-destructive/5')}>
                    <td className="p-3">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.unit_of_measure}</p>
                    </td>
                    <td className="p-3"><Badge variant="secondary">{capitalize(item.category)}</Badge></td>
                    <td className={cn('p-3 text-right font-mono font-medium', isLow && 'text-destructive')}>
                      {Number(item.current_quantity).toFixed(1)}
                    </td>
                    <td className="p-3 text-right text-muted-foreground">{Number(item.reorder_level).toFixed(1)}</td>
                    <td className="p-3 text-right">{formatCurrency(Number(item.cost_per_unit))}</td>
                    <td className="p-3 text-right font-medium">{formatCurrency(Number(item.current_quantity) * Number(item.cost_per_unit))}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openAdjustDialog(item)}>
                          <ArrowUpDown className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openItemDialog(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingItem ? 'Edit Item' : 'New Inventory Item'}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1" /></div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={(v: InventoryCategory) => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Unit</Label><Input value={form.unit_of_measure} onChange={e => setForm(p => ({ ...p, unit_of_measure: e.target.value }))} className="mt-1" /></div>
              <div><Label>Current Qty</Label><Input type="number" step="0.1" value={form.current_quantity} onChange={e => setForm(p => ({ ...p, current_quantity: e.target.value }))} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Reorder Level</Label><Input type="number" step="0.1" value={form.reorder_level} onChange={e => setForm(p => ({ ...p, reorder_level: e.target.value }))} className="mt-1" /></div>
              <div><Label>Cost per Unit</Label><Input type="number" step="0.01" value={form.cost_per_unit} onChange={e => setForm(p => ({ ...p, cost_per_unit: e.target.value }))} className="mt-1" /></div>
            </div>
            <div><Label>Supplier</Label>
              <Select value={form.supplier_id} onValueChange={v => setForm(p => ({ ...p, supplier_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>Cancel</Button>
            <Button onClick={saveItem}>{editingItem ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Adjust Stock: {adjustItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Current: {adjustItem && Number(adjustItem.current_quantity).toFixed(1)} {adjustItem?.unit_of_measure}</p>
            <div><Label>Quantity Change *</Label>
              <Input type="number" step="0.1" placeholder="e.g. 5 or -3" value={adjForm.quantity} onChange={e => setAdjForm(p => ({ ...p, quantity: e.target.value }))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Use positive to add, negative to remove</p>
            </div>
            <div><Label>Type</Label>
              <Select value={adjForm.type} onValueChange={v => setAdjForm(p => ({ ...p, type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual_adjustment">Manual Adjustment</SelectItem>
                  <SelectItem value="waste_spoilage">Waste / Spoilage</SelectItem>
                  <SelectItem value="stock_count">Stock Count</SelectItem>
                  <SelectItem value="purchase_receipt">Purchase Receipt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={adjForm.notes} onChange={e => setAdjForm(p => ({ ...p, notes: e.target.value }))} className="mt-1" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustDialog(false)}>Cancel</Button>
            <Button onClick={saveAdjustment}>Save Adjustment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
