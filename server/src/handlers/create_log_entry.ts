
import { db } from '../db';
import { logsTable } from '../db/schema';
import { type CreateLogEntryInput, type LogEntry } from '../schema';

export const createLogEntry = async (input: CreateLogEntryInput): Promise<LogEntry> => {
  try {
    // Use current timestamp if not provided
    const timestamp = input.timestamp || new Date();

    // Insert log entry record
    const result = await db.insert(logsTable)
      .values({
        timestamp,
        level: input.level,
        type: input.type,
        source: input.source,
        message: input.message,
        raw_content: input.raw_content
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Log entry creation failed:', error);
    throw error;
  }
};
