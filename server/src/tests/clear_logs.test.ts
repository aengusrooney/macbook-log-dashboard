
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { logsTable, streamStatusTable } from '../db/schema';
import { type CreateLogEntryInput } from '../schema';
import { clearLogs } from '../handlers/clear_logs';
import { eq } from 'drizzle-orm';

// Test log data
const testLogEntry: CreateLogEntryInput = {
  timestamp: new Date(),
  level: 'info',
  type: 'application',
  source: 'test-app',
  message: 'Test log message',
  raw_content: '[INFO] Test log message'
};

describe('clearLogs', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should clear all logs successfully', async () => {
    // Create some test log entries
    await db.insert(logsTable)
      .values([
        {
          timestamp: testLogEntry.timestamp!,
          level: testLogEntry.level,
          type: testLogEntry.type,
          source: testLogEntry.source,
          message: testLogEntry.message,
          raw_content: testLogEntry.raw_content
        },
        {
          timestamp: new Date(),
          level: 'error',
          type: 'system',
          source: 'test-system',
          message: 'Error message',
          raw_content: '[ERROR] Error message'
        }
      ])
      .execute();

    // Verify logs exist before clearing
    const logsBefore = await db.select().from(logsTable).execute();
    expect(logsBefore).toHaveLength(2);

    // Clear logs
    const result = await clearLogs();

    // Verify response
    expect(result.success).toBe(true);
    expect(result.message).toEqual('All logs cleared successfully');

    // Verify all logs are deleted
    const logsAfter = await db.select().from(logsTable).execute();
    expect(logsAfter).toHaveLength(0);
  });

  it('should reset stream status total_logs counter when status exists', async () => {
    // Create initial stream status with some log count
    await db.insert(streamStatusTable)
      .values({
        is_paused: 'false',
        total_logs: 50,
        last_update: new Date()
      })
      .execute();

    // Clear logs
    const result = await clearLogs();

    expect(result.success).toBe(true);

    // Verify stream status was updated
    const streamStatus = await db.select()
      .from(streamStatusTable)
      .execute();

    expect(streamStatus).toHaveLength(1);
    expect(streamStatus[0].total_logs).toEqual(0);
    expect(streamStatus[0].is_paused).toEqual('false');
    expect(streamStatus[0].last_update).toBeInstanceOf(Date);
  });

  it('should create stream status record if none exists', async () => {
    // Verify no stream status exists initially
    const statusBefore = await db.select()
      .from(streamStatusTable)
      .execute();
    expect(statusBefore).toHaveLength(0);

    // Clear logs
    const result = await clearLogs();

    expect(result.success).toBe(true);

    // Verify stream status was created
    const streamStatus = await db.select()
      .from(streamStatusTable)
      .execute();

    expect(streamStatus).toHaveLength(1);
    expect(streamStatus[0].total_logs).toEqual(0);
    expect(streamStatus[0].is_paused).toEqual('false');
    expect(streamStatus[0].last_update).toBeInstanceOf(Date);
  });

  it('should work when no logs exist', async () => {
    // Verify no logs exist initially
    const logsBefore = await db.select().from(logsTable).execute();
    expect(logsBefore).toHaveLength(0);

    // Clear logs
    const result = await clearLogs();

    expect(result.success).toBe(true);
    expect(result.message).toEqual('All logs cleared successfully');

    // Verify still no logs and stream status is properly handled
    const logsAfter = await db.select().from(logsTable).execute();
    expect(logsAfter).toHaveLength(0);

    const streamStatus = await db.select()
      .from(streamStatusTable)
      .execute();
    expect(streamStatus).toHaveLength(1);
    expect(streamStatus[0].total_logs).toEqual(0);
  });
});
