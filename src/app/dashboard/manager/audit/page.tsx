'use client';
import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { useUser } from '@/hooks/use-user';
import { PageHeader, LoadingState, EmptyState, StatusBadge } from '@/components/shared';
import { Badge } from '@/components/ui/core';
import { Shield } from 'lucide-react';
import { formatDateTime, capitalize } from '@/lib/utils';

export default function AuditLogPage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.branch_id) return;
    supabase.from('audit_logs').select('*, profile:profiles(full_name)')
      .eq('branch_id', user.branch_id).order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => { setLogs((data || []).map(l => ({ ...l, profile: Array.isArray(l.profile) ? l.profile[0] : l.profile }))); setLoading(false); });
  }, [user]);

  if (loading) return <LoadingState />;
  return (
    <div>
      <PageHeader title="Audit Log" description="Track critical system changes" />
      {logs.length === 0 ? <EmptyState title="No audit entries" icon={<Shield className="h-8 w-8 text-muted-foreground" />} /> : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm"><thead className="bg-muted/50"><tr>
            <th className="text-left p-3 font-medium">Time</th><th className="text-left p-3 font-medium">User</th>
            <th className="text-left p-3 font-medium">Action</th><th className="text-left p-3 font-medium">Entity</th>
            <th className="text-left p-3 font-medium">Description</th>
          </tr></thead><tbody className="divide-y">
            {logs.map(l => (
              <tr key={l.id}>
                <td className="p-3 text-xs whitespace-nowrap">{formatDateTime(l.created_at)}</td>
                <td className="p-3">{l.profile?.full_name || '—'}</td>
                <td className="p-3"><Badge variant="secondary">{capitalize(l.action)}</Badge></td>
                <td className="p-3 text-muted-foreground">{capitalize(l.entity_type)}</td>
                <td className="p-3 text-muted-foreground text-xs max-w-xs truncate">{l.description || '—'}</td>
              </tr>))}
          </tbody></table></div>
      )}
    </div>
  );
}
