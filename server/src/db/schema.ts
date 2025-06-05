
import { serial, text, pgTable, timestamp, pgEnum, integer } from 'drizzle-orm/pg-core';

// Define enums
export const logLevelEnum = pgEnum('log_level', ['debug', 'info', 'warn', 'error', 'fatal']);
export const logTypeEnum = pgEnum('log_type', ['system', 'application', 'network', 'security', 'other']);

// Logs table
export const logsTable = pgTable('logs', {
  id: serial('id').primaryKey(),
  timestamp: timestamp('timestamp').notNull(),
  level: logLevelEnum('level').notNull(),
  type: logTypeEnum('type').notNull(),
  source: text('source').notNull(), // Process name, application name, etc.
  message: text('message').notNull(),
  raw_content: text('raw_content').notNull(), // Original log line
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Stream status table (single row to track stream state)
export const streamStatusTable = pgTable('stream_status', {
  id: serial('id').primaryKey(),
  is_paused: text('is_paused').notNull().default('false'), // Store as text since drizzle-orm doesn't have boolean for pg
  last_update: timestamp('last_update').defaultNow().notNull(),
  total_logs: integer('total_logs').notNull().default(0) // Use integer with default instead of serial
});

// TypeScript types for the tables
export type LogEntry = typeof logsTable.$inferSelect;
export type NewLogEntry = typeof logsTable.$inferInsert;
export type StreamStatus = typeof streamStatusTable.$inferSelect;
export type NewStreamStatus = typeof streamStatusTable.$inferInsert;

// Export all tables for proper query building
export const tables = { 
  logs: logsTable, 
  streamStatus: streamStatusTable 
};
