'use client';

import React, { useState } from 'react';
import { Coffee, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MenuCategory, MenuItem } from '@/types';

function formatCurrency(amount: number, currency = 'KES') {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
}

interface Props {
  branch: { id: string; name: string; currency: string };
  table: { id: string; table_number: string };
  categories: MenuCategory[];
  items: MenuItem[];
}

export function QRMenuClient({ branch, table, categories, items }: Props) {
  const [selectedCat, setSelectedCat] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const filtered = items.filter(i => {
    const matchesCat = selectedCat === 'all' || i.category_id === selectedCat;
    const matchesSearch = !search || i.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 dark:from-stone-950 dark:to-stone-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-stone-900/90 backdrop-blur border-b px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-700 flex items-center justify-center">
            <Coffee className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-stone-900 dark:text-stone-100">{branch.name}</h1>
            <p className="text-xs text-stone-500">Table {table.table_number}</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search menu..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-4 px-4 no-scrollbar">
          <button
            onClick={() => setSelectedCat('all')}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              selectedCat === 'all'
                ? 'bg-amber-700 text-white'
                : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border'
            )}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                selectedCat === cat.id
                  ? 'bg-amber-700 text-white'
                  : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Menu items */}
        <div className="space-y-3">
          {filtered.map(item => (
            <button
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="w-full bg-white dark:bg-stone-800 rounded-xl p-4 text-left shadow-sm hover:shadow-md transition-shadow border border-stone-100 dark:border-stone-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-stone-900 dark:text-stone-100">{item.name}</h3>
                  {item.description && (
                    <p className="text-sm text-stone-500 mt-0.5 line-clamp-2">{item.description}</p>
                  )}
                </div>
                <p className="text-lg font-bold text-amber-700 dark:text-amber-500 ml-4 shrink-0">
                  {formatCurrency(Number(item.base_price), branch.currency)}
                </p>
              </div>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Coffee className="h-12 w-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500">No items found</p>
          </div>
        )}

        {/* Item detail overlay */}
        {selectedItem && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setSelectedItem(null)}>
            <div className="bg-white dark:bg-stone-800 rounded-t-2xl w-full max-w-lg mx-auto p-6" onClick={e => e.stopPropagation()}>
              <div className="w-12 h-1 rounded-full bg-stone-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">{selectedItem.name}</h2>
              {selectedItem.description && (
                <p className="text-stone-500 mt-2">{selectedItem.description}</p>
              )}
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-500 mt-4">
                {formatCurrency(Number(selectedItem.base_price), branch.currency)}
              </p>
              {selectedItem.prep_time_minutes && (
                <p className="text-sm text-stone-400 mt-2">~{selectedItem.prep_time_minutes} min prep time</p>
              )}
              <button
                onClick={() => setSelectedItem(null)}
                className="w-full mt-6 py-3 rounded-xl bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-8 text-xs text-stone-400">
          <p>Powered by Karibu Café</p>
        </div>
      </div>
    </div>
  );
}
