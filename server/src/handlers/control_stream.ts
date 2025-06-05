
import { db } from '../db';
import { streamStatusTable } from '../db/schema';
import { type StreamControlInput, type StreamStatus } from '../schema';
import { sql } from 'drizzle-orm';

export const controlStream = async (input: StreamControlInput): Promise<StreamStatus> => {
  try {
    // Check if a status record already exists
    const existingStatus = await db.select()
      .from(streamStatusTable)
      .limit(1)
      .execute();

    let result;
    const currentTime = new Date();

    if (existingStatus.length === 0) {
      // No existing record, create new one
      let initialValues = {
        is_paused: 'false',
        last_update: currentTime,
        total_logs: 0
      };

      // Apply action-specific changes
      switch (input.action) {
        case 'pause':
          initialValues.is_paused = 'true';
          break;
        case 'resume':
          initialValues.is_paused = 'false';
          break;
        case 'clear':
          await db.execute(sql`DELETE FROM logs`);
          initialValues.total_logs = 0;
          break;
      }

      result = await db.insert(streamStatusTable)
        .values(initialValues)
        .returning()
        .execute();

      return {
        is_paused: result[0].is_paused === 'true',
        last_update: result[0].last_update,
        total_logs: result[0].total_logs
      };
    } else {
      // Update existing record
      const existing = existingStatus[0];
      let updateValues: Partial<typeof streamStatusTable.$inferInsert> = {
        last_update: currentTime
      };

      switch (input.action) {
        case 'pause':
          updateValues.is_paused = 'true';
          break;
        case 'resume':
          updateValues.is_paused = 'false';
          break;
        case 'clear':
          await db.execute(sql`DELETE FROM logs`);
          updateValues.total_logs = 0;
          break;
      }

      result = await db.update(streamStatusTable)
        .set(updateValues)
        .where(sql`id = ${existing.id}`)
        .returning()
        .execute();

      return {
        is_paused: result[0].is_paused === 'true',
        last_update: result[0].last_update,
        total_logs: result[0].total_logs
      };
    }
  } catch (error) {
    console.error('Stream control failed:', error);
    throw error;
  }
};
