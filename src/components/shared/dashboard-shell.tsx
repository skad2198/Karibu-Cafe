'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useSupabase } from '@/hooks/use-supabase';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/select-dropdown';
import {
  Coffee, LayoutDashboard, UtensilsCrossed, ChefHat,
  Package, Truck, Receipt, Calculator, Clock, Users,
  FileText, LogOut, Menu, X, Sun, Moon, ClipboardList, Warehouse, Shield, CreditCard, ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLang } from '@/lib/i18n/context';
import type { SessionUser, AppRole } from '@/types';

interface NavItem {
  labelKey: string;
  href: string;
  icon: React.ReactNode;
  roles: AppRole[];
}

const navItems: NavItem[] = [
  { labelKey: 'dashboard',      href: '/dashboard/manager',             icon: <LayoutDashboard className="h-5 w-5" />, roles: ['admin', 'manager'] },
  { labelKey: 'orders',         href: '/dashboard/waiter',              icon: <UtensilsCrossed className="h-5 w-5" />, roles: ['admin', 'manager', 'waiter'] },
  { labelKey: 'cashier',        href: '/dashboard/cashier',             icon: <ShoppingBag className="h-5 w-5" />,     roles: ['admin', 'manager', 'cashier'] },
  { labelKey: 'billing',        href: '/dashboard/manager/billing',     icon: <CreditCard className="h-5 w-5" />,      roles: ['admin', 'manager'] },
  { labelKey: 'kitchen',        href: '/dashboard/kitchen',             icon: <ChefHat className="h-5 w-5" />,         roles: ['admin', 'manager', 'kitchen'] },
  { labelKey: 'menu',           href: '/dashboard/manager/menu',        icon: <Coffee className="h-5 w-5" />,          roles: ['admin', 'manager'] },
  { labelKey: 'tables',         href: '/dashboard/manager/tables',      icon: <ClipboardList className="h-5 w-5" />,   roles: ['admin', 'manager'] },
  { labelKey: 'suppliers',      href: '/dashboard/manager/suppliers',   icon: <Truck className="h-5 w-5" />,           roles: ['admin', 'manager'] },
  { labelKey: 'inventory',      href: '/dashboard/manager/inventory',   icon: <Package className="h-5 w-5" />,         roles: ['admin', 'manager'] },
  { labelKey: 'assets',         href: '/dashboard/manager/assets',      icon: <Warehouse className="h-5 w-5" />,       roles: ['admin', 'manager'] },
  { labelKey: 'expenses',       href: '/dashboard/manager/expenses',    icon: <Receipt className="h-5 w-5" />,         roles: ['admin', 'manager'] },
  { labelKey: 'reconciliation', href: '/dashboard/manager/reconciliation', icon: <Calculator className="h-5 w-5" />,  roles: ['admin', 'manager'] },
  { labelKey: 'reports',        href: '/dashboard/manager/reports',     icon: <FileText className="h-5 w-5" />,        roles: ['admin', 'manager'] },
  { labelKey: 'attendance',     href: '/dashboard/staff',               icon: <Clock className="h-5 w-5" />,           roles: ['admin', 'manager', 'staff', 'waiter', 'kitchen', 'cashier'] },
  { labelKey: 'users',          href: '/dashboard/manager/users',       icon: <Users className="h-5 w-5" />,           roles: ['admin', 'manager'] },
  { labelKey: 'auditLog',       href: '/dashboard/manager/audit',       icon: <Shield className="h-5 w-5" />,          roles: ['admin', 'manager'] },
];

export function DashboardShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useSupabase();
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t } = useLang();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleItems = navItems.filter(item => item.roles.some(r => user.roles.includes(r)));

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 lg:relative lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b px-4">
            <Coffee className="h-7 w-7 text-primary" />
            <span className="text-lg font-bold">Karibu Café</span>
            <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {visibleItems.map(item => {
              const label = t.nav[item.labelKey as keyof typeof t.nav] ?? item.labelKey;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors touch-target',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {item.icon}
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div className="border-t p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-accent transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                    {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium truncate">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user.roles.join(', ')}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                  {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  {theme === 'dark' ? 'Light Mode' : 'Mode Clair'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {lang === 'en' ? 'Sign Out' : 'Déconnexion'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur px-4 lg:px-6">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1" />

          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'fr' : 'en')}
            className="px-3 py-1.5 rounded-md border text-xs font-semibold hover:bg-accent transition-colors"
            title={lang === 'en' ? 'Switch to French' : 'Passer en anglais'}
          >
            {lang === 'en' ? 'FR' : 'EN'}
          </button>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse-gentle" />
            {t.common.online}
          </div>
        </header>

        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
