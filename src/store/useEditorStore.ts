import { create } from 'zustand';
import { EditorProject, EditorElement } from '@/types/editor';

interface EditorState {
  project: EditorProject | null;
  activeSpreadId: string | null;
  selectedElementId: string | null;

  loadProject: (project: EditorProject) => void;
  setActiveSpread: (spreadId: string) => void;
  setSelectedElement: (elementId: string | null) => void;

  updateElement: (spreadId: string, elementId: string, changes: Partial<EditorElement>) => void;
  addElement: (spreadId: string, element: EditorElement) => void;
  removeElement: (spreadId: string, elementId: string) => void;

  bringForward: (spreadId: string, elementId: string) => void;
  sendBackward: (spreadId: string, elementId: string) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  project: null,
  activeSpreadId: null,
  selectedElementId: null,

  loadProject: (project) => set({ project, activeSpreadId: project.spreads[0]?.id || null }),
  setActiveSpread: (id) => set({ activeSpreadId: id }),
  setSelectedElement: (id) => set({ selectedElementId: id }),

  updateElement: (spreadId, elementId, changes) => set((state) => {
    if (!state.project) return state;
    
    // Auto-save hook or wrapper can be added elsewhere. State is purely mutated here.
    const newSpreads = state.project.spreads.map((spread) => {
      if (spread.id !== spreadId) return spread;
      
      const newElements = spread.elements.map((el) => {
        if (el.id !== elementId) return el;
        return { ...el, ...changes };
      });
      return { ...spread, elements: newElements };
    });

    return { project: { ...state.project, spreads: newSpreads } };
  }),

  addElement: (spreadId, element) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((spread) => {
      if (spread.id !== spreadId) return spread;
      element.zIndex = spread.elements.length;
      return { ...spread, elements: [...spread.elements, element] };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  removeElement: (spreadId, elementId) => set((state) => {
    if (!state.project) return state;
    
    // Garbage collection for blobs
    const spread = state.project.spreads.find(s => s.id === spreadId);
    const element = spread?.elements.find(e => e.id === elementId);
    if (element?.previewUrl && element.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(element.previewUrl);
    }
    if (element?.originalUrl && element.originalUrl.startsWith('blob:')) {
      URL.revokeObjectURL(element.originalUrl);
    }
    
    // Purge binary files from persistent IndexedDB Memory async
    const previewId = element?.previewBlobId;
    if (previewId) {
      import('idb-keyval').then(({ del }) => del(previewId)).catch(console.error);
    }
    const originalId = element?.originalBlobId;
    if (originalId) {
      import('idb-keyval').then(({ del }) => del(originalId)).catch(console.error);
    }

    const newSpreads = state.project.spreads.map((s) => {
      if (s.id !== spreadId) return s;
      return { ...s, elements: s.elements.filter(e => e.id !== elementId) };
    });
    
    // Reset selection if deleting the selected item
    const newSelectedId = state.selectedElementId === elementId ? null : state.selectedElementId;
    return { project: { ...state.project, spreads: newSpreads }, selectedElementId: newSelectedId };
  }),

  bringForward: (spreadId, elementId) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((spread) => {
      if (spread.id !== spreadId) return spread;
      const elements = [...spread.elements].sort((a, b) => a.zIndex - b.zIndex);
      const idx = elements.findIndex(e => e.id === elementId);
      if (idx === -1 || idx === elements.length - 1) return spread;

      const temp = elements[idx];
      elements[idx] = elements[idx + 1];
      elements[idx + 1] = temp;

      elements.forEach((el, index) => { el.zIndex = index; });
      return { ...spread, elements };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  sendBackward: (spreadId, elementId) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((spread) => {
      if (spread.id !== spreadId) return spread;
      const elements = [...spread.elements].sort((a, b) => a.zIndex - b.zIndex);
      const idx = elements.findIndex(e => e.id === elementId);
      if (idx <= 0) return spread;

      const temp = elements[idx];
      elements[idx] = elements[idx - 1];
      elements[idx - 1] = temp;

      elements.forEach((el, index) => { el.zIndex = index; });
      return { ...spread, elements };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),
}));
