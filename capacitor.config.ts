import type { CapacitorConfig } from "@capacitor/cli";

// One codebase, three targets (PRD §7). Native iOS/Android platform folders are
// generated later (Phase 2, behind the human-gated APNs/FCM setup); the web build
// in `dist` is what boots in the first sitting.
const config: CapacitorConfig = {
  appId: "com.glp1companion.app",
  appName: "GLP-1 Companion",
  webDir: "dist",
};

export default config;
