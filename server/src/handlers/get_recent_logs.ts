
import { type LogEntry } from '../schema';

export declare function getRecentLogs(limit?: number): Promise<LogEntry[]>;
