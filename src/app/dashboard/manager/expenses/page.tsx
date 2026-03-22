'use client';
import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, Input, Label, Textarea } from '@/components/ui/core';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog-tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select-dropdown';
import { PageHeader, LoadingState, EmptyState, StatusBadge } from '@/components/shared';
import { useToast } from '@/components/ui/toast';
import { Plus, Edit, Receipt } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { Expense, ExpenseCategory, PaymentMethod } from '@/types';

export default function ExpensesPage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<(Expense & { category?: ExpenseCategory })[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ amount: '', description: '', category_id: '', payment_method: 'cash' as PaymentMethod, expense_date: new Date().toISOString().split('T')[0], notes: '' });

  const load = async () => {
    if (!user?.branch_id) return;
    const [eRes, cRes] = await Promise.all([
      supabase.from('expenses').select('*, category:expense_categories(*)').eq('branch_id', user.branch_id).order('expense_date', { ascending: false }).limit(50),
      supabase.from('expense_categories').select('*').eq('branch_id', user.branch_id),
    ]);
    setExpenses((eRes.data || []).map(e => ({ ...e, category: Array.isArray(e.category) ? e.category[0] : e.category })));
    setCategories(cRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const save = async () => {
    if (!user?.branch_id || !form.amount || !form.description) return;
    await supabase.from('expenses').insert({
      branch_id: user.branch_id, amount: parseFloat(form.amount), description: form.description,
      category_id: form.category_id || null, payment_method: form.payment_method,
      expense_date: form.expense_date, notes: form.notes || null, entered_by: user.id, status: 'approved',
    });
    toast({ title: 'Expense recorded', variant: 'success' });
    setShowDialog(false);
    setForm({ amount: '', description: '', category_id: '', payment_method: 'cash', expense_date: new Date().toISOString().split('T')[0], notes: '' });
    load();
  };

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Expenses" description={`Total: ${formatCurrency(totalExpenses)}`}
        actions={<Button onClick={() => setShowDialog(true)}><Plus className="h-4 w-4 mr-1" /> Add Expense</Button>}
      />
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="text-left p-3 font-medium">Date</th>
            <th className="text-left p-3 font-medium">Description</th>
            <th className="text-left p-3 font-medium">Category</th>
            <th className="text-left p-3 font-medium">Method</th>
            <th className="text-right p-3 font-medium">Amount</th>
          </tr></thead>
          <tbody className="divide-y">
            {expenses.map(e => (
              <tr key={e.id}><td className="p-3">{formatDate(e.expense_date)}</td>
                <td className="p-3 font-medium">{e.description}</td>
                <td className="p-3 text-muted-foreground">{e.category?.name || '—'}</td>
                <td className="p-3"><StatusBadge status={e.payment_method} /></td>
                <td className="p-3 text-right font-medium">{formatCurrency(Number(e.amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Expense</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Amount (KES) *</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className="mt-1" /></div>
            <div><Label>Description *</Label><Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="mt-1" /></div>
            <div><Label>Category</Label>
              <Select value={form.category_id} onValueChange={v => setForm(p => ({ ...p, category_id: v }))}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Date</Label><Input type="date" value={form.expense_date} onChange={e => setForm(p => ({ ...p, expense_date: e.target.value }))} className="mt-1" /></div>
              <div><Label>Payment Method</Label>
                <Select value={form.payment_method} onValueChange={(v: PaymentMethod) => setForm(p => ({ ...p, payment_method: v }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="mpesa">M-Pesa</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="mt-1" rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
