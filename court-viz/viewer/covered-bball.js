// Heroes Arena concept, basketball only: the same arena with basketball lines, board and kit, and no sport
// switch, for showing the basketball side on its own (Jamie, 4 Nov 2026).
import { startViewer } from './app.js';
import { coveredBball } from './p2.js';

await startViewer({ builders: { 2: coveredBball }, navTools: true });
