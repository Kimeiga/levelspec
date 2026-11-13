import { createServer } from 'vite';

const server = await createServer({ configFile: false, root: process.cwd(), server: { host: '127.0.0.1', port: 0 } });
await server.listen();
console.log(`http://127.0.0.1:${server.httpServer.address().port}/projects/kowloon-asset-pilot/`);
process.once('SIGINT', async () => { await server.close(); process.exit(0); });
process.once('SIGTERM', async () => { await server.close(); process.exit(0); });
