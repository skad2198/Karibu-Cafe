'use client';
import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/core';
import { PageHeader, LoadingState, EmptyState } from '@/components/shared';
import { useToast } from '@/components/ui/toast';
import { Clock, LogIn, LogOut } from 'lucide-react';
import { formatDateTime, formatDate, cn } from '@/lib/utils';
import type { AttendanceLog } from '@/types';

export default function StaffAttendancePage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const { toast } = useToast();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<AttendanceLog | null>(null);
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('attendance_logs').select('*').eq('user_id', user.id).order('check_in', { ascending: false }).limit(30);
    const all = data || [];
    setLogs(all);
    const open = all.find(l => !l.check_out);
    setActiveSession(open || null);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const checkIn = async () => {
    if (!user) return;
    setProcessing(true);
    await supabase.from('attendance_logs').insert({ branch_id: user.branch_id, user_id: user.id });
    toast({ title: 'Checked in', variant: 'success' });
    setProcessing(false); load();
  };

  const checkOut = async () => {
    if (!activeSession || !user) return;
    setProcessing(true);
    await supabase.from('attendance_logs').update({ check_out: new Date().toISOString() }).eq('id', activeSession.id);
    toast({ title: 'Checked out', variant: 'success' });
    setProcessing(false); load();
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Attendance" description={user?.full_name || ''} />

      {/* Check in/out */}
      <Card className="mb-6">
        <CardContent className="p-6 text-center">
          {activeSession ? (
            <div>
              <div className="flex items-center justify-center gap-2 text-success mb-3">
                <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
                <span className="font-medium">Currently Checked In</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Since {formatDateTime(activeSession.check_in)}</p>
              <Button size="xl" variant="destructive" onClick={checkOut} disabled={processing}>
                <LogOut className="h-5 w-5 mr-2" /> Check Out
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-muted-foreground mb-4">You are not checked in</p>
              <Button size="xl" onClick={checkIn} disabled={processing}>
                <LogIn className="h-5 w-5 mr-2" /> Check In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <h3 className="font-semibold mb-3">Recent History</h3>
      {logs.length === 0 ? <EmptyState title="No attendance records" /> : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>
              <th className="text-left p-3 font-medium">Date</th>
              <th className="text-left p-3 font-medium">Check In</th>
              <th className="text-left p-3 font-medium">Check Out</th>
              <th className="text-right p-3 font-medium">Hours</th>
            </tr></thead>
            <tbody className="divide-y">
              {logs.map(l => (
                <tr key={l.id}>
                  <td className="p-3">{formatDate(l.check_in)}</td>
                  <td className="p-3">{formatDateTime(l.check_in)}</td>
                  <td className="p-3">{l.check_out ? formatDateTime(l.check_out) : <span className="text-success">Active</span>}</td>
                  <td className="p-3 text-right font-mono">{l.total_hours ? `${l.total_hours}h` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
