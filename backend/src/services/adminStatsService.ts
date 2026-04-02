import { supabase } from '../config/database.js';

export type AdminDashboardStats = {
  usersCount: number;
  propertiesCount: number;
  contactSubmissionsCount: number;
};

async function countRows(table: string): Promise<number> {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) {
    console.error(`adminStats count ${table}:`, error);
    return 0;
  }
  return count ?? 0;
}

export async function getDashboardStats(): Promise<AdminDashboardStats> {
  const [usersCount, propertiesCount, contactSubmissionsCount] = await Promise.all([
    countRows('users'),
    countRows('properties'),
    countRows('contact_submissions'),
  ]);

  return {
    usersCount,
    propertiesCount,
    contactSubmissionsCount,
  };
}
