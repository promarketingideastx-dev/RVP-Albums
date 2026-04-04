"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '@/store/useEditorStore';

interface NavigatorProps {
  scale: number;
  autoScale: number;
}

export function NavigatorWidget({ scale, autoScale }: NavigatorProps) {
  const project = useEditorStore(state => state.project);
  const workspaceZoom = useEditorStore(state => state.workspaceZoom);
  const setWorkspaceZoom = useEditorStore(state => state.setWorkspaceZoom);
  const workspacePan = useEditorStore(state => state.workspacePan);
  const setWorkspacePan = useEditorStore(state => state.setWorkspacePan);

  const minimapRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Track continuous viewport resizing for precise reverse math
  const [viewportDims, setViewportDims] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = document.getElementById('workspace-container');
    if (!container) return;
    
    // Setup observer to know our actual screen viewport limits
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setViewportDims({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height
        });
      }
    });
    observer.observe(container);
    setViewportDims({ width: container.clientWidth, height: container.clientHeight });
    
    return () => observer.disconnect();
  }, []);

  // Sync Pan Snapping when transitioning from AutoFit to Absolute overrides
  const handleZoomChange = (val: number) => {
    if (!project) return;
    
    if (Math.abs(val - 1.0) < 0.01) {
       setWorkspaceZoom(null);
    } else {
       if (workspaceZoom === null && viewportDims.width > 0) {
          // Snap intrinsic pan right before enforcing override zoom allowing clean visual jumps
          const defaultPanX = (viewportDims.width - (project.size.w_mm * autoScale)) / 2;
          const defaultPanY = (viewportDims.height - (project.size.h_mm * autoScale)) / 2;
          
          // Pre-calculate centered offset mapping
          const cx = viewportDims.width / 2;
          const cy = viewportDims.height / 2;
          const newScale = autoScale * val;
          const mapPanX = cx - (cx - defaultPanX) * (newScale / autoScale);
          const mapPanY = cy - (cy - defaultPanY) * (newScale / autoScale);
          
          setWorkspacePan({ x: mapPanX, y: mapPanY });
       }
       setWorkspaceZoom(val);
    }
  };

  if (!project || viewportDims.width === 0) return null;

  // The fixed physical geometry of the Mini Map UI block
  const MAP_WIDTH = 200;
  const MAP_HEIGHT = MAP_WIDTH * (project.size.h_mm / project.size.w_mm);

  // The actual conversion ratio between the 2D mm paper size and our raw 200px tracker
  const trackingRatio = MAP_WIDTH / project.size.w_mm;

  // Derive PanX / PanY safely (if null, EditorWorkspace overrides to default math anyway, but we need it locally to draw)
  const defaultPanX = (viewportDims.width - (project.size.w_mm * scale)) / 2;
  const defaultPanY = (viewportDims.height - (project.size.h_mm * scale)) / 2;
  const currentPanX = workspaceZoom === null ? defaultPanX : workspacePan.x;
  const currentPanY = workspaceZoom === null ? defaultPanY : workspacePan.y;

  // 1. Calculate the Red ViewBox Size 
  // It represents how much of the REAL PHYSICAL MM PAPER fits inside the Viewport Window!
  const mappedVisibleMmX = viewportDims.width / scale;
  const mappedVisibleMmY = viewportDims.height / scale;
  
  const boxWidth = mappedVisibleMmX * trackingRatio;
  const boxHeight = mappedVisibleMmY * trackingRatio;

  // 2. Calculate the Red ViewBox Position
  // If currentPanX is negative (panned right), it means the viewport's left edge is deep inside the paper!
  // Therefore the box must be shifted POSITIVELY inside the minimap.
  const mappedOffsetMmX = -currentPanX / scale;
  const mappedOffsetMmY = -currentPanY / scale;
  
  const boxLeft = mappedOffsetMmX * trackingRatio;
  const boxTop = mappedOffsetMmY * trackingRatio;

  // Pointer drag bindings routing physics directly back into global Konva Layer translations natively!
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    
    // e.movementX is pixels inside the MAP widget. We must reverse-translate it into Konva absolute Translation matrix offsets.
    // X_map / trackingRatio = mm_movement
    // mm_movement * scale = px_movement_on_screen
    // However, since shifting the BOX means shifting the SCREEN, the screen moves oppositely (-)
    const panPxDeltaX = -(e.movementX / trackingRatio) * scale;
    const panPxDeltaY = -(e.movementY / trackingRatio) * scale;
    
    // Override auto-zoom immediately if not already active
    if (workspaceZoom === null) {
       setWorkspaceZoom(1.0);
    }
    
    setWorkspacePan((prev) => ({ 
       x: prev.x + panPxDeltaX, 
       y: prev.y + panPxDeltaY 
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const currentPercentage = Math.round((scale / autoScale) * 100);

  return (
    <div className="absolute bottom-6 right-6 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-2xl overflow-hidden z-40 flex flex-col w-[202px]">
      <div className="px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 font-semibold text-xs text-neutral-600 dark:text-neutral-300 flex items-center justify-between">
        <span>Navigator</span>
        <span className="font-mono">{currentPercentage}%</span>
      </div>

      <div 
        ref={minimapRef}
        className="relative bg-white dark:bg-neutral-950 w-[200px] overflow-hidden"
        style={{ height: MAP_HEIGHT }}
      >
        <div 
          className="absolute border-2 border-red-500 cursor-grab hover:bg-red-500 hover:bg-opacity-10 transition-colors"
          style={{
            left: boxLeft,
            top: boxTop,
            width: boxWidth,
            height: boxHeight,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>

      <div className="p-3 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 flex items-center gap-2">
        <svg className="w-3 h-3 text-neutral-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-3.5-8a.5.5 0 01.5-.5h6a.5.5 0 010 1h-6a.5.5 0 01-.5-.5z" clipRule="evenodd" /></svg>
        <input 
          type="range"
          min={0.1}
          max={5.0} 
          step={0.05}
          className="w-full accent-blue-500"
          value={workspaceZoom === null ? 1.0 : workspaceZoom}
          onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
        />
        <svg className="w-4 h-4 text-neutral-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm4.5-8a.5.5 0 01-.5.5h-3v3a.5.5 0 01-1 0v-3h-3a.5.5 0 010-1h3v-3a.5.5 0 011 0v3h3a.5.5 0 01.5.5z" clipRule="evenodd" /></svg>
      </div>
    </div>
  );
}
