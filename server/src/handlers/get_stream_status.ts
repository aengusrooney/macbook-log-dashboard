
import { db } from '../db';
import { streamStatusTable } from '../db/schema';
import { type StreamStatus } from '../schema';

export const getStreamStatus = async (): Promise<StreamStatus> => {
  try {
    // Get the stream status record (should be only one)
    const results = await db.select()
      .from(streamStatusTable)
      .limit(1)
      .execute();

    // If no status record exists, create a default one
    if (results.length === 0) {
      const defaultStatus = await db.insert(streamStatusTable)
        .values({
          is_paused: 'false',
          total_logs: 0
        })
        .returning()
        .execute();

      const status = defaultStatus[0];
      return {
        is_paused: status.is_paused === 'true',
        last_update: status.last_update,
        total_logs: status.total_logs
      };
    }

    // Convert the database record to the expected format
    const status = results[0];
    return {
      is_paused: status.is_paused === 'true',
      last_update: status.last_update,
      total_logs: status.total_logs
    };
  } catch (error) {
    console.error('Failed to get stream status:', error);
    throw error;
  }
};
