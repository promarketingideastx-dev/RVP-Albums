"use client";

import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { Stage, Layer, Rect, Ellipse, Transformer, Image as KonvaImage, Text, Group, Line, Circle } from 'react-konva';
import Konva from 'konva';
import { useTranslations } from 'next-intl';
import { LUT_LIBRARY } from '@/lib/lut-presets';
import { TYPOGRAPHY_PRESETS } from '@/lib/typography-presets';
import { useEditorStore } from '@/store/useEditorStore';
import { EditorElement } from '@/types/editor';
import { extractAssetMetadataFromFile } from '@/utils/metadataEngine';
import useImage from 'use-image';

interface SpreadCanvasProps {
  stageWidth: number;
  stageHeight: number;
  scale: number;
  panX: number;
  panY: number;
  spreadIdOverride?: string;
}

export const smartGuidesEmitter = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listeners: [] as any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setGuides: function(guides: any[]) {
    this.listeners.forEach(l => l(guides));
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscribe: function(l: any) { this.listeners.push(l); },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unsubscribe: function(l: any) { this.listeners = this.listeners.filter(cb => cb !== l); }
};

const SmartGuidesRenderer = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupRef = useRef<any>(null);
  
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (g: any[]) => {
       const group = groupRef.current;
       if (!group) return;
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
       const lines = group.getChildren();
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
       lines.forEach((line: any) => line.visible(false));
       
       g.forEach((guide, i) => {
          if (i < lines.length) {
             lines[i].points(guide.points);
             lines[i].visible(true);
          }
       });
       // Direct draw on parent layer ensuring 144Hz commit!
       const layer = group.getLayer();
       if (layer) layer.batchDraw();
    };
    smartGuidesEmitter.subscribe(handler);
    return () => smartGuidesEmitter.unsubscribe(handler);
  }, []);

  return (
    <Group ref={groupRef} listening={false}>
       {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
         <Line 
           key={i} 
           points={[-8000, -8000, -8000, -8000]} 
           stroke="#00ffff" 
           strokeWidth={1.5} 
           dash={[6, 4]} 
           visible={false}
         />
       ))}
    </Group>
  );
};

export function buildSmartSnapBoundFunc(
  element: EditorElement,
  elements: EditorElement[],
  spreadSize: { w_mm: number, h_mm: number }
) {
  return (pos: { x: number, y: number }) => {
    // We are returning the theoretical {x, y} which is the top-left of the Group dragging!
    const SNAP_THRESHOLD_MM = 2; // ~8 pixels mathematically 
    
    const dragBox = {
       x: pos.x,
       y: pos.y,
       w: element.w_mm * (element.scale || 1),
       h: element.h_mm * (element.scale || 1)
    };
    
    const dragEdges = {
       top: dragBox.y,
       centerY: dragBox.y + dragBox.h / 2,
       bottom: dragBox.y + dragBox.h,
       left: dragBox.x,
       centerX: dragBox.x + dragBox.w / 2,
       right: dragBox.x + dragBox.w
    };

    let newX = pos.x;
    let newY = pos.y;
    let snappedX = false;
    let snappedY = false;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeGuides: any[] = [];

    // Check mathematical siblings + Spread Absolute Limits
    const scanTargets = [
      ...elements.filter(sib => sib.id !== element.id && sib.type !== 'group').map(sib => ({
         x: sib.x_mm,
         y: sib.y_mm,
         w: sib.w_mm * (sib.scale || 1),
         h: sib.h_mm * (sib.scale || 1)
      })),
      // pseudo-sibling representing the absolute SCREEN geometry for Center/Top/Bottom alignments
      { x: 0, y: 0, w: spreadSize.w_mm, h: spreadSize.h_mm }
    ];

    scanTargets.forEach(sibBox => {
      
      const sibEdges = {
         top: sibBox.y,
         centerY: sibBox.y + sibBox.h / 2,
         bottom: sibBox.y + sibBox.h,
         left: sibBox.x,
         centerX: sibBox.x + sibBox.w / 2,
         right: sibBox.x + sibBox.w
      };

      // X Edge Alignments
      if (!snappedX) {
        if (Math.abs(dragEdges.left - sibEdges.left) < SNAP_THRESHOLD_MM) {
           newX = sibEdges.left; snappedX = true;
           activeGuides.push({ points: [sibEdges.left, -8000, sibEdges.left, 8000], orientation: 'v' });
        } else if (Math.abs(dragEdges.right - sibEdges.right) < SNAP_THRESHOLD_MM) {
           newX = sibEdges.right - dragBox.w; snappedX = true;
           activeGuides.push({ points: [sibEdges.right, -8000, sibEdges.right, 8000], orientation: 'v' });
        } else if (Math.abs(dragEdges.centerX - sibEdges.centerX) < SNAP_THRESHOLD_MM) {
           newX = sibEdges.centerX - dragBox.w / 2; snappedX = true;
           activeGuides.push({ points: [sibEdges.centerX, -8000, sibEdges.centerX, 8000], orientation: 'v' });
        } else if (Math.abs(dragEdges.left - sibEdges.right) < SNAP_THRESHOLD_MM) { // Snap Left to Right
           newX = sibEdges.right; snappedX = true;
           activeGuides.push({ points: [sibEdges.right, -8000, sibEdges.right, 8000], orientation: 'v' });
        } else if (Math.abs(dragEdges.right - sibEdges.left) < SNAP_THRESHOLD_MM) { // Snap Right to Left
           newX = sibEdges.left - dragBox.w; snappedX = true;
           activeGuides.push({ points: [sibEdges.left, -8000, sibEdges.left, 8000], orientation: 'v' });
        }
      }

      // Y Edge Alignments
      if (!snappedY) {
        if (Math.abs(dragEdges.top - sibEdges.top) < SNAP_THRESHOLD_MM) {
           newY = sibEdges.top; snappedY = true;
           activeGuides.push({ points: [-8000, sibEdges.top, 8000, sibEdges.top], orientation: 'h' });
        } else if (Math.abs(dragEdges.bottom - sibEdges.bottom) < SNAP_THRESHOLD_MM) {
           newY = sibEdges.bottom - dragBox.h; snappedY = true;
           activeGuides.push({ points: [-8000, sibEdges.bottom, 8000, sibEdges.bottom], orientation: 'h' });
        } else if (Math.abs(dragEdges.centerY - sibEdges.centerY) < SNAP_THRESHOLD_MM) {
           newY = sibEdges.centerY - dragBox.h / 2; snappedY = true;
           activeGuides.push({ points: [-8000, sibEdges.centerY, 8000, sibEdges.centerY], orientation: 'h' });
        } else if (Math.abs(dragEdges.top - sibEdges.bottom) < SNAP_THRESHOLD_MM) { // Snap Top to Bottom
           newY = sibEdges.bottom; snappedY = true;
           activeGuides.push({ points: [-8000, sibEdges.bottom, 8000, sibEdges.bottom], orientation: 'h' });
        } else if (Math.abs(dragEdges.bottom - sibEdges.top) < SNAP_THRESHOLD_MM) { // Snap Bottom to Top
           newY = sibEdges.top - dragBox.h; snappedY = true;
           activeGuides.push({ points: [-8000, sibEdges.top, 8000, sibEdges.top], orientation: 'h' });
        }
      }
    });

    // Sub-emit to the isolated HUD renderer bypassing the AST reconciler
    smartGuidesEmitter.setGuides(activeGuides);

    return { x: newX, y: newY };
  };
}

const ShadowDragAnchor = ({ element, spreadId, isSelected }: { element: EditorElement, spreadId: string, isSelected: boolean }) => {
  const updateElement = useEditorStore((state) => state.updateElement);
  const globalStyles = useEditorStore((state) => state.project?.globalImageStyles);
  
  const appliedShadowOpacity = element.shadowOpacity ?? (globalStyles?.shadowEnabled ? (globalStyles.shadowOpacity ?? 0.5) : 0);
  const appliedShadowColor = element.shadowColor || (globalStyles?.shadowEnabled ? (globalStyles.shadowColor || 'transparent') : 'transparent');
  const appliedShadowOffsetX = element.shadowOffsetX ?? (globalStyles?.shadowEnabled ? (globalStyles.shadowOffsetX ?? 0) : 0);
  const appliedShadowOffsetY = element.shadowOffsetY ?? (globalStyles?.shadowEnabled ? (globalStyles.shadowOffsetY ?? 0) : 0);

  if (!isSelected || appliedShadowOpacity <= 0 || appliedShadowColor === 'transparent') return null;

  const centerX = element.x_mm + element.w_mm / 2;
  const centerY = element.y_mm + element.h_mm / 2;

  return (
    <Group x={centerX} y={centerY}>
      <Line 
        points={[0, 0, appliedShadowOffsetX, appliedShadowOffsetY]} 
        stroke="#3b82f6" 
        dash={[4,4]} 
        strokeWidth={1.5} 
        opacity={0.8}
      />
      <Circle 
        x={appliedShadowOffsetX} 
        y={appliedShadowOffsetY} 
        radius={7} 
        fill="#ffffff" 
        stroke="#3b82f6" 
        strokeWidth={3} 
        draggable 
        onDragMove={(e) => {
          updateElement(spreadId, element.id, {
            shadowOffsetX: Math.round(e.target.x()),
            shadowOffsetY: Math.round(e.target.y())
          });
        }}
        onMouseEnter={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = 'move';
        }}
        onMouseLeave={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = 'default';
        }}
      />
    </Group>
  );
};

