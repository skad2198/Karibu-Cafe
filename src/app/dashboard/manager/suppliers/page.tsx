'use client';
import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, Input, Label, Textarea } from '@/components/ui/core';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog-tabs';
import { PageHeader, LoadingState, EmptyState } from '@/components/shared';
import { useToast } from '@/components/ui/toast';
import { Plus, Edit, Phone, Mail, MapPin } from 'lucide-react';
import type { Supplier } from '@/types';

export default function SuppliersPage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: '', contact_person: '', phone: '', email: '', address: '', notes: '' });

  const load = async () => {
    if (!user?.branch_id) return;
    const { data } = await supabase.from('suppliers').select('*').eq('branch_id', user.branch_id).eq('is_active', true).order('name');
    setSuppliers(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const openDialog = (s?: Supplier) => {
    if (s) { setEditing(s); setForm({ name: s.name, contact_person: s.contact_person || '', phone: s.phone || '', email: s.email || '', address: s.address || '', notes: s.notes || '' }); }
    else { setEditing(null); setForm({ name: '', contact_person: '', phone: '', email: '', address: '', notes: '' }); }
    setShowDialog(true);
  };

  const save = async () => {
    if (!user?.branch_id || !form.name) return;
    const payload = { branch_id: user.branch_id, name: form.name, contact_person: form.contact_person || null, phone: form.phone || null, email: form.email || null, address: form.address || null, notes: form.notes || null };
    if (editing) { await supabase.from('suppliers').update(payload).eq('id', editing.id); }
    else { await supabase.from('suppliers').insert(payload); }
    toast({ title: editing ? 'Supplier updated' : 'Supplier added', variant: 'success' });
    setShowDialog(false); load();
  };

  if (loading) return <LoadingState />;
  return (
    <div>
      <PageHeader title="Suppliers" description={`${suppliers.length} suppliers`} actions={<Button onClick={() => openDialog()}><Plus className="h-4 w-4 mr-1" /> Add Supplier</Button>} />
      {suppliers.length === 0 ? <EmptyState title="No suppliers" action={<Button onClick={() => openDialog()}><Plus className="h-4 w-4 mr-1" /> Add</Button>} /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(s => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between"><h3 className="font-semibold">{s.name}</h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(s)}><Edit className="h-4 w-4" /></Button></div>
                {s.contact_person && <p className="text-sm text-muted-foreground">{s.contact_person}</p>}
                <div className="mt-2 space-y-1 text-sm">
                  {s.phone && <p className="flex items-center gap-2"><Phone className="h-3 w-3" />{s.phone}</p>}
                  {s.email && <p className="flex items-center gap-2"><Mail className="h-3 w-3" />{s.email}</p>}
                  {s.address && <p className="flex items-center gap-2"><MapPin className="h-3 w-3" />{s.address}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit Supplier' : 'New Supplier'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1" /></div>
            <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="mt-1" /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="mt-1" /></div>
            </div>
            <div><Label>Address</Label><Textarea value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="mt-1" rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button onClick={save}>{editing ? 'Save' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
