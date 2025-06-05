
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { logsTable } from '../db/schema';
import { getRecentLogs } from '../handlers/get_recent_logs';

// Test log entries with required timestamp field
const testLogEntry1 = {
  timestamp: new Date('2024-01-01T10:00:00Z'),
  level: 'info' as const,
  type: 'application' as const,
  source: 'test-app',
  message: 'Test message 1',
  raw_content: 'Raw log content 1'
};

const testLogEntry2 = {
  timestamp: new Date('2024-01-01T11:00:00Z'),
  level: 'error' as const,
  type: 'system' as const,
  source: 'test-system',
  message: 'Test message 2',
  raw_content: 'Raw log content 2'
};

const testLogEntry3 = {
  timestamp: new Date('2024-01-01T12:00:00Z'),
  level: 'warn' as const,
  type: 'network' as const,
  source: 'test-network',
  message: 'Test message 3',
  raw_content: 'Raw log content 3'
};

describe('getRecentLogs', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no logs exist', async () => {
    const result = await getRecentLogs();
    
    expect(result).toEqual([]);
  });

  it('should return logs ordered by created_at descending', async () => {
    // Insert test logs one by one with small delays to ensure different created_at timestamps
    await db.insert(logsTable).values(testLogEntry1).execute();
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
    
    await db.insert(logsTable).values(testLogEntry2).execute();
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
    
    await db.insert(logsTable).values(testLogEntry3).execute();

    const result = await getRecentLogs();

    expect(result).toHaveLength(3);
    // Should be ordered by created_at descending (most recent first)
    expect(result[0].message).toEqual('Test message 3');
    expect(result[1].message).toEqual('Test message 2');
    expect(result[2].message).toEqual('Test message 1');
  });

  it('should respect the limit parameter', async () => {
    // Insert 5 test logs one by one with delays
    for (let i = 1; i <= 5; i++) {
      await db.insert(logsTable).values({
        timestamp: new Date(`2024-01-01T${10 + i}:00:00Z`),
        level: 'info' as const,
        type: 'application' as const,
        source: `test-source-${i}`,
        message: `Test message ${i}`,
        raw_content: `Raw content ${i}`
      }).execute();
      
      if (i < 5) {
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay between inserts
      }
    }

    const result = await getRecentLogs(3);

    expect(result).toHaveLength(3);
    // Should get the 3 most recent logs
    expect(result[0].message).toEqual('Test message 5');
    expect(result[1].message).toEqual('Test message 4');
    expect(result[2].message).toEqual('Test message 3');
  });

  it('should return correct log entry structure', async () => {
    await db.insert(logsTable).values(testLogEntry1).execute();

    const result = await getRecentLogs();

    expect(result).toHaveLength(1);
    const log = result[0];
    
    expect(log.id).toBeDefined();
    expect(log.timestamp).toBeInstanceOf(Date);
    expect(log.level).toEqual('info');
    expect(log.type).toEqual('application');
    expect(log.source).toEqual('test-app');
    expect(log.message).toEqual('Test message 1');
    expect(log.raw_content).toEqual('Raw log content 1');
    expect(log.created_at).toBeInstanceOf(Date);
  });

  it('should use default limit of 100', async () => {
    // Insert 150 logs using batch insert with proper date formatting
    const logEntries = [];
    for (let i = 1; i <= 150; i++) {
      // Use a proper date format that spreads across different minutes
      const minutes = String(i % 60).padStart(2, '0');
      const hours = String(10 + Math.floor(i / 60)).padStart(2, '0');
      
      logEntries.push({
        timestamp: new Date(`2024-01-01T${hours}:${minutes}:00Z`),
        level: 'info' as const,
        type: 'application' as const,
        source: `source-${i}`,
        message: `Message ${i}`,
        raw_content: `Raw ${i}`
      });
    }

    await db.insert(logsTable).values(logEntries).execute();

    const result = await getRecentLogs();

    expect(result).toHaveLength(100);
  });
});
