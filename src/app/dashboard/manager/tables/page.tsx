'use client';
import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, Input, Label } from '@/components/ui/core';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog-tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select-dropdown';
import { PageHeader, LoadingState, StatusBadge } from '@/components/shared';
import { useToast } from '@/components/ui/toast';
import { Plus, Edit, QrCode } from 'lucide-react';
import type { RestaurantTable, TableStatus } from '@/types';

export default function TablesPage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const { toast } = useToast();
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<RestaurantTable | null>(null);
  const [form, setForm] = useState({ table_number: '', capacity: '', status: 'available' as TableStatus });

  const load = async () => {
    if (!user?.branch_id) return;
    const { data } = await supabase.from('restaurant_tables').select('*').eq('branch_id', user.branch_id).order('sort_order');
    setTables(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const openDialog = (t?: RestaurantTable) => {
    if (t) { setEditing(t); setForm({ table_number: t.table_number, capacity: t.capacity ? String(t.capacity) : '', status: t.status }); }
    else { setEditing(null); setForm({ table_number: '', capacity: '', status: 'available' }); }
    setShowDialog(true);
  };

  const save = async () => {
    if (!user?.branch_id || !form.table_number) return;
    const payload = { branch_id: user.branch_id, table_number: form.table_number, capacity: form.capacity ? parseInt(form.capacity) : null, status: form.status };
    if (editing) { await supabase.from('restaurant_tables').update(payload).eq('id', editing.id); }
    else { await supabase.from('restaurant_tables').insert(payload); }
    toast({ title: editing ? 'Table updated' : 'Table added', variant: 'success' });
    setShowDialog(false); load();
  };

  if (loading) return <LoadingState />;
  return (
    <div>
      <PageHeader title="Tables" description={`${tables.length} tables`} actions={<Button onClick={() => openDialog()}><Plus className="h-4 w-4 mr-1" /> Add Table</Button>} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {tables.map(t => (
          <Card key={t.id}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{t.table_number}</p>
              <StatusBadge status={t.status} className="mt-2" />
              {t.capacity && <p className="text-xs text-muted-foreground mt-1">{t.capacity} seats</p>}
              <div className="flex justify-center gap-1 mt-3">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(t)}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                  const url = `${window.location.origin}/menu/${user?.branch_id}/${t.qr_token}`;
                  navigator.clipboard.writeText(url);
                  toast({ title: 'QR link copied', variant: 'info' });
                }}><QrCode className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>{editing ? 'Edit Table' : 'New Table'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Table Number *</Label><Input value={form.table_number} onChange={e => setForm(p => ({ ...p, table_number: e.target.value }))} className="mt-1" /></div>
            <div><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} className="mt-1" /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v: TableStatus) => setForm(p => ({ ...p, status: v }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="available">Available</SelectItem><SelectItem value="occupied">Occupied</SelectItem><SelectItem value="billing">Billing</SelectItem><SelectItem value="cleaning">Cleaning</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button onClick={save}>{editing ? 'Save' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
