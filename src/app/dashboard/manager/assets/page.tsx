'use client';
import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, Input, Label, Textarea } from '@/components/ui/core';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog-tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select-dropdown';
import { PageHeader, LoadingState, StatusBadge, EmptyState } from '@/components/shared';
import { useToast } from '@/components/ui/toast';
import { Plus, Edit, Warehouse } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { FixedAsset, AssetStatus, AssetCondition } from '@/types';

export default function AssetsPage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const { toast } = useToast();
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<FixedAsset | null>(null);
  const [form, setForm] = useState({ name: '', category: '', description: '', purchase_date: '', purchase_value: '', serial_number: '', status: 'active' as AssetStatus, condition: 'good' as AssetCondition, location: '', notes: '' });

  const load = async () => {
    if (!user?.branch_id) return;
    const { data } = await supabase.from('fixed_assets').select('*').eq('branch_id', user.branch_id).order('name');
    setAssets(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const totalValue = assets.reduce((s, a) => s + (Number(a.purchase_value) || 0), 0);

  const openDialog = (a?: FixedAsset) => {
    if (a) { setEditing(a); setForm({ name: a.name, category: a.category, description: a.description || '', purchase_date: a.purchase_date || '', purchase_value: a.purchase_value ? String(a.purchase_value) : '', serial_number: a.serial_number || '', status: a.status, condition: a.condition || 'good', location: a.location || '', notes: a.notes || '' }); }
    else { setEditing(null); setForm({ name: '', category: '', description: '', purchase_date: '', purchase_value: '', serial_number: '', status: 'active', condition: 'good', location: '', notes: '' }); }
    setShowDialog(true);
  };

  const save = async () => {
    if (!user?.branch_id || !form.name || !form.category) return;
    const payload = { branch_id: user.branch_id, name: form.name, category: form.category, description: form.description || null, purchase_date: form.purchase_date || null, purchase_value: form.purchase_value ? parseFloat(form.purchase_value) : null, serial_number: form.serial_number || null, status: form.status, condition: form.condition, location: form.location || null, notes: form.notes || null, created_by: user.id };
    if (editing) { await supabase.from('fixed_assets').update(payload).eq('id', editing.id); }
    else { await supabase.from('fixed_assets').insert(payload); }
    toast({ title: editing ? 'Asset updated' : 'Asset added', variant: 'success' });
    setShowDialog(false); load();
  };

  if (loading) return <LoadingState />;
  return (
    <div>
      <PageHeader title="Fixed Assets" description={`Total value: ${formatCurrency(totalValue)}`} actions={<Button onClick={() => openDialog()}><Plus className="h-4 w-4 mr-1" /> Add Asset</Button>} />
      {assets.length === 0 ? <EmptyState title="No assets" icon={<Warehouse className="h-8 w-8 text-muted-foreground" />} /> : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm"><thead className="bg-muted/50"><tr>
            <th className="text-left p-3 font-medium">Asset</th><th className="text-left p-3 font-medium">Category</th>
            <th className="text-left p-3 font-medium">Status</th><th className="text-left p-3 font-medium">Condition</th>
            <th className="text-right p-3 font-medium">Value</th><th className="text-center p-3 font-medium">Actions</th>
          </tr></thead><tbody className="divide-y">
            {assets.map(a => (
              <tr key={a.id}><td className="p-3 font-medium">{a.name}{a.serial_number && <p className="text-xs text-muted-foreground">S/N: {a.serial_number}</p>}</td>
                <td className="p-3 text-muted-foreground">{a.category}</td>
                <td className="p-3"><StatusBadge status={a.status} /></td>
                <td className="p-3"><StatusBadge status={a.condition || 'unknown'} /></td>
                <td className="p-3 text-right">{a.purchase_value ? formatCurrency(Number(a.purchase_value)) : '—'}</td>
                <td className="p-3 text-center"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(a)}><Edit className="h-4 w-4" /></Button></td>
              </tr>))}
          </tbody></table></div>
      )}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit Asset' : 'New Asset'}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1" /></div>
            <div><Label>Category *</Label><Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="mt-1" placeholder="e.g. Equipment, Furniture" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Purchase Date</Label><Input type="date" value={form.purchase_date} onChange={e => setForm(p => ({ ...p, purchase_date: e.target.value }))} className="mt-1" /></div>
              <div><Label>Purchase Value</Label><Input type="number" step="0.01" value={form.purchase_value} onChange={e => setForm(p => ({ ...p, purchase_value: e.target.value }))} className="mt-1" /></div>
            </div>
            <div><Label>Serial Number</Label><Input value={form.serial_number} onChange={e => setForm(p => ({ ...p, serial_number: e.target.value }))} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Status</Label><Select value={form.status} onValueChange={(v: AssetStatus) => setForm(p => ({ ...p, status: v }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="active">Active</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem><SelectItem value="retired">Retired</SelectItem><SelectItem value="disposed">Disposed</SelectItem>
              </SelectContent></Select></div>
              <div><Label>Condition</Label><Select value={form.condition} onValueChange={(v: AssetCondition) => setForm(p => ({ ...p, condition: v }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="excellent">Excellent</SelectItem><SelectItem value="good">Good</SelectItem><SelectItem value="fair">Fair</SelectItem><SelectItem value="poor">Poor</SelectItem>
              </SelectContent></Select></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="mt-1" rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button onClick={save}>{editing ? 'Save' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
