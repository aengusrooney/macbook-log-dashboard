
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { logsTable } from '../db/schema';
import { type LogFilterInput, type CreateLogEntryInput } from '../schema';
import { getLogs } from '../handlers/get_logs';

// Helper to create test log entries
const createTestLog = async (input: CreateLogEntryInput) => {
  const timestamp = input.timestamp || new Date();
  return await db.insert(logsTable)
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
};

describe('getLogs', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all logs when no filter is provided', async () => {
    // Create test logs
    await createTestLog({
      level: 'info',
      type: 'application',
      source: 'test-app',
      message: 'Test message 1',
      raw_content: 'Raw content 1'
    });

    await createTestLog({
      level: 'error',
      type: 'system',
      source: 'test-system',
      message: 'Test message 2',
      raw_content: 'Raw content 2'
    });

    const results = await getLogs();

    expect(results).toHaveLength(2);
    expect(results[0].level).toBeDefined();
    expect(results[0].message).toBeDefined();
    expect(results[0].timestamp).toBeInstanceOf(Date);
    expect(results[0].created_at).toBeInstanceOf(Date);
  });

  it('should filter logs by level', async () => {
    await createTestLog({
      level: 'info',
      type: 'application',
      source: 'test-app',
      message: 'Info message',
      raw_content: 'Info raw content'
    });

    await createTestLog({
      level: 'error',
      type: 'application',
      source: 'test-app',
      message: 'Error message',
      raw_content: 'Error raw content'
    });

    const filter: LogFilterInput = { 
      level: 'error',
      limit: 100,
      offset: 0
    };
    const results = await getLogs(filter);

    expect(results).toHaveLength(1);
    expect(results[0].level).toEqual('error');
    expect(results[0].message).toEqual('Error message');
  });

  it('should filter logs by type', async () => {
    await createTestLog({
      level: 'info',
      type: 'application',
      source: 'test-app',
      message: 'App message',
      raw_content: 'App raw content'
    });

    await createTestLog({
      level: 'info',
      type: 'system',
      source: 'test-system',
      message: 'System message',
      raw_content: 'System raw content'
    });

    const filter: LogFilterInput = { 
      type: 'system',
      limit: 100,
      offset: 0
    };
    const results = await getLogs(filter);

    expect(results).toHaveLength(1);
    expect(results[0].type).toEqual('system');
    expect(results[0].message).toEqual('System message');
  });

  it('should filter logs by source', async () => {
    await createTestLog({
      level: 'info',
      type: 'application',
      source: 'app1',
      message: 'Message from app1',
      raw_content: 'Raw from app1'
    });

    await createTestLog({
      level: 'info',
      type: 'application',
      source: 'app2',
      message: 'Message from app2',
      raw_content: 'Raw from app2'
    });

    const filter: LogFilterInput = { 
      source: 'app1',
      limit: 100,
      offset: 0
    };
    const results = await getLogs(filter);

    expect(results).toHaveLength(1);
    expect(results[0].source).toEqual('app1');
    expect(results[0].message).toEqual('Message from app1');
  });

  it('should filter logs by keyword in message and raw_content', async () => {
    await createTestLog({
      level: 'info',
      type: 'application',
      source: 'test-app',
      message: 'Database connection error',
      raw_content: 'Raw database content'
    });

    await createTestLog({
      level: 'info',
      type: 'application',
      source: 'test-app',
      message: 'User login successful',
      raw_content: 'Contains database in raw content'
    });

    await createTestLog({
      level: 'info',
      type: 'application',
      source: 'test-app',
      message: 'Normal operation',
      raw_content: 'Normal raw content'
    });

    const filter: LogFilterInput = { 
      keyword: 'database',
      limit: 100,
      offset: 0
    };
    const results = await getLogs(filter);

    expect(results).toHaveLength(2);
    // Should find logs with 'database' in either message or raw_content
    expect(
      results.some(r => r.message.toLowerCase().includes('database') || 
                       r.raw_content.toLowerCase().includes('database'))
    ).toBe(true);
  });

  it('should filter logs by date range', async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    await createTestLog({
      timestamp: twoHoursAgo,
      level: 'info',
      type: 'application',
      source: 'test-app',
      message: 'Old message',
      raw_content: 'Old raw content'
    });

    await createTestLog({
      timestamp: oneHourAgo,
      level: 'info',
      type: 'application',
      source: 'test-app',
      message: 'Recent message',
      raw_content: 'Recent raw content'
    });

    const filter: LogFilterInput = { 
      start_time: oneHourAgo,
      end_time: now,
      limit: 100,
      offset: 0
    };
    const results = await getLogs(filter);

    expect(results).toHaveLength(1);
    expect(results[0].message).toEqual('Recent message');
    expect(results[0].timestamp >= oneHourAgo).toBe(true);
    expect(results[0].timestamp <= now).toBe(true);
  });

  it('should apply pagination with limit and offset', async () => {
    // Create multiple logs
    for (let i = 0; i < 5; i++) {
      await createTestLog({
        level: 'info',
        type: 'application',
        source: 'test-app',
        message: `Message ${i}`,
        raw_content: `Raw content ${i}`
      });
    }

    const filter: LogFilterInput = { 
      limit: 2, 
      offset: 1
    };
    const results = await getLogs(filter);

    expect(results).toHaveLength(2);
    // Results should be ordered by timestamp desc, so we get the 2nd and 3rd most recent
  });

  it('should combine multiple filters', async () => {
    await createTestLog({
      level: 'error',
      type: 'application',
      source: 'critical-app',
      message: 'Critical error occurred',
      raw_content: 'Critical error in database'
    });

    await createTestLog({
      level: 'error',
      type: 'system',
      source: 'critical-app',
      message: 'System error occurred',
      raw_content: 'System error details'
    });

    await createTestLog({
      level: 'info',
      type: 'application',
      source: 'critical-app',
      message: 'Critical info message',
      raw_content: 'Info message content'
    });

    const filter: LogFilterInput = {
      level: 'error',
      type: 'application',
      source: 'critical-app',
      keyword: 'critical',
      limit: 100,
      offset: 0
    };
    const results = await getLogs(filter);

    expect(results).toHaveLength(1);
    expect(results[0].level).toEqual('error');
    expect(results[0].type).toEqual('application');
    expect(results[0].source).toEqual('critical-app');
    expect(results[0].message.toLowerCase()).toContain('critical');
  });

  it('should return logs ordered by timestamp desc (most recent first)', async () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

    await createTestLog({
      timestamp: twoMinutesAgo,
      level: 'info',
      type: 'application',
      source: 'test-app',
      message: 'Oldest message',
      raw_content: 'Oldest content'
    });

    await createTestLog({
      timestamp: now,
      level: 'info',
      type: 'application',
      source: 'test-app',
      message: 'Newest message',
      raw_content: 'Newest content'
    });

    await createTestLog({
      timestamp: oneMinuteAgo,
      level: 'info',
      type: 'application',
      source: 'test-app',
      message: 'Middle message',
      raw_content: 'Middle content'
    });

    const results = await getLogs();

    expect(results).toHaveLength(3);
    expect(results[0].message).toEqual('Newest message');
    expect(results[1].message).toEqual('Middle message');
    expect(results[2].message).toEqual('Oldest message');
  });

  it('should use default limit and offset when none provided', async () => {
    // Create more logs than the default limit
    for (let i = 0; i < 150; i++) {
      await createTestLog({
        level: 'info',
        type: 'application',
        source: 'test-app',
        message: `Message ${i}`,
        raw_content: `Raw content ${i}`
      });
    }

    const results = await getLogs();

    // Should return default limit of 100
    expect(results).toHaveLength(100);
  });
});
