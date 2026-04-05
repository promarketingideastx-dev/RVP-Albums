"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import TypographyPresetSelector from './editor/TypographyPresetSelector';
import { AlignLeft, AlignCenter, AlignRight, Baseline, LetterText, Type, PaintBucket, TypeOutline, TextSelect, Layers, SlidersHorizontal, Globe, RotateCcw, LayoutTemplate, Lock } from 'lucide-react';
import LayersPanel from './editor/LayersPanel';
import GlobalStylesPanel from './editor/GlobalStylesPanel';
import AutoLayoutPanel from './editor/AutoLayoutPanel';
import CameraRawPanel from './editor/CameraRawPanel';
import { useEditorStore } from '@/store/useEditorStore';
import { LUT_LIBRARY } from '@/lib/lut-presets';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LocalShadowPanel = ({ element, activeSpreadId, updateElement }: any) => {
  const isShadowEnabled = element.shadowColor && element.shadowColor !== 'transparent';
  return (
    <div className="mt-4 mb-6 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
      <label className="flex items-center gap-2 mb-3 cursor-pointer">
        <input 
          type="checkbox" 
          checked={isShadowEnabled || false}
          onChange={(e) => updateElement(activeSpreadId, element.id, { 
             shadowColor: e.target.checked ? '#000000' : 'transparent',
             shadowBlur: e.target.checked ? (element.shadowBlur ?? 15) : undefined,
             shadowOpacity: e.target.checked ? (element.shadowOpacity ?? 0.5) : undefined,
             shadowOffsetX: e.target.checked ? (element.shadowOffsetX ?? 0) : undefined,
             shadowOffsetY: e.target.checked ? (element.shadowOffsetY ?? 10) : undefined
          })}
          className="accent-teal-500"
        />
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">Enable Drop Shadow</span>
      </label>
      {isShadowEnabled && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">Color</label>
            <input 
              type="color" 
              value={element.shadowColor || '#000000'}
              onChange={(e) => updateElement(activeSpreadId, element.id, { shadowColor: e.target.value })}
              className="w-full h-8 rounded border border-neutral-200 dark:border-neutral-700 cursor-pointer block overflow-hidden"
            />
          </div>

          <div>
            <div className="flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              <label className="flex items-center gap-1.5">
                Opacity
                <button onClick={() => updateElement(activeSpreadId, element.id, { shadowOpacity: 0.5 })} className="text-neutral-400 hover:text-teal-500 transition-colors bg-neutral-100 dark:bg-neutral-800 rounded p-0.5" title="Reset"><RotateCcw className="w-2.5 h-2.5" /></button>
              </label>
              <span>{Math.round((element.shadowOpacity ?? 0.5) * 100)}%</span>
            </div>
            <div className="flex gap-2">
              <input type="range" min="0" max="1" step="0.05" className="w-full accent-teal-500" value={element.shadowOpacity ?? 0.5} onChange={(e) => updateElement(activeSpreadId, element.id, { shadowOpacity: parseFloat(e.target.value) })}/>
              <input type="number" step="0.05" className="w-12 bg-white dark:bg-neutral-950 text-xs px-1 rounded border border-neutral-200 dark:border-neutral-800 text-center outline-none" value={element.shadowOpacity ?? 0.5} onChange={(e) => updateElement(activeSpreadId, element.id, { shadowOpacity: parseFloat(e.target.value) || 0 })}/>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              <label className="flex items-center gap-1.5">
                Blur
                <button onClick={() => updateElement(activeSpreadId, element.id, { shadowBlur: 15 })} className="text-neutral-400 hover:text-teal-500 transition-colors bg-neutral-100 dark:bg-neutral-800 rounded p-0.5" title="Reset"><RotateCcw className="w-2.5 h-2.5" /></button>
              </label>
              <span>{element.shadowBlur || 0}</span>
            </div>
            <div className="flex gap-2">
              <input type="range" min="0" max="100" step="0.5" className="w-full accent-teal-500" value={element.shadowBlur || 0} onChange={(e) => updateElement(activeSpreadId, element.id, { shadowBlur: parseFloat(e.target.value) })}/>
              <input type="number" className="w-12 bg-white dark:bg-neutral-950 text-xs px-1 rounded border border-neutral-200 dark:border-neutral-800 text-center outline-none" value={element.shadowBlur || 0} onChange={(e) => updateElement(activeSpreadId, element.id, { shadowBlur: parseFloat(e.target.value) || 0 })}/>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              <label className="flex items-center gap-1.5">
                Distance X
                <button onClick={() => updateElement(activeSpreadId, element.id, { shadowOffsetX: 0 })} className="text-neutral-400 hover:text-teal-500 transition-colors bg-neutral-100 dark:bg-neutral-800 rounded p-0.5" title="Reset"><RotateCcw className="w-2.5 h-2.5" /></button>
              </label>
              <span>{element.shadowOffsetX || 0}</span>
            </div>
            <div className="flex gap-2">
              <input type="range" min="-100" max="100" step="0.5" className="w-full accent-teal-500" value={element.shadowOffsetX || 0} onChange={(e) => updateElement(activeSpreadId, element.id, { shadowOffsetX: parseFloat(e.target.value) })}/>
              <input type="number" className="w-16 bg-white dark:bg-neutral-950 text-xs px-1 rounded border border-neutral-200 dark:border-neutral-800 text-center outline-none" value={element.shadowOffsetX || 0} onChange={(e) => updateElement(activeSpreadId, element.id, { shadowOffsetX: parseFloat(e.target.value) || 0 })}/>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              <label className="flex items-center gap-1.5">
                Distance Y
                <button onClick={() => updateElement(activeSpreadId, element.id, { shadowOffsetY: 10 })} className="text-neutral-400 hover:text-teal-500 transition-colors bg-neutral-100 dark:bg-neutral-800 rounded p-0.5" title="Reset"><RotateCcw className="w-2.5 h-2.5" /></button>
              </label>
              <span>{element.shadowOffsetY || 0}</span>
            </div>
            <div className="flex gap-2">
              <input type="range" min="-100" max="100" step="0.5" className="w-full accent-teal-500" value={element.shadowOffsetY || 0} onChange={(e) => updateElement(activeSpreadId, element.id, { shadowOffsetY: parseFloat(e.target.value) })}/>
              <input type="number" className="w-16 bg-white dark:bg-neutral-950 text-xs px-1 rounded border border-neutral-200 dark:border-neutral-800 text-center outline-none" value={element.shadowOffsetY || 0} onChange={(e) => updateElement(activeSpreadId, element.id, { shadowOffsetY: parseFloat(e.target.value) || 0 })}/>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default function Inspector() {
  const t = useTranslations('Editor');
  const project = useEditorStore((state) => state.project);
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const updateElement = useEditorStore((state) => state.updateElement);
  const setPreviewOriginalPhotoId = useEditorStore((state) => state.setPreviewOriginalPhotoId);
  const bringForward = useEditorStore((state) => state.bringForward);
  const sendBackward = useEditorStore((state) => state.sendBackward);
  const removeElement = useEditorStore((state) => state.removeElement);

  const activeSpread = project?.spreads.find(s => s.id === activeSpreadId);
  const element = activeSpread?.elements.find(e => e.id === selectedElementId);

  // Local state acts as a buffer to avoid crashing React node reconciliation on every keystroke
  const [localX, setLocalX] = useState('');
  const [localY, setLocalY] = useState('');
  const [localW, setLocalW] = useState('');
  const [localH, setLocalH] = useState('');
  const [localRot, setLocalRot] = useState('');
  const [localFill, setLocalFill] = useState('#000000');
  const [activeTab, setActiveTab] = useState<'properties' | 'layout' | 'layers' | 'global'>('properties');

  const x_mm = element?.x_mm;
  const y_mm = element?.y_mm;
  const w_mm = element?.w_mm;
  const h_mm = element?.h_mm;
  const rotation_deg = element?.rotation_deg;
  const fillColor = element?.fillColor || element?.color;

  // Sink memory values downward if they are legitimately updated by the canvas/store
  useEffect(() => {
    if (x_mm !== undefined && y_mm !== undefined && w_mm !== undefined && h_mm !== undefined && rotation_deg !== undefined) {
      setLocalX(x_mm.toFixed(2));
      setLocalY(y_mm.toFixed(2));
      setLocalW(w_mm.toFixed(2));
      setLocalH(h_mm.toFixed(2));
      setLocalRot(rotation_deg.toFixed(2));
      if (fillColor) setLocalFill(fillColor);
    }
  }, [x_mm, y_mm, w_mm, h_mm, rotation_deg, fillColor, selectedElementId]);

  // Handle intelligent auto-switching of tabs when selecting elements
  useEffect(() => {
    if (!selectedElementId && activeTab === 'properties') {
      setActiveTab('global');
    } else if (selectedElementId && activeTab === 'global') {
      setActiveTab('properties');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElementId]);

  if (!activeSpreadId) {
    return (
      <aside className="w-64 shrink-0 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 flex flex-col h-full items-center justify-center text-sm text-neutral-400">
        Waiting for spread...
      </aside>
    );
  }

  const TabsHeader = () => (
    <div className="flex border-b border-neutral-200 dark:border-neutral-800 shrink-0">
      <button onClick={() => setActiveTab('properties')} className={`flex-1 py-3 text-[9px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'properties' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
        <SlidersHorizontal className="w-4 h-4" /> Prop.
      </button>
      <button onClick={() => setActiveTab('layout')} className={`flex-1 py-3 text-[9px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'layout' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
        <LayoutTemplate className="w-4 h-4" /> Layout
      </button>
      <button onClick={() => setActiveTab('global')} className={`flex-1 py-3 text-[9px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'global' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
        <Globe className="w-4 h-4" /> Global
      </button>
      <button onClick={() => setActiveTab('layers')} className={`flex-1 py-3 text-[9px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'layers' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
        <Layers className="w-4 h-4" /> Capas
      </button>
    </div>
  );

  if (activeTab === 'global') {
    return (
      <aside className="w-64 shrink-0 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col h-full overflow-hidden">
        <TabsHeader />
        <GlobalStylesPanel />
      </aside>
    );
  }

  if (activeTab === 'layout') {
    return (
      <aside className="w-64 shrink-0 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col h-full overflow-hidden">
        <TabsHeader />
        <AutoLayoutPanel />
      </aside>
    );
  }

  if (activeTab === 'layers') {
    return (
      <aside className="w-64 shrink-0 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col h-full overflow-hidden">
        <TabsHeader />
        <LayersPanel />
      </aside>
    );
  }

  if (!element) {
    return (
      <aside className="w-64 shrink-0 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col h-full overflow-hidden">
        <TabsHeader />
        <div className="flex-1 p-4 flex flex-col items-center justify-center text-sm text-neutral-400 text-center gap-2">
          {t('no_selection')}
        </div>
      </aside>
    );
  }

  const handleBlurOrEnter = (e: React.KeyboardEvent | React.FocusEvent) => {
    if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
    
    updateElement(activeSpreadId, element.id, {
      x_mm: parseFloat(localX) || 0,
      y_mm: parseFloat(localY) || 0,
      w_mm: Math.max(5, parseFloat(localW) || 5), // Constraint to protect mathematical render collapse
      h_mm: Math.max(5, parseFloat(localH) || 5),
      rotation_deg: parseFloat(localRot) || 0,
      fillColor: localFill || '#000000',
      color: localFill || '#000000',
    });
  };

  const InputField = ({ label, value, setter, min, max, step, onReset }: { label: string, value: string, setter: (val: string) => void, min?: number, max?: number, step?: string, onReset?: () => void }) => (
    <div className="flex flex-col gap-1 mb-3">
      <div className="flex justify-between items-center px-1 mb-0.5">
        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
          {label}
          {onReset && (
            <button 
              onClick={(e) => { e.preventDefault(); onReset(); }}
              className="text-neutral-400 hover:text-blue-500 transition-colors bg-neutral-100 dark:bg-neutral-800 rounded p-0.5" 
              title="Reset"
            >
              <RotateCcw className="w-2 h-2" />
            </button>
          )}
        </label>
        <span className="text-[10px] font-mono text-blue-500 font-medium bg-blue-500/10 px-1.5 py-0.5 rounded">{value}</span>
      </div>
      {(min !== undefined && max !== undefined) ? (
        <input
          type="range"
          min={min}
          max={max}
          step={step || "1"}
          className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          value={value}
          onPointerDown={() => useEditorStore.temporal.getState().pause()}
          onTouchStart={() => useEditorStore.temporal.getState().pause()}
          onChange={(e) => setter(e.target.value)}
          onPointerUp={(e) => {
            useEditorStore.temporal.getState().resume();
            setter(e.currentTarget.value);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            handleBlurOrEnter(e as any);
          }}
          onTouchEnd={(e) => {
            useEditorStore.temporal.getState().resume();
            setter(e.currentTarget.value);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            handleBlurOrEnter(e as any);
          }}
          onBlur={handleBlurOrEnter}
        />
      ) : (
        <input
          type="number"
          className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          value={value}
          onChange={(e) => setter(e.target.value)}
          onBlur={handleBlurOrEnter}
          onKeyDown={handleBlurOrEnter}
          step={step || "0.1"}
        />
      )}
    </div>
  );

  return (
    <aside className="w-64 shrink-0 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col h-full overflow-hidden">
      <TabsHeader />
      
      <div className="flex-1 p-4 overflow-y-auto">
        <h2 className="text-sm font-semibold tracking-wider text-neutral-800 dark:text-neutral-200 mb-6 uppercase">{t('properties')}</h2>
      {element.isAutoLayoutManaged && activeSpread?.autoLayout?.isActive ? (
         <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded flex items-start gap-2">
            <Lock className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <span className="text-xs text-blue-700 dark:text-blue-400 font-medium leading-tight">{t('al_managed')}</span>
         </div>
      ) : (
        <>
          <InputField label={t('x_pos')} value={localX} setter={setLocalX} step="0.1" onReset={() => updateElement(activeSpreadId, element.id, { x_mm: 50 })} />
          <InputField label={t('y_pos')} value={localY} setter={setLocalY} step="0.1" onReset={() => updateElement(activeSpreadId, element.id, { y_mm: 50 })} />
          <InputField label={t('width')} value={localW} setter={setLocalW} step="0.1" onReset={() => updateElement(activeSpreadId, element.id, { w_mm: 50 })} />
          <InputField label={t('height')} value={localH} setter={setLocalH} step="0.1" onReset={() => updateElement(activeSpreadId, element.id, { h_mm: 50 })} />
          <InputField label={t('rotation')} value={localRot} setter={setLocalRot} min={0} max={360} step="1" onReset={() => updateElement(activeSpreadId, element.id, { rotation_deg: 0 })} />
        </>
      )}
      <InputField 
        label={"Opacidad Global"} 
        value={element.opacity !== undefined ? (element.opacity * 100).toFixed(0) : '100'} 
        setter={(val) => updateElement(activeSpreadId, element.id, { opacity: parseFloat(val) / 100 })} 
        min={0} max={100} step="1" 
        onReset={() => updateElement(activeSpreadId, element.id, { opacity: 1 })}
      />
      <InputField 
        label={"Escalar (Proporcional)"} 
        value={element.scale !== undefined ? element.scale.toString() : '1'} 
        setter={(val) => updateElement(activeSpreadId, element.id, { scale: parseFloat(val) })} 
        min={0.1} max={5} step="0.05" 
        onReset={() => updateElement(activeSpreadId, element.id, { scale: 1 })}
      />

      {/* Global Style Isolation */}
      <div className="pt-3 pb-2 border-t border-neutral-200 dark:border-neutral-800">
         <label className="flex items-center gap-2 cursor-pointer">
           <input 
             type="checkbox" 
             checked={element.isolateFromGlobalStyles || false} 
             onChange={(e) => updateElement(activeSpreadId, element.id, { isolateFromGlobalStyles: e.target.checked })} 
             className="w-3.5 h-3.5 rounded border-neutral-300 text-blue-500 focus:ring-blue-500" 
           />
           <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase">Aislar de Estilos Globales</span>
         </label>
      </div>
      
      {element.type === 'decoration' && element.sourceType === 'default' && (
        <>
          <div className="flex flex-col gap-1 mb-3">
            <label className="text-xs font-semibold text-neutral-500 uppercase">{t('color')}</label>
            <input
              type="color"
              className="w-full h-8 cursor-pointer rounded border border-neutral-200 dark:border-neutral-700"
              value={localFill || '#000000'}
              onChange={(e) => {
                setLocalFill(e.target.value);
                updateElement(activeSpreadId, element.id, {
                  color: e.target.value
                });
              }}
              onBlur={handleBlurOrEnter}
            />
          </div>

          <div className="flex flex-col gap-1 mb-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
            <label className="text-xs font-semibold text-neutral-500 uppercase">Modo de Mezcla (Blend)</label>
            <select
              className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
              value={element.blendMode || 'source-over'}
              onChange={(e) => updateElement(activeSpreadId, element.id, { blendMode: e.target.value })}
            >
              <option value="source-over">Normal</option>
              <option value="multiply">Multiplicar</option>
              <option value="screen">Trama (Screen)</option>
              <option value="overlay">Superponer</option>
              <option value="darken">Oscurecer</option>
              <option value="lighten">Aclarar</option>
              <option value="color-dodge">Sobreexponer Color</option>
              <option value="color-burn">Subexponer Color</option>
              <option value="hard-light">Luz Fuerte</option>
              <option value="soft-light">Luz Suave</option>
              <option value="difference">Diferencia</option>
              <option value="exclusion">Exclusión</option>
              <option value="color">Color</option>
              <option value="luminosity">Luminosidad</option>
            </select>
          </div>

          {/* Shadow Controls Segment */}
          <LocalShadowPanel element={element} activeSpreadId={activeSpreadId} updateElement={updateElement} />
        </>
      )}

      {element.type === 'image' && (
        <div className="pt-3 mt-3 border-t border-neutral-200 dark:border-neutral-800">
           {/* Phase 7.J: User Control Override */}
           <div className="mb-4 bg-orange-50 dark:bg-orange-900/10 p-3 rounded-lg border border-orange-200 dark:border-orange-800/50">
             <div className="flex items-center justify-between mb-2">
                 <h3 className="text-[10px] font-bold uppercase tracking-wider text-orange-800 dark:text-orange-200">Editorial Role</h3>
             </div>
             <select 
               className="w-full bg-white dark:bg-neutral-950 border border-orange-200 dark:border-orange-800 rounded px-2 py-1.5 text-sm focus:outline-none transition-shadow mb-1 text-orange-900 dark:text-orange-100 font-medium"
               value={element.editorialRole || 'auto'}
               // eslint-disable-next-line @typescript-eslint/no-explicit-any
               onChange={(e) => updateElement(activeSpreadId, element.id, { editorialRole: e.target.value as any })}
             >
                <option value="auto">System Auto</option>
                <option value="hero">★ Forzar HERO</option>
                <option value="supporting">■ Supporting</option>
                <option value="filler">▼ Filler</option>
             </select>
             {element.assignmentReason && activeSpread?.autoLayout?.isActive && (
                <p className="text-[10px] text-orange-800/80 dark:text-orange-200/80 leading-tight mt-1.5 border-t border-orange-200/50 dark:border-orange-800/50 pt-1.5">
                   <strong className="block mb-0.5 opacity-75">Respuesta del Motor:</strong>
                   {element.assignmentReason}
                </p>
             )}
           </div>
           
            <div className="flex items-center justify-between mb-2">
             <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-800 dark:text-neutral-200">Filtros & LUTs Presets</h3>
             {element.photoFilter && element.photoFilter !== 'none' && (
               <button
                 type="button"
                 onMouseDown={() => setPreviewOriginalPhotoId(element.id)}
                 onMouseUp={() => setPreviewOriginalPhotoId(null)}
                 onMouseLeave={() => setPreviewOriginalPhotoId(null)}
                 onTouchStart={() => setPreviewOriginalPhotoId(element.id)}
                 onTouchEnd={() => setPreviewOriginalPhotoId(null)}
                 className="p-1 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors"
                 title="Mantener presionado para ver original sin filtros"
               >
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                 </svg>
               </button>
             )}
           </div>
           <select 
             className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow mb-4"
             value={element.photoFilter || 'none'}
             onChange={(e) => updateElement(activeSpreadId, element.id, { photoFilter: e.target.value })}
           >
              <option value="none">Original (Sin Filtro)</option>
              {Array.from(new Set(LUT_LIBRARY.map(l => l.category))).map(category => (
                <optgroup key={category} label={category}>
                  {LUT_LIBRARY.filter(l => l.category === category).map(lut => (
                    <option key={lut.id} value={lut.id}>{lut.name}</option>
                  ))}
                </optgroup>
              ))}
              <optgroup label="Legacy Básicos">
                <option value="sepia">Sepia (Legacy)</option>
                <option value="grayscale">B/N (Legacy)</option>
                <option value="invert">Invertir</option>
                <option value="blur">Desenfoque</option>
                <option value="noise">Ruido</option>
                <option value="brighten">Brillo</option>
                <option value="contrast">Contraste</option>
                <option value="posterize">Posterizar</option>
              </optgroup>
           </select>

           <div className="flex items-center justify-between mb-2">
             <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-800 dark:text-neutral-200">Camera Raw Pro</h3>
           </div>
           
           <CameraRawPanel element={element} activeSpreadId={activeSpreadId} />
           
        </div>
      )}

      {element.type === 'text' && (
        <div className="mb-4">
          {/* Typograpy Presets Block */}
          <div className="bg-neutral-50 dark:bg-neutral-900/50 p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 mb-3">
             <TypographyPresetSelector />
          </div>
          
          <div className="bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 space-y-4">
            {/* Raw Text Box */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <TextSelect className="w-3.5 h-3.5 text-neutral-500" />
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Text Source</label>
              </div>
              <textarea
                className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow min-h-[60px]"
                value={element.text || ''}
                onChange={(e) => updateElement(activeSpreadId, element.id, { text: e.target.value })}
                placeholder="Escribe tu texto..."
              />
            </div>

            {/* Font Typography Bar */}
            <div className="">
              <div className="flex items-center gap-1.5 mb-2">
                <Type className="w-3.5 h-3.5 text-neutral-500" />
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Typography</label>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                <select
                  className="w-full h-8 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded px-2 text-sm focus:outline-none"
                  value={element.fontFamily || 'Inter'}
                  onChange={(e) => updateElement(activeSpreadId, element.id, { fontFamily: e.target.value })}
                >
                  <optgroup label="Scripts & Calligraphy">
                    <option value="Great Vibes">Great Vibes</option>
                    <option value="Alex Brush">Alex Brush</option>
                    <option value="Allura">Allura</option>
                    <option value="Parisienne">Parisienne (Adorn)</option>
                    <option value="Qwigley">Qwigley (Burgues)</option>
                    <option value="Grand Hotel">Grand Hotel (Lavanderia)</option>
                    <option value="Cedarville Cursive">Cedarville (Snell)</option>
                    <option value="Herr Von Muellerhoff">Herr Von Muellerhoff (Zapfino)</option>
                    <option value="Tangerine">Tangerine (Shelley)</option>
                    <option value="Sacramento">Sacramento (Affair)</option>
                    <option value="Pinyon Script">Pinyon Script</option>
                    <option value="Caveat">Caveat (Playlist)</option>
                    <option value="Satisfy">Satisfy (Beloved)</option>
                    <option value="Dancing Script">Dancing Script</option>
                    <option value="Pacifico">Pacifico</option>
                    <option value="Cookie">Cookie</option>
                    <option value="Rochester">Rochester</option>
                    <option value="Montez">Montez</option>
                    <option value="Norican">Norican</option>
                    <option value="Mrs Saint Delafield">Mrs Saint Delafield</option>
                    <option value="La Belle Aurore">La Belle Aurore</option>
                  </optgroup>
                  <optgroup label="Serif & Editorial">
                    <option value="Playfair Display">Playfair Display</option>
                    <option value="Libre Baskerville">Libre Baskerville</option>
                    <option value="Bodoni Moda">Bodoni Moda</option>
                    <option value="EB Garamond">EB Garamond</option>
                    <option value="Libre Caslon Text">Libre Caslon Text</option>
                    <option value="Cormorant Garamond">Cormorant Garamond</option>
                    <option value="Lora">Lora (Sabon)</option>
                    <option value="Crimson Text">Crimson Text (Minion)</option>
                    <option value="Cinzel">Cinzel (Trajan)</option>
                    <option value="Neuton">Neuton (Mrs Eaves)</option>
                    <option value="Prata">Prata (Chronicle)</option>
                    <option value="Gloock">Gloock (Canela)</option>
                    <option value="Abril Fatface">Abril Fatface (Butler)</option>
                    <option value="Vidaloka">Vidaloka (Noe)</option>
                    <option value="Frank Ruhl Libre">Frank Ruhl Libre</option>
                    <option value="Yeseva One">Yeseva One</option>
                    <option value="Zilla Slab">Zilla Slab (Editorial)</option>
                    <option value="Cinzel Decorative">Cinzel Decorative</option>
                    <option value="Marcellus">Marcellus</option>
                    <option value="Forum">Forum</option>
                    <option value="Spectral">Spectral</option>
                    <option value="Fraunces">Fraunces (Orpheus)</option>
                    <option value="Cardo">Cardo</option>
                    <option value="Alegreya">Alegreya</option>
                    <option value="Vollkorn">Vollkorn</option>
                    <option value="Arapey">Arapey</option>
                    <option value="Old Standard TT">Old Standard TT</option>
                    <option value="Sorts Mill Goudy">Sorts Mill Goudy</option>
                  </optgroup>
                  <optgroup label="Sans Serif & Modern">
                    <option value="Inter">Inter (Helvetica)</option>
                    <option value="Jost">Jost (Futura)</option>
                    <option value="Nunito Sans">Nunito Sans (Avenir)</option>
                    <option value="Montserrat">Montserrat</option>
                    <option value="Raleway">Raleway</option>
                    <option value="DM Sans">DM Sans (Proxima)</option>
                    <option value="Prompt">Prompt (Gotham)</option>
                    <option value="Lato">Lato</option>
                    <option value="Open Sans">Open Sans</option>
                    <option value="Poppins">Poppins</option>
                    <option value="Josefin Sans">Josefin Sans</option>
                    <option value="Work Sans">Work Sans</option>
                    <option value="Nunito">Nunito</option>
                    <option value="Outfit">Outfit</option>
                    <option value="Oswald">Oswald</option>
                    <option value="Arial">Arial</option>
                  </optgroup>
                </select>
                <div className="flex items-center bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded h-8 px-1">
                   <input type="number" value={element.fontSize || 32} onChange={(e) => updateElement(activeSpreadId, element.id, { fontSize: parseFloat(e.target.value) || 32 })} className="w-10 text-center bg-transparent border-none text-sm outline-none" min={8} max={500} />
                </div>
              </div>
            </div>

            {/* Formatting Row */}
            <div className="grid grid-cols-2 gap-2">
              {/* Spacing Adjustments */}
              <div className="flex bg-neutral-200/50 dark:bg-neutral-800/50 p-1 rounded-md">
                <button onClick={() => updateElement(activeSpreadId, element.id, { textAlign: 'left' })} className={`flex-1 flex justify-center py-1 rounded transition-colors ${!element.textAlign || element.textAlign === 'left' ? 'bg-white dark:bg-neutral-700 shadow-sm' : 'text-neutral-500'}`}>
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button onClick={() => updateElement(activeSpreadId, element.id, { textAlign: 'center' })} className={`flex-1 flex justify-center py-1 rounded transition-colors ${element.textAlign === 'center' ? 'bg-white dark:bg-neutral-700 shadow-sm' : 'text-neutral-500'}`}>
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button onClick={() => updateElement(activeSpreadId, element.id, { textAlign: 'right' })} className={`flex-1 flex justify-center py-1 rounded transition-colors ${element.textAlign === 'right' ? 'bg-white dark:bg-neutral-700 shadow-sm' : 'text-neutral-500'}`}>
                  <AlignRight className="w-4 h-4" />
                </button>
              </div>

              {/* Text Case Segment (using a clean segmented structure) */}
              <div className="flex bg-neutral-200/50 dark:bg-neutral-800/50 p-1 rounded-md text-xs font-medium">
                <button onClick={() => updateElement(activeSpreadId, element.id, { textTransform: 'uppercase' })} className={`flex-1 flex justify-center py-1 rounded transition-colors ${element.textTransform === 'uppercase' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500'}`}>
                  AA
                </button>
                <button onClick={() => updateElement(activeSpreadId, element.id, { textTransform: 'lowercase' })} className={`flex-1 flex justify-center py-1 rounded transition-colors ${element.textTransform === 'lowercase' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500'}`}>
                  aa
                </button>
                <button onClick={() => updateElement(activeSpreadId, element.id, { textTransform: undefined })} className={`flex-1 flex justify-center py-1 rounded transition-colors ${!element.textTransform ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500'}`}>
                  Aa
                </button>
              </div>
            </div>

            {/* Metrics */}
            <div className={`grid grid-cols-2 gap-3`}>
              <div className="flex items-center gap-2">
                <LetterText className="w-4 h-4 text-neutral-400 shrink-0" />
                <input type="range" min="-10" max="100" step="1" value={element.letterSpacing || 0} onChange={(e) => updateElement(activeSpreadId, element.id, { letterSpacing: parseFloat(e.target.value) })} className="w-full accent-blue-500 h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer" />
                <span className="text-xs text-neutral-400 w-6 text-right tabular-nums">{element.letterSpacing || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <Baseline className="w-4 h-4 text-neutral-400 shrink-0" />
                <input type="range" min="0.5" max="3" step="0.1" value={element.lineHeight || 1} onChange={(e) => updateElement(activeSpreadId, element.id, { lineHeight: parseFloat(e.target.value) })} className="w-full accent-blue-500 h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer" />
                <span className="text-xs text-neutral-400 w-6 text-right tabular-nums">{element.lineHeight || 1}</span>
              </div>
            </div>

            {/* Global Style Isolation */}
            <div className="pt-3 pb-2 border-t border-neutral-200 dark:border-neutral-800">
               <label className="flex items-center gap-2 cursor-pointer">
                 <input 
                   type="checkbox" 
                   checked={element.isolateFromGlobalStyles || false} 
                   onChange={(e) => updateElement(activeSpreadId, element.id, { isolateFromGlobalStyles: e.target.checked })} 
                   className="w-3.5 h-3.5 rounded border-neutral-300 text-blue-500 focus:ring-blue-500" 
                 />
                 <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Aislar de Estilos Globales</span>
               </label>
            </div>

            {/* Fills & Strokes */}
            <div className="grid grid-cols-[1fr_1fr] gap-4 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <PaintBucket className="w-3.5 h-3.5 text-neutral-500" />
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Fill</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="color" className="w-8 h-8 rounded-full border border-neutral-200 shadow-sm cursor-pointer p-0 overflow-hidden" value={element.textColor || '#000000'} onChange={(e) => updateElement(activeSpreadId, element.id, { textColor: e.target.value })} />
                  <span className="text-xs text-neutral-600 font-mono uppercase bg-white border px-1.5 py-1 rounded">{element.textColor || '#000000'}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <TypeOutline className="w-3.5 h-3.5 text-neutral-500" />
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Stroke</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="color" className="w-6 h-6 rounded border border-neutral-200 shadow-sm cursor-pointer p-0 overflow-hidden" value={element.strokeColor || '#000000'} onChange={(e) => updateElement(activeSpreadId, element.id, { strokeColor: e.target.value })} />
                  <input type="number" min="0" max="100" value={element.strokeWidth || 0} onChange={(e) => updateElement(activeSpreadId, element.id, { strokeWidth: parseFloat(e.target.value) || 0 })} className="w-10 h-6 border rounded text-xs text-center outline-none bg-white font-mono" />
                </div>
              </div>
            </div>
            
            {/* Shadow Controls Segment */}
            <LocalShadowPanel element={element} activeSpreadId={activeSpreadId} updateElement={updateElement} />
          </div>
        </div>
      )}

      {element.type === 'shape' && (
        <div className="flex flex-col gap-1 mb-3">
          <label className="text-xs font-semibold text-neutral-500 uppercase">{t('fill_color')}</label>
          <input
            type="color"
            className="w-full h-8 cursor-pointer rounded border border-neutral-200 dark:border-neutral-700"
            value={localFill}
            onChange={(e) => setLocalFill(e.target.value)}
            onBlur={handleBlurOrEnter}
          />
        </div>
      )}

      <div className="pt-4 mt-6 border-t border-neutral-200 dark:border-neutral-800 flex justify-between gap-2">
        <button 
          onClick={() => sendBackward(activeSpreadId, element.id)} 
          className="flex-1 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-semibold uppercase rounded text-neutral-600 dark:text-neutral-400 transition-colors"
          title={t('send_backward')}
        >
          Capa ↓
        </button>
        <button 
          onClick={() => bringForward(activeSpreadId, element.id)} 
          className="flex-1 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-semibold uppercase rounded text-neutral-600 dark:text-neutral-400 transition-colors"
          title={t('bring_forward')}
        >
          Capa ↑
        </button>
        <button 
          onClick={() => removeElement(activeSpreadId, element.id)} 
          className="flex-1 py-1.5 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-xs font-semibold uppercase rounded text-red-600 dark:text-red-400 transition-colors"
          title={t('delete')}
        >
          ✕
        </button>
      </div>
      </div>
    </aside>
  );
}
