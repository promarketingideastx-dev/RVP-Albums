"use client";

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useEditorStore } from '@/store/useEditorStore';
import { RulerGuides } from './RulerGuides';
import { TYPOGRAPHY_PRESETS } from '@/lib/typography-presets';

const SpreadCanvas = dynamic(() => import('./SpreadCanvas'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full w-full bg-neutral-100 dark:bg-neutral-800">Loading Canvas...</div>
});

export default function EditorWorkspace() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const project = useEditorStore((state) => state.project);
  const measurementUnit = useEditorStore((state) => state.measurementUnit);

  // Auto-inject Google Fonts globally so preset fonts don't break when sidebar unmounts
  const fontLinks = React.useMemo(() => {
    const fontsSet = new Set<string>();
    TYPOGRAPHY_PRESETS.forEach(p => {
      fontsSet.add(p.fonts.h1);
      fontsSet.add(p.fonts.h2);
      fontsSet.add(p.fonts.body);
      fontsSet.add(p.fonts.small);
    });

    // Also inject any custom fonts currently active anywhere across the spreads
    if (project && project.spreads) {
      project.spreads.forEach(spread => {
        spread.elements.forEach(element => {
          if (element.type === 'text' && element.fontFamily) {
            fontsSet.add(element.fontFamily);
          }
        });
      });
    }

    return Array.from(fontsSet).map(font => 
      `@import url('https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}&display=swap');`
    ).join('\n');
  }, [project]);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Real ResizeObserver bound to the component container, not the window
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setDimensions({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height
        });
      }
    });
    
    observer.observe(containerRef.current);
    
    // Set initial size
    setDimensions({
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight
    });

    return () => observer.disconnect();
  }, []);

  if (!project) return <div className="flex items-center justify-center h-full text-neutral-400">No project loaded</div>;

  // Calculate scale so the canvas fits in the workspace
  const padding = 80;
  const availableWidth = Math.max(10, dimensions.width - padding);
  const availableHeight = Math.max(10, dimensions.height - padding);
  
  const scaleX = availableWidth / project.size.w_mm;
  const scaleY = availableHeight / project.size.h_mm;
  const scale = Math.min(scaleX, scaleY);
  
  const isReady = scale > 0 && dimensions.width > 0;
  const stageWidth = isReady ? project.size.w_mm * scale : 0;
  const stageHeight = isReady ? project.size.h_mm * scale : 0;

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden bg-neutral-200 dark:bg-neutral-900 flex items-center justify-center relative w-full h-full">
       <style dangerouslySetInnerHTML={{ __html: fontLinks }} />
       {!isReady ? (
         <div className="text-xs text-neutral-400">Loading Canvas...</div>
       ) : (
         <div 
           className="absolute transition-all duration-200" 
           style={{ width: stageWidth, height: stageHeight }}
         >
           <SpreadCanvas 
             stageWidth={stageWidth} 
             stageHeight={stageHeight} 
             scale={scale} 
           />
           <RulerGuides 
             scale={scale} 
             project={project} 
             unit={measurementUnit} 
           />
         </div>
       )}
    </div>
  );
}
