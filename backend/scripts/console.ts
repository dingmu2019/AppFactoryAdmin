import repl from 'repl';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import Services
import { DebateService } from '../src/services/debateService.ts';
import { OrderService } from '../src/services/OrderService.ts';
import { getDatabaseClient } from '../src/lib/db/connection.ts';

// Setup Environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('\n🚀 Backend Console (SaaS Factory)');
console.log('-----------------------------------');
console.log('Available Globals:');
console.log('  - DebateService');
console.log('  - OrderService');
console.log('  - db (getDatabaseClient)');
console.log('-----------------------------------');
console.log('Example: await DebateService.createDebate({...})');
console.log('-----------------------------------\n');

const r = repl.start({
  prompt: 'admin-sys > ',
  useColors: true,
  replMode: repl.REPL_MODE_STRICT,
});

// Attach Context
r.context.DebateService = DebateService;
r.context.OrderService = OrderService;
r.context.db = getDatabaseClient;

// Add a helper to await promises easily in REPL if top-level await isn't supported (Node 16+ REPL supports it)
r.context.cb = (p: Promise<any>) => {
    p.then(console.log).catch(console.error);
};
