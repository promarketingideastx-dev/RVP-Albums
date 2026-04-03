import { StorageDriver } from './StorageDriver';
import { IDBDriver } from './IDBDriver';

// In Phase 7.B this will dynamically swap to TauriFSDriver if window.__TAURI__ is detected.
// For Phase 7.A, it strictly binds to IDBDriver masking all browser limitations cleanly.
export const storage: StorageDriver = new IDBDriver();
