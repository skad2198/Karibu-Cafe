'use client';

import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, Input, Label, Textarea, Badge } from '@/components/ui/core';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog-tabs';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/dialog-tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select-dropdown';
import { PageHeader, EmptyState, LoadingState, ConfirmActionDialog } from '@/components/shared';
import { useToast } from '@/components/ui/toast';
import { Plus, Edit, Trash2, Coffee, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MenuItem, MenuCategory } from '@/types';

export default function MenuManagementPage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const { toast } = useToast();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState('all');

  // Dialog state
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showCatDialog, setShowCatDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingCat, setEditingCat] = useState<MenuCategory | null>(null);

  // Form state
  const [itemForm, setItemForm] = useState({
    name: '', description: '', base_price: '', category_id: '',
    is_available: true, is_taxable: true, prep_time_minutes: '',
  });
  const [catForm, setCatForm] = useState({ name: '', description: '' });

  const load = async () => {
    if (!user?.branch_id) return;
    const [cRes, iRes] = await Promise.all([
      supabase.from('menu_categories').select('*').eq('branch_id', user.branch_id).order('sort_order'),
      supabase.from('menu_items').select('*').eq('branch_id', user.branch_id).eq('is_active', true).order('sort_order'),
    ]);
    setCategories(cRes.data || []);
    setItems(iRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const openItemDialog = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name, description: item.description || '',
        base_price: String(item.base_price), category_id: item.category_id,
        is_available: item.is_available, is_taxable: item.is_taxable,
        prep_time_minutes: item.prep_time_minutes ? String(item.prep_time_minutes) : '',
      });
    } else {
      setEditingItem(null);
      setItemForm({ name: '', description: '', base_price: '', category_id: categories[0]?.id || '', is_available: true, is_taxable: true, prep_time_minutes: '' });
    }
    setShowItemDialog(true);
  };

  const saveItem = async () => {
    if (!user?.branch_id || !itemForm.name || !itemForm.base_price || !itemForm.category_id) return;
    const payload = {
      branch_id: user.branch_id,
      name: itemForm.name,
      description: itemForm.description || null,
      base_price: parseFloat(itemForm.base_price),
      category_id: itemForm.category_id,
      is_available: itemForm.is_available,
      is_taxable: itemForm.is_taxable,
      prep_time_minutes: itemForm.prep_time_minutes ? parseInt(itemForm.prep_time_minutes) : null,
    };

    if (editingItem) {
      await supabase.from('menu_items').update(payload).eq('id', editingItem.id);
      toast({ title: 'Menu item updated', variant: 'success' });
    } else {
      await supabase.from('menu_items').insert(payload);
      toast({ title: 'Menu item created', variant: 'success' });
    }
    setShowItemDialog(false);
    load();
  };

  const toggleAvailability = async (item: MenuItem) => {
    await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id);
    load();
  };

  const openCatDialog = (cat?: MenuCategory) => {
    if (cat) { setEditingCat(cat); setCatForm({ name: cat.name, description: cat.description || '' }); }
    else { setEditingCat(null); setCatForm({ name: '', description: '' }); }
    setShowCatDialog(true);
  };

  const saveCat = async () => {
    if (!user?.branch_id || !catForm.name) return;
    if (editingCat) {
      await supabase.from('menu_categories').update({ name: catForm.name, description: catForm.description || null }).eq('id', editingCat.id);
    } else {
      await supabase.from('menu_categories').insert({ branch_id: user.branch_id, name: catForm.name, description: catForm.description || null });
    }
    setShowCatDialog(false);
    load();
  };

  const filteredItems = selectedCat === 'all' ? items : items.filter(i => i.category_id === selectedCat);

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Menu Management"
        description="Manage categories and menu items"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openCatDialog()}>
              <Plus className="h-4 w-4 mr-1" /> Category
            </Button>
            <Button onClick={() => openItemDialog()}>
              <Plus className="h-4 w-4 mr-1" /> Menu Item
            </Button>
          </div>
        }
      />

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
        <Button variant={selectedCat === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCat('all')}>
          All ({items.length})
        </Button>
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center gap-1">
            <Button
              variant={selectedCat === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCat(cat.id)}
            >
              {cat.name} ({items.filter(i => i.category_id === cat.id).length})
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCatDialog(cat)}>
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Items grid */}
      {filteredItems.length === 0 ? (
        <EmptyState title="No menu items" description="Add your first menu item" action={
          <Button onClick={() => openItemDialog()}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
        } />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => (
            <Card key={item.id} className={cn(!item.is_available && 'opacity-60')}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{item.name}</h3>
                    {item.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>}
                    <p className="text-lg font-bold text-primary mt-2">${Number(item.base_price).toFixed(2)} <span className="text-xs font-normal text-muted-foreground">USD HT</span></p>
                    <div className="flex items-center gap-2 mt-2">
                      {!item.is_available && <Badge variant="warning">Unavailable</Badge>}
                      {item.is_taxable && <Badge variant="secondary">Taxable</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 ml-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openItemDialog(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleAvailability(item)}>
                      {item.is_available ? <ToggleRight className="h-4 w-4 text-success" /> : <ToggleLeft className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Menu Item' : 'New Menu Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={itemForm.name} onChange={e => setItemForm(p => ({ ...p, name: e.target.value }))} className="mt-1" /></div>
            <div><Label>Description</Label><Textarea value={itemForm.description} onChange={e => setItemForm(p => ({ ...p, description: e.target.value }))} className="mt-1" rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Price (KES) *</Label><Input type="number" step="0.01" value={itemForm.base_price} onChange={e => setItemForm(p => ({ ...p, base_price: e.target.value }))} className="mt-1" /></div>
              <div><Label>Prep Time (min)</Label><Input type="number" value={itemForm.prep_time_minutes} onChange={e => setItemForm(p => ({ ...p, prep_time_minutes: e.target.value }))} className="mt-1" /></div>
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={itemForm.category_id} onValueChange={v => setItemForm(p => ({ ...p, category_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={itemForm.is_available} onChange={e => setItemForm(p => ({ ...p, is_available: e.target.checked }))} className="rounded" />
                Available
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={itemForm.is_taxable} onChange={e => setItemForm(p => ({ ...p, is_taxable: e.target.checked }))} className="rounded" />
                Taxable
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>Cancel</Button>
            <Button onClick={saveItem}>{editingItem ? 'Save Changes' : 'Create Item'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={showCatDialog} onOpenChange={setShowCatDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingCat ? 'Edit Category' : 'New Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} className="mt-1" /></div>
            <div><Label>Description</Label><Input value={catForm.description} onChange={e => setCatForm(p => ({ ...p, description: e.target.value }))} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCatDialog(false)}>Cancel</Button>
            <Button onClick={saveCat}>{editingCat ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
