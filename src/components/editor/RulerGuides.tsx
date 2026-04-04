import React from 'react';
import { EditorProject } from '@/types/editor';
import { useEditorStore } from '@/store/useEditorStore';

interface RulerGuidesProps {
  scale: number;
  project: EditorProject;
  unit: 'in' | 'cm';
}

export function RulerGuides({ scale, project, unit }: RulerGuidesProps) {
  const activeSpreadId = useEditorStore(s => s.activeSpreadId);
  const addGuide = useEditorStore(s => s.addGuide);
  const updateGuide = useEditorStore(s => s.updateGuide);
  const removeGuide = useEditorStore(s => s.removeGuide);

  const startGuideDrag = (e: React.PointerEvent, orientation: 'horizontal' | 'vertical') => {
     if (!activeSpreadId) return;
     // Konva wraps the <canvas> inside a div with class "konvajs-content"
     const canvasWrapper = document.querySelector('.konvajs-content');
     if (!canvasWrapper) return;
     
     const rect = canvasWrapper.getBoundingClientRect();
     const guideId = `guide_${Date.now()}`;
     const initialPos = orientation === 'horizontal' ? (e.clientY - rect.top) / scale : (e.clientX - rect.left) / scale;
     
     addGuide(activeSpreadId, { id: guideId, orientation, position_mm: initialPos });

     const onMove = (ev: PointerEvent) => {
         const mm = orientation === 'horizontal' ? (ev.clientY - rect.top) / scale : (ev.clientX - rect.left) / scale;
         updateGuide(activeSpreadId, guideId, { position_mm: mm });
     };

     const onUp = (ev: PointerEvent) => {
         const mm = orientation === 'horizontal' ? (ev.clientY - rect.top) / scale : (ev.clientX - rect.left) / scale;
         // Drag-to-delete logic dynamically drops guides snapped completely outside physical page lines
         if (mm < -10 || (orientation === 'vertical' && mm > project.size.w_mm + 10) || (orientation === 'horizontal' && mm > project.size.h_mm + 10)) {
            removeGuide(activeSpreadId, guideId);
         }
         window.removeEventListener('pointermove', onMove);
         window.removeEventListener('pointerup', onUp);
     };

     window.addEventListener('pointermove', onMove);
     window.addEventListener('pointerup', onUp);
  };
  const isInch = unit === 'in';
  const majorTickMm = isInch ? 25.4 : 10;
  
  const wPixels = project.size.w_mm * scale;
  const hPixels = project.size.h_mm * scale;
  
  const hTicks = Math.floor(project.size.w_mm / majorTickMm) + 1;
  const vTicks = Math.floor(project.size.h_mm / majorTickMm) + 1;

  const rulerThickness = 24; // px

  return (
    <>
      {/* Top Horizontal Ruler */}
      <div 
        className="absolute bg-white dark:bg-neutral-800 border-b border-neutral-300 dark:border-neutral-700 cursor-row-resize select-none"
        onPointerDown={(e) => startGuideDrag(e, 'horizontal')}
        style={{
           top: -rulerThickness,
           left: 0,
           height: rulerThickness,
           width: wPixels,
           overflow: 'hidden'
        }}
      >
        {Array.from({ length: hTicks }).map((_, i) => {
          const pos = i * majorTickMm * scale;
          return (
            <div 
              key={i} 
              className="absolute top-0 bottom-0 border-l border-neutral-400 dark:border-neutral-500"
              style={{ left: pos }}
            >
              <span className="text-[10px] text-neutral-500 ml-1 mt-0.5 block select-none">
                {i}
              </span>
            </div>
          );
        })}
      </div>

      {/* Left Vertical Ruler */}
      <div 
        className="absolute bg-white dark:bg-neutral-800 border-r border-neutral-300 dark:border-neutral-700 cursor-col-resize select-none"
        onPointerDown={(e) => startGuideDrag(e, 'vertical')}
        style={{
           top: 0,
           left: -rulerThickness,
           width: rulerThickness,
           height: hPixels,
           overflow: 'hidden'
        }}
      >
        {Array.from({ length: vTicks }).map((_, i) => {
          const pos = i * majorTickMm * scale;
          return (
            <div 
              key={i} 
              className="absolute left-0 right-0 border-t border-neutral-400 dark:border-neutral-500"
              style={{ top: pos }}
            >
              <span className="text-[10px] text-neutral-500 ml-0.5 mt-0.5 block select-none" style={{ transform: 'rotate(-90deg)', transformOrigin: 'top left', marginTop: '14px', marginLeft: '6px' }}>
                {i}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Corner Square */}
      <div 
        className="absolute bg-white dark:bg-neutral-800 border-b border-r border-neutral-300 dark:border-neutral-700 font-mono text-[9px] text-neutral-400 flex items-center justify-center font-bold"
        style={{
          top: -rulerThickness,
          left: -rulerThickness,
          width: rulerThickness,
          height: rulerThickness
        }}
      >
        {unit.toUpperCase()}
      </div>
    </>
  );
}
