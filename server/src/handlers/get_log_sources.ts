
import { db } from '../db';
import { logsTable } from '../db/schema';
import { sql } from 'drizzle-orm';

export const getLogSources = async (): Promise<string[]> => {
  try {
    // Get distinct sources from logs table, ordered alphabetically
    const result = await db
      .select({ source: logsTable.source })
      .from(logsTable)
      .where(sql`${logsTable.source} IS NOT NULL AND ${logsTable.source} != ''`)
      .groupBy(logsTable.source)
      .orderBy(logsTable.source)
      .execute();

    return result.map(row => row.source);
  } catch (error) {
    console.error('Failed to get log sources:', error);
    throw error;
  }
};
