
import { z } from 'zod';

// Log level enum
export const logLevelSchema = z.enum(['debug', 'info', 'warn', 'error', 'fatal']);

// Log type enum  
export const logTypeSchema = z.enum(['system', 'application', 'network', 'security', 'other']);

// Log entry schema
export const logEntrySchema = z.object({
  id: z.number(),
  timestamp: z.coerce.date(),
  level: logLevelSchema,
  type: logTypeSchema,
  source: z.string(), // Process name, application name, etc.
  message: z.string(),
  raw_content: z.string(), // Original log line
  created_at: z.coerce.date()
});

export type LogEntry = z.infer<typeof logEntrySchema>;

// Input schema for creating log entries
export const createLogEntryInputSchema = z.object({
  timestamp: z.coerce.date().optional(), // Defaults to now if not provided
  level: logLevelSchema,
  type: logTypeSchema,
  source: z.string(),
  message: z.string(),
  raw_content: z.string()
});

export type CreateLogEntryInput = z.infer<typeof createLogEntryInputSchema>;

// Input schema for filtering logs
export const logFilterInputSchema = z.object({
  level: logLevelSchema.optional(),
  type: logTypeSchema.optional(),
  source: z.string().optional(),
  keyword: z.string().optional(), // Search in message and raw_content
  start_time: z.coerce.date().optional(),
  end_time: z.coerce.date().optional(),
  limit: z.number().int().positive().max(1000).default(100),
  offset: z.number().int().nonnegative().default(0)
});

export type LogFilterInput = z.infer<typeof logFilterInputSchema>;

// Stream status schema
export const streamStatusSchema = z.object({
  is_paused: z.boolean(),
  last_update: z.coerce.date(),
  total_logs: z.number().int().nonnegative()
});

export type StreamStatus = z.infer<typeof streamStatusSchema>;

// Stream control input
export const streamControlInputSchema = z.object({
  action: z.enum(['pause', 'resume', 'clear'])
});

export type StreamControlInput = z.infer<typeof streamControlInputSchema>;
