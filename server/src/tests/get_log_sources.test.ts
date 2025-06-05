
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { logsTable } from '../db/schema';
import { getLogSources } from '../handlers/get_log_sources';

// Test log entries with required timestamp field for database insertion
const testLogs = [
  {
    timestamp: new Date(),
    level: 'info' as const,
    type: 'system' as const,
    source: 'nginx',
    message: 'Server started',
    raw_content: '[INFO] nginx: Server started on port 80'
  },
  {
    timestamp: new Date(),
    level: 'error' as const,
    type: 'application' as const,
    source: 'app.js',
    message: 'Database connection failed',
    raw_content: '[ERROR] app.js: Failed to connect to database'
  },
  {
    timestamp: new Date(),
    level: 'warn' as const,
    type: 'system' as const,
    source: 'nginx',
    message: 'High memory usage',
    raw_content: '[WARN] nginx: Memory usage at 85%'
  },
  {
    timestamp: new Date(),
    level: 'debug' as const,
    type: 'application' as const,
    source: 'api-server',
    message: 'Request processed',
    raw_content: '[DEBUG] api-server: GET /api/users processed'
  }
];

describe('getLogSources', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no logs exist', async () => {
    const sources = await getLogSources();
    expect(sources).toEqual([]);
  });

  it('should return unique sources from logs', async () => {
    // Insert test logs
    await db.insert(logsTable).values(testLogs).execute();

    const sources = await getLogSources();

    expect(sources).toHaveLength(3);
    expect(sources).toContain('nginx');
    expect(sources).toContain('app.js');
    expect(sources).toContain('api-server');
  });

  it('should return sources in alphabetical order', async () => {
    // Insert test logs
    await db.insert(logsTable).values(testLogs).execute();

    const sources = await getLogSources();

    expect(sources).toEqual(['api-server', 'app.js', 'nginx']);
  });

  it('should handle duplicate sources correctly', async () => {
    // Insert logs with duplicate sources
    const duplicateLogs = [
      {
        timestamp: new Date(),
        level: 'info' as const,
        type: 'system' as const,
        source: 'nginx',
        message: 'First message',
        raw_content: '[INFO] nginx: First message'
      },
      {
        timestamp: new Date(),
        level: 'error' as const,
        type: 'system' as const,
        source: 'nginx',
        message: 'Second message',
        raw_content: '[ERROR] nginx: Second message'
      },
      {
        timestamp: new Date(),
        level: 'info' as const,
        type: 'application' as const,
        source: 'app.js',
        message: 'App message',
        raw_content: '[INFO] app.js: App message'
      }
    ];

    await db.insert(logsTable).values(duplicateLogs).execute();

    const sources = await getLogSources();

    expect(sources).toHaveLength(2);
    expect(sources).toEqual(['app.js', 'nginx']);
  });

  it('should exclude empty and null sources', async () => {
    // Insert logs with empty and null-like sources
    const logsWithEmptySources = [
      {
        timestamp: new Date(),
        level: 'info' as const,
        type: 'system' as const,
        source: 'valid-source',
        message: 'Valid message',
        raw_content: '[INFO] valid-source: Valid message'
      },
      {
        timestamp: new Date(),
        level: 'info' as const,
        type: 'system' as const,
        source: '',
        message: 'Empty source message',
        raw_content: '[INFO] : Empty source message'
      }
    ];

    await db.insert(logsTable).values(logsWithEmptySources).execute();

    const sources = await getLogSources();

    expect(sources).toHaveLength(1);
    expect(sources).toEqual(['valid-source']);
  });
});