const EditorImage = ({ 
  element, 
  elements,
  spreadId, 
  isSelected, 
  onSelect,
  onContextMenu
}: { 
  element: EditorElement, 
  elements: EditorElement[],
  spreadId: string, 
  isSelected: boolean, 
  onSelect: () => void,
  onContextMenu: (x: number, y: number, id: string) => void
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filterLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trRef = useRef<any>(null);
  const lastSwapTimeRef = useRef<number>(0);
  const lastSwappedIdRef = useRef<string | null>(null);
  const updateElement = useEditorStore((state) => state.updateElement);
  const previewOriginalPhotoId = useEditorStore((state) => state.previewOriginalPhotoId);
  const globalStyles = useEditorStore((state) => state.project?.globalImageStyles);
  const projectSize = useEditorStore((state) => state.project?.size) || { w_mm: 1000, h_mm: 1000 };
  const prevSpreadId = useEditorStore((state) => {
      const idx = state.project?.spreads.findIndex(s => s.id === spreadId) ?? -1;
      return idx > 0 && state.project ? state.project.spreads[idx - 1].id : null;
  });
  const nextSpreadId = useEditorStore((state) => {
      const idx = state.project?.spreads.findIndex(s => s.id === spreadId) ?? -1;
      return idx !== -1 && state.project && idx < state.project.spreads.length - 1 ? state.project.spreads[idx + 1].id : null;
  });
  
  // Phase 8.B: Extract sequential logic strictly mapped inside Editor Store explicitly natively
  const isStagingMode = element.stageType === 'staged';
  const stagingIndex = isStagingMode ? elements.filter(e => e.type === 'image' && e.stageType === 'staged').findIndex(e => e.id === element.id) : -1;

  const [image] = useImage(element.previewUrl || element.src || 'https://via.placeholder.com/150');
  const isSelectedStaged = useEditorStore(state => state.selectedStagedElementIds.includes(element.id));

  useEffect(() => {
    if (isSelected && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  // Object-Fit Cover Math for Layouts
  let computedCrop = undefined;
  if (image) {
    const imgW = image.width;
    const imgH = image.height;
    const imgRatio = imgW / imgH;
    const boxRatio = element.w_mm / element.h_mm;

    // Tolerance for float rounding
    if (Math.abs(imgRatio - boxRatio) > 0.005) {
      if (imgRatio > boxRatio) {
        // Image is wider than target box
        const newW = imgH * boxRatio;
        computedCrop = {
          x: (imgW - newW) / 2,
          y: 0,
          width: newW,
          height: imgH
        };
      } else {
        // Image is taller than target box
        const newH = imgW / boxRatio;
        computedCrop = {
          x: 0,
          y: (imgH - newH) / 2,
          width: imgW,
          height: newH
        };
      }
    }
  }

  // Handle Photo Filters Natively via SINGLE LAYER pipeline
  useLayoutEffect(() => {
    if (filterLayerRef.current && image) {
      const node = filterLayerRef.current;
      const hasLegacyFilter = element.photoFilter && element.photoFilter !== 'none';
      const hasAdj = element.photoAdjustments && Object.values(element.photoAdjustments).some(v => typeof v === 'number' && v !== 0);
      
      if ((hasLegacyFilter || hasAdj) && element.id !== previewOriginalPhotoId) {
        node.clearCache(); // NEVER reprocess cached image - clear first
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filtersArray: any[] = [];
        const intensity = element.filterIntensity !== undefined ? element.filterIntensity : 1;
        
        if (hasLegacyFilter) {
          const lut = LUT_LIBRARY.find(l => l.id === element.photoFilter);
          
          if (lut) {
             if (lut.contrast && lut.contrast !== 0) {
                filtersArray.push(Konva.Filters.Contrast);
                node.contrast(lut.contrast * intensity);
             }
             if (lut.brightness && lut.brightness !== 0) {
                filtersArray.push(Konva.Filters.Brighten);
                node.brightness(lut.brightness * intensity);
             }
             if (lut.grayscale) filtersArray.push(Konva.Filters.Grayscale);
             if (lut.sepia) filtersArray.push(Konva.Filters.Sepia);
             if (lut.invert) filtersArray.push(Konva.Filters.Invert);
             
             if (lut.hue !== undefined || lut.saturation !== undefined || lut.luminance !== undefined) {
                filtersArray.push(Konva.Filters.HSL);
                if (lut.hue !== undefined) node.hue(lut.hue * intensity);
                if (lut.saturation !== undefined) node.saturation(Math.max(-2, Math.min(2, lut.saturation * intensity)));
                if (lut.luminance !== undefined) node.luminance(lut.luminance * intensity);
             }
          } else {
             // Fallback for legacy basic filters
             switch(element.photoFilter) {
               case 'sepia': filtersArray.push(Konva.Filters.Sepia); break;
               case 'grayscale': filtersArray.push(Konva.Filters.Grayscale); break;
               case 'invert': filtersArray.push(Konva.Filters.Invert); break;
               case 'blur': 
                 filtersArray.push(Konva.Filters.Blur); 
                 node.blurRadius(intensity * 5); 
                 break;
               case 'noise': 
                 filtersArray.push(Konva.Filters.Noise); 
                 node.noise(intensity); 
                 break;
               case 'posterize': 
                 filtersArray.push(Konva.Filters.Posterize); 
                 node.levels(intensity * 4); 
                 break;
             }
          }
        }

        // Apply new Pro Adjustments
        if (hasAdj) {
          const adj = element.photoAdjustments!;
          
          if (adj.exposure || adj.highlights || adj.shadows || adj.whites || adj.blacks) {
             filtersArray.push(Konva.Filters.Brighten);
             let totalBrightness = (adj.exposure || 0) / 200;
             if (adj.highlights) totalBrightness += (adj.highlights / 100) * 0.15;
             if (adj.whites) totalBrightness += (adj.whites / 100) * 0.08;
             if (adj.shadows) totalBrightness += (adj.shadows / 100) * 0.15;
             if (adj.blacks) totalBrightness += (adj.blacks / 100) * 0.08;
             node.brightness(Math.max(-1, Math.min(1, totalBrightness)));
          }
          
          if (adj.lightContrast || adj.clarity || adj.dehaze || adj.texture) {
             filtersArray.push(Konva.Filters.Contrast);
             let totalContrast = (adj.lightContrast || 0) * 0.6;
             if (adj.clarity) totalContrast += (adj.clarity / 100) * 20;
             if (adj.dehaze) totalContrast += (adj.dehaze / 100) * 15;
             if (adj.texture) totalContrast += (adj.texture / 100) * 10;
             node.contrast(Math.max(-100, Math.min(100, totalContrast))); 
          }
          
          // Advanced Color: Vibrance and Saturation
          if (adj.saturation || adj.vibrance) {
             if (!filtersArray.includes(Konva.Filters.HSL)) filtersArray.push(Konva.Filters.HSL);
             let totalSat = (adj.saturation || 0);
             if (adj.vibrance) totalSat += (adj.vibrance * 0.5); 
             node.saturation(Math.max(-2, Math.min(2, totalSat / 100))); 
             node.hue(0);
          }
          
          // Advanced Color: Temperature and Tint (Thermal Curves via Linear Normalized RGB)
          if (adj.temperature || adj.tint) {
             if (!filtersArray.includes(Konva.Filters.RGB)) filtersArray.push(Konva.Filters.RGB);
             let r = 0, g = 0, b = 0;
             if (adj.temperature) {
                 const tempNormalized = adj.temperature / 100;
                 r += tempNormalized * 20;   
                 b -= tempNormalized * 20;   
             }
             if (adj.tint) {
                 const tintNormalized = adj.tint / 100;
                 r += tintNormalized * 10;
                 b += tintNormalized * 10;
                 g -= tintNormalized * 20; 
             }
             if (typeof node.red === 'function') {
                node.red(Math.max(-255, Math.min(255, r)));
                node.green(Math.max(-255, Math.min(255, g)));
                node.blue(Math.max(-255, Math.min(255, b)));
             }
          }
          
          if (adj.grain) {
             filtersArray.push(Konva.Filters.Noise);
             node.noise(Math.max(0, (adj.grain / 100) * 0.5)); 
          }
          
          if (adj.blur) {
             filtersArray.push(Konva.Filters.Blur);
             node.blurRadius(Math.max(0, adj.blur / 5)); 
          }
        }
        
        node.filters(filtersArray);
        
        // SAFE PIXEL RATIO IMPLEMENTATION WITH MEMORY LIMITERS
        const naturalWidth = image.naturalWidth || image.width;
        const logicalWidth = element.w_mm;
        
        // Since logicalWidth is in geometric mm, ratio must scale perfectly to reach native resolution.
        // A hard limiter of 2.5 is disastrous here (mm coordinates are tiny).
        let computedPixelRatio = logicalWidth > 0 ? (naturalWidth / logicalWidth) : 1;
           
        // Extreme Memory Safeguard: Cap the maximum absolute cache coordinate bound
        // This ensures a 16K image doesn't crash DOM arrays, but targets ultra HD (4000-6000px).
        const MAX_CACHE_BOUND = 4500; 
        if (logicalWidth * computedPixelRatio > MAX_CACHE_BOUND) {
            computedPixelRatio = MAX_CACHE_BOUND / logicalWidth;
        }

        if (process.env.NODE_ENV === 'development') {
           console.log(`[Preview Pipeline] Caching ${element.id} | Nat: ${naturalWidth} | Logical DOM mm: ${logicalWidth} | Adjusted Safe Ratio: ${computedPixelRatio}`);
        }

        node.cache({ pixelRatio: computedPixelRatio, imageSmoothingEnabled: false });
        node.getLayer()?.batchDraw();
      } else {
        // RAW Passthrough - Clear entirely
        if (process.env.NODE_ENV === 'development') {
           if (node.isCached()) console.log(`[Preview Pipeline] Raw Passthrough ${element.id} -> Cache Cleared (Zero Values)`);
        }
        node.clearCache();
        node.filters([]);
        node.getLayer()?.batchDraw();
      }
    }
  }, [element.photoFilter, element.photoAdjustments, image, element.filterIntensity, previewOriginalPhotoId, element.w_mm, element.h_mm, element.scale]);

  // Phase 8.D: Apply Layout Hook Tracking Transition bridging semantic to geometric mapping natively
  const prevIsManaged = useRef(element.isAutoLayoutManaged);
  
  useLayoutEffect(() => {
    if (groupRef.current) {
        if (!prevIsManaged.current && element.isAutoLayoutManaged) {
            // Flash-Pop Design Transition Sequence (Native Konva Math)
            const node = groupRef.current;
            node.opacity(0); // Instantly conceal raw geometry 
            node.scale({ x: 0.85, y: 0.85 }); // Contract aggressively for dramatic Snap-Out
            
            const tween = new Konva.Tween({
               node: node,
               duration: 0.35,
               opacity: element.opacity !== undefined ? element.opacity : 1,
               scaleX: 1,
               scaleY: 1,
               easing: Konva.Easings.EaseOut
            });
            tween.play();
            
            // Phase 8.D FIX: Native memory cleanup garbage collection properly handled interceptors smoothly
            return () => { tween.destroy(); };
        }
    }
    prevIsManaged.current = element.isAutoLayoutManaged;
  }, [element.isAutoLayoutManaged, element.opacity]);

  const appliedShadowColor = element.shadowColor || (!element.isolateFromGlobalStyles && globalStyles?.shadowEnabled ? (globalStyles.shadowColor || '#000000') : 'transparent');
  const appliedShadowBlur = element.shadowBlur ?? (!element.isolateFromGlobalStyles && globalStyles?.shadowEnabled ? (globalStyles.shadowBlur ?? 0) : 0);
  const appliedShadowOffsetX = element.shadowOffsetX ?? (!element.isolateFromGlobalStyles && globalStyles?.shadowEnabled ? (globalStyles.shadowOffsetX ?? 0) : 0);
  const appliedShadowOffsetY = element.shadowOffsetY ?? (!element.isolateFromGlobalStyles && globalStyles?.shadowEnabled ? (globalStyles.shadowOffsetY ?? 0) : 0);
  const appliedShadowOpacity = element.shadowOpacity ?? (!element.isolateFromGlobalStyles && globalStyles?.shadowEnabled ? (globalStyles.shadowOpacity ?? 0.5) : 0.5);

  const shadowIsInvisibleArtifact = (appliedShadowBlur === 0 && appliedShadowOffsetX === 0 && appliedShadowOffsetY === 0) || appliedShadowOpacity === 0;
  
  if (element.type === 'image' || element.type === 'decoration') {
    console.log("SHADOW TRACE:", {
      id: element.id,
      globalEnabled: globalStyles?.shadowEnabled,
      appliedShadowColor,
      appliedShadowBlur,
      appliedShadowOffsetX,
      appliedShadowOffsetY,
      appliedShadowOpacity,
      shadowIsInvisibleArtifact
    });
  }

  const finalShadowColor = shadowIsInvisibleArtifact ? 'transparent' : appliedShadowColor;

  const strokeEnabled = !element.isolateFromGlobalStyles && (globalStyles?.strokeEnabled ?? false);
  const appliedStrokeWidth = element.strokeWidth ?? (strokeEnabled ? (globalStyles?.strokeWidth ?? 0) : 0);
  const appliedStrokeColor = element.strokeColor ?? (strokeEnabled ? (globalStyles?.strokeColor ?? '#ffffff') : undefined);
  
  const cornerRadiusEnabled = !element.isolateFromGlobalStyles && (globalStyles?.borderRadiusEnabled ?? false);
  const appliedBorderRadius = element.borderRadius ?? (cornerRadiusEnabled ? (globalStyles?.borderRadius ?? 0) : 0);

  return (
    <React.Fragment>
      <Group
        ref={groupRef}
        x={element.x_mm}
        y={element.y_mm}
        width={element.w_mm}
        height={element.h_mm}
        rotation={element.rotation_deg || 0}
        scaleX={element.scale || 1}
        scaleY={element.scale || 1}
        draggable={isSelected && !element.locked || isSelectedStaged} // Allow drag if staged batch selected!
        onClick={(e) => {
           if (element.stageType === 'staged') {
              if (e.evt.metaKey || e.evt.ctrlKey || e.evt.shiftKey) {
                 useEditorStore.getState().toggleStagedElementSelection(element.id);
                 return;
              } else {
                 const store = useEditorStore.getState();
                 if (!store.selectedStagedElementIds.includes(element.id)) {
                    store.setStagedSelection([element.id]);
                 }
              }
           } else {
              useEditorStore.getState().clearStagedSelection();
           }
           onSelect();
        }}
        onTap={() => {
           if (element.stageType === 'staged') {
              useEditorStore.getState().setStagedSelection([element.id]);
           } else {
              useEditorStore.getState().clearStagedSelection();
           }
           onSelect();
        }}
        opacity={element.opacity !== undefined ? element.opacity : 1}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        globalCompositeOperation={(element.blendMode as any) || 'source-over'}
        onDragStart={() => {
           if (isStagingMode) {
              useEditorStore.getState().setDraggingStagedElementId(element.id);
           }
        }}
        onDragMove={(e) => {
           if (isStagingMode) {
              const dropX = e.target.x() + (element.w_mm / 2);
              const dropY = e.target.y() + (element.h_mm / 2);
              const stagingImages = elements.filter(el => el.type === 'image' && el.stageType === 'staged');
              
              const hoverElement = stagingImages.find(el => 
                 el.id !== element.id &&
                 dropX >= el.x_mm && dropX <= el.x_mm + el.w_mm &&
                 dropY >= el.y_mm && dropY <= el.y_mm + el.h_mm
              );
              
              if (hoverElement) {
                  const hoverIdx = stagingImages.findIndex(el => el.id === hoverElement.id);
                  useEditorStore.getState().setStagingDropPreviewIndex(hoverIdx);
              } else {
                  useEditorStore.getState().setStagingDropPreviewIndex(null);
              }
           } else if (element.stageType === 'layout') {
               // Phase 10: Dynamic Collision Detection for Fundy Live Swap
               const dropX = e.target.x() + (element.w_mm / 2);
               const dropY = e.target.y() + (element.h_mm / 2);
               const layoutImages = elements.filter(el => el.type === 'image' && el.stageType === 'layout');
               
               let candidateId: string | null = null;
               for (const neighbor of layoutImages) {
                   if (neighbor.id === element.id) continue;
                   
                   const nX = neighbor.x_mm + neighbor.w_mm / 2;
                   const nY = neighbor.y_mm + neighbor.h_mm / 2;
                   const dist = Math.hypot(dropX - nX, dropY - nY);
                   
                   // Math proximity threshold (Center distance close to another element's center)
                   // Using 30mm or significant overlap area
                   const intersectX = Math.max(0, Math.min(e.target.x() + element.w_mm, neighbor.x_mm + neighbor.w_mm) - Math.max(e.target.x(), neighbor.x_mm));
                   const intersectY = Math.max(0, Math.min(e.target.y() + element.h_mm, neighbor.y_mm + neighbor.h_mm) - Math.max(e.target.y(), neighbor.y_mm));
                   const overlapArea = intersectX * intersectY;
                   const neighborArea = neighbor.w_mm * neighbor.h_mm;
                   
                   // 40% area penetration or extreme center center proximity (<35mm)
                   if (overlapArea > neighborArea * 0.4 || dist < 35) {
                        candidateId = neighbor.id;
                        break;
                   }
               }

               const now = Date.now();
               if (candidateId) {
                   const isReciprocalLoop = candidateId === lastSwappedIdRef.current;
                   const cooldown = isReciprocalLoop ? 1000 : 300; // Hardened anti-loop throttle

                   if (now - lastSwapTimeRef.current > cooldown) {
                       lastSwapTimeRef.current = now;
                       lastSwappedIdRef.current = candidateId;
                       useEditorStore.getState().swapFundyMasonryElements(spreadId, element.id, candidateId);
                   }
               }
           }
        }}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          e.cancelBubble = true;
          e.evt.stopPropagation();
          onContextMenu(e.evt.clientX, e.evt.clientY, element.id);
        }}
        onDragEnd={(e) => {
          smartGuidesEmitter.setGuides([]);

          // Phase 8.B/F: Staging Reorder Interceptor (Batched!)
          if (isStagingMode) {
             useEditorStore.getState().setDraggingStagedElementId(null);
             useEditorStore.getState().setStagingDropPreviewIndex(null);
             
             // Phase 8.C: Cross-Spread Native Traversal Target Math Context relative
             const dropX = e.target.x() + (element.w_mm / 2);
             const dropY = e.target.y() + (element.h_mm / 2);

             if (dropX < 0 && prevSpreadId) {
                 useEditorStore.getState().moveStagedPhotoAcrossSpreads(spreadId, prevSpreadId, element.id);
                 return;
             }
             if (dropX > projectSize.w_mm && nextSpreadId) {
                 useEditorStore.getState().moveStagedPhotoAcrossSpreads(spreadId, nextSpreadId, element.id);
                 return;
             }

             const allImages = elements.filter(el => el.type === 'image' && el.stageType === 'staged');
             
             const targetElement = allImages.find(el => 
                el.id !== element.id &&
                dropX >= el.x_mm && dropX <= el.x_mm + el.w_mm &&
                dropY >= el.y_mm && dropY <= el.y_mm + el.h_mm
             );

             // Trigger explicit semantic grid-reorder (recalculates all X/Y globally)
             useEditorStore.getState().reorderStagedPhotos(spreadId, element.id, targetElement ? targetElement.id : element.id);
             return; 
          }

          // Phase 10: Enforce strict Grid Locks for mathematical tracking
          const currentSpread = useEditorStore.getState().project?.spreads.find(s => s.id === spreadId);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (element.stageType === 'layout' && (currentSpread?.autoLayout?.mode as any) === 'fundy-masonry-experimental') {
               e.target.x(element.x_mm);
               e.target.y(element.y_mm);
               trRef.current?.getLayer()?.batchDraw();
               return;
          }

          updateElement(spreadId, element.id, {
            x_mm: e.target.x(),
            y_mm: e.target.y(),
          });
        }}
        dragBoundFunc={buildSmartSnapBoundFunc(element, elements, projectSize)}
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onTransformEnd={(e) => {
          const node = groupRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          node.scaleX(1);
          node.scaleY(1);

          updateElement(spreadId, element.id, {
            x_mm: node.x(),
            y_mm: node.y(),
            w_mm: Math.max(5, element.w_mm * scaleX),
            h_mm: Math.max(5, element.h_mm * scaleY),
            rotation_deg: node.rotation()
          });
        }}
      >
        <KonvaImage 
          ref={filterLayerRef}
          image={image} 
          x={0} y={0}
          width={element.w_mm} 
          height={element.h_mm} 
          crop={computedCrop}
          cornerRadius={appliedBorderRadius}
          stroke={appliedStrokeWidth > 0 ? appliedStrokeColor : undefined}
          strokeWidth={appliedStrokeWidth}
          shadowColor={finalShadowColor}
          shadowBlur={appliedShadowBlur}
          shadowOffsetX={appliedShadowOffsetX}
          shadowOffsetY={appliedShadowOffsetY}
          shadowOpacity={appliedShadowOpacity}
          imageSmoothingEnabled={false}
          imageSmoothingQuality="high"
        />
        
        {/* Pro Vignette Overlay */}
        {element.photoAdjustments?.vignette && element.photoAdjustments.vignette !== 0 ? (
           <Rect
             x={0} y={0}
             width={element.w_mm} height={element.h_mm}
             cornerRadius={appliedBorderRadius}
             listening={false}
             fillRadialGradientStartPoint={{ x: element.w_mm / 2, y: element.h_mm / 2 }}
             fillRadialGradientStartRadius={Math.min(element.w_mm, element.h_mm) * 0.2}
             fillRadialGradientEndPoint={{ x: element.w_mm / 2, y: element.h_mm / 2 }}
             fillRadialGradientEndRadius={Math.max(element.w_mm, element.h_mm) * 0.75}
             fillRadialGradientColorStops={[
               0, 'rgba(0,0,0,0)',
               1, element.photoAdjustments.vignette < 0 
                   ? `rgba(0,0,0,${Math.min(1, Math.abs(element.photoAdjustments.vignette) / 100)})`
                   : `rgba(255,255,255,${Math.min(1, element.photoAdjustments.vignette / 100)})`
             ]}
           />
        ) : null}
        
        {/* Phase 8.B: Narrative Sequence Badge for Staging Mode */}
        {isStagingMode && stagingIndex !== -1 && (
          <Group x={10} y={10}>
             <Rect 
               width={24} height={24} 
               cornerRadius={12} 
               fill="#F59E0B" 
               shadowColor="black" shadowBlur={4} shadowOpacity={0.3} shadowOffsetY={2}
             />
             <Text 
               text={(stagingIndex + 1).toString()}
               fill="white"
               fontSize={11}
               fontFamily="Inter"
               fontStyle="bold"
               align="center"
               verticalAlign="middle"
               width={24}
               height={24}
             />
          </Group>
        )}

        {/* Phase 7.J: Visual Feedback for manual User Control logic Overrides */}
        {element.editorialRole && element.editorialRole !== 'auto' && (
          <Group x={10} y={10}>
             {/* Backdrop preventing color bleeding */}
             <Rect 
               width={28} height={28} 
               cornerRadius={6} 
               fill="rgba(0,0,0,0.65)" 
             />
             <Text 
               text={element.editorialRole === 'hero' ? 'H' : element.editorialRole === 'supporting' ? 'S' : 'F'}
               fill="white"
               fontSize={16}
               fontFamily="Inter"
               fontStyle="bold"
               align="center"
               verticalAlign="middle"
               width={28}
               height={28}
             />
          </Group>
        )}

        {/* Phase 8.F: Native Batch Selection Extractor UI */}
        {isSelectedStaged && (
           <Rect
             width={element.w_mm}
             height={element.h_mm}
             stroke="#3b82f6"
             strokeWidth={3}
             fill="rgba(59, 130, 246, 0.25)"
             listening={false}
           />
        )}
      </Group>
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) return oldBox;
            return newBox;
          }}
        />
      )}
      <ShadowDragAnchor element={element} spreadId={spreadId} isSelected={isSelected} />
    </React.Fragment>
  );
};

