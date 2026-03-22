'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from './use-supabase';
import type { SessionUser, AppRole } from '@/types';

export function useUser() {
  const supabase = useSupabase();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) { setUser(null); setLoading(false); return; }

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', authUser.id);

        if (profile) {
          setUser({
            id: authUser.id,
            email: profile.email,
            full_name: profile.full_name,
            branch_id: profile.branch_id,
            roles: (roles || []).map((r: { role: AppRole }) => r.role),
            avatar_url: profile.avatar_url,
          });
        }
      } catch (err) {
        console.error('Error loading user:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return { user, loading };
}
