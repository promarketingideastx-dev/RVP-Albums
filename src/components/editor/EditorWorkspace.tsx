"use client";

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useEditorStore } from '@/store/useEditorStore';

const SpreadCanvas = dynamic(() => import('./SpreadCanvas'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full w-full bg-neutral-100 dark:bg-neutral-800">Loading Canvas...</div>
});

export default function EditorWorkspace() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const project = useEditorStore((state) => state.project);

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
  // Leave a 40px padding on all sides (80px total)
  const padding = 80;
  const availableWidth = dimensions.width - padding;
  const availableHeight = dimensions.height - padding;
  
  const scaleX = availableWidth / project.size.w_mm;
  const scaleY = availableHeight / project.size.h_mm;
  
  const scale = Math.min(scaleX, scaleY);
  
  if (scale <= 0 || !dimensions.width) return <div ref={containerRef} className="flex-1 h-full w-full" />;

  const stageWidth = project.size.w_mm * scale;
  const stageHeight = project.size.h_mm * scale;

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden bg-neutral-200 dark:bg-neutral-900 flex items-center justify-center relative">
       <div 
         className="absolute transition-all duration-200 overflow-hidden" 
         style={{ width: stageWidth, height: stageHeight }}
       >
         <SpreadCanvas 
            stageWidth={stageWidth} 
            stageHeight={stageHeight} 
            scale={scale} 
         />
       </div>
    </div>
  );
}
