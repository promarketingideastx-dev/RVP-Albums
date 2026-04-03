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
      return { ...spread, elements: [...spread.elements, element] };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  removeElement: (spreadId, elementId) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((spread) => {
      if (spread.id !== spreadId) return spread;
      return { ...spread, elements: spread.elements.filter(e => e.id !== elementId) };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  bringForward: (spreadId, elementId) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((spread) => {
      if (spread.id !== spreadId) return spread;
      const elements = [...spread.elements];
      const idx = elements.findIndex(e => e.id === elementId);
      if (idx === -1) return spread;

      // Adjust zIndex purely algebraically
      const targetZ = elements[idx].zIndex + 1;
      elements[idx].zIndex = targetZ;
      return { ...spread, elements };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  sendBackward: (spreadId, elementId) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((spread) => {
      if (spread.id !== spreadId) return spread;
      const elements = [...spread.elements];
      const idx = elements.findIndex(e => e.id === elementId);
      if (idx === -1) return spread;

      const targetZ = Math.max(0, elements[idx].zIndex - 1);
      elements[idx].zIndex = targetZ;
      return { ...spread, elements };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),
}));
