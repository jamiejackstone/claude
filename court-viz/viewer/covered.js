// Heroes Hub concept (the covered Hoop Hub, formerly Hero Dome): the finished covered hub on its own, with the portable MicroArena main hoop, four
// storage containers, the multi-sport floor with a sport switch, the full installation from an empty
// playground, and zoom and turn buttons for desktop.
import { startViewer } from './app.js';
import { coveredOnly } from './p2.js';

await startViewer({ builders: { 2: coveredOnly }, navTools: true });
