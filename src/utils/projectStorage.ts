import { EditorProject } from '@/types/editor';
import { saveProjectToDB, deleteProjectFromDB } from '@/utils/persistence';
import { generateAndSaveThumbnail } from '@/utils/thumbnailGenerator';

const PROJECTS_KEY = 'vro_projects';
const FOLDERS_KEY = 'vro_project_folders';
const DEFAULT_FOLDERS = ['Bodas', 'XV Años', 'Estudio', 'Retratos', 'Eventos'];

export interface ProjectIndexMeta {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  projectCategory?: 'album' | 'studio_print';
  sizeStr?: string;
  dimensionsMm?: { w_mm: number; h_mm: number };
  targetDpi?: number;
  pixelResolution?: string;
  fileExtension?: string;
  elementCount?: number;
  folder?: string;
  thumbnailPreviewId?: string;
}

let thumbnailDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export const projectStorage = {
  getFolders: (): string[] => {
    if (typeof window === 'undefined') return DEFAULT_FOLDERS;
    try {
      const raw = localStorage.getItem(FOLDERS_KEY);
      if (!raw) {
        localStorage.setItem(FOLDERS_KEY, JSON.stringify(DEFAULT_FOLDERS));
        return DEFAULT_FOLDERS;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_FOLDERS;
    } catch {
      return DEFAULT_FOLDERS;
    }
  },

  addFolder: (name: string): string[] => {
    if (typeof window === 'undefined') return DEFAULT_FOLDERS;
    const trimmed = name.trim();
    if (!trimmed) return projectStorage.getFolders();
    const current = projectStorage.getFolders();
    if (!current.includes(trimmed)) {
      const updated = [...current, trimmed];
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(updated));
      return updated;
    }
    return current;
  },

  deleteFolder: (name: string): string[] => {
    if (typeof window === 'undefined') return DEFAULT_FOLDERS;
    const current = projectStorage.getFolders();
    const updated = current.filter(f => f !== name);
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(updated));
    // Clear folder from project index
    const all = projectStorage.getAllProjects();
    const modified = all.map(p => p.folder === name ? { ...p, folder: undefined } : p);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(modified));
    return updated;
  },

  moveToFolder: (projectId: string, folderName: string): boolean => {
    if (typeof window === 'undefined') return false;
    const all = projectStorage.getAllProjects();
    const idx = all.findIndex(p => p.id === projectId);
    if (idx !== -1) {
      all[idx].folder = folderName === 'none' || !folderName ? undefined : folderName;
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(all));
      // Also update project payload
      const proj = projectStorage.loadProject(projectId);
      if (proj) {
        proj.folder = folderName === 'none' || !folderName ? undefined : folderName;
        localStorage.setItem(`vro_proj_${projectId}`, JSON.stringify(proj));
      }
      return true;
    }
    return false;
  },

  getAllProjects: (): ProjectIndexMeta[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(PROJECTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return parsed.map((p: ProjectIndexMeta) => {
        if (!p.projectCategory) {
          if (p.title?.toLowerCase().includes('print') || p.title?.toLowerCase().includes('estudio')) {
            p.projectCategory = 'studio_print';
          } else {
            p.projectCategory = 'album';
          }
        }
        if (!p.fileExtension) {
          p.fileExtension = '.rvp';
        }
        // Heal 7205 px rounding drift back to exact 7200 px
        if (p.pixelResolution && p.pixelResolution.includes('7205')) {
          p.pixelResolution = p.pixelResolution.replace('7205', '7200');
        }
        if (p.dimensionsMm) {
          const inW = p.dimensionsMm.w_mm / 25.4;
          const inH = p.dimensionsMm.h_mm / 25.4;
          const snapInW = Math.abs(inW - Math.round(inW)) < 0.05 ? Math.round(inW) : Math.round(inW * 10) / 10;
          const snapInH = Math.abs(inH - Math.round(inH)) < 0.05 ? Math.round(inH) : Math.round(inH * 10) / 10;
          p.sizeStr = `${snapInW}×${snapInH} in`;
          const dpi = p.targetDpi || 300;
          p.pixelResolution = `${Math.round(snapInW * dpi)} × ${Math.round(snapInH * dpi)} px`;
        }
        return p;
      });
    } catch (e) {
      console.error('Failed to parse vro_projects', e);
      return [];
    }
  },

  loadProject: (projectId: string): EditorProject | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`vro_proj_${projectId}`);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error(`Failed to load project ${projectId}`, e);
      return null;
    }
  },

  saveProject: (project: EditorProject): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      // Avoid storing volatile blob URLs in localStorage
      const safeProject: EditorProject = {
        ...project,
        updatedAt: new Date().toISOString(),
        spreads: project.spreads.map(spread => ({
            ...spread,
            elements: spread.elements.map(el => {
                if (el.type === 'image') {
                    const newEl = { ...el } as typeof el & { previewUrl?: string; originalUrl?: string };
                    delete newEl.previewUrl;
                    delete newEl.originalUrl;
                    return newEl;
                }
                return el;
            })
        })),
        assets: project.assets?.map(a => {
            const newAsset = { ...a } as typeof a & { previewUrl?: string; originalUrl?: string };
            delete newAsset.previewUrl;
            delete newAsset.originalUrl;
            return newAsset;
        })
      };

      const serialized = JSON.stringify(safeProject);
      localStorage.setItem(`vro_proj_${project.id}`, serialized);

      // Asynchronously sync to IndexedDB
      saveProjectToDB(safeProject).catch(err => {
        console.warn('Background saveProjectToDB failed:', err);
      });

      // Extract rich metadata for index card
      const index = projectStorage.getAllProjects();
      const existingIdx = index.findIndex(p => p.id === project.id);
      const category = safeProject.projectCategory || (safeProject.type === 'type_studio_print' ? 'studio_print' : 'album');
      
      const rawInW = safeProject.size ? safeProject.size.w_mm / 25.4 : 0;
      const rawInH = safeProject.size ? safeProject.size.h_mm / 25.4 : 0;
      const snapInW = Math.abs(rawInW - Math.round(rawInW)) < 0.05 ? Math.round(rawInW) : Math.round(rawInW * 10) / 10;
      const snapInH = Math.abs(rawInH - Math.round(rawInH)) < 0.05 ? Math.round(rawInH) : Math.round(rawInH * 10) / 10;
      const sizeStr = safeProject.size ? `${snapInW}×${snapInH} in` : undefined;
      const dpi = safeProject.targetDpi || 300;
      const pxW = Math.round(snapInW * dpi);
      const pxH = Math.round(snapInH * dpi);
      const pixelResolution = pxW && pxH ? `${pxW} × ${pxH} px` : undefined;
      const totalElements = safeProject.spreads.reduce((acc, s) => acc + (s.elements?.length || 0), 0);
      
      // Real composition thumbnail key in IndexedDB
      const thumbnailPreviewId = `thumb_${safeProject.id}`;

      // Trigger background real composition thumbnail generation (debounced so interactive edits stay at 60 FPS)
      if (thumbnailDebounceTimer) clearTimeout(thumbnailDebounceTimer);
      thumbnailDebounceTimer = setTimeout(() => {
        thumbnailDebounceTimer = null;
        generateAndSaveThumbnail(project).catch(err => {
          console.warn('Background generateAndSaveThumbnail failed:', err);
        });
      }, 2500);

      const meta: ProjectIndexMeta = {
        id: safeProject.id,
        title: safeProject.title,
        createdAt: safeProject.createdAt || safeProject.updatedAt,
        updatedAt: safeProject.updatedAt,
        projectCategory: category,
        sizeStr,
        dimensionsMm: safeProject.size,
        targetDpi: dpi,
        pixelResolution,
        fileExtension: '.rvp',
        elementCount: totalElements,
        folder: safeProject.folder,
        thumbnailPreviewId
      };

      if (existingIdx !== -1) {
        index[existingIdx] = meta;
      } else {
        index.push(meta);
      }

      localStorage.setItem(PROJECTS_KEY, JSON.stringify(index));
      return true;
    } catch (e) {
      console.error('Failed to save project', e);
      return false;
    }
  },

  saveProjectAsync: async (project: EditorProject): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    try {
      // 1. Synchronous localStorage save
      projectStorage.saveProject(project);
      if (thumbnailDebounceTimer) {
        clearTimeout(thumbnailDebounceTimer);
        thumbnailDebounceTimer = null;
      }

      // 2. Await IndexedDB persistence
      const safeProject: EditorProject = {
        ...project,
        updatedAt: new Date().toISOString(),
        spreads: project.spreads.map(spread => ({
            ...spread,
            elements: spread.elements.map(el => {
                if (el.type === 'image') {
                    const newEl = { ...el } as typeof el & { previewUrl?: string; originalUrl?: string };
                    delete newEl.previewUrl;
                    delete newEl.originalUrl;
                    return newEl;
                }
                return el;
            })
        })),
        assets: project.assets?.map(a => {
            const newAsset = { ...a } as typeof a & { previewUrl?: string; originalUrl?: string };
            delete newAsset.previewUrl;
            delete newAsset.originalUrl;
            return newAsset;
        })
      };

      await Promise.allSettled([
        saveProjectToDB(safeProject),
        generateAndSaveThumbnail(project)
      ]);

      return true;
    } catch (e) {
      console.error('Failed to save project asynchronously', e);
      return false;
    }
  },

  deleteProject: (projectId: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.removeItem(`vro_proj_${projectId}`);
      const index = projectStorage.getAllProjects();
      const filtered = index.filter(p => p.id !== projectId);
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(filtered));

      // Also clean up from IndexedDB
      deleteProjectFromDB(projectId).catch(err => {
        console.warn('deleteProjectFromDB failed:', err);
      });
      import('idb-keyval').then(({ del }) => del(`thumb_${projectId}`)).catch(() => {});

      return true;
    } catch (e) {
      console.error('Failed to delete project', e);
      return false;
    }
  },

  exportProjectFile: (projectId: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const proj = projectStorage.loadProject(projectId);
      if (!proj) return false;
      const jsonStr = JSON.stringify(proj, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = (proj.title || 'proyecto').replace(/[^a-zA-Z0-9_\-áéíóúÁÉÍÓÚñÑ ]/g, '_');
      a.download = `${safeTitle}.rvp`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.error('Failed to export project file', e);
      return false;
    }
  }
};