const EditorShape = ({ 
  element, 
  elements,
  spreadId, 
  isSelected, 
  onSelect,
  onContextMenu
}: { 
  element: EditorElement, 
  elements: EditorElement[],
  spreadId: string, 
  isSelected: boolean, 
  onSelect: () => void,
  onContextMenu: (x: number, y: number, id: string) => void
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shapeRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trRef = useRef<any>(null);
  const updateElement = useEditorStore((state) => state.updateElement);
  const projectSize = useEditorStore((state) => state.project?.size) || { w_mm: 1000, h_mm: 1000 };

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  const commonProps = {
    ref: shapeRef,
    fill: element.fillColor || '#aaaaaa',
    rotation: element.rotation_deg,
    opacity: element.opacity !== undefined ? element.opacity : 1,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalCompositeOperation: (element.blendMode as any) || 'source-over',
    shadowColor: element.shadowColor || 'transparent',
    shadowBlur: element.shadowBlur || 0,
    shadowOffsetX: element.shadowOffsetX || 0,
    shadowOffsetY: element.shadowOffsetY || 0,
    shadowOpacity: element.shadowOpacity !== undefined ? element.shadowOpacity : 0.5,
    draggable: true,
    onClick: onSelect,
    onTap: onSelect,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onContextMenu: (e: any) => {
      e.evt.preventDefault();
      e.cancelBubble = true;
      e.evt.stopPropagation();
      onContextMenu(e.evt.clientX, e.evt.clientY, element.id);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onDragEnd: (e: any) => {
      smartGuidesEmitter.setGuides([]);
      updateElement(spreadId, element.id, {
        x_mm: e.target.x(),
        y_mm: e.target.y(),
      });
    },
    dragBoundFunc: buildSmartSnapBoundFunc(element, elements, projectSize),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onTransformEnd: () => {
      const node = shapeRef.current;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);

      updateElement(spreadId, element.id, {
        x_mm: node.x(),
        y_mm: node.y(),
        w_mm: Math.max(5, node.width() * scaleX),
        h_mm: Math.max(5, node.height() * scaleY),
        rotation_deg: node.rotation()
      });
    }
  };

  return (
    <React.Fragment>
      {element.shapeType === 'ellipse' ? (
        <Ellipse
          {...commonProps}
          radiusX={element.w_mm / 2}
          radiusY={element.h_mm / 2}
          x={element.x_mm}
          y={element.y_mm}
          offset={{ x: -element.w_mm / 2, y: -element.h_mm / 2 }}
        />
      ) : (
        <Rect
          {...commonProps}
          x={element.x_mm}
          y={element.y_mm}
          width={element.w_mm}
          height={element.h_mm}
        />
      )}
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) return oldBox;
            return newBox;
          }}
        />
      )}
      <ShadowDragAnchor element={element} spreadId={spreadId} isSelected={isSelected} />
    </React.Fragment>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EditorText = ({ element, elements, spreadId, isSelected, onSelect, onContextMenu }: any) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shapeRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trRef = useRef<any>(null);
  const updateElement = useEditorStore((state) => state.updateElement);
  const projectSize = useEditorStore((state) => state.project?.size) || { w_mm: 1000, h_mm: 1000 };

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  // Forces the canvas to redraw as soon as the font is downloaded
  useEffect(() => {
    if (element.fontFamily && typeof document !== 'undefined' && document.fonts) {
      document.fonts.load(`12px "${element.fontFamily}"`).then(() => {
        if (shapeRef.current) {
          shapeRef.current.getLayer()?.batchDraw();
        }
      }).catch(() => {});
    }
  }, [element.fontFamily]);

  const onTransformEnd = () => {
    const node = shapeRef.current;
    if (!node) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    
    updateElement(spreadId, element.id, {
      x_mm: node.x(),
      y_mm: node.y(),
      w_mm: Math.max(10, node.width() * scaleX),
      h_mm: Math.max(10, node.height() * scaleY),
      fontSize: Math.round((element.fontSize || 32) * scaleX),
      rotation_deg: node.rotation()
    });
  };

  return (
    <React.Fragment>
      <Text
        ref={shapeRef}
        x={element.x_mm}
        y={element.y_mm}
        width={element.w_mm}
        height={element.h_mm}
        text={element.textTransform === 'uppercase' ? (element.text || 'Doble clic para editar...').toUpperCase() : element.textTransform === 'lowercase' ? (element.text || 'Doble clic para editar...').toLowerCase() : (element.text || 'Doble clic para editar...')}
        fontFamily={element.fontFamily || 'Inter'}
        fontSize={element.fontSize || 32}
        fill={element.textColor || '#000000'}
        letterSpacing={element.letterSpacing || 0}
        lineHeight={element.lineHeight || 1}
        stroke={element.strokeColor || undefined}
        strokeWidth={element.strokeWidth || 0}
        rotation={element.rotation_deg}
        opacity={element.opacity !== undefined ? element.opacity : 1}
        shadowColor={element.shadowColor || 'black'}
        shadowBlur={element.shadowBlur || 0}
        shadowOffsetX={element.shadowOffsetX || 0}
        shadowOffsetY={element.shadowOffsetY || 0}
        shadowOpacity={element.shadowOpacity !== undefined ? element.shadowOpacity : 0.5}
        draggable={isSelected && !element.locked}
        onClick={onSelect}
        onTap={onSelect}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onDragEnd={(e: any) => {
          smartGuidesEmitter.setGuides([]);
          updateElement(spreadId, element.id, {
            x_mm: e.target.x(),
            y_mm: e.target.y(),
          });
        }}
        dragBoundFunc={buildSmartSnapBoundFunc(element, elements, projectSize)}
        onTransformEnd={onTransformEnd}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onContextMenu={(e: any) => {
          e.evt.preventDefault();
          e.cancelBubble = true;
          e.evt.stopPropagation();
          onContextMenu(e.evt.clientX, e.evt.clientY, element.id);
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 10) return oldBox;
            return newBox;
          }}
        />
      )}
      <ShadowDragAnchor element={element} spreadId={spreadId} isSelected={isSelected} />
    </React.Fragment>
  );
};

