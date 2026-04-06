import React from 'react';
import { EditorProject } from '@/types/editor';
import { useEditorStore } from '@/store/useEditorStore';

interface RulerGuidesProps {
  scale: number;
  project: EditorProject;
  unit: 'in' | 'cm';
  panX: number;
  panY: number;
}

export function RulerGuides({ scale, project, unit, panX, panY }: RulerGuidesProps) {
  const activeSpreadId = useEditorStore(s => s.activeSpreadId);
  const addGuide = useEditorStore(s => s.addGuide);
  const updateGuide = useEditorStore(s => s.updateGuide);
  const removeGuide = useEditorStore(s => s.removeGuide);
  
  const [tooltip, setTooltip] = React.useState<{visible: boolean, x: number, y: number, value: string} | null>(null);

  const isInch = unit === 'in';
  const majorTickMm = isInch ? 25.4 : 10;

  const startGuideDrag = (e: React.PointerEvent, orientation: 'horizontal' | 'vertical') => {
     if (!activeSpreadId) return;
     // Konva wraps the <canvas> inside a div with class "konvajs-content"
     const canvasWrapper = document.querySelector('.konvajs-content');
     if (!canvasWrapper) return;
     
     const rect = canvasWrapper.getBoundingClientRect();
     const guideId = `guide_${Date.now()}`;
     const initialPos = orientation === 'horizontal' ? (e.clientY - rect.top - panY) / scale : (e.clientX - rect.left - panX) / scale;
     
     addGuide({ id: guideId, orientation, position_mm: initialPos });

     const onMove = (ev: PointerEvent) => {
         const mm = orientation === 'horizontal' ? (ev.clientY - rect.top - panY) / scale : (ev.clientX - rect.left - panX) / scale;
         updateGuide(guideId, { position_mm: mm });
         
         const displayValue = isInch ? `${(mm / 25.4).toFixed(2)} in` : `${(mm / 10).toFixed(2)} cm`;
         setTooltip({ visible: true, x: ev.clientX, y: ev.clientY, value: displayValue });
     };

     const onUp = (ev: PointerEvent) => {
         const mm = orientation === 'horizontal' ? (ev.clientY - rect.top - panY) / scale : (ev.clientX - rect.left - panX) / scale;
         // Drag-to-delete logic dynamically drops guides snapped completely outside physical page lines
         if (mm < -10 || (orientation === 'vertical' && mm > project.size.w_mm + 10) || (orientation === 'horizontal' && mm > project.size.h_mm + 10)) {
            removeGuide(guideId);
         }
         setTooltip(null);
         window.removeEventListener('pointermove', onMove);
         window.removeEventListener('pointerup', onUp);
     };

     window.addEventListener('pointermove', onMove);
     window.addEventListener('pointerup', onUp);
  };
  
  const isLastSpread = activeSpreadId && project.spreads[project.spreads.length - 1]?.id === activeSpreadId;
  const isLastSpreadEmpty = isLastSpread && project.spreads.find(s => s.id === activeSpreadId)?.elements.length === 0;
  
  const spreadGap = 50; // mm
  const totalWidth = (isLastSpread && !isLastSpreadEmpty) ? (project.size.w_mm * 2) + spreadGap : project.size.w_mm;

  const wPixels = totalWidth * scale;
  const hPixels = project.size.h_mm * scale;
  
  const hTicks = Math.floor(totalWidth / majorTickMm) + 1;
  const vTicks = Math.floor(project.size.h_mm / majorTickMm) + 1;

  const rulerThickness = 24; // px

  return (
    <>
      {/* Top Horizontal Ruler */}
      <div 
        className="absolute bg-white dark:bg-neutral-800 border-b border-neutral-300 dark:border-neutral-700 cursor-row-resize select-none z-10"
        onPointerDown={(e) => startGuideDrag(e, 'horizontal')}
        style={{
           top: 0,
           left: rulerThickness,
           height: rulerThickness,
           right: 0,
           overflow: 'hidden'
        }}
      >
        <div style={{ transform: `translateX(${panX}px)`, width: wPixels, height: '100%', position: 'relative' }}>
          {Array.from({ length: hTicks }).map((_, i) => {
            const pos = i * majorTickMm * scale;
            return (
              <React.Fragment key={i}>
                <div 
                  className="absolute top-0 bottom-0 border-l border-neutral-400 dark:border-neutral-500"
                  style={{ left: pos }}
                >
                  <span className="text-[10px] text-neutral-500 ml-1 mt-0.5 block select-none">
                    {i}
                  </span>
                </div>
                {isInch && i < hTicks - 1 && [1, 2, 3].map(frac => (
                   <div 
                      key={`frac-h-${i}-${frac}`} 
                      className={`absolute bottom-0 border-l border-neutral-400 dark:border-neutral-500 ${frac === 2 ? 'h-1/2' : 'h-1/3'}`}
                      style={{ left: pos + (frac * 0.25 * majorTickMm * scale), opacity: frac === 2 ? 0.6 : 0.3 }}
                   />
                ))}
                {!isInch && i < hTicks - 1 && (
                   <div 
                      className="absolute bottom-0 border-l border-neutral-400 dark:border-neutral-500 h-1/2 opacity-40"
                      style={{ left: pos + (0.5 * majorTickMm * scale) }}
                   />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Left Vertical Ruler */}
      <div 
        className="absolute bg-white dark:bg-neutral-800 border-r border-neutral-300 dark:border-neutral-700 cursor-col-resize select-none z-10"
        onPointerDown={(e) => startGuideDrag(e, 'vertical')}
        style={{
           top: rulerThickness,
           left: 0,
           width: rulerThickness,
           bottom: 0,
           overflow: 'hidden'
        }}
      >
        <div style={{ transform: `translateY(${panY}px)`, height: hPixels, width: '100%', position: 'relative' }}>
          {Array.from({ length: vTicks }).map((_, i) => {
            const pos = i * majorTickMm * scale;
            return (
              <React.Fragment key={i}>
                <div 
                  className="absolute left-0 right-0 border-t border-neutral-400 dark:border-neutral-500"
                  style={{ top: pos }}
                >
                  <span className="text-[10px] text-neutral-500 ml-0.5 mt-0.5 block select-none" style={{ transform: 'rotate(-90deg)', transformOrigin: 'top left', marginTop: '14px', marginLeft: '6px' }}>
                    {i}
                  </span>
                </div>
                {isInch && i < vTicks - 1 && [1, 2, 3].map(frac => (
                   <div 
                      key={`frac-v-${i}-${frac}`} 
                      className={`absolute right-0 border-t border-neutral-400 dark:border-neutral-500 ${frac === 2 ? 'w-1/2' : 'w-1/3'}`}
                      style={{ top: pos + (frac * 0.25 * majorTickMm * scale), opacity: frac === 2 ? 0.6 : 0.3 }}
                   />
                ))}
                {!isInch && i < vTicks - 1 && (
                   <div 
                      className="absolute right-0 border-t border-neutral-400 dark:border-neutral-500 w-1/2 opacity-40"
                      style={{ top: pos + (0.5 * majorTickMm * scale) }}
                   />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      
      {/* Corner Square */}
      <div 
        className="absolute bg-white dark:bg-neutral-800 border-b border-r border-neutral-300 dark:border-neutral-700 font-mono text-[9px] text-neutral-400 flex items-center justify-center font-bold z-20"
        style={{
          top: 0,
          left: 0,
          width: rulerThickness,
          height: rulerThickness
        }}
      >
        {unit.toUpperCase()}
      </div>
      
      {tooltip?.visible && (
        <div 
          className="fixed z-50 px-2 py-1 bg-black/80 text-white text-xs rounded-md shadow-lg font-mono pointer-events-none whitespace-nowrap transform -translate-x-1/2 -translate-y-[150%]"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.value}
        </div>
      )}
    </>
  );
}
