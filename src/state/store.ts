import { create } from "zustand";
import type { AppMode } from "../types";

/**
 * The single app store (PRD §7.1, §12) — one Zustand store is the source of UI
 * state. Do not create additional stores; add slices here as phases land.
 *
 * Phase 0 holds only the onboarding-selected mode (null until chosen, §2).
 */
interface AppState {
  mode: AppMode | null;
  setMode: (mode: AppMode) => void;
}

export const useAppStore = create<AppState>((set) => ({
  mode: null,
  setMode: (mode) => set({ mode }),
}));
