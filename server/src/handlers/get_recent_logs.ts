
import { db } from '../db';
import { logsTable } from '../db/schema';
import { type LogEntry } from '../schema';
import { desc } from 'drizzle-orm';

export const getRecentLogs = async (limit: number = 100): Promise<LogEntry[]> => {
  try {
    const results = await db.select()
      .from(logsTable)
      .orderBy(desc(logsTable.created_at))
      .limit(limit)
      .execute();

    return results.map(log => ({
      ...log,
      timestamp: log.timestamp,
      created_at: log.created_at
    }));
  } catch (error) {
    console.error('Getting recent logs failed:', error);
    throw error;
  }
};
