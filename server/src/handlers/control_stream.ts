
import { type StreamControlInput, type StreamStatus } from '../schema';

export declare function controlStream(input: StreamControlInput): Promise<StreamStatus>;
