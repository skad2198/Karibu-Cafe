'use client';
import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/core';
import { PageHeader, LoadingState, EmptyState } from '@/components/shared';
import { useToast } from '@/components/ui/toast';
import { Clock, LogIn, LogOut, CheckCircle2 } from 'lucide-react';
import { formatDateTime, formatDate } from '@/lib/utils';
import { useLang } from '@/lib/i18n/context';
import type { AttendanceLog } from '@/types';

export default function StaffAttendancePage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const { toast } = useToast();
  const { t } = useLang();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<AttendanceLog | null>(null);
  const [completedToday, setCompletedToday] = useState(false);
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('check_in', { ascending: false })
      .limit(30);
    const all = data || [];
    setLogs(all);

    const open = all.find(l => !l.check_out);
    setActiveSession(open || null);

    // Check if user already fully checked in+out today
    const todayStr = new Date().toISOString().split('T')[0];
    const todayDone = all.find(l => l.check_in.startsWith(todayStr) && !!l.check_out);
    setCompletedToday(!!todayDone && !open);

    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const checkIn = async () => {
    if (!user) return;
    setProcessing(true);
    const { error } = await supabase.from('attendance_logs').insert({
      branch_id: user.branch_id,
      user_id: user.id,
    });
    if (error) {
      toast({ title: 'Check-in failed', description: error.message, variant: 'error' });
    } else {
      toast({ title: t.staff.checkedInToast, variant: 'success' });
    }
    setProcessing(false);
    load();
  };

  const checkOut = async () => {
    if (!activeSession || !user) return;
    setProcessing(true);
    const { error } = await supabase
      .from('attendance_logs')
      .update({ check_out: new Date().toISOString() })
      .eq('id', activeSession.id);
    if (error) {
      toast({ title: 'Check-out failed', description: error.message, variant: 'error' });
    } else {
      toast({ title: t.staff.checkedOutToast, variant: 'success' });
    }
    setProcessing(false);
    load();
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader title={t.staff.title} description={user?.full_name || ''} />

      {/* Check in/out card */}
      <Card className="mb-6">
        <CardContent className="p-6 text-center">
          {activeSession ? (
            <div>
              <div className="flex items-center justify-center gap-2 text-success mb-3">
                <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
                <span className="font-medium">{t.staff.checkedIn}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t.staff.since} {formatDateTime(activeSession.check_in)}
              </p>
              <Button size="xl" variant="destructive" onClick={checkOut} disabled={processing}>
                <LogOut className="h-5 w-5 mr-2" /> {t.staff.checkOut}
              </Button>
            </div>
          ) : completedToday ? (
            <div>
              <div className="flex items-center justify-center gap-2 text-success mb-3">
                <CheckCircle2 className="h-6 w-6" />
                <span className="font-semibold">{t.staff.attendanceComplete}</span>
              </div>
              <p className="text-sm text-muted-foreground">{t.staff.attendanceCompleteDesc}</p>
            </div>
          ) : (
            <div>
              <p className="text-muted-foreground mb-4">{t.staff.notCheckedIn}</p>
              <Button size="xl" onClick={checkIn} disabled={processing}>
                <LogIn className="h-5 w-5 mr-2" /> {t.staff.checkIn}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <h3 className="font-semibold mb-3">{t.staff.recentHistory}</h3>
      {logs.length === 0 ? (
        <EmptyState title={t.staff.noRecords} />
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">{t.staff.date}</th>
                <th className="text-left p-3 font-medium">{t.staff.checkInCol}</th>
                <th className="text-left p-3 font-medium">{t.staff.checkOutCol}</th>
                <th className="text-right p-3 font-medium">{t.staff.hours}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map(l => (
                <tr key={l.id}>
                  <td className="p-3">{formatDate(l.check_in)}</td>
                  <td className="p-3">{formatDateTime(l.check_in)}</td>
                  <td className="p-3">
                    {l.check_out
                      ? formatDateTime(l.check_out)
                      : <span className="text-success font-medium">{t.staff.active}</span>
                    }
                  </td>
                  <td className="p-3 text-right font-mono">
                    {l.total_hours != null ? `${Number(l.total_hours).toFixed(1)}h` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
