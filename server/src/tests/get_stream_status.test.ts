
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { streamStatusTable } from '../db/schema';
import { getStreamStatus } from '../handlers/get_stream_status';

describe('getStreamStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return default status when no record exists', async () => {
    const result = await getStreamStatus();

    expect(result.is_paused).toBe(false);
    expect(result.total_logs).toBe(0);
    expect(result.last_update).toBeInstanceOf(Date);
  });

  it('should create default record in database when none exists', async () => {
    await getStreamStatus();

    const records = await db.select()
      .from(streamStatusTable)
      .execute();

    expect(records).toHaveLength(1);
    expect(records[0].is_paused).toBe('false');
    expect(records[0].total_logs).toBe(0);
    expect(records[0].last_update).toBeInstanceOf(Date);
  });

  it('should return existing status when record exists', async () => {
    // Create a status record first
    await db.insert(streamStatusTable)
      .values({
        is_paused: 'true',
        total_logs: 150
      })
      .execute();

    const result = await getStreamStatus();

    expect(result.is_paused).toBe(true);
    expect(result.total_logs).toBe(150);
    expect(result.last_update).toBeInstanceOf(Date);
  });

  it('should convert string boolean correctly', async () => {
    // Test false conversion
    await db.insert(streamStatusTable)
      .values({
        is_paused: 'false',
        total_logs: 25
      })
      .execute();

    const falseResult = await getStreamStatus();
    expect(falseResult.is_paused).toBe(false);
    expect(typeof falseResult.is_paused).toBe('boolean');

    // Clear and test true conversion
    await db.delete(streamStatusTable).execute();
    
    await db.insert(streamStatusTable)
      .values({
        is_paused: 'true',
        total_logs: 75
      })
      .execute();

    const trueResult = await getStreamStatus();
    expect(trueResult.is_paused).toBe(true);
    expect(typeof trueResult.is_paused).toBe('boolean');
  });

  it('should return only the first record when multiple exist', async () => {
    // Insert multiple records (edge case)
    await db.insert(streamStatusTable)
      .values([
        { is_paused: 'true', total_logs: 100 },
        { is_paused: 'false', total_logs: 200 }
      ])
      .execute();

    const result = await getStreamStatus();

    // Should return the first record
    expect(result.is_paused).toBe(true);
    expect(result.total_logs).toBe(100);
    expect(result.last_update).toBeInstanceOf(Date);
  });
});
