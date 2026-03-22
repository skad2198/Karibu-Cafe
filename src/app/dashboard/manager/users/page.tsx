'use client';
import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/use-supabase';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, Input, Label, Badge } from '@/components/ui/core';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog-tabs';
import { PageHeader, LoadingState, EmptyState, StatusBadge } from '@/components/shared';
import { useToast } from '@/components/ui/toast';
import { Plus, Edit, Users, Shield } from 'lucide-react';
import { capitalize, cn } from '@/lib/utils';
import type { Profile, UserRole, AppRole } from '@/types';

const ALL_ROLES: AppRole[] = ['admin', 'manager', 'waiter', 'kitchen', 'staff'];

export default function UsersPage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<(Profile & { roles: UserRole[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<(Profile & { roles: UserRole[] }) | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);

  const load = async () => {
    if (!user?.branch_id) return;
    const { data: profs } = await supabase.from('profiles').select('*').order('full_name');
    const { data: roles } = await supabase.from('user_roles').select('*');
    const merged = (profs || []).map(p => ({
      ...p,
      roles: (roles || []).filter(r => r.user_id === p.id),
    }));
    setProfiles(merged);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const openRoleDialog = (p: Profile & { roles: UserRole[] }) => {
    setSelectedProfile(p);
    setSelectedRoles(p.roles.map(r => r.role));
    setShowRoleDialog(true);
  };

  const saveRoles = async () => {
    if (!selectedProfile || !user) return;
    // Delete existing roles
    await supabase.from('user_roles').delete().eq('user_id', selectedProfile.id);
    // Insert new roles
    if (selectedRoles.length > 0) {
      await supabase.from('user_roles').insert(
        selectedRoles.map(role => ({
          user_id: selectedProfile.id, role, branch_id: user.branch_id, granted_by: user.id,
        }))
      );
    }
    toast({ title: 'Roles updated', variant: 'success' });
    setShowRoleDialog(false); load();
  };

  if (loading) return <LoadingState />;
  return (
    <div>
      <PageHeader title="Users" description={`${profiles.length} users`} />
      {profiles.length === 0 ? <EmptyState title="No users" icon={<Users className="h-8 w-8 text-muted-foreground" />} /> : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm"><thead className="bg-muted/50"><tr>
            <th className="text-left p-3 font-medium">Name</th><th className="text-left p-3 font-medium">Email</th>
            <th className="text-left p-3 font-medium">Roles</th><th className="text-center p-3 font-medium">Status</th>
            <th className="text-center p-3 font-medium">Actions</th>
          </tr></thead><tbody className="divide-y">
            {profiles.map(p => (
              <tr key={p.id}><td className="p-3 font-medium">{p.full_name}</td><td className="p-3 text-muted-foreground">{p.email}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {p.roles.map(r => <Badge key={r.id} variant="secondary">{capitalize(r.role)}</Badge>)}
                    {p.roles.length === 0 && <span className="text-muted-foreground text-xs">No roles</span>}
                  </div>
                </td>
                <td className="p-3 text-center"><StatusBadge status={p.is_active ? 'active' : 'inactive'} /></td>
                <td className="p-3 text-center"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openRoleDialog(p)}><Shield className="h-4 w-4" /></Button></td>
              </tr>))}
          </tbody></table></div>
      )}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Manage Roles: {selectedProfile?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {ALL_ROLES.map(role => (
              <label key={role} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer">
                <input type="checkbox" checked={selectedRoles.includes(role)}
                  onChange={e => setSelectedRoles(prev => e.target.checked ? [...prev, role] : prev.filter(r => r !== role))}
                  className="rounded" />
                <span className="font-medium capitalize">{role}</span>
              </label>
            ))}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowRoleDialog(false)}>Cancel</Button><Button onClick={saveRoles}>Save Roles</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
