import { EditorProject } from '@/types/editor';

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

      // Extract rich metadata for index card
      const index = projectStorage.getAllProjects();
      const existingIdx = index.findIndex(p => p.id === project.id);
      const category = safeProject.projectCategory || (safeProject.type === 'type_studio_print' ? 'studio_print' : 'album');
      const sizeStr = safeProject.size ? `${Math.round(safeProject.size.w_mm / 25.4)}×${Math.round(safeProject.size.h_mm / 25.4)} in` : undefined;
      const dpi = safeProject.targetDpi || 300;
      const pxW = safeProject.size ? Math.round((safeProject.size.w_mm / 25.4) * dpi) : 0;
      const pxH = safeProject.size ? Math.round((safeProject.size.h_mm / 25.4) * dpi) : 0;
      const pixelResolution = pxW && pxH ? `${pxW} × ${pxH} px` : undefined;
      const totalElements = safeProject.spreads.reduce((acc, s) => acc + (s.elements?.length || 0), 0);
      
      // Thumbnail candidate from first image element or asset
      const firstImageEl = safeProject.spreads[0]?.elements.find(el => el.type === 'image');
      const firstAsset = safeProject.assets?.[0];
      const thumbnailPreviewId = firstImageEl?.previewBlobId || firstAsset?.previewBlobId;

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

  deleteProject: (projectId: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.removeItem(`vro_proj_${projectId}`);
      const index = projectStorage.getAllProjects();
      const filtered = index.filter(p => p.id !== projectId);
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(filtered));
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