export default function SpreadCanvas({ stageWidth, stageHeight, scale, panX, panY, spreadIdOverride }: SpreadCanvasProps) {
  const project = useEditorStore((state) => state.project);
  const _activeSpreadId = useEditorStore((state) => state.activeSpreadId);
  const activeSpreadId = spreadIdOverride ?? _activeSpreadId;
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const setSelectedElement = useEditorStore((state) => state.setSelectedElement);
  const stagingDropPreviewIndex = useEditorStore((state) => state.stagingDropPreviewIndex);

  const bringToFront = useEditorStore((state) => state.bringToFront);
  const bringForward = useEditorStore((state) => state.bringForward);
  const sendBackward = useEditorStore((state) => state.sendBackward);
  const sendToBack = useEditorStore((state) => state.sendToBack);

  const t = useTranslations('Editor');

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, elementId: string } | null>(null);
  const [isDraggingOverCanvas, setIsDraggingOverCanvas] = useState(false);

  useEffect(() => {
    const handleGlobalClick = () => { if (contextMenu) setContextMenu(null); };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [contextMenu]);

  const fontLinks = React.useMemo(() => {
    const activePreset = TYPOGRAPHY_PRESETS.find(p => p.id === project?.typographyPresetId);
    if (!activePreset) return null;
    const fontsSet = new Set<string>();
    fontsSet.add(activePreset.fonts.h1);
    fontsSet.add(activePreset.fonts.h2);
    fontsSet.add(activePreset.fonts.body);
    fontsSet.add(activePreset.fonts.small);
    return Array.from(fontsSet).map(font => 
      `@import url('https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}&display=swap');`
    ).join('\n');
  }, [project?.typographyPresetId]);

  const draggingStagedElementId = useEditorStore((state) => state.draggingStagedElementId);

  if (!project || !activeSpreadId) return null;

  const spreadIndex = project.spreads.findIndex((s) => s.id === activeSpreadId);
  const spread = project.spreads[spreadIndex];
  if (!spread) return null;

  const prevSpreadId = spreadIndex > 0 ? project.spreads[spreadIndex - 1].id : null;
  const nextSpreadId = spreadIndex < project.spreads.length - 1 ? project.spreads[spreadIndex + 1].id : null;


  // Sorting elements by zIndex to render properly
  const elements = [...spread.elements].sort((a, b) => a.zIndex - b.zIndex);

  // Parse advanced Background properties smoothly native organically
  const bgConfig = spread.bg_config || { type: 'none' };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bgProps: any = { fill: spread.bg_color || '#ffffff' };
  
  if (bgConfig.type === 'solid' && bgConfig.color1) {
    bgProps = { fill: bgConfig.color1 };
  } else if (bgConfig.type === 'linear' && bgConfig.color1 && bgConfig.color2) {
    const angleRad = (bgConfig.gradientAngle || 0) * (Math.PI / 180);
    const cx = project.size.w_mm / 2;
    const cy = project.size.h_mm / 2;
    const r = Math.sqrt(cx * cx + cy * cy);
    bgProps = {
       fillLinearGradientStartPoint: { x: cx - Math.cos(angleRad) * r, y: cy - Math.sin(angleRad) * r },
       fillLinearGradientEndPoint: { x: cx + Math.cos(angleRad) * r, y: cy + Math.sin(angleRad) * r },
       fillLinearGradientColorStops: [0, bgConfig.color1, 1, bgConfig.color2]
    };
  } else if (bgConfig.type === 'radial' && bgConfig.color1 && bgConfig.color2) {
    const cx = ((bgConfig.radialCenterX ?? 50) / 100) * project.size.w_mm;
    const cy = ((bgConfig.radialCenterY ?? 50) / 100) * project.size.h_mm;
    const maxRadius = Math.max(project.size.w_mm, project.size.h_mm);
    const radius = ((bgConfig.radialSize ?? 50) / 100) * maxRadius;
    bgProps = {
       fillRadialGradientStartPoint: { x: cx, y: cy },
       fillRadialGradientStartRadius: 0,
       fillRadialGradientEndPoint: { x: cx, y: cy },
       fillRadialGradientEndRadius: radius,
       fillRadialGradientColorStops: [0, bgConfig.color1, 1, bgConfig.color2]
    };
  }



  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const checkDeselect = (e: any) => {
    try {
      if (typeof e.target?.getStage === 'function') {
        const clickedOnEmpty = e.target === e.target.getStage();
        const clickedOnBackground = typeof e.target?.name === 'function' && e.target.name() === 'background-paper';
        if (clickedOnEmpty || clickedOnBackground) {
          setSelectedElement(null);
          useEditorStore.getState().clearStagedSelection();
        }
      } else {
        if (typeof e.target?.tagName === 'string' && e.target.tagName.toUpperCase() !== 'CANVAS') {
          setSelectedElement(null);
          useEditorStore.getState().clearStagedSelection();
        }
      }
    } catch (err) {
      console.warn("Deselect check failed silently natively", err);
    }
  };

  return (
    <div 
      className="flex-1 w-full h-full p-8 relative"
      onClick={checkDeselect}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu(null);
      }}
      onDragEnter={() => setIsDraggingOverCanvas(true)}
      onDragLeave={(e) => {
          // Prevent child elements from falsely triggering drag leave
          if (e.currentTarget === e.target) setIsDraggingOverCanvas(false);
      }}
      onDragOver={(e) => { 
         e.preventDefault(); 
         e.dataTransfer.dropEffect = 'copy'; 
         if (!isDraggingOverCanvas) setIsDraggingOverCanvas(true);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOverCanvas(false);
        try {
          let dropX = 20;
          let dropY = 20;
          const canvasWrapper = document.querySelector('.konvajs-content');
          if (canvasWrapper) {
              const rect = canvasWrapper.getBoundingClientRect();
              dropX = (e.clientX - rect.left - panX) / scale;
              dropY = (e.clientY - rect.top - panY) / scale;
          }
          
          const spreadIndex = project.spreads.findIndex((s) => s.id === activeSpreadId);
          const isLastSpread = spreadIndex === project.spreads.length - 1;
          const isGhostDrop = isLastSpread && dropX > project.size.w_mm + 25;

           // Phase 8.A / Phase 12: Nondestructive Drop Interceptor - Native OS Files
           if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
              if (files.length > 0) {
                 const promises = files.map((file, i) => {
                    return new Promise<import('@/types/editor').ProjectAsset>((resolve) => {
                       const objectUrl = URL.createObjectURL(file);
                       const img = new window.Image();
                       img.onload = () => {
                          const md = extractAssetMetadataFromFile(file, (useEditorStore.getState().project?.assets?.length || 0) + i, { w: img.width, h: img.height });
                          resolve({
                             id: 'asset_' + Date.now() + '_' + Math.random().toString(36).substring(2,9),
                             name: file.name,
                             previewUrl: objectUrl,
                             originalUrl: objectUrl,
                             width: img.width,
                             height: img.height,
                             orientation: md.orientation,
                             aspectRatio: md.aspectRatio,
                             metadata: md
                          });
                       };
                       img.src = objectUrl;
                    });
                 });
                 Promise.all(promises).then(newAssets => {
                    if (isGhostDrop) {
                       import('uuid').then(({ v4: uuidv4 }) => {
                          const newSpreadId = uuidv4();
                          
                          useEditorStore.setState(prev => {
                             if (!prev.project) return prev;
                             return { project: { ...prev.project, spreads: [...prev.project.spreads, { id: newSpreadId, elements: [], bg_color: '#FFFFFF', status: 'empty' as const }] } };
                          });

                          setTimeout(() => {
                             useEditorStore.getState().setActiveSpread(newSpreadId);
                             useEditorStore.getState().ingestAndDropToSpread(newSpreadId, newAssets);
                          }, 50);
                       });
                       return;
                    }

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const isFundyMode = (spread.autoLayout?.mode as any) === 'fundy-masonry-experimental';
                    if (isFundyMode) {
                        useEditorStore.getState().ingestAndDropToSpread(spread.id, newAssets);
                    } else {
                        useEditorStore.getState().ingestStagedPhotos(newAssets);
                    }
                 });
                 // Stop default JSON payload parsing for these raw payloads
                 return; 
              }
           }

          const rawPayload = e.dataTransfer.getData('application/json');
          if (!rawPayload) return;
          const payload = JSON.parse(rawPayload);
          
          if (payload) {
             if (isGhostDrop && payload.type === 'image') {
                   const idsToProcess = payload.assetIds || [payload.assetId];
                   const stagedAssets = idsToProcess.map((id: string) => project.assets?.find(a => a.id === id)).filter(Boolean) as import('@/types/editor').ProjectAsset[];

                   if (stagedAssets.length > 0) {
                       import('uuid').then(({ v4: uuidv4 }) => {
                          const newSpreadId = uuidv4();
                          
                          useEditorStore.setState(prev => {
                             if (!prev.project) return prev;
                             return { project: { ...prev.project, spreads: [...prev.project.spreads, { id: newSpreadId, elements: [], bg_color: '#FFFFFF', status: 'empty' as const }] } };
                          });

                          setTimeout(() => {
                             useEditorStore.getState().setActiveSpread(newSpreadId);
                             useEditorStore.getState().ingestAndDropToSpread(newSpreadId, stagedAssets);
                          }, 50);
                       });
                   }
                   return;
             }

            // Text payloads bypass image loading entirely!
            if (payload.type === 'text') {
              const role = payload.sourceId === 'txt-heading' ? 'h1' : payload.sourceId === 'txt-subheading' ? 'h2' : 'body';
              const textW = role === 'h1' ? 250 : role === 'h2' ? 200 : 150;
              const textH = role === 'h1' ? 80 : role === 'h2' ? 60 : 40;
              
              useEditorStore.getState().addElement(activeSpreadId, {
                id: `el_${Date.now()}`,
                type: 'text',
                textRole: role,
                text: role === 'h1' ? 'Añadir un título' : role === 'h2' ? 'Añadir un subtítulo' : 'Añade un poco de texto aquí...',
                fontFamily: 'Inter',
                fontSize: role === 'h1' ? 72 : role === 'h2' ? 48 : 24,
                textColor: '#000000',
                x_mm: dropX - (textW / 2),
                y_mm: dropY - (textH / 2),
                w_mm: textW,
                h_mm: textH,
                rotation_deg: 0,
                zIndex: 0
              });

              // Auto-apply current preset if active
              const presetId = useEditorStore.getState().project?.typographyPresetId;
              if (presetId) {
                setTimeout(() => {
                  useEditorStore.getState().applyTypographyPreset(presetId);
                }, 50);
              }
              return;
            }

            if (payload.type === 'image' || payload.type === 'decoration') {
               const idsToProcess = payload.assetIds || [payload.assetId];
               const stagedAssets = idsToProcess.map((id: string) => project.assets?.find(a => a.id === id)).filter(Boolean) as import('@/types/editor').ProjectAsset[];
               // eslint-disable-next-line @typescript-eslint/no-explicit-any
               const isFundyMode = (spread.autoLayout?.mode as any) === 'fundy-masonry-experimental' || spread.status === 'empty' || spread.elements.length === 0;

               if (payload.type === 'image' && isFundyMode && stagedAssets.length > 0) {
                    useEditorStore.getState().ingestAndDropToSpread(activeSpreadId, stagedAssets);
                    return;
               }

              const img = new window.Image();
            img.onload = () => {
              const aspect = img.width / img.height;
              let w = 80;
              let h = 80 / aspect;
              
              if (h > 120) {
                 h = 120;
                 w = 120 * aspect;
              }

              if (payload.type === 'image') {
                // Phase 7.H: Collision Swap Detection for Auto-Layout Constraints
                let didSwap = false;
                if (spread?.autoLayout?.isActive) {
                  const targetManagedElement = spread.elements.find(el => 
                     el.isAutoLayoutManaged &&
                     dropX >= el.x_mm && dropX <= el.x_mm + el.w_mm &&
                     dropY >= el.y_mm && dropY <= el.y_mm + el.h_mm
                  );

                  if (targetManagedElement) {
                     // SWAP execution. Do NOT destroy AST geometry.
                     useEditorStore.getState().updateElement(activeSpreadId, targetManagedElement.id, {
                        previewUrl: payload.previewUrl,
                        originalUrl: payload.originalUrl,
                        previewBlobId: payload.previewBlobId,
                        originalBlobId: payload.originalBlobId,
                        assetId: payload.assetId
                     });
                     didSwap = true;
                  }
                }

                if (!didSwap) {
                  useEditorStore.getState().addElement(activeSpreadId, {
                    id: `el_${Date.now()}`,
                    type: 'image',
                    previewUrl: payload.previewUrl,
                    originalUrl: payload.originalUrl,
                    previewBlobId: payload.previewBlobId,
                    originalBlobId: payload.originalBlobId,
                    assetId: payload.assetId, // Persistent generic linkage
                    x_mm: dropX - (w / 2),
                    y_mm: dropY - (h / 2),
                    w_mm: w,
                    h_mm: h,
                    rotation_deg: 0,
                    zIndex: 0
                  });
                }
              } else if (payload.type === 'decoration') {
                useEditorStore.getState().addElement(activeSpreadId, {
                  id: `el_${Date.now()}`,
                  type: 'decoration',
                  src: payload.src,
                  libraryCategory: payload.libraryCategory,
                  sourceType: payload.sourceType || 'default',
                  blendMode: payload.libraryCategory === 'cinematic' ? 'multiply' : payload.libraryCategory === 'overlays' ? 'screen' : 'source-over',
                  sourceId: payload.sourceId,
                  x_mm: payload.libraryCategory === 'cinematic' ? 0 : dropX - (w / 2),
                  y_mm: payload.libraryCategory === 'cinematic' ? 0 : dropY - (h / 2),
                  w_mm: payload.libraryCategory === 'cinematic' ? 900 : w,
                  h_mm: payload.libraryCategory === 'cinematic' ? 900 : h,
                  opacity: payload.libraryCategory === 'cinematic' ? 0.35 : 1,
                  rotation_deg: 0,
                  zIndex: 0
                });
              }
            };
            img.src = payload.type === 'decoration' ? payload.src : payload.previewUrl;
            }
          }
        } catch (err) {
          console.error("Drop parsing error", err);
        }
      }}
    >
      <div style={{ display: 'none' }}>
        {fontLinks && <style dangerouslySetInnerHTML={{ __html: fontLinks }} />}
      </div>
      <Stage
        width={stageWidth}
        height={stageHeight}
        pixelRatio={typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1}
        onMouseDown={checkDeselect}
        onTouchStart={checkDeselect}
        style={{ boxShadow: '0px 10px 30px rgba(0,0,0,0.1)' }}
        onContextMenu={(e) => e.evt.preventDefault()}
      >
      <Layer>
      <Group x={panX} y={panY} scaleX={scale} scaleY={scale}>
        {/* Background Paper */}
        <Rect
          name="background-paper"
          x={0}
          y={0}
          width={project.size.w_mm}
          height={project.size.h_mm}
          {...bgProps}
          shadowColor="black"
          shadowBlur={10}
          shadowOpacity={0.1}
        />

        {/* Elements */}
        {elements.map((rawEl) => {
          let el = { ...rawEl };
          if (el.type === 'group') return null; // Logical container bypassing visual draw explicitly
          if (el.visible === false) return null; // Direct visibility toggle overriding render loops

          // Calculate cascading visibility and Opacity correctly natively protecting render cycles
          if (el.groupId) {
             const parent = spread.elements.find(g => g.id === el.groupId);
             if (parent && parent.visible === false) return null; // Cascade Visibility
             
             if (parent && parent.opacity !== undefined) {
                // If parent has opacity, merge it natively
                const childOpacity = el.opacity !== undefined ? el.opacity : 1;
                el = { ...el, opacity: parent.opacity * childOpacity };
             }
          }

          if (el.type === 'shape') {
            return (
              <EditorShape
                key={el.id}
                element={el}
                elements={elements}
                spreadId={activeSpreadId}
                isSelected={selectedElementId === el.id}
                onSelect={() => setSelectedElement(el.id)}
                onContextMenu={(x: number, y: number, id: string) => setContextMenu({ x, y, elementId: id })}
              />
            );
          }
          if (el.type === 'text') {
            return (
              <EditorText
                key={el.id}
                element={el}
                elements={elements}
                spreadId={activeSpreadId}
                isSelected={selectedElementId === el.id}
                onSelect={() => setSelectedElement(el.id)}
                onContextMenu={(x: number, y: number, id: string) => setContextMenu({ x, y, elementId: id })}
              />
            );
          }
          return (
            <EditorImage
              key={el.id}
              element={el}
              elements={elements}
              spreadId={activeSpreadId}
              isSelected={selectedElementId === el.id}
              onSelect={() => setSelectedElement(el.id)}
              onContextMenu={(x: number, y: number, id: string) => setContextMenu({ x, y, elementId: id })}
            />
          );
        })}

        {elements.length === 0 && (
           <Group>
             <Rect x={project.size.w_mm * 0.2} y={project.size.h_mm * 0.25} width={project.size.w_mm * 0.6} height={project.size.h_mm * 0.5} fill="#d4d4d4" cornerRadius={4} listening={false} />
             <Text text="↓" x={0} y={project.size.h_mm * 0.5 - 15} width={project.size.w_mm} fontSize={18} fill="#666666" align="center" listening={false} />
             <Text text="Drop images to Add Spread" x={0} y={project.size.h_mm * 0.5 + 10} width={project.size.w_mm} fontSize={12} fontFamily="Inter" fill="#666666" align="center" listening={false} />
           </Group>
        )}

        {(() => {
            const spreadIndex = project.spreads.findIndex((s) => s.id === activeSpreadId);
            const isLastSpread = spreadIndex === project.spreads.length - 1;
            return (isLastSpread && elements.length > 0) ? (
               <Group x={project.size.w_mm + 50} y={0}>
                 <Rect width={project.size.w_mm} height={project.size.h_mm} fill="#ffffff" shadowBlur={10} shadowOpacity={0.1} />
                 <Rect x={project.size.w_mm * 0.2} y={project.size.h_mm * 0.25} width={project.size.w_mm * 0.6} height={project.size.h_mm * 0.5} fill="#d4d4d4" cornerRadius={4} listening={false} />
                 <Text text="↓" x={0} y={project.size.h_mm * 0.5 - 15} width={project.size.w_mm} fontSize={18} fill="#666666" align="center" listening={false} />
                 <Text text="Drop images to Add Spread" x={0} y={project.size.h_mm * 0.5 + 10} width={project.size.w_mm} fontSize={12} fontFamily="Inter" fill="#666666" align="center" listening={false} />
                 <Text text={`Pages ${(spreadIndex + 1) * 2 + 1}-${(spreadIndex + 1) * 2 + 2}`} x={0} y={-20} fontSize={10} fill="#888888" listening={false} />
               </Group>
            ) : null;
        })()}

        {/* Phase 8.E Drop Preview Overlay Matrix Native Marker */}
        {stagingDropPreviewIndex !== null && (
           (() => {
              const projectW = project.size.w_mm;
              const thumbnailW = 40;
              const thumbMaxH = 60;
              const margin = 20;
              const gap = 10;
              const cols = Math.max(1, Math.floor((projectW - (margin * 2)) / (thumbnailW + gap)));
              
              const col = stagingDropPreviewIndex % cols;
              const row = Math.floor(stagingDropPreviewIndex / cols);
              
              return (
                 <Rect 
                    x={margin + (col * (thumbnailW + gap)) - 4}
                    y={margin + (row * (thumbMaxH + gap))}
                    width={2}
                    height={thumbMaxH}
                    fill="#3b82f6"
                    cornerRadius={2}
                    shadowColor="#3b82f6"
                    shadowBlur={4}
                    shadowOpacity={0.6}
                    listening={false}
                 />
              );
           })()
        )}

        {/* Phase 8.C UI Edge Overlay Markers natively binding during native Konva drag instances */}
        {draggingStagedElementId && prevSpreadId && (
           <Group x={-45} y={0} opacity={0.8} listening={false}>
              <Rect width={40} height={project.size.h_mm} fill="#3b82f6" cornerRadius={4} />
              <Text x={8} y={project.size.h_mm / 2 + 60} text="← PREVIOUS SPREAD" fill="white" rotation={-90} align="center" fontStyle="bold" fontSize={14} letterSpacing={2} />
           </Group>
        )}
        {draggingStagedElementId && nextSpreadId && (
           <Group x={project.size.w_mm + 5} y={0} opacity={0.8} listening={false}>
              <Rect width={40} height={project.size.h_mm} fill="#3b82f6" cornerRadius={4} />
              <Text x={30} y={project.size.h_mm / 2 - 70} text="NEXT SPREAD →" fill="white" rotation={90} align="center" fontStyle="bold" fontSize={14} letterSpacing={2} />
           </Group>
        )}
        
      {/* Print Guides Overlay separated safely from elements */}
        {/* Bleed Guide: Red Dashed */}
        <Rect
           x={project.bleed_mm}
           y={project.bleed_mm}
           width={project.size.w_mm - (project.bleed_mm * 2)}
           height={project.size.h_mm - (project.bleed_mm * 2)}
           stroke="#ff0000"
           strokeWidth={1 / scale}
           dash={[6 / scale, 4 / scale]}
           opacity={0.6}
           listening={false}
        />
        
        {/* Safe Zone Guide: Blue Dashed */}
        <Rect
           x={project.bleed_mm + project.safe_zone_mm}
           y={project.bleed_mm + project.safe_zone_mm}
           width={project.size.w_mm - ((project.bleed_mm + project.safe_zone_mm) * 2)}
           height={project.size.h_mm - ((project.bleed_mm + project.safe_zone_mm) * 2)}
           stroke="#0000ff"
           strokeWidth={1 / scale}
           dash={[4 / scale, 4 / scale]}
           opacity={0.4}
           listening={false}
        />
        
        {/* Center Fold Line Component replaced by individual Spread Canvases - No Center Fold needed here */}
      
      {/* Dynamic Native Ruler Guides Overlay */}
        {spread.guides?.map(guide => (
          <Line
            key={guide.id}
            points={
              guide.orientation === 'vertical' 
                ? [guide.position_mm, -500, guide.position_mm, project.size.h_mm + 500] 
                : [-500, guide.position_mm, project.size.w_mm + 500, guide.position_mm]
            }
            stroke={guide.color || '#00ffff'}
            strokeWidth={Math.max(1, 1.5 / scale)}
            hitStrokeWidth={12 / scale}
            draggable={!guide.locked}
            dragBoundFunc={(pos) => ({
              x: guide.orientation === 'vertical' ? pos.x : 0,
              y: guide.orientation === 'horizontal' ? pos.y : 0
            })}
            onDragEnd={(e) => {
              const node = e.target;
              const delta = guide.orientation === 'vertical' ? node.x() : node.y();
              const newPos = guide.position_mm + delta;
              
              if (newPos < -10 || (guide.orientation === 'vertical' && newPos > project.size.w_mm + 10) || (guide.orientation === 'horizontal' && newPos > project.size.h_mm + 10)) {
                 useEditorStore.getState().removeGuide(spread.id, guide.id);
              } else {
                 useEditorStore.getState().updateGuide(spread.id, guide.id, { position_mm: newPos });
              }
              node.position({ x: 0, y: 0 }); 
            }}
            onMouseEnter={(e) => {
              if (!guide.locked) {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = guide.orientation === 'vertical' ? 'col-resize' : 'row-resize';
              }
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'default';
            }}
            onContextMenu={(e) => {
              e.evt.preventDefault();
              e.cancelBubble = true;
              e.evt.stopPropagation();
              setContextMenu({ x: e.evt.clientX, y: e.evt.clientY, elementId: `guide:${guide.id}` });
            }}
          />
        ))}

        {/* Global Hardware Accelerated Smart Guides Drawing Matrix */}
        <SmartGuidesRenderer />
      </Group>
      </Layer>
      </Stage>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {isDraggingOverCanvas && (spread.autoLayout?.mode as any) === 'fundy-masonry-experimental' && (
         <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center bg-orange-500/10 backdrop-blur-[1px] m-8 border-2 border-dashed border-orange-500 rounded-lg transition-all animate-in fade-in duration-200">
             <div className="bg-white dark:bg-neutral-900 px-6 py-4 rounded-xl shadow-2xl flex flex-col items-center gap-2 border border-orange-200 dark:border-orange-900 scale-100 animate-in zoom-in-95 duration-200">
                 <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/40 rounded-full flex items-center justify-center text-orange-500 mb-1">
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                 </div>
                 <h3 className="font-bold text-neutral-800 dark:text-neutral-100">{t('dropzone_active')}</h3>
                 <p className="text-xs text-neutral-500">{t('dropzone_active_subtitle')}</p>
             </div>
         </div>
      )}

      {contextMenu && (
        <div 
          className="fixed z-50 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl py-1 min-w-[160px] text-sm overflow-hidden"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.elementId.startsWith('guide:') ? (
             <>
               <button
                 className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
                 onClick={() => {
                    const guideId = contextMenu.elementId.replace('guide:', '');
                    const guide = spread.guides?.find(g => g.id === guideId);
                    if (guide) useEditorStore.getState().updateGuide(spread.id, guideId, { locked: !guide.locked });
                    setContextMenu(null);
                 }}
               >
                 {spread.guides?.find(g => g.id === contextMenu.elementId.replace('guide:', ''))?.locked ? 'Unlock Guide' : 'Lock Guide'}
               </button>
               <button
                 className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between"
                 onClick={() => {
                    const guideId = contextMenu.elementId.replace('guide:', '');
                    const guide = spread.guides?.find(g => g.id === guideId);
                    const isRed = guide?.color === '#ff0000';
                    useEditorStore.getState().updateGuide(spread.id, guideId, { color: isRed ? '#00ffff' : '#ff0000' });
                    setContextMenu(null);
                 }}
               >
                 Change Color
                 <span className="w-3 h-3 rounded-full border border-neutral-300 dark:border-neutral-600" style={{ backgroundColor: spread.guides?.find(g => g.id === contextMenu.elementId.replace('guide:', ''))?.color === '#ff0000' ? '#00ffff' : '#ff0000' }}></span>
               </button>
               <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1"></div>
               <button
                 className="w-full text-left px-4 py-2 hover:bg-red-500 hover:text-white text-red-500 transition-colors"
                 onClick={() => { 
                    useEditorStore.getState().removeGuide(spread.id, contextMenu.elementId.replace('guide:', '')); 
                    setContextMenu(null); 
                 }}
               >
                 Delete Guide
               </button>
             </>
          ) : (
             <>
               <button
            className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
            onClick={() => { bringToFront(activeSpreadId, contextMenu.elementId); setContextMenu(null); }}
          >
            {t('bring_to_front')}
          </button>
          <button
            className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
            onClick={() => { bringForward(activeSpreadId, contextMenu.elementId); setContextMenu(null); }}
          >
            {t('bring_forward')}
          </button>
          <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1"></div>
          <button
            className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
            onClick={() => { sendBackward(activeSpreadId, contextMenu.elementId); setContextMenu(null); }}
          >
            {t('send_backward')}
          </button>
          <button
            className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
            onClick={() => { sendToBack(activeSpreadId, contextMenu.elementId); setContextMenu(null); }}
          >
            {t('send_to_back')}
          </button>
         </>
       )}
        </div>
      )}
    </div>
  );
}
