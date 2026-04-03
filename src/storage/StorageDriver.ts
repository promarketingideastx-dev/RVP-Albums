import { EditorProject, ProjectAsset } from '@/types/editor';

export interface ProjectMetadata {
  id: string;
  title: string;
  type: string;
  labPresetId: string;
  labPresetName: string;
  updatedAt: string;
}

export interface StorageDriver {
  // Project Lifecycle
  listProjects(): Promise<ProjectMetadata[]>;
  createProject(project: EditorProject): Promise<void>;
  openProject(id: string): Promise<EditorProject | null>;
  saveProject(project: EditorProject): Promise<void>;
  
  // Generic Actions
  deleteProject(id: string): Promise<void>;
  
  // Implemented inside ProjectPicker logic for now, but abstracting them prepares for Tauri bounds
  // where duplicate is just an OS copy, not a JSON parse.
  
  // Asset Management
  // Since currently AssetTray adds/removes directly into EditorStore components rather than a DB immediately,
  // we might handle "saveProject" for everything.
  // BUT the architecture map requires:
  // addAssets, removeAsset, loadAssets, generatePreview (optional based on future Tauri needs)
  // For IDB, addAsset might just mean generating ObjectURLs.
  addAsset(file: File): Promise<ProjectAsset>;
}
