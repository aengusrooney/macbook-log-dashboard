
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { streamStatusTable, logsTable } from '../db/schema';
import { type StreamControlInput } from '../schema';
import { controlStream } from '../handlers/control_stream';

describe('controlStream', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should pause the stream', async () => {
    const input: StreamControlInput = {
      action: 'pause'
    };

    const result = await controlStream(input);

    expect(result.is_paused).toBe(true);
    expect(result.total_logs).toBe(0);
    expect(result.last_update).toBeInstanceOf(Date);

    // Verify in database
    const status = await db.select()
      .from(streamStatusTable)
      .execute();

    expect(status).toHaveLength(1);
    expect(status[0].is_paused).toBe('true');
    expect(status[0].total_logs).toBe(0);
  });

  it('should resume the stream', async () => {
    // First pause it
    await controlStream({ action: 'pause' });

    const input: StreamControlInput = {
      action: 'resume'
    };

    const result = await controlStream(input);

    expect(result.is_paused).toBe(false);
    expect(result.last_update).toBeInstanceOf(Date);

    // Verify in database - should still be only one record
    const status = await db.select()
      .from(streamStatusTable)
      .execute();

    expect(status).toHaveLength(1);
    expect(status[0].is_paused).toBe('false');
  });

  it('should clear logs and reset counter', async () => {
    // Create some test logs first
    await db.insert(logsTable).values([
      {
        timestamp: new Date(),
        level: 'info',
        type: 'system',
        source: 'test-app',
        message: 'Test message 1',
        raw_content: 'Raw log 1'
      },
      {
        timestamp: new Date(),
        level: 'error',
        type: 'application',
        source: 'test-app',
        message: 'Test message 2',
        raw_content: 'Raw log 2'
      }
    ]).execute();

    // Set initial status with some total_logs
    await db.insert(streamStatusTable).values({
      is_paused: 'false',
      total_logs: 5
    }).execute();

    const input: StreamControlInput = {
      action: 'clear'
    };

    const result = await controlStream(input);

    expect(result.total_logs).toBe(0);
    expect(result.last_update).toBeInstanceOf(Date);

    // Verify logs were cleared
    const logs = await db.select()
      .from(logsTable)
      .execute();

    expect(logs).toHaveLength(0);

    // Verify status was updated and still only one record
    const status = await db.select()
      .from(streamStatusTable)
      .execute();

    expect(status).toHaveLength(1);
    expect(status[0].total_logs).toBe(0);
  });

  it('should update existing stream status record', async () => {
    // Create initial status
    await db.insert(streamStatusTable).values({
      is_paused: 'false',
      total_logs: 10
    }).execute();

    const input: StreamControlInput = {
      action: 'pause'
    };

    const result = await controlStream(input);

    expect(result.is_paused).toBe(true);
    expect(result.total_logs).toBe(10); // Should preserve existing total

    // Verify only one record exists
    const allStatus = await db.select()
      .from(streamStatusTable)
      .execute();

    expect(allStatus).toHaveLength(1);
    expect(allStatus[0].is_paused).toBe('true');
    expect(allStatus[0].total_logs).toBe(10);
  });

  it('should handle multiple sequential actions', async () => {
    // Pause
    const pauseResult = await controlStream({ action: 'pause' });
    expect(pauseResult.is_paused).toBe(true);

    // Resume
    const resumeResult = await controlStream({ action: 'resume' });
    expect(resumeResult.is_paused).toBe(false);
    expect(resumeResult.last_update.getTime()).toBeGreaterThan(pauseResult.last_update.getTime());

    // Clear
    const clearResult = await controlStream({ action: 'clear' });
    expect(clearResult.total_logs).toBe(0);

    // Verify final state - should still be only one record
    const status = await db.select()
      .from(streamStatusTable)
      .execute();

    expect(status).toHaveLength(1);
  });

  it('should create initial record when none exists', async () => {
    // Verify no records exist initially
    const initialStatus = await db.select()
      .from(streamStatusTable)
      .execute();
    expect(initialStatus).toHaveLength(0);

    const input: StreamControlInput = {
      action: 'resume'
    };

    const result = await controlStream(input);

    expect(result.is_paused).toBe(false);
    expect(result.total_logs).toBe(0);
    expect(result.last_update).toBeInstanceOf(Date);

    // Verify record was created
    const finalStatus = await db.select()
      .from(streamStatusTable)
      .execute();
    expect(finalStatus).toHaveLength(1);
  });
});
