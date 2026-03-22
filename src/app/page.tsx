import { redirect } from 'next/navigation';
import { getSessionUser, getDashboardPath } from '@/lib/auth/session';

export default async function HomePage() {
  const user = await getSessionUser();
  if (user) {
    redirect(getDashboardPath(user));
  }
  redirect('/login');
}
