import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { DashboardShell } from '@/components/shared/dashboard-shell';
import { LangProvider } from '@/lib/i18n/context';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  return (
    <LangProvider>
      <DashboardShell user={user}>{children}</DashboardShell>
    </LangProvider>
  );
}
