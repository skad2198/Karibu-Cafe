import { createServerSupabaseClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { QRMenuClient } from './client';

interface Props {
  params: Promise<{ branchId: string; tableToken: string }>;
}

export default async function QRMenuPage({ params }: Props) {
  const { branchId, tableToken } = await params;
  const supabase = await createServerSupabaseClient();

  // Verify branch exists
  const { data: branch } = await supabase
    .from('branches')
    .select('id, name, currency')
    .eq('id', branchId)
    .eq('is_active', true)
    .single();

  if (!branch) notFound();

  // Verify table token
  const { data: table } = await supabase
    .from('restaurant_tables')
    .select('id, table_number')
    .eq('qr_token', tableToken)
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .single();

  if (!table) notFound();

  // Get menu
  const { data: categories } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .order('sort_order');

  const { data: items } = await supabase
    .from('menu_items')
    .select('*')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .eq('is_available', true)
    .order('sort_order');

  return (
    <QRMenuClient
      branch={branch}
      table={table}
      categories={categories || []}
      items={items || []}
    />
  );
}
