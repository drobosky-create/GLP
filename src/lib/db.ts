// db.ts — the ONLY module that touches storage (PRD §7.1). Screens never persist
// directly; they call this. Local-first: data lives on the device.
//
// Architecture: a Storage interface + an in-memory implementation (used in tests
// and as a fallback). In the app, Claude Code provides ONE native-backed
// implementation of the same interface:
//   - native (iOS/Android): Capacitor SQLite or Preferences
//   - web build: IndexedDB
// Because everything depends on the interface, swapping the backing store never
// touches screens or other lib modules.

import {
  AppData, DoseEvent, WeightEntry, SideEffectEntry,
  IntakeEntry, StrengthCheckin, Vial, Medication, Entitlement, ID,
} from "../types";

export interface Storage {
  load(): Promise<AppData>;
  save(data: AppData): Promise<void>;
}

export const emptyData = (): AppData => ({
  medications: [],
  doses: [],
  weights: [],
  sideEffects: [],
  intake: [],
  strength: [],
  vials: [],
  entitlement: { tier: "free" },
});

// Simple id helper (no external dep).
export const newId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/** In-memory Storage. Real builds replace this with a native/IndexedDB impl. */
export class MemoryStorage implements Storage {
  private data: AppData;
  constructor(seed?: AppData) { this.data = seed ?? emptyData(); }
  async load() { return structuredClone(this.data); }
  async save(data: AppData) { this.data = structuredClone(data); }
}

/**
 * Repository: the app-facing API. Holds the loaded AppData in memory, mutates it,
 * and persists through whatever Storage was injected. Keeps mutation logic in one
 * place so screens stay declarative.
 */
export class Repo {
  private data: AppData = emptyData();
  constructor(private storage: Storage) {}

  async init(): Promise<void> { this.data = await this.storage.load(); }
  snapshot(): AppData { return structuredClone(this.data); }
  private async persist() { await this.storage.save(this.data); }

  async addDose(d: Omit<DoseEvent, "id">): Promise<DoseEvent> {
    const rec = { ...d, id: newId() }; this.data.doses.push(rec); await this.persist(); return rec;
  }
  async addWeight(w: Omit<WeightEntry, "id">): Promise<WeightEntry> {
    const rec = { ...w, id: newId() }; this.data.weights.push(rec); await this.persist(); return rec;
  }
  async addSideEffect(s: Omit<SideEffectEntry, "id">): Promise<SideEffectEntry> {
    const rec = { ...s, id: newId() }; this.data.sideEffects.push(rec); await this.persist(); return rec;
  }
  async addIntake(i: Omit<IntakeEntry, "id">): Promise<IntakeEntry> {
    const rec = { ...i, id: newId() }; this.data.intake.push(rec); await this.persist(); return rec;
  }
  async addStrength(s: Omit<StrengthCheckin, "id">): Promise<StrengthCheckin> {
    const rec = { ...s, id: newId() }; this.data.strength.push(rec); await this.persist(); return rec;
  }
  async addMedication(m: Omit<Medication, "id">): Promise<Medication> {
    const rec = { ...m, id: newId() }; this.data.medications.push(rec); await this.persist(); return rec;
  }
  async addVial(v: Omit<Vial, "id">): Promise<Vial> {
    const rec = { ...v, id: newId() }; this.data.vials.push(rec); await this.persist(); return rec;
  }
  async setEntitlement(e: Entitlement): Promise<void> {
    this.data.entitlement = e; await this.persist();
  }

  // Remove a user-logged record by id (approved core addition, issue #1). Additive
  // and symmetric to the add* methods; deletes only the user's own logged data.
  async removeDose(id: ID): Promise<void> {
    this.data.doses = this.data.doses.filter((x) => x.id !== id); await this.persist();
  }
  async removeWeight(id: ID): Promise<void> {
    this.data.weights = this.data.weights.filter((x) => x.id !== id); await this.persist();
  }
  async removeSideEffect(id: ID): Promise<void> {
    this.data.sideEffects = this.data.sideEffects.filter((x) => x.id !== id); await this.persist();
  }
  async removeIntake(id: ID): Promise<void> {
    this.data.intake = this.data.intake.filter((x) => x.id !== id); await this.persist();
  }
  async removeStrength(id: ID): Promise<void> {
    this.data.strength = this.data.strength.filter((x) => x.id !== id); await this.persist();
  }
  async removeMedication(id: ID): Promise<void> {
    this.data.medications = this.data.medications.filter((x) => x.id !== id); await this.persist();
  }
  async removeVial(id: ID): Promise<void> {
    this.data.vials = this.data.vials.filter((x) => x.id !== id); await this.persist();
  }

  doses() { return [...this.data.doses].sort((a, b) => a.at - b.at); }
  weights() { return [...this.data.weights].sort((a, b) => a.at - b.at); }
  sideEffects() { return [...this.data.sideEffects].sort((a, b) => a.at - b.at); }
  entitlement() { return this.data.entitlement; }
}
