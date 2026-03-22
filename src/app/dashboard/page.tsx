import { redirect } from 'next/navigation';
import { getSessionUser, getDashboardPath } from '@/lib/auth/session';

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  redirect(getDashboardPath(user));
}
