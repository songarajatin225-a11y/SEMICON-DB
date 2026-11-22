// Entry point: the passcode screen comes first; the app (and its data download) starts only once unlocked.
import { ensureUnlocked } from "./gate.js";
await ensureUnlocked();
await import("./main.js");
