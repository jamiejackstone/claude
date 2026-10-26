// Hoop Hub Final Concept: Phase 1, the outdoor court, and Phase 2, the covered hub, behind one switch.
import { startViewer } from './app.js';
import { phase1 } from './p1.js';
import { phase2 } from './p2.js';

await startViewer({ builders: { 1: phase1, 2: phase2 } });
