
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { logsTable } from '../db/schema';
import { searchLogs } from '../handlers/search_logs';

const testLogEntry = {
  timestamp: new Date(),
  level: 'info' as const,
  type: 'application' as const,
  source: 'test-app',
  message: 'User authentication successful',
  raw_content: '[INFO] User john.doe@example.com authenticated successfully'
};

const testLogEntry2 = {
  timestamp: new Date(),
  level: 'error' as const,
  type: 'system' as const,
  source: 'database',
  message: 'Connection timeout occurred',
  raw_content: '[ERROR] Database connection timeout after 30 seconds'
};

const testLogEntry3 = {
  timestamp: new Date(),
  level: 'warn' as const,
  type: 'network' as const,
  source: 'api-gateway',
  message: 'Rate limit exceeded for user',
  raw_content: '[WARN] Rate limit exceeded for user ID 12345'
};

describe('searchLogs', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should search logs by keyword in message field', async () => {
    // Create test logs
    await db.insert(logsTable).values([testLogEntry, testLogEntry2, testLogEntry3]).execute();

    const results = await searchLogs('authentication');

    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('authentication');
    expect(results[0].level).toEqual('info');
    expect(results[0].source).toEqual('test-app');
  });

  it('should search logs by keyword in raw_content field', async () => {
    // Create test logs
    await db.insert(logsTable).values([testLogEntry, testLogEntry2, testLogEntry3]).execute();

    const results = await searchLogs('timeout');

    expect(results).toHaveLength(1);
    expect(results[0].raw_content).toContain('timeout');
    expect(results[0].level).toEqual('error');
    expect(results[0].source).toEqual('database');
  });

  it('should search case-insensitively', async () => {
    // Create test logs
    await db.insert(logsTable).values([testLogEntry, testLogEntry2, testLogEntry3]).execute();

    const results = await searchLogs('USER');

    expect(results).toHaveLength(2);
    // Should find both logs containing "user" (case insensitive)
    const messages = results.map(r => r.message);
    expect(messages).toContain('User authentication successful');
    expect(messages).toContain('Rate limit exceeded for user');
  });

  it('should return multiple matching logs', async () => {
    // Create test logs
    await db.insert(logsTable).values([testLogEntry, testLogEntry2, testLogEntry3]).execute();

    const results = await searchLogs('exceeded');

    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('exceeded');
  });

  it('should return empty array when no matches found', async () => {
    // Create test logs
    await db.insert(logsTable).values([testLogEntry, testLogEntry2, testLogEntry3]).execute();

    const results = await searchLogs('nonexistent');

    expect(results).toHaveLength(0);
  });

  it('should respect limit parameter', async () => {
    // Create multiple logs with same keyword
    const manyLogs = Array.from({ length: 10 }, (_, i) => ({
      timestamp: new Date(),
      level: 'info' as const,
      type: 'application' as const,
      source: `app-${i}`,
      message: `Test message ${i}`,
      raw_content: `[INFO] Test log entry ${i}`
    }));

    await db.insert(logsTable).values(manyLogs).execute();

    const results = await searchLogs('Test', 5);

    expect(results).toHaveLength(5);
    results.forEach(result => {
      expect(result.message).toContain('Test');
    });
  });

  it('should use default limit when not specified', async () => {
    // Create test logs
    await db.insert(logsTable).values([testLogEntry, testLogEntry2, testLogEntry3]).execute();

    const results = await searchLogs('test');

    // Should not throw and should return results (testing default limit doesn't cause issues)
    expect(Array.isArray(results)).toBe(true);
  });

  it('should return logs with correct structure', async () => {
    // Create test log
    await db.insert(logsTable).values([testLogEntry]).execute();

    const results = await searchLogs('authentication');

    expect(results).toHaveLength(1);
    const log = results[0];
    
    expect(log.id).toBeDefined();
    expect(log.timestamp).toBeInstanceOf(Date);
    expect(log.level).toEqual('info');
    expect(log.type).toEqual('application');
    expect(log.source).toEqual('test-app');
    expect(log.message).toEqual('User authentication successful');
    expect(log.raw_content).toEqual('[INFO] User john.doe@example.com authenticated successfully');
    expect(log.created_at).toBeInstanceOf(Date);
  });
});
