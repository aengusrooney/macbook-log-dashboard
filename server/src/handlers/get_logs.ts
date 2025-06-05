
import { db } from '../db';
import { logsTable } from '../db/schema';
import { type LogFilterInput, type LogEntry, logFilterInputSchema } from '../schema';
import { and, desc, gte, lte, eq, or, ilike, type SQL } from 'drizzle-orm';

export const getLogs = async (input: LogFilterInput = { limit: 100, offset: 0 }): Promise<LogEntry[]> => {
  try {
    // Parse input to ensure defaults are applied
    const filter = logFilterInputSchema.parse(input);

    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    if (filter.level) {
      conditions.push(eq(logsTable.level, filter.level));
    }

    if (filter.type) {
      conditions.push(eq(logsTable.type, filter.type));
    }

    if (filter.source) {
      conditions.push(eq(logsTable.source, filter.source));
    }

    if (filter.keyword) {
      conditions.push(
        or(
          ilike(logsTable.message, `%${filter.keyword}%`),
          ilike(logsTable.raw_content, `%${filter.keyword}%`)
        )!
      );
    }

    if (filter.start_time) {
      conditions.push(gte(logsTable.timestamp, filter.start_time));
    }

    if (filter.end_time) {
      conditions.push(lte(logsTable.timestamp, filter.end_time));
    }

    // Build the complete query at once to avoid type issues
    let results;
    
    if (conditions.length === 0) {
      // No filters - simple query
      results = await db
        .select()
        .from(logsTable)
        .orderBy(desc(logsTable.timestamp))
        .limit(filter.limit)
        .offset(filter.offset)
        .execute();
    } else if (conditions.length === 1) {
      // Single condition
      results = await db
        .select()
        .from(logsTable)
        .where(conditions[0])
        .orderBy(desc(logsTable.timestamp))
        .limit(filter.limit)
        .offset(filter.offset)
        .execute();
    } else {
      // Multiple conditions
      results = await db
        .select()
        .from(logsTable)
        .where(and(...conditions))
        .orderBy(desc(logsTable.timestamp))
        .limit(filter.limit)
        .offset(filter.offset)
        .execute();
    }

    return results;
  } catch (error) {
    console.error('Failed to get logs:', error);
    throw error;
  }
};
