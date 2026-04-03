"use client";

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useEditorStore } from '@/store/useEditorStore';
import { useDebouncedCallback } from 'use-debounce';
import Sidebar from '@/components/Sidebar';
import Toolbar from '@/components/Toolbar';
import Inspector from '@/components/Inspector';
import EditorWorkspace from '@/components/editor/EditorWorkspace';
import AssetTray from '@/components/AssetTray';
import ProjectPicker from '@/components/project/ProjectPicker';
import SetupModal from '@/components/project/SetupModal';
import { saveProjectToDB, loadProjectFromDB, listProjectsFromDB } from '@/utils/persistence';
import { EditorProject } from '@/types/editor';

export default function AppPage() {
  const t = useTranslations('Editor');
  const loadProject = useEditorStore((state) => state.loadProject);
  const project = useEditorStore((state) => state.project);
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const removeElement = useEditorStore((state) => state.removeElement);
  
  const [viewMode, setViewMode] = useState<'initializing' | 'picker' | 'editor'>('initializing');
  const [showSetup, setShowSetup] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [init, setInit] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // INITIAL BOOT SEQUENCE
  useEffect(() => {
    if (!mounted || init) return;

    listProjectsFromDB().then(async (list) => {
      if (list.length > 0) {
        setViewMode('picker');
      } else {
        // Fallback check for legacy untracked 'rvp_editor_project'
        const legacyProj = await loadProjectFromDB('proj_genesis');
        if (legacyProj) {
          // If a legacy project exists, forcefully index it by saving it again securely
          await saveProjectToDB(legacyProj);
          setViewMode('picker');
        } else {
          // Absolute clean slate
          setViewMode('picker');
          setShowSetup(true);
        }
      }
      setInit(true);
    }).catch(console.error);
  }, [mounted, init]);

  // LOAD PROJECT HANDLER
  const handleOpenProject = async (id: string) => {
    setViewMode('initializing');
    try {
      const projectToLoad = await loadProjectFromDB(id);
      if (projectToLoad) {
        // GUARD: Healing missing attributes
        projectToLoad.size = projectToLoad.size || { w_mm: 514, h_mm: 260 };
        if (typeof projectToLoad.bleed_mm === 'undefined') projectToLoad.bleed_mm = 3;
        if (typeof projectToLoad.safe_zone_mm === 'undefined') projectToLoad.safe_zone_mm = 5;
        if (!projectToLoad.title) projectToLoad.title = 'Untitled Album';

        // GUARD: Healing missing elements arrays within active spreads
        projectToLoad.spreads = projectToLoad.spreads.map(s => ({
          ...s,
          elements: s.elements || []
        }));

        loadProject(projectToLoad);
        setViewMode('editor');
      } else {
        setViewMode('picker');
      }
    } catch (e) {
      console.error('Failed to load project:', e);
      setViewMode('picker');
    }
  };

  // CREATE PROJECT HANDLER
  const handleCreateProject = async (name: string, type: string, labPresetId: string) => {
    const newId = `proj_${Date.now()}`;
    const newProject: EditorProject = {
      id: newId,
      title: name,
      type: type,
      labPresetId: labPresetId,
      labPresetName: labPresetId === 'pic-pro-lab' ? 'Pic Pro Lab' : 'Custom Lab',
      storageMode: 'local',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectVersion: 1,
      size: { w_mm: 514, h_mm: 260 }, // Hardcoded for this phase per strictly constrained scope
      bleed_mm: 3,
      safe_zone_mm: 5,
      spreads: [
        {
          id: `spread_${Date.now()}`,
          bg_color: '#ffffff',
          elements: []
        }
      ]
    };

    await saveProjectToDB(newProject);
    setShowSetup(false);
    handleOpenProject(newId);
  };

  // MOCK AUTOSAVE DEBOUNCE (Hardened with deep string comparison)
  const [saveStatus, setSaveStatus] = useState<string>('');
  const lastSavedStr = useRef<string>('');
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const debouncedSave = useDebouncedCallback((p: any) => {
    const pStr = JSON.stringify(p);
    if (pStr === lastSavedStr.current) return; // Prevent unnecessary DB calls
    lastSavedStr.current = pStr;
    
    // Real IDB Save (Asynchronous local save)
    saveProjectToDB(p).catch(console.error);

    setSaveStatus(t('save_success'));
    setTimeout(() => setSaveStatus(''), 2000);
  }, 1000);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName) ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }
      
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (activeSpreadId && selectedElementId) {
          removeElement(activeSpreadId, selectedElementId);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSpreadId, selectedElementId, removeElement]);

  // WATCH FOR PROJECT UNLOAD
  useEffect(() => {
    if (viewMode === 'editor' && !project) {
      setViewMode('picker');
    }
  }, [project, viewMode]);

  useEffect(() => {
    if (!mounted || viewMode !== 'editor' || !project) return;
    setSaveStatus(t('saving'));
    debouncedSave(project);
  }, [project, viewMode, mounted, debouncedSave, t]);

  if (!mounted) return <div className="h-screen w-screen bg-white dark:bg-neutral-950" />;
  if (viewMode === 'initializing') return <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-neutral-950 text-black dark:text-white font-medium">{t('initializing')}</div>;

  if (viewMode === 'picker') {
    return (
      <>
        <ProjectPicker 
          onOpenProject={handleOpenProject} 
          onNewProject={() => setShowSetup(true)} 
        />
        {showSetup && (
          <SetupModal 
            onCancel={() => setShowSetup(false)} 
            onCreate={handleCreateProject} 
          />
        )}
      </>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden text-neutral-900 dark:text-neutral-100">
      <Toolbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 relative flex flex-col h-full w-full">
          <div className="flex-1 relative overflow-hidden">
            <EditorWorkspace />
          </div>
          <AssetTray />
          
          {/* MOCK SAVING INDICATOR UI */}
          {saveStatus && (
            <div className="absolute top-4 right-4 bg-black text-white text-xs px-3 py-1 rounded shadow-lg opacity-50 z-50">
              {saveStatus}
            </div>
          )}
        </main>
        <Inspector />
      </div>
    </div>
  );
}
