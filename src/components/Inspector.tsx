"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useEditorStore } from '@/store/useEditorStore';

export default function Inspector() {
  const t = useTranslations('Editor');
  const project = useEditorStore((state) => state.project);
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const updateElement = useEditorStore((state) => state.updateElement);
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
  const [localFill, setLocalFill] = useState('');
  const [localOpacity, setLocalOpacity] = useState('');
  const [localScale, setLocalScale] = useState('');

  const x_mm = element?.x_mm;
  const y_mm = element?.y_mm;
  const w_mm = element?.w_mm;
  const h_mm = element?.h_mm;
  const rotation_deg = element?.rotation_deg;
  const fillColor = element?.fillColor || element?.color;
  const opacity = element?.opacity !== undefined ? element.opacity : 1;
  const scale = element?.scale !== undefined ? element.scale : 1;

  // Sink memory values downward if they are legitimately updated by the canvas/store
  useEffect(() => {
    if (x_mm !== undefined && y_mm !== undefined && w_mm !== undefined && h_mm !== undefined && rotation_deg !== undefined) {
      setLocalX(x_mm.toFixed(2));
      setLocalY(y_mm.toFixed(2));
      setLocalW(w_mm.toFixed(2));
      setLocalH(h_mm.toFixed(2));
      setLocalRot(rotation_deg.toFixed(2));
      setLocalOpacity((opacity * 100).toFixed(0));
      setLocalScale((scale).toFixed(2));
      if (fillColor) setLocalFill(fillColor);
    }
  }, [x_mm, y_mm, w_mm, h_mm, rotation_deg, opacity, scale, fillColor, selectedElementId]);

  if (!element || !activeSpreadId) {
    return (
      <aside className="w-64 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 flex items-center justify-center text-sm text-neutral-400">
        {t('no_selection')}
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
      opacity: (parseFloat(localOpacity) || 100) / 100,
      scale: parseFloat(localScale) || 1,
    });
  };

  const InputField = ({ label, value, setter, min, max, step }: { label: string, value: string, setter: (val: string) => void, min?: number, max?: number, step?: string }) => (
    <div className="flex flex-col gap-1 mb-3">
      <div className="flex justify-between items-center px-1 mb-0.5">
        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{label}</label>
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
          onChange={(e) => setter(e.target.value)}
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
    <aside className="w-64 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 flex flex-col overflow-y-auto">
      <h2 className="text-sm font-semibold tracking-wider text-neutral-800 dark:text-neutral-200 mb-6 uppercase">{t('properties')}</h2>
      <InputField label={t('x_pos')} value={localX} setter={setLocalX} min={-500} max={1500} step="1" />
      <InputField label={t('y_pos')} value={localY} setter={setLocalY} min={-500} max={1500} step="1" />
      <InputField label={t('width')} value={localW} setter={setLocalW} min={1} max={1500} step="1" />
      <InputField label={t('height')} value={localH} setter={setLocalH} min={1} max={1500} step="1" />
      <InputField label={t('rotation')} value={localRot} setter={setLocalRot} min={0} max={360} step="1" />
      
      {element.type === 'decoration' && element.sourceType === 'default' && (
        <>
          <InputField label={t('opacity')} value={localOpacity} setter={setLocalOpacity} min={0} max={100} step="1" />
          <InputField label={t('scale')} value={localScale} setter={setLocalScale} min={0.1} max={5} step="0.05" />
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
          <div className="pt-3 mt-3 border-t border-neutral-200 dark:border-neutral-800">
             <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-800 dark:text-neutral-200 mb-2">Shadow Effects</h3>
             <InputField 
               label={"Shadow Blur"} 
               value={element.shadowBlur !== undefined ? element.shadowBlur.toString() : "0"} 
               setter={(val) => updateElement(activeSpreadId, element.id, { shadowBlur: parseFloat(val) })} 
               min={0} max={100} step="1"
             />
             <div className="flex gap-2">
               <InputField 
                 label={"Offset X"} 
                 value={element.shadowOffsetX !== undefined ? element.shadowOffsetX.toString() : "0"} 
                 setter={(val) => updateElement(activeSpreadId, element.id, { shadowOffsetX: parseFloat(val) })} 
                 min={-100} max={100} step="1"
               />
               <InputField 
                 label={"Offset Y"} 
                 value={element.shadowOffsetY !== undefined ? element.shadowOffsetY.toString() : "0"} 
                 setter={(val) => updateElement(activeSpreadId, element.id, { shadowOffsetY: parseFloat(val) })} 
                 min={-100} max={100} step="1"
               />
             </div>
             <div className="flex flex-col gap-1 mb-2 mt-1">
               <label className="text-xs font-semibold text-neutral-500 uppercase">Shadow Color</label>
               <input
                 type="color"
                 className="w-full h-8 cursor-pointer rounded border border-neutral-200 dark:border-neutral-700"
                 value={element.shadowColor || '#000000'}
                 onChange={(e) => updateElement(activeSpreadId, element.id, { shadowColor: e.target.value })}
               />
             </div>
             <InputField 
               label={"Shadow Opacity"} 
               value={element.shadowOpacity !== undefined ? element.shadowOpacity.toString() : "0.5"} 
               setter={(val) => updateElement(activeSpreadId, element.id, { shadowOpacity: parseFloat(val) })} 
               min={0} max={1} step="0.01"
             />
          </div>
        </>
      )}

      {element.type === 'image' && (
        <div className="pt-3 mt-3 border-t border-neutral-200 dark:border-neutral-800">
           <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-800 dark:text-neutral-200 mb-2">Filtros Fotográficos</h3>
           <select 
             className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow mb-2"
             value={element.photoFilter || 'none'}
             onChange={(e) => updateElement(activeSpreadId, element.id, { photoFilter: e.target.value })}
           >
              <option value="none">Original</option>
              <option value="sepia">Sepia Clásico</option>
              <option value="grayscale">Blanco y Negro</option>
              <option value="invert">Invertir Colores</option>
              <option value="blur">Desenfoque (Blur)</option>
              <option value="noise">Ruido de Película (Noise)</option>
              <option value="brighten">Brillo</option>
              <option value="contrast">Contraste</option>
              <option value="posterize">Posterizar</option>
           </select>
           {['blur', 'noise', 'brighten', 'contrast', 'posterize'].includes(element.photoFilter || '') && (
              <InputField 
                label="Intensidad del Filtro" 
                value={element.filterIntensity !== undefined ? element.filterIntensity.toString() : (element.photoFilter === 'posterize' ? '4' : '0')} 
                setter={(val) => updateElement(activeSpreadId, element.id, { filterIntensity: parseFloat(val) })} 
                min={0} max={element.photoFilter === 'posterize' ? 10 : (element.photoFilter === 'blur' ? 20 : (element.photoFilter === 'contrast' ? 100 : 1))}
                step={element.photoFilter === 'posterize' ? '1' : '0.1'}
              />
           )}
        </div>
      )}

      {element.type === 'text' && (
        <div className="mb-4 bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-800 dark:text-neutral-200 mb-3 border-b border-neutral-200 dark:border-neutral-800 pb-2">Typography</h3>
          <div className="flex flex-col gap-1 mb-3">
            <label className="text-xs font-semibold text-neutral-500 uppercase">Text Source</label>
            <textarea
              className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow min-h-[60px]"
              value={element.text || ''}
              onChange={(e) => updateElement(activeSpreadId, element.id, { text: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1 mb-3">
            <label className="text-xs font-semibold text-neutral-500 uppercase">Font Family</label>
            <select
              className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1.5 text-sm focus:outline-none"
              value={element.fontFamily || 'Inter'}
              onChange={(e) => updateElement(activeSpreadId, element.id, { fontFamily: e.target.value })}
            >
              <option value="Inter">Inter (Sans Serif)</option>
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Courier New">Courier New</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
              <option value="Impact">Impact</option>
              <option value="Comic Sans MS">Comic Sans MS</option>
              <option value="Oswald">Oswald</option>
              <option value="Playfair Display">Playfair Display</option>
            </select>
          </div>
          <InputField 
            label={"Font Size"} 
            value={element.fontSize !== undefined ? element.fontSize.toString() : "32"} 
            setter={(val) => updateElement(activeSpreadId, element.id, { fontSize: parseFloat(val) })} 
            min={8} max={250} step="1"
          />
          <div className="flex flex-col gap-1 mb-3">
            <label className="text-xs font-semibold text-neutral-500 uppercase">Text Fill Color</label>
            <input
              type="color"
              className="w-full h-8 cursor-pointer rounded border border-neutral-200 dark:border-neutral-700"
              value={element.textColor || '#000000'}
              onChange={(e) => updateElement(activeSpreadId, element.id, { textColor: e.target.value })}
            />
          </div>
          
          <div className="pt-3 mt-3 border-t border-neutral-200 dark:border-neutral-800">
             <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-800 dark:text-neutral-200 mb-2">Outline (Stroke)</h3>
             <InputField 
               label={"Outline Thickness"} 
               value={element.strokeWidth !== undefined ? element.strokeWidth.toString() : "0"} 
               setter={(val) => updateElement(activeSpreadId, element.id, { strokeWidth: parseFloat(val) })} 
             />
             <div className="flex flex-col gap-1 mb-2 mt-1">
               <label className="text-xs font-semibold text-neutral-500 uppercase">Outline Color</label>
               <input
                 type="color"
                 className="w-full h-8 cursor-pointer rounded border border-neutral-200 dark:border-neutral-700"
                 value={element.strokeColor || '#000000'}
                 onChange={(e) => updateElement(activeSpreadId, element.id, { strokeColor: e.target.value })}
               />
             </div>
          </div>

          <div className="pt-3 mt-3 border-t border-neutral-200 dark:border-neutral-800">
             <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-800 dark:text-neutral-200 mb-2">Text Shadow Drops</h3>
             <InputField 
               label={"Shadow Blur Radius"} 
               value={element.shadowBlur !== undefined ? element.shadowBlur.toString() : "0"} 
               setter={(val) => updateElement(activeSpreadId, element.id, { shadowBlur: parseFloat(val) })} 
             />
             <div className="flex gap-2">
               <InputField 
                 label={"Offset X"} 
                 value={element.shadowOffsetX !== undefined ? element.shadowOffsetX.toString() : "0"} 
                 setter={(val) => updateElement(activeSpreadId, element.id, { shadowOffsetX: parseFloat(val) })} 
                 min={-100} max={100} step="1"
               />
               <InputField 
                 label={"Offset Y"} 
                 value={element.shadowOffsetY !== undefined ? element.shadowOffsetY.toString() : "0"} 
                 setter={(val) => updateElement(activeSpreadId, element.id, { shadowOffsetY: parseFloat(val) })} 
                 min={-100} max={100} step="1"
               />
             </div>
             <div className="flex flex-col gap-1 mb-2 mt-1">
               <label className="text-xs font-semibold text-neutral-500 uppercase">Shadow Color</label>
               <input
                 type="color"
                 className="w-full h-8 cursor-pointer rounded border border-neutral-200 dark:border-neutral-700"
                 value={element.shadowColor || '#000000'}
                 onChange={(e) => updateElement(activeSpreadId, element.id, { shadowColor: e.target.value })}
               />
             </div>
             <InputField 
               label={"Shadow Translucency"} 
               value={element.shadowOpacity !== undefined ? element.shadowOpacity.toString() : "0.5"} 
               setter={(val) => updateElement(activeSpreadId, element.id, { shadowOpacity: parseFloat(val) })} 
             />
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
          ↓
        </button>
        <button 
          onClick={() => bringForward(activeSpreadId, element.id)} 
          className="flex-1 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-semibold uppercase rounded text-neutral-600 dark:text-neutral-400 transition-colors"
          title={t('bring_forward')}
        >
          ↑
        </button>
        <button 
          onClick={() => removeElement(activeSpreadId, element.id)} 
          className="flex-1 py-1.5 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-xs font-semibold uppercase rounded text-red-600 dark:text-red-400 transition-colors"
          title={t('delete')}
        >
          ✕
        </button>
      </div>
    </aside>
  );
}
