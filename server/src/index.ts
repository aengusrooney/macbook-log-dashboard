
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';
import { 
  createLogEntryInputSchema, 
  logFilterInputSchema, 
  streamControlInputSchema 
} from './schema';
import { createLogEntry } from './handlers/create_log_entry';
import { getLogs } from './handlers/get_logs';
import { getRecentLogs } from './handlers/get_recent_logs';
import { searchLogs } from './handlers/search_logs';
import { getStreamStatus } from './handlers/get_stream_status';
import { controlStream } from './handlers/control_stream';
import { clearLogs } from './handlers/clear_logs';
import { getLogSources } from './handlers/get_log_sources';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // Log management
  createLogEntry: publicProcedure
    .input(createLogEntryInputSchema)
    .mutation(({ input }) => createLogEntry(input)),
  
  getLogs: publicProcedure
    .input(logFilterInputSchema.optional())
    .query(({ input }) => getLogs(input)),
  
  getRecentLogs: publicProcedure
    .input(z.number().int().positive().max(1000).default(100))
    .query(({ input }) => getRecentLogs(input)),
  
  searchLogs: publicProcedure
    .input(z.object({ 
      keyword: z.string().min(1), 
      limit: z.number().int().positive().max(1000).default(100) 
    }))
    .query(({ input }) => searchLogs(input.keyword, input.limit)),
  
  // Stream control
  getStreamStatus: publicProcedure
    .query(() => getStreamStatus()),
  
  controlStream: publicProcedure
    .input(streamControlInputSchema)
    .mutation(({ input }) => controlStream(input)),
  
  // Utility endpoints
  clearLogs: publicProcedure
    .mutation(() => clearLogs()),
  
  getLogSources: publicProcedure
    .query(() => getLogSources()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
