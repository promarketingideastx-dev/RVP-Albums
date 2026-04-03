"use client";

import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useEditorStore } from '@/store/useEditorStore';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { exportSpreadToJPG } from '@/utils/exportEngine';
import { exportProjectToFile } from '@/utils/exportImport';
import { storage } from '@/storage';
import { v4 as uuidv4 } from 'uuid';

type ExportIntent = 'web' | 'print' | 'proof';
type ExportQuality = 'web' | 'high' | 'print';

export default function Toolbar() {
  const t = useTranslations('Editor');
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);
  const bringForward = useEditorStore((state) => state.bringForward);
  const sendBackward = useEditorStore((state) => state.sendBackward);
  const project = useEditorStore((state) => state.project);
  const unloadProject = useEditorStore((state) => state.unloadProject);
  const measurementUnit = useEditorStore((state) => state.measurementUnit);
  const toggleMeasurementUnit = useEditorStore((state) => state.toggleMeasurementUnit);
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Pro Export UI States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exportIntent, setExportIntent] = useState<ExportIntent>('print');
  const [exportQuality, setExportQuality] = useState<ExportQuality>('print');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openExportModal = (intent: ExportIntent) => {
    setExportIntent(intent);
    if (intent === 'web') setExportQuality('web');
    else if (intent === 'proof') setExportQuality('web');
    else setExportQuality('print');
    
    setIsMenuOpen(false);
    setIsModalOpen(true);
  };

  const handleExportExecute = async () => {
     setIsModalOpen(false);
     if (isExporting || !project || !activeSpreadId) return;
     const spreadIndex = project.spreads.findIndex(s => s.id === activeSpreadId);
     if (spreadIndex === -1) return;
     const spread = project.spreads[spreadIndex];
     
     setIsExporting(true);
     setExportStatus('idle');

     // Force render frame before executing export to prevent UI freeze
     await new Promise(resolve => setTimeout(resolve, 50));

     try {
       let pixelMultiplier = 10;
       let quality = 0.95;

       if (exportQuality === 'web') {
           pixelMultiplier = 2; // ~150 DPI eq
           quality = 0.70;
       } else if (exportQuality === 'high') {
           pixelMultiplier = 5; 
           quality = 0.85;
       } else if (exportQuality === 'print') {
           pixelMultiplier = 10; // ~300 DPI eq
           quality = 1.0;
       }

       const dataUrl = await exportSpreadToJPG(spread, { 
         size: project.size, 
         pixelMultiplier, 
         quality 
       });
       
       const a = document.createElement('a');
       a.href = dataUrl;
       
       // File Naming Logic
       const safeProjectName = project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'album';
       const paddedIndex = String(spreadIndex + 1).padStart(2, '0');
       const fileName = `${safeProjectName}-spread-${paddedIndex}.jpg`; 
       
       // Detect Native OS Dialog Support (File System Access API)
       if ('showSaveFilePicker' in window) {
         try {
           const blob = await (await fetch(dataUrl)).blob();
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           const fileHandle = await (window as any).showSaveFilePicker({
             suggestedName: fileName,
             types: [{
               description: 'JPEG Image',
               accept: {'image/jpeg': ['.jpg', '.jpeg']},
             }],
           });
           const writable = await fileHandle.createWritable();
           await writable.write(blob);
           await writable.close();
         } catch (err: unknown) {
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           if ((err as any).name === 'AbortError') {
             // User explicitly cancelled the native dialog. Stop silently.
             setIsExporting(false);
             return;
           }
           throw err; // Forward actual writing errors to global trap
         }
       } else {
         // Standard Anchor Fallback for Safari/Legacy
         const a = document.createElement('a');
         a.href = dataUrl;
         a.download = fileName;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
       }

       setExportStatus('success');
       setTimeout(() => setExportStatus('idle'), 2500);
     } catch (err) {
       console.error("Export Failed:", err);
       setExportStatus('error');
       setTimeout(() => setExportStatus('idle'), 4000);
     } finally {
       setIsExporting(false);
     }
  };

  const swapLocale = () => {
    if (project?.id) {
      localStorage.setItem('rvp_last_open_project_id', project.id);
    }
    const nextLocale = pathname.startsWith('/es') ? '/en' : '/es';
    window.location.href = nextLocale;
  };

  const getPreviewFilename = () => {
    if (!project || !activeSpreadId) return 'album-spread-01.jpg';
    const spreadIndex = project.spreads.findIndex(s => s.id === activeSpreadId);
    if (spreadIndex === -1) return 'album-spread-01.jpg';
    const safeProjectName = project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'album';
    const paddedIndex = String(spreadIndex + 1).padStart(2, '0');
    return `${safeProjectName}-spread-${paddedIndex}.jpg`; 
  };

  const handleRename = async () => {
    if (!project) return;
    const newName = window.prompt("Enter new project name:", project.title);
    if (newName && newName.trim() !== '') {
       // Deep copy needed to ensure state isn't mutated directly
       const updatedProject = { ...project, title: newName.trim(), updatedAt: new Date().toISOString() };
       useEditorStore.setState({ project: updatedProject });
       await storage.saveProject(updatedProject);
    }
  };

  const handleDuplicate = async () => {
    if (!project) return;
    try {
      setIsExporting(true); // Spin loader during heavy IDB cloning
      const clonedProject = JSON.parse(JSON.stringify(project));
      clonedProject.id = uuidv4();
      clonedProject.title = `${project.title} (Copy)`;
      clonedProject.updatedAt = new Date().toISOString();
      await storage.saveProject(clonedProject);
      alert('Project Duplicated successfully! Return to Projects menu to open it.');
    } catch (err) {
      console.error(err);
      alert('Failed to duplicate project.');
    } finally {
      setIsExporting(false);
      setIsMenuOpen(false);
    }
  };

  return (
    <>
      {/* GLOBAL EXPORT OVERLAY */}
      {isExporting && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-2xl p-8 flex flex-col items-center border border-neutral-200 dark:border-neutral-800">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-medium text-lg text-neutral-900 dark:text-neutral-100">{t('export_loading')}</p>
          </div>
        </div>
      )}

      {/* PRO EXPORT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden border border-neutral-200 dark:border-neutral-800">
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                {exportIntent === 'web' ? t('export_modal_title_web') : 
                 exportIntent === 'print' ? t('export_modal_title_print') : 
                 t('export_modal_title_proof')}
              </h2>
            </div>
            
            {/* Body */}
            <div className="p-6 flex flex-col gap-5">
              
              {/* Pages */}
              <div className="flex flex-col gap-2">
                 <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('export_modal_pages')}</label>
                 <div className="flex items-center gap-2">
                   <input type="radio" checked readOnly className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-neutral-300" />
                   <span className="text-sm text-neutral-900 dark:text-neutral-100">{t('export_modal_pages_active')}</span>
                 </div>
                 <div className="flex items-center gap-2 opacity-50 cursor-not-allowed">
                   <input type="radio" disabled className="w-4 h-4 border-neutral-300" />
                   <span className="text-sm text-neutral-500">{t('export_modal_pages_all')}</span>
                 </div>
              </div>

              {/* Format */}
              <div className="flex flex-col gap-2">
                 <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('export_modal_format')}</label>
                 <select disabled className="text-sm border border-neutral-200 dark:border-neutral-700 rounded p-2 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white cursor-not-allowed opacity-80">
                    <option>JPG</option>
                    <option disabled>{t('export_modal_format_pdf')}</option>
                 </select>
              </div>

              {/* Quality / Intent */}
              <div className="flex flex-col gap-2">
                 <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{t('export_modal_quality')}</label>
                 <select 
                    value={exportQuality} 
                    onChange={(e) => setExportQuality(e.target.value as ExportQuality)}
                    className="text-sm border border-neutral-200 dark:border-neutral-700 rounded p-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                  >
                    <option value="web">{t('export_modal_quality_web')}</option>
                    <option value="high">{t('export_modal_quality_high')}</option>
                    <option value="print">{t('export_modal_quality_print')}</option>
                 </select>
              </div>

              {/* Preview block */}
              <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded border border-neutral-100 dark:border-neutral-800 flex flex-col gap-1">
                 <span className="text-xs text-neutral-500 font-medium uppercase tracking-wider">{t('export_modal_preview')}</span>
                 <span className="text-sm font-mono text-blue-600 dark:text-blue-400 break-all">{getPreviewFilename()}</span>
                 <span className="text-xs text-neutral-400 mt-1 italic leading-tight">{t('export_modal_helper')}</span>
              </div>
              
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-3 bg-neutral-50 dark:bg-neutral-950">
               <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition">
                  {t('export_modal_cancel')}
               </button>
               <button onClick={handleExportExecute} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded shadow transition active:scale-95">
                  {t('export_modal_confirm')}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATIONS */}
      {exportStatus === 'success' && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white px-6 py-3 rounded shadow-xl animate-in fade-in slide-in-from-bottom-4">
          <span className="font-medium">{t('export_success')}</span>
        </div>
      )}
      {exportStatus === 'error' && (
        <div className="fixed bottom-6 right-6 z-50 bg-red-600 text-white px-6 py-3 rounded shadow-xl animate-in fade-in slide-in-from-bottom-4">
          <span className="font-medium">{t('export_error')}</span>
        </div>
      )}

      <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-4 flex items-center justify-between relative z-40">
        <div className="flex items-center gap-3">
          <button 
             onClick={unloadProject}
             className="w-8 h-8 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full transition"
             title="Back to Projects"
          >
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
             </svg>
          </button>
          <div className="flex-1 flex justify-center items-center group">
           <button
              onClick={handleRename}
              className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Rename Project"
           >
              <span className="font-bold text-lg text-neutral-900 dark:text-neutral-100">
                {project?.title || t('title')}
              </span>
              <svg className="w-4 h-4 text-neutral-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
           </button>
        </div>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedElementId && activeSpreadId && (
            <>
              <button 
                onClick={() => bringForward(activeSpreadId, selectedElementId)}
                className="px-3 py-1 text-sm bg-neutral-100 dark:bg-neutral-800 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
              >
                 {t('order_up')}
              </button>
              <button 
                onClick={() => sendBackward(activeSpreadId, selectedElementId)}
                className="px-3 py-1 text-sm bg-neutral-100 dark:bg-neutral-800 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
              >
                 {t('order_down')}
              </button>
            </>
          )}
        </div>
        {/* Unit Toggle & Export Tools */}
        <div className="flex items-center gap-4">
            {/* Native Ruler Unit Toggle */}
            <button 
              onClick={toggleMeasurementUnit}
              className="px-3 py-1.5 flex items-center gap-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-sm font-bold tracking-wide transition-colors text-neutral-600 dark:text-neutral-300"
              title="Toggle Ruler Units (Inches / Centimeters)"
            >
              <span>📏 {measurementUnit === 'in' ? t('inches') : t('centimeters')}</span>
            </button>

            {/* Print Export Button */}
            <div className="relative" ref={menuRef}>
            <button 
               onClick={() => setIsMenuOpen(!isMenuOpen)}
               className="px-4 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium rounded hover:bg-black dark:hover:bg-neutral-200 transition flex items-center gap-1.5"
            >
              Export
              <svg className={`w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md shadow-lg py-1 animate-in fade-in slide-in-from-top-2 z-50">
                 <button onClick={() => openExportModal('web')} className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition">
                   {t('export_dropdown_web')}
                 </button>
                 <button onClick={() => openExportModal('print')} className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition">
                   {t('export_dropdown_print')}
                 </button>
                 <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1"></div>
                 <button onClick={() => openExportModal('proof')} className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition">
                   {t('export_dropdown_proof')}
                 </button>
                 <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1"></div>
                 
                 <div className="px-3 pt-2 pb-1 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Project Actions</div>
                 
                 <button 
                   onClick={() => { if (project) exportProjectToFile(project); setIsMenuOpen(false); }} 
                   className="w-full text-left px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition font-medium"
                 >
                   Export Session (.rvp)
                 </button>
                 <button 
                   onClick={handleDuplicate} 
                   className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition rounded-b-md"
                 >
                   Duplicate Project
                 </button>
              </div>
            )}
          </div>

          <button 
             onClick={swapLocale}
             className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition"
          >
            {t('language')}
          </button>
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-sm w-24 py-1 border border-neutral-200 dark:border-neutral-800 rounded text-center hover:bg-neutral-50 dark:hover:bg-neutral-900 transition"
          >
            {theme === 'dark' ? t('theme_light') : t('theme_dark')}
          </button>
        </div>
      </header>
    </>
  );
}
