
import { type LogEntry } from '../schema';

export declare function searchLogs(keyword: string, limit?: number): Promise<LogEntry[]>;
