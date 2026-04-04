"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useEditorStore } from '@/store/useEditorStore';

interface NavigatorProps {
  scale: number;
  autoScale: number;
}

export function NavigatorWidget({ scale, autoScale }: NavigatorProps) {
  const project = useEditorStore(state => state.project);
  const workspaceZoom = useEditorStore(state => state.workspaceZoom);
  const setWorkspaceZoom = useEditorStore(state => state.setWorkspaceZoom);

  const minimapRef = useRef<HTMLDivElement>(null);

  const [viewBox, setViewBox] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Default minimap container sizing
  const MAP_WIDTH = 200;
  
  const updateViewBox = useCallback(() => {
    const container = document.getElementById('workspace-scroll-container');
    if (!container) return;

    const scrollW = container.scrollWidth;
    const scrollH = container.scrollHeight;
    const clientW = container.clientWidth;
    const clientH = container.clientHeight;

    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    // The scale of the minimap relative to the total scrollable area
    const mapScaleX = MAP_WIDTH / scrollW;
    const mapScaleY = (MAP_WIDTH * (scrollH / scrollW)) / scrollH;

    setViewBox({
      left: scrollLeft * mapScaleX,
      top: scrollTop * mapScaleY,
      width: clientW * mapScaleX,
      height: clientH * mapScaleY
    });
  }, []);

  useEffect(() => {
    const container = document.getElementById('workspace-scroll-container');
    if (!container) return;

    container.addEventListener('scroll', updateViewBox);
    window.addEventListener('resize', updateViewBox);
    
    // Initial sync
    setTimeout(updateViewBox, 50);

    return () => {
      container.removeEventListener('scroll', updateViewBox);
      window.removeEventListener('resize', updateViewBox);
    };
  }, [updateViewBox, scale]);

  // Two-way sync: Dragging the Red Box physically scrolls the native DOM
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const container = document.getElementById('workspace-scroll-container');
    const minimap = minimapRef.current;
    if (!container || !minimap) return;

    // Movement delta natively mapped to scroll offsets
    const mapScaleX = MAP_WIDTH / container.scrollWidth;
    const mapScaleY = (MAP_WIDTH * (container.scrollHeight / container.scrollWidth)) / container.scrollHeight;

    const scrollDeltaX = e.movementX / mapScaleX;
    const scrollDeltaY = e.movementY / mapScaleY;

    container.scrollBy({ left: scrollDeltaX, top: scrollDeltaY, behavior: 'instant' });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  if (!project) return null;

  const scrollH = document.getElementById('workspace-scroll-container')?.scrollHeight || MAP_WIDTH;
  const scrollW = document.getElementById('workspace-scroll-container')?.scrollWidth || MAP_WIDTH;
  const MAP_HEIGHT = MAP_WIDTH * (scrollH / scrollW);

  // The actual Canvas element size inside the scroll container
  const padding = 80;
  const stageW = project.size.w_mm * scale;
  const stageH = project.size.h_mm * scale;

  // Render a tiny miniature of the actual canvas (gray box inside the map)
  const mapScaleX = MAP_WIDTH / scrollW;
  const mapScaleY = MAP_HEIGHT / scrollH;
  
  // Natively calculate where the canvas sits in the scrollable bounds (centered)
  const canvasLeft = scrollW > (stageW + padding) ? (scrollW - stageW) / 2 : padding / 2;
  const canvasTop = scrollH > (stageH + padding) ? (scrollH - stageH) / 2 : padding / 2;

  const currentPercentage = Math.round((scale / autoScale) * 100);

  return (
    <div className="absolute bottom-6 right-6 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-2xl overflow-hidden z-40 flex flex-col w-[202px]">
      {/* Header */}
      <div className="px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 font-semibold text-xs text-neutral-600 dark:text-neutral-300 flex items-center justify-between">
        <span>Navigator</span>
        <span className="font-mono">{currentPercentage}%</span>
      </div>

      {/* MiniMap Area */}
      <div 
        ref={minimapRef}
        className="relative bg-neutral-50 dark:bg-neutral-950 w-full"
        style={{ height: MAP_HEIGHT || 150 }}
      >
        {/* Tiny Canvas Representation */}
        <div 
          className="absolute bg-white dark:bg-neutral-700 shadow-sm transition-all duration-75"
          style={{
            left: canvasLeft * mapScaleX,
            top: canvasTop * mapScaleY,
            width: stageW * mapScaleX,
            height: stageH * mapScaleY
          }}
        />

        {/* The Red Hover Viewbox */}
        <div 
          className="absolute border-2 border-red-500 cursor-grab hover:bg-red-500 hover:bg-opacity-10 transition-colors"
          style={{
            left: viewBox.left,
            top: viewBox.top,
            width: viewBox.width,
            height: viewBox.height,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)', // Photoshop darkened out-of-bounds style
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>

      {/* Slider Controls */}
      <div className="p-3 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 flex items-center gap-2">
        <svg className="w-3 h-3 text-neutral-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-3.5-8a.5.5 0 01.5-.5h6a.5.5 0 010 1h-6a.5.5 0 01-.5-.5z" clipRule="evenodd" /></svg>
        <input 
          type="range"
          min={0.1}
          max={5.0} // 10% to 500% zoom
          step={0.05}
          className="w-full accent-blue-500"
          value={workspaceZoom === null ? 1.0 : workspaceZoom}
          onChange={(e) => {
             const val = parseFloat(e.target.value);
             // If they snap back to exact 1.0, null it out so it auto-fits natively again!
             if (Math.abs(val - 1.0) < 0.01) setWorkspaceZoom(null);
             else setWorkspaceZoom(val);
          }}
        />
        <svg className="w-4 h-4 text-neutral-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm4.5-8a.5.5 0 01-.5.5h-3v3a.5.5 0 01-1 0v-3h-3a.5.5 0 010-1h3v-3a.5.5 0 011 0v3h3a.5.5 0 01.5.5z" clipRule="evenodd" /></svg>
      </div>
    </div>
  );
}
