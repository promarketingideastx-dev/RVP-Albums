"use client";

import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useEditorStore } from '@/store/useEditorStore';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { exportSpreadToJPG } from '@/utils/exportEngine';

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
       
       a.download = fileName;
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);

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
        <div className="font-bold text-lg">{t('title')}</div>
        
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

        <div className="flex items-center gap-4">
          {/* EXPORT DROP DOWN */}
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
