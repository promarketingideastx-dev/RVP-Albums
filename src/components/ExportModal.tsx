'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

export type ExportType = 'print' | 'web' | 'pdf';
export type WebQuality = 'low' | 'medium' | 'high';

export interface ExportModalOptions {
  type: ExportType;
  rangeType: 'all' | 'custom';
  rangeStart?: number; // 1-indexed for UX, converts to 0-indexed in engine
  rangeEnd?: number;   // 1-indexed for UX, converts to 0-indexed in engine
  webQuality?: WebQuality;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportModalOptions) => void;
  totalPages: number;
}

export default function ExportModal({ isOpen, onClose, onExport, totalPages }: ExportModalProps) {
  const t = useTranslations('Export'); // Assuming a namespace exists or will fallback to keys
  
  const [exportType, setExportType] = useState<ExportType>('print');
  const [rangeType, setRangeType] = useState<'all' | 'custom'>('all');
  const [customRangeString, setCustomRangeString] = useState('');
  const [webQuality, setWebQuality] = useState<WebQuality>('high');
  
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleExport = () => {
    setErrorMsg('');
    
    let rangeStart: number | undefined = undefined;
    let rangeEnd: number | undefined = undefined;
    
    if (rangeType === 'custom') {
      const parts = customRangeString.split('-').map(s => parseInt(s.trim(), 10));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        rangeStart = parts[0];
        rangeEnd = parts[1];
        
        if (rangeStart < 1 || rangeEnd > totalPages || rangeStart > rangeEnd) {
          setErrorMsg(t('invalidRange') || `Invalid range. Must be between 1 and ${totalPages}`);
          return;
        }
      } else if (parts.length === 1 && !isNaN(parts[0])) {
        // Single page
        rangeStart = parts[0];
        rangeEnd = parts[0];
        if (rangeStart < 1 || rangeStart > totalPages) {
          setErrorMsg(t('invalidRange') || `Invalid single page. Must be between 1 and ${totalPages}`);
          return;
        }
      } else {
        setErrorMsg(t('invalidFormat') || 'Invalid format. Use e.g., 1-5');
        return;
      }
    }

    onExport({
      type: exportType,
      rangeType,
      rangeStart,
      rangeEnd,
      webQuality: exportType === 'web' ? webQuality : undefined
    });
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl p-6 w-full max-w-lg border border-neutral-200 dark:border-neutral-800 flex flex-col scale-in">
        
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
             {t('exportOptions') || 'Export Options'}
           </h2>
           <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
             <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
             </svg>
           </button>
        </div>

        <div className="space-y-6 flex-1 overflow-y-auto pr-2">
           
           {/* Section 1: Type */}
           <div className="space-y-3">
              <label className="text-sm font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                {t('exportFormat') || 'Format'}
              </label>
              <div className="grid grid-cols-3 gap-3">
                 <button 
                   onClick={() => setExportType('print')}
                   className={`py-2 px-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition ${exportType === 'print' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300' : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700'}`}
                 >
                   <span className="text-lg">🖨️</span>
                   <span className="text-xs font-semibold">{t('exportPrint') || 'Print (High-Res)'}</span>
                 </button>
                 <button 
                   onClick={() => setExportType('web')}
                   className={`py-2 px-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition ${exportType === 'web' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300' : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700'}`}
                 >
                   <span className="text-lg">🌐</span>
                   <span className="text-xs font-semibold">{t('exportWeb') || 'Web (JPG)'}</span>
                 </button>
                 <button 
                   onClick={() => setExportType('pdf')}
                   className={`py-2 px-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition ${exportType === 'pdf' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300' : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700'}`}
                 >
                   <span className="text-lg">📄</span>
                   <span className="text-xs font-semibold">{t('exportPDF') || 'Proof (PDF)'}</span>
                 </button>
              </div>
           </div>

           {/* Section 2: Range */}
           <div className="space-y-3 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg border border-neutral-100 dark:border-neutral-800">
              <label className="text-sm font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                {t('pages') || 'Pages'} <span className="text-xs font-normal text-neutral-400 normal-case ml-1">({totalPages} {t('total') || 'Total'})</span>
              </label>
              <div className="flex flex-col gap-3">
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input type="radio" className="w-4 h-4 text-blue-500" checked={rangeType === 'all'} onChange={() => setRangeType('all')} />
                   <span className="text-neutral-700 dark:text-neutral-300 text-sm font-medium">{t('allPages') || 'All Pages'}</span>
                 </label>
                 <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" className="w-4 h-4 text-blue-500" checked={rangeType === 'custom'} onChange={() => setRangeType('custom')} />
                      <span className="text-neutral-700 dark:text-neutral-300 text-sm font-medium">{t('range') || 'Range'}</span>
                    </label>
                    <input 
                      type="text" 
                      disabled={rangeType !== 'custom'}
                      value={customRangeString}
                      onChange={(e) => setCustomRangeString(e.target.value)}
                      placeholder="ej. 1-5"
                      className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1 text-sm disabled:opacity-50 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                 </div>
              </div>
              {errorMsg && <p className="text-xs text-red-500 font-medium mt-1">{errorMsg}</p>}
           </div>

           {/* Section 3: Dynamic Options based on Type */}
           {exportType === 'print' && (
             <div className="space-y-3 p-4 border border-neutral-100 dark:border-neutral-800 rounded-lg">
                <label className="text-sm font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  {t('colorProfile') || 'Color Profile'}
                </label>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  <p className="font-semibold text-neutral-800 dark:text-neutral-200">Output Color Space: sRGB</p>
                  <p className="text-xs mt-1 opacity-80">{t('printNotice') || 'Rendering engine locked to high-fidelity Print resolution.'}</p>
                </div>
             </div>
           )}

           {exportType === 'web' && (
             <div className="space-y-3 p-4 border border-neutral-100 dark:border-neutral-800 rounded-lg">
                <label className="text-sm font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  {t('webQuality') || 'Web Quality'}
                </label>
                <div className="flex gap-4">
                  {(['low', 'medium', 'high'] as WebQuality[]).map(q => (
                    <label key={q} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" className="w-4 h-4 text-blue-500" checked={webQuality === q} onChange={() => setWebQuality(q)} />
                      <span className="text-neutral-700 dark:text-neutral-300 text-sm capitalize">{t(`quality_${q}`) || q}</span>
                    </label>
                  ))}
                </div>
             </div>
           )}
           
        </div>

        <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <button 
             onClick={onClose}
             className="px-5 py-2 rounded-lg font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            {t('cancel') || 'Cancel'}
          </button>
          <button 
             onClick={handleExport}
             className="px-6 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition flex items-center gap-2"
          >
            <span>{t('exportAction') || 'Export'}</span>
          </button>
        </div>
        
      </div>
    </div>
  );
}
