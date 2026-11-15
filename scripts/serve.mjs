// Tiny static server for previewing dist/ locally: npm run preview
import { createServer } from 'node:http';
import { serveDist } from './static.mjs';

const PORT = Number(process.env.PORT) || 4321;

createServer(serveDist).listen(PORT, () => console.log(`Previewing at http://localhost:${PORT}/`));
