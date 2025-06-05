
import { type LogFilterInput, type LogEntry } from '../schema';

export declare function getLogs(filter?: LogFilterInput): Promise<LogEntry[]>;
