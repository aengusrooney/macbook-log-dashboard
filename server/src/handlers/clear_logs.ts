
import { db } from '../db';
import { logsTable, streamStatusTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const clearLogs = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // Delete all log entries
    await db.delete(logsTable).execute();

    // Reset the total_logs counter in stream status
    // First, check if a stream status record exists
    const existingStatus = await db.select()
      .from(streamStatusTable)
      .limit(1)
      .execute();

    if (existingStatus.length > 0) {
      // Update existing record
      await db.update(streamStatusTable)
        .set({
          total_logs: 0,
          last_update: new Date()
        })
        .where(eq(streamStatusTable.id, existingStatus[0].id))
        .execute();
    } else {
      // Create initial record if none exists
      await db.insert(streamStatusTable)
        .values({
          is_paused: 'false',
          total_logs: 0,
          last_update: new Date()
        })
        .execute();
    }

    return {
      success: true,
      message: 'All logs cleared successfully'
    };
  } catch (error) {
    console.error('Clear logs failed:', error);
    throw error;
  }
};
