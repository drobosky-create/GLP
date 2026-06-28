/**
 * db.ts — storage layer. The ONLY place that touches SQLite (Capacitor) / IndexedDB
 * (web). Screens never talk to storage directly; they call functions exported here
 * (PRD §7.1, §12). Local-first: the app works offline and feels instant (§5).
 *
 * Phase 1 fills this in (dose / weight / side-effect / intake / strength CRUD).
 */
export {};
