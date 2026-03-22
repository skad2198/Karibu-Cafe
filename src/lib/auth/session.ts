import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { AppRole, SessionUser } from '@/types';
import { redirect } from 'next/navigation';

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);

  return {
    id: user.id,
    email: profile.email,
    full_name: profile.full_name,
    branch_id: profile.branch_id,
    roles: (userRoles || []).map((r: { role: AppRole }) => r.role),
    avatar_url: profile.avatar_url,
  };
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireRole(allowedRoles: AppRole[]): Promise<SessionUser> {
  const user = await requireAuth();
  const hasAccess = user.roles.some(r => allowedRoles.includes(r));
  if (!hasAccess) redirect('/dashboard');
  return user;
}

export function hasRole(user: SessionUser, role: AppRole): boolean {
  return user.roles.includes(role);
}

export function isAdminOrManager(user: SessionUser): boolean {
  return user.roles.includes('admin') || user.roles.includes('manager');
}

export function getPrimaryRole(user: SessionUser): AppRole {
  const priority: AppRole[] = ['admin', 'manager', 'cashier', 'waiter', 'kitchen', 'staff'];
  return priority.find(r => user.roles.includes(r)) || 'staff';
}

export function getDashboardPath(user: SessionUser): string {
  const role = getPrimaryRole(user);
  switch (role) {
    case 'admin': return '/dashboard/admin';
    case 'manager': return '/dashboard/manager';
    case 'cashier': return '/dashboard/cashier';
    case 'waiter': return '/dashboard/waiter';
    case 'kitchen': return '/dashboard/kitchen';
    case 'staff': return '/dashboard/staff';
    default: return '/dashboard';
  }
}
