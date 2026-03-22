import { redirect } from 'next/navigation';
import { getSessionUser, getDashboardPath } from '@/lib/auth/session';
import { DashboardShell } from '@/components/shared/dashboard-shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
