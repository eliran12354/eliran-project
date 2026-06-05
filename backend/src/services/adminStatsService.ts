import { count } from '../config/database.js';

export type AdminDashboardStats = {
  usersCount: number;
  propertiesCount: number;
  contactSubmissionsCount: number;
};

// Table names are hardcoded constants (never user input), so interpolation is safe here.
const COUNTABLE_TABLES = ['users', 'properties', 'contact_submissions'] as const;
type CountableTable = (typeof COUNTABLE_TABLES)[number];

async function countRows(table: CountableTable): Promise<number> {
  try {
    return await count(`SELECT count(*)::int AS count FROM ${table}`);
  } catch (err) {
    console.error(`adminStats count ${table}:`, err);
    return 0;
  }
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
