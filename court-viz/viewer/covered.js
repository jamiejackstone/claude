// Hoop Hub covered concept: the finished covered hub on its own, with the portable MicroArena main hoop and
// the full installation from an empty playground.
import { startViewer } from './app.js';
import { coveredOnly } from './p2.js';

await startViewer({ builders: { 2: coveredOnly } });
