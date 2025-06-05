
import { db } from '../db';
import { logsTable } from '../db/schema';
import { type LogEntry } from '../schema';
import { or, ilike } from 'drizzle-orm';

export const searchLogs = async (keyword: string, limit: number = 100): Promise<LogEntry[]> => {
  try {
    // Build query to search in message and raw_content fields
    let query = db.select()
      .from(logsTable)
      .where(
        or(
          ilike(logsTable.message, `%${keyword}%`),
          ilike(logsTable.raw_content, `%${keyword}%`)
        )
      )
      .limit(limit);

    const results = await query.execute();

    // Convert database results to schema format
    return results.map(result => ({
      id: result.id,
      timestamp: result.timestamp,
      level: result.level,
      type: result.type,
      source: result.source,
      message: result.message,
      raw_content: result.raw_content,
      created_at: result.created_at
    }));
  } catch (error) {
    console.error('Log search failed:', error);
    throw error;
  }
};
