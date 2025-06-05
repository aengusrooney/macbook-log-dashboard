
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { logsTable } from '../db/schema';
import { type CreateLogEntryInput } from '../schema';
import { createLogEntry } from '../handlers/create_log_entry';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateLogEntryInput = {
  timestamp: new Date('2024-01-01T10:00:00Z'),
  level: 'info',
  type: 'application',
  source: 'test-app',
  message: 'Test log message',
  raw_content: '[INFO] test-app: Test log message'
};

describe('createLogEntry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a log entry with all fields', async () => {
    const result = await createLogEntry(testInput);

    // Validate all fields
    expect(result.id).toBeDefined();
    expect(result.timestamp).toEqual(testInput.timestamp!);
    expect(result.level).toEqual('info');
    expect(result.type).toEqual('application');
    expect(result.source).toEqual('test-app');
    expect(result.message).toEqual('Test log message');
    expect(result.raw_content).toEqual('[INFO] test-app: Test log message');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save log entry to database', async () => {
    const result = await createLogEntry(testInput);

    // Query database to verify entry was saved
    const logs = await db.select()
      .from(logsTable)
      .where(eq(logsTable.id, result.id))
      .execute();

    expect(logs).toHaveLength(1);
    expect(logs[0].timestamp).toEqual(testInput.timestamp!);
    expect(logs[0].level).toEqual('info');
    expect(logs[0].type).toEqual('application');
    expect(logs[0].source).toEqual('test-app');
    expect(logs[0].message).toEqual('Test log message');
    expect(logs[0].raw_content).toEqual('[INFO] test-app: Test log message');
    expect(logs[0].created_at).toBeInstanceOf(Date);
  });

  it('should use current timestamp when not provided', async () => {
    const beforeTime = new Date();
    
    const inputWithoutTimestamp: CreateLogEntryInput = {
      level: 'error',
      type: 'system',
      source: 'system-monitor',
      message: 'System error occurred',
      raw_content: '[ERROR] system-monitor: System error occurred'
    };

    const result = await createLogEntry(inputWithoutTimestamp);
    const afterTime = new Date();

    // Verify timestamp was set to current time
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result.timestamp >= beforeTime).toBe(true);
    expect(result.timestamp <= afterTime).toBe(true);
  });

  it('should handle different log levels and types', async () => {
    const debugInput: CreateLogEntryInput = {
      level: 'debug',
      type: 'network',
      source: 'network-service',
      message: 'Debug network info',
      raw_content: '[DEBUG] network-service: Debug network info'
    };

    const result = await createLogEntry(debugInput);

    expect(result.level).toEqual('debug');
    expect(result.type).toEqual('network');
    expect(result.source).toEqual('network-service');
    expect(result.message).toEqual('Debug network info');
  });

  it('should handle fatal security logs', async () => {
    const securityInput: CreateLogEntryInput = {
      level: 'fatal',
      type: 'security',
      source: 'auth-service',
      message: 'Critical security breach detected',
      raw_content: '[FATAL] auth-service: Critical security breach detected'
    };

    const result = await createLogEntry(securityInput);

    expect(result.level).toEqual('fatal');
    expect(result.type).toEqual('security');
    expect(result.source).toEqual('auth-service');
    expect(result.message).toEqual('Critical security breach detected');
  });
});
