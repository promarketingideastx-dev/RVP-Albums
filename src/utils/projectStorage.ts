import { EditorProject } from '@/types/editor';

const PROJECTS_KEY = 'vro_projects';

export interface ProjectIndexMeta {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
}

export const projectStorage = {
  getAllProjects: (): ProjectIndexMeta[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(PROJECTS_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
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
      // Evitar guardar URLs de memoria volátil y aligerar carga
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

      // Actualizar índice
      const index = projectStorage.getAllProjects();
      const existingIdx = index.findIndex(p => p.id === project.id);
      const meta: ProjectIndexMeta = {
        id: safeProject.id,
        title: safeProject.title,
        createdAt: safeProject.createdAt || safeProject.updatedAt,
        updatedAt: safeProject.updatedAt
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
  }
};
