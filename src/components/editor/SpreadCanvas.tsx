"use client";
import { getCachedRawImage } from '@/utils/rawImageCache';

import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { Stage, Layer, Rect, Ellipse, Transformer, Image as KonvaImage, Text, Group, Line, Circle } from 'react-konva';
import Konva from 'konva';
import { useTranslations } from 'next-intl';
import {
  ArrowUpToLine,
  ArrowUp,
  ArrowDown,
  ArrowDownToLine,
  Copy,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { TYPOGRAPHY_PRESETS } from '@/lib/typography-presets';
import { useEditorStore } from '@/store/useEditorStore';
import { EditorElement } from '@/types/editor';
import { CropOverlay } from './CropOverlay';
import { PhotoAttributesMenuSection } from '../common/PhotoAttributesMenuSection';
import { extractAssetMetadataFromFile } from '@/utils/metadataEngine';
import { processLocalImage } from '@/utils/imageIngestion';
import {
  Point2D,
  getWorldPivotPoint,
  computeRotationAroundPivot,
  worldPointToNormalizedPivot,
  findTopmostElementAtPoint,
} from '@/utils/transformGeometry';
import { applyRawAdjustmentsToKonvaNode, registerKonvaRawFilters } from '@/utils/rawImagePipeline';
import useImage from 'use-image';

// Register Global Custom WebGL ColorShift Filter for Additive Raw Math (Replaces luminance-based RGB / painter RGBA)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof window !== 'undefined' && !(Konva.Filters as any).ColorShift) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Konva.Filters as any).ColorShift = function (this: any, imageData: ImageData) {
    const data = imageData.data;
    const nPixels = data.length;
    const rShift = this.getAttr('redShift') || 0;
    const gShift = this.getAttr('greenShift') || 0;
    const bShift = this.getAttr('blueShift') || 0;

    for (let i = 0; i < nPixels; i += 4) {
      data[i] = Math.max(0, Math.min(255, data[i] + rShift));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + gShift));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + bShift));
    }
  };
}
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
    // Gentle 0.65mm snap threshold so dragging layers feels smooth without magnetic sticking friction
    const SNAP_THRESHOLD_MM = 0.65;

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
  const project = useEditorStore((state) => state.project);
  const isRawSession = project?.type === 'type_raw_session' || (project as { workflowMode?: string })?.workflowMode === 'raw';

  const appliedShadowOpacity = element.shadowOpacity ?? (globalStyles?.shadowEnabled ? (globalStyles.shadowOpacity ?? 0.5) : 0);
  const appliedShadowColor = element.shadowColor || (globalStyles?.shadowEnabled ? (globalStyles.shadowColor || 'transparent') : 'transparent');
  const appliedShadowOffsetX = element.shadowOffsetX ?? (globalStyles?.shadowEnabled ? (globalStyles.shadowOffsetX ?? 0) : 0);
  const appliedShadowOffsetY = element.shadowOffsetY ?? (globalStyles?.shadowEnabled ? (globalStyles.shadowOffsetY ?? 0) : 0);

  if (isRawSession || !isSelected || element.locked || appliedShadowOpacity <= 0 || appliedShadowColor === 'transparent') return null;

  const centerPt = getWorldPivotPoint(element, 0.5, 0.5);

  return (
    <Group x={centerPt.x} y={centerPt.y}>
      <Line
        points={[0, 0, appliedShadowOffsetX, appliedShadowOffsetY]}
        stroke="#3b82f6"
        dash={[4,4]}
        strokeWidth={1.5}
        opacity={0.8}
        listening={false}
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

const PivotAnchorOverlay = ({
  element,
  spreadId,
  isSelected,
}: {
  element: EditorElement;
  spreadId: string;
  isSelected: boolean;
}) => {
  const updateElement = useEditorStore((state) => state.updateElement);
  const showPivotGuides = useEditorStore((state) => state.showPivotGuides);
  const project = useEditorStore((state) => state.project);
  const isRawSession = project?.type === 'type_raw_session' || (project as { workflowMode?: string })?.workflowMode === 'raw';

  if (!isSelected || element.locked || !showPivotGuides || isRawSession) return null;

  const centerPt = getWorldPivotPoint(element, 0.5, 0.5);
  const pivotU = element.pivotX ?? 0;
  const pivotV = element.pivotY ?? 0;
  const anchorPt = getWorldPivotPoint(element, pivotU, pivotV);
  const isAnchorAtCenter = Math.abs(pivotU - 0.5) < 0.02 && Math.abs(pivotV - 0.5) < 0.02;

  const snapNormalized = (val: number) => {
    if (Math.abs(val - 0) < 0.04) return 0;
    if (Math.abs(val - 0.5) < 0.04) return 0.5;
    if (Math.abs(val - 1) < 0.04) return 1;
    return val;
  };

  return (
    <Group>
      {/* Geometric Center Reference Crosshair (Blue) */}
      <Group x={centerPt.x} y={centerPt.y} listening={false}>
        <Line points={[-4, 0, 4, 0]} stroke="#3b82f6" strokeWidth={1.2} opacity={0.85} />
        <Line points={[0, -4, 0, 4]} stroke="#3b82f6" strokeWidth={1.2} opacity={0.85} />
        <Circle x={0} y={0} radius={2.2} fill="#3b82f6" opacity={0.85} />
      </Group>

      {/* Dashed connector from Geometric Center to Active Anchor Pivot when distinct */}
      {!isAnchorAtCenter && (
        <Line
          points={[centerPt.x, centerPt.y, anchorPt.x, anchorPt.y]}
          stroke="#f59e0b"
          dash={[3, 3]}
          strokeWidth={1}
          opacity={0.75}
          listening={false}
        />
      )}

      {/* Draggable Active Anchor Pivot Target (Amber) */}
      <Group
        x={anchorPt.x}
        y={anchorPt.y}
        draggable
        onDragMove={(e) => {
          const worldX = e.target.x();
          const worldY = e.target.y();
          const norm = worldPointToNormalizedPivot(element, worldX, worldY);
          const snappedU = snapNormalized(norm.pivotX);
          const snappedV = snapNormalized(norm.pivotY);
          updateElement(spreadId, element.id, {
            pivotX: snappedU,
            pivotY: snappedV,
          });
        }}
        onMouseEnter={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = 'crosshair';
        }}
        onMouseLeave={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = 'default';
        }}
      >
        <Circle x={0} y={0} radius={5.5} fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" strokeWidth={1.75} />
        <Line points={[-7, 0, 7, 0]} stroke="#f59e0b" strokeWidth={1.25} listening={false} />
        <Line points={[0, -7, 0, 7]} stroke="#f59e0b" strokeWidth={1.25} listening={false} />
        <Circle x={0} y={0} radius={2} fill="#ffffff" stroke="#d97706" strokeWidth={1} listening={false} />
      </Group>
    </Group>
  );
};

const EditorImage = React.memo(function EditorImage({
  element,
  elements,
  spreadId,
  isSelected,
  isHovered = false,
  onSelect,
  onContextMenu,
  canvasScale = 2.5,
}: {
  element: EditorElement,
  elements: EditorElement[],
  spreadId: string,
  isSelected: boolean,
  isHovered?: boolean,
  onSelect: () => void,
  onContextMenu: (x: number, y: number, id: string) => void,
  canvasScale?: number,
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filterLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trRef = useRef<any>(null);
  const transformPivotRef = useRef<Point2D | null>(null);
  const transformStartRotRef = useRef<number>(0);
  const lastSwapTimeRef = useRef<number>(0);
  const lastSwappedIdRef = useRef<string | null>(null);
  const updateElement = useEditorStore((state) => state.updateElement);
  const previewOriginalPhotoId = useEditorStore((state) => state.previewOriginalPhotoId);
  const beforeAfterMode = useEditorStore((state) => state.beforeAfterMode);
  const beforeAfterSplitPosition = useEditorStore((state) => state.beforeAfterSplitPosition);
  const setBeforeAfterSplitPosition = useEditorStore((state) => state.setBeforeAfterSplitPosition);
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

  // In Camera Raw Pro, use element.originalUrl when available for 100% full uncompressed quality,
  // falling back to previewUrl. In Album mode, use previewUrl for snappy multi-photo layouts.
  const project = useEditorStore((state) => state.project);
  const isRawSession = project?.type === 'type_raw_session' || (project as { workflowMode?: string })?.workflowMode === 'raw';

  const imageSrc = (isRawSession && element.originalUrl)
    ? element.originalUrl
    : (element.previewUrl || element.originalUrl || element.src || 'https://via.placeholder.com/150');
  const [loadedImage] = useImage(imageSrc);
  const cachedRawImage = isRawSession
    ? getCachedRawImage(imageSrc)
    : undefined;
  const image = cachedRawImage || loadedImage;
  const isSelectedStaged = useEditorStore(state => state.selectedStagedElementIds.includes(element.id));

  const isCropMode = useEditorStore((state) => state.isCropMode);
  const activeCropElementId = useEditorStore((state) => state.activeCropElementId);
  const flipHDraft = useEditorStore((state) => state.flipHDraft);
  const flipVDraft = useEditorStore((state) => state.flipVDraft);
  const isCropActiveForThis = isCropMode && activeCropElementId === element.id;

  const s = Math.max(0.1, canvasScale);
  const isSinglePhotoMode = isRawSession || project?.projectCategory === 'studio_print';
  const showBeforeAfterSplit = beforeAfterMode === 'split' && (isSelected || isSinglePhotoMode);

  useEffect(() => {
    if (!isRawSession && isSelected && !element.locked && trRef.current && groupRef.current) {
      if (showBeforeAfterSplit || isCropActiveForThis) {
        trRef.current.nodes([]);
      } else {
        trRef.current.nodes([groupRef.current]);
      }
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, element.locked, showBeforeAfterSplit, isRawSession, isCropActiveForThis]);

  // Object-Fit Cover Math ONLY for Album Auto-Layout slots (never crop free Photo Studio layers or decorations!)
  let computedCrop = undefined;
  const isAutoLayoutSlot = Boolean(
    element.type === 'image' && (element.isAutoLayoutManaged || element.stageType === 'layout')
  );

  if (image && !isCropActiveForThis && element.cropData) {
    const imgW = image.width;
    const imgH = image.height;
    computedCrop = {
      x: (element.cropData.xPercent / 100) * imgW,
      y: (element.cropData.yPercent / 100) * imgH,
      width: Math.max(1, (element.cropData.widthPercent / 100) * imgW),
      height: Math.max(1, (element.cropData.heightPercent / 100) * imgH),
    };
  } else if (image && isAutoLayoutSlot) {
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

  const filterRafRef = useRef<number | null>(null);

  // Handle Photo Filters Natively via SINGLE LAYER pipeline
  useLayoutEffect(() => {
    if (filterLayerRef.current && image) {
      const node = filterLayerRef.current;
      const hasLegacyFilter = element.photoFilter && element.photoFilter !== 'none';
      const hasAdj = Boolean(
        element.photoAdjustments &&
        (
          Object.entries(element.photoAdjustments).some(([, v]) => typeof v === 'number' && v !== 0) ||
          (element.photoAdjustments.curve && Object.values(element.photoAdjustments.curve).some(v => v !== 0)) ||
          (element.photoAdjustments.hsl && Object.values(element.photoAdjustments.hsl).some(ch => ch.h !== 0 || ch.s !== 0 || ch.l !== 0)) ||
          (element.photoAdjustments.pointColor && element.photoAdjustments.pointColor.enabled)
        )
      );

      if ((hasLegacyFilter || hasAdj) && element.id !== previewOriginalPhotoId) {
        if (filterRafRef.current) cancelAnimationFrame(filterRafRef.current);
        filterRafRef.current = requestAnimationFrame(() => {
          if (!filterLayerRef.current) return;
          const currentNode = filterLayerRef.current;
          currentNode.clearCache();
          registerKonvaRawFilters(Konva);
          const intensity = element.filterIntensity !== undefined ? element.filterIntensity : 1;

          // Single unified raw & photographic LUT processing pipeline
          const finalFilters = applyRawAdjustmentsToKonvaNode(
            currentNode,
            element.photoAdjustments || {},
            [],
            Konva,
            element.photoFilter,
            intensity
          );

          currentNode.filters(finalFilters);

          // HIGH PERFORMANCE RETINA HIGH-FIDELITY CACHE RATIO
          // Full physical screen pixel caching preserving crystal-clear sharpness at 100% zoom and high-DPI displays.
          const naturalWidth = image.naturalWidth || image.width;
          const logicalWidth = element.w_mm;

          const stageScale = currentNode.getStage()?.scaleX() || 1;
          const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
          const screenPixelWidth = Math.round(logicalWidth * stageScale * dpr);

          // Caching up to full natural resolution or at least physical screen pixels (min 2560px)
          const targetWidth = Math.min(naturalWidth, Math.max(screenPixelWidth, 2560));
          const computedPixelRatio = logicalWidth > 0 ? (targetWidth / logicalWidth) : 1;

          currentNode.cache({ pixelRatio: computedPixelRatio, imageSmoothingEnabled: true });
          currentNode.getLayer()?.batchDraw();
        });
      } else {
        if (filterRafRef.current) cancelAnimationFrame(filterRafRef.current);
        node.clearCache();
        node.filters([]);
        node.getLayer()?.batchDraw();
      }
    }

    return () => {
      if (filterRafRef.current) cancelAnimationFrame(filterRafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [element.id, element.photoFilter, element.photoAdjustments, image, element.filterIntensity, previewOriginalPhotoId, element.cropData, isCropActiveForThis]);

  // Debounced cache geometry refresh when w_mm or h_mm changes on an already-filtered node,
  // avoiding synchronous CPU filter execution on every single resize frame.
  useEffect(() => {
    const node = filterLayerRef.current;
    if (!node || !image || !node.isCached()) return;
    const timer = setTimeout(() => {
      if (filterLayerRef.current && filterLayerRef.current.isCached()) {
        const naturalWidth = image.naturalWidth || image.width;
        const logicalWidth = element.w_mm;
        const stageScale = filterLayerRef.current.getStage()?.scaleX() || 1;
        const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
        const screenPixelWidth = Math.round(logicalWidth * stageScale * dpr);
        const targetWidth = Math.min(naturalWidth, Math.max(screenPixelWidth, 2560));
        const computedPixelRatio = logicalWidth > 0 ? (targetWidth / logicalWidth) : 1;
        filterLayerRef.current.cache({ pixelRatio: computedPixelRatio, imageSmoothingEnabled: true });
        filterLayerRef.current.getLayer()?.batchDraw();
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [element.w_mm, element.h_mm, image]);

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

  // Invalidate Konva filter cache immediately whenever cropData or crop mode changes
  useLayoutEffect(() => {
    if (filterLayerRef.current) {
      filterLayerRef.current.clearCache();
      filterLayerRef.current.getLayer()?.batchDraw();
    }
  }, [element.cropData, isCropActiveForThis]);

  const appliedShadowColor = element.shadowColor || (!element.isolateFromGlobalStyles && globalStyles?.shadowEnabled ? (globalStyles.shadowColor || '#000000') : 'transparent');
  const appliedShadowBlur = element.shadowBlur ?? (!element.isolateFromGlobalStyles && globalStyles?.shadowEnabled ? (globalStyles.shadowBlur ?? 0) : 0);
  const appliedShadowOffsetX = element.shadowOffsetX ?? (!element.isolateFromGlobalStyles && globalStyles?.shadowEnabled ? (globalStyles.shadowOffsetX ?? 0) : 0);
  const appliedShadowOffsetY = element.shadowOffsetY ?? (!element.isolateFromGlobalStyles && globalStyles?.shadowEnabled ? (globalStyles.shadowOffsetY ?? 0) : 0);
  const appliedShadowOpacity = element.shadowOpacity ?? (!element.isolateFromGlobalStyles && globalStyles?.shadowEnabled ? (globalStyles.shadowOpacity ?? 0.5) : 0.5);

  const shadowIsInvisibleArtifact = (appliedShadowBlur === 0 && appliedShadowOffsetX === 0 && appliedShadowOffsetY === 0) || appliedShadowOpacity === 0;
  const finalShadowColor = shadowIsInvisibleArtifact ? 'transparent' : appliedShadowColor;

  const strokeEnabled = !element.isolateFromGlobalStyles && (globalStyles?.strokeEnabled ?? false);
  const appliedStrokeWidth = element.strokeWidth ?? (strokeEnabled ? (globalStyles?.strokeWidth ?? 0) : 0);
  const appliedStrokeColor = element.strokeColor ?? (strokeEnabled ? (globalStyles?.strokeColor ?? '#ffffff') : undefined);

  const cornerRadiusEnabled = !element.isolateFromGlobalStyles && (globalStyles?.borderRadiusEnabled ?? false);
  const appliedBorderRadius = element.borderRadius ?? (cornerRadiusEnabled ? (globalStyles?.borderRadius ?? 0) : 0);

  // The background photo remains firm and fixed on canvas - what rotates/adjusts is the crop guide!
  const currentRotation = element.rotation_deg || 0;
  const photoRotation = isRawSession ? (isCropActiveForThis ? rotationDraft : currentRotation) : 0;
  const currentFlipH = isCropActiveForThis ? flipHDraft : !!element.flipHorizontal;
  const currentFlipV = isCropActiveForThis ? flipVDraft : !!element.flipVertical;

  const cx = element.w_mm / 2;
  const cy = element.h_mm / 2;

  return (
    <React.Fragment>
      <Group
        ref={groupRef}
        x={isRawSession ? cx : (element.x_mm + (currentFlipH ? element.w_mm : 0))}
        y={isRawSession ? cy : (element.y_mm + (currentFlipV ? element.h_mm : 0))}
        offsetX={isRawSession ? cx : 0}
        offsetY={isRawSession ? cy : 0}
        width={element.w_mm}
        height={element.h_mm}
        rotation={isRawSession ? 0 : currentRotation}
        clipX={isRawSession ? 0 : undefined}
        clipY={isRawSession ? 0 : undefined}
        clipWidth={isRawSession ? element.w_mm : undefined}
        clipHeight={isRawSession ? element.h_mm : undefined}
        scaleX={(element.scale || 1) * (currentFlipH ? -1 : 1)}
        scaleY={(element.scale || 1) * (currentFlipV ? -1 : 1)}
        listening={!element.locked}
        draggable={!isRawSession && !isCropActiveForThis && !element.locked && (isSelected || isSelectedStaged)} // Strictly locked/anchored in Camera Raw Pro and during Crop mode
        onClick={(e) => {
           if (element.locked) return;
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
           if (element.locked) return;
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
        onTransformStart={() => {
          const pivotU = element.pivotX ?? 0.5;
          const pivotV = element.pivotY ?? 0.5;
          transformPivotRef.current = getWorldPivotPoint(element, pivotU, pivotV);
          transformStartRotRef.current = groupRef.current?.rotation() || 0;
        }}
        onTransform={() => {
          const node = groupRef.current;
          if (!node || !transformPivotRef.current) return;
          const baseScale = element.scale || 1;
          const isPureRotation =
            Math.abs(node.scaleX() - baseScale) < 0.005 &&
            Math.abs(node.scaleY() - baseScale) < 0.005 &&
            Math.abs(node.rotation() - transformStartRotRef.current) > 0.01;
          if (isPureRotation) {
            const pivotU = element.pivotX ?? 0.5;
            const pivotV = element.pivotY ?? 0.5;
            const nextPose = computeRotationAroundPivot(
              element,
              node.rotation(),
              pivotU,
              pivotV,
              transformPivotRef.current
            );
            node.x(nextPose.x_mm);
            node.y(nextPose.y_mm);
          }
        }}
        onTransformEnd={() => {
          const node = groupRef.current;
          const baseScale = element.scale || 1;
          const ratioX = node.scaleX() / baseScale;
          const ratioY = node.scaleY() / baseScale;

          node.scaleX(baseScale);
          node.scaleY(baseScale);
          transformPivotRef.current = null;

          updateElement(spreadId, element.id, {
            x_mm: Number(node.x().toFixed(3)),
            y_mm: Number(node.y().toFixed(3)),
            w_mm: Math.max(5, Number((element.w_mm * ratioX).toFixed(2))),
            h_mm: Math.max(5, Number((element.h_mm * ratioY).toFixed(2))),
            rotation_deg: Number(node.rotation().toFixed(2))
          });
        }}
      >
        {/* Base Unadjusted Original Photo (visible on the left or during toggle) */}
        {showBeforeAfterSplit && (
          <KonvaImage
            image={image}
            x={isRawSession ? cx : 0} y={isRawSession ? cy : 0}
            offsetX={isRawSession ? cx : 0}
            offsetY={isRawSession ? cy : 0}
            rotation={photoRotation}
            width={element.w_mm}
            height={element.h_mm}
            crop={computedCrop}
            cornerRadius={appliedBorderRadius}
            imageSmoothingEnabled={true}
            imageSmoothingQuality="high"
            listening={false}
          />
        )}

        {/* Filtered / Adjusted Photo (clipped to right side in split mode, or full normally) */}
        {showBeforeAfterSplit ? (
          <Group
            clipX={element.w_mm * beforeAfterSplitPosition}
            clipY={0}
            clipWidth={element.w_mm * (1 - beforeAfterSplitPosition)}
            clipHeight={element.h_mm}
          >
            <KonvaImage
              ref={filterLayerRef}
              image={image}
              x={isRawSession ? cx : 0} y={isRawSession ? cy : 0}
            offsetX={isRawSession ? cx : 0}
            offsetY={isRawSession ? cy : 0}
            rotation={photoRotation}
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
              imageSmoothingEnabled={true}
              imageSmoothingQuality="high"
            />
          </Group>
        ) : (
          <KonvaImage
            ref={filterLayerRef}
            image={image}
            x={isRawSession ? cx : 0} y={isRawSession ? cy : 0}
            offsetX={isRawSession ? cx : 0}
            offsetY={isRawSession ? cy : 0}
            rotation={photoRotation}
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
            imageSmoothingEnabled={true}
            imageSmoothingQuality="high"
          />
        )}

        {/* Interactive Split Divider Line & Draggable Handle on Canvas (Crisp constant screen scale) */}
        {showBeforeAfterSplit && (
          <Group listening={true}>
            {/* 1. Visible Fine Hairline Divider (Always 1.5px on screen) */}
            <Line
              points={[
                element.w_mm * beforeAfterSplitPosition,
                0,
                element.w_mm * beforeAfterSplitPosition,
                element.h_mm,
              ]}
              stroke="#ffffff"
              strokeWidth={Math.max(0.15, 1.4 / s)}
              shadowColor="#000000"
              shadowBlur={Math.max(0.4, 3 / s)}
              shadowOpacity={0.7}
              listening={false}
            />

            {/* 2. Full-height Invisible Draggable Hit Zone (Allows dragging along the entire vertical line) */}
            <Line
              points={[
                element.w_mm * beforeAfterSplitPosition,
                0,
                element.w_mm * beforeAfterSplitPosition,
                element.h_mm,
              ]}
              stroke="transparent"
              strokeWidth={Math.max(4, 26 / s)}
              draggable
              dragBoundFunc={(pos) => {
                const groupNode = groupRef.current;
                if (!groupNode) return pos;
                const transform = groupNode.getAbsoluteTransform().copy().invert();
                const local = transform.point(pos);
                const clampedLocalX = Math.max(element.w_mm * 0.01, Math.min(element.w_mm * 0.99, local.x));
                return groupNode.getAbsoluteTransform().point({ x: clampedLocalX, y: 0 });
              }}
              onDragMove={(e) => {
                e.cancelBubble = true;
                const groupNode = groupRef.current;
                if (!groupNode) return;
                const transform = groupNode.getAbsoluteTransform().copy().invert();
                const local = transform.point(e.target.getAbsolutePosition());
                const ratio = Math.max(0.01, Math.min(0.99, local.x / element.w_mm));
                setBeforeAfterSplitPosition(ratio);
              }}
              onMouseEnter={(e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'ew-resize';
              }}
              onMouseLeave={(e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'default';
              }}
            />

            {/* 3. Draggable Center Knob (Constant screen size: 20px diameter) */}
            <Group
              x={element.w_mm * beforeAfterSplitPosition}
              y={element.h_mm / 2}
              draggable
              dragBoundFunc={(pos) => {
                const groupNode = groupRef.current;
                if (!groupNode) return pos;
                const transform = groupNode.getAbsoluteTransform().copy().invert();
                const local = transform.point(pos);
                const clampedLocalX = Math.max(element.w_mm * 0.01, Math.min(element.w_mm * 0.99, local.x));
                return groupNode.getAbsoluteTransform().point({ x: clampedLocalX, y: element.h_mm / 2 });
              }}
              onDragStart={(e) => {
                e.cancelBubble = true;
              }}
              onDragMove={(e) => {
                e.cancelBubble = true;
                const groupNode = groupRef.current;
                if (!groupNode) return;
                const transform = groupNode.getAbsoluteTransform().copy().invert();
                const local = transform.point(e.target.getAbsolutePosition());
                const ratio = Math.max(0.01, Math.min(0.99, local.x / element.w_mm));
                setBeforeAfterSplitPosition(ratio);
              }}
              onDragEnd={(e) => {
                e.cancelBubble = true;
              }}
              onMouseEnter={(e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'ew-resize';
              }}
              onMouseLeave={(e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'default';
              }}
            >
              <Circle
                radius={Math.max(1, 10 / s)}
                fill="#ffffff"
                stroke="#1f2937"
                strokeWidth={Math.max(0.2, 1 / s)}
                shadowColor="#000000"
                shadowBlur={Math.max(0.5, 4 / s)}
                shadowOpacity={0.35}
              />
              <Line
                points={[
                  -3.5 / s, 0,
                  -1.2 / s, -2.5 / s,
                  -1.2 / s, 2.5 / s
                ]}
                fill="#1f2937"
                closed
              />
              <Line
                points={[
                  3.5 / s, 0,
                  1.2 / s, -2.5 / s,
                  1.2 / s, 2.5 / s
                ]}
                fill="#1f2937"
                closed
              />
            </Group>

            {/* 4. "ANTES" Badge (Left - Constant Screen Size: 18px height) */}
            <Group x={Math.max(1, 8 / s)} y={Math.max(1, 8 / s)} listening={false}>
              <Rect
                width={Math.max(4, 40 / s)}
                height={Math.max(2, 18 / s)}
                fill="rgba(0,0,0,0.7)"
                cornerRadius={Math.max(1, 3.5 / s)}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={Math.max(0.1, 0.6 / s)}
              />
              <Text
                text="ANTES"
                fontSize={Math.max(1, 8 / s)}
                fontStyle="bold"
                fill="#ffffff"
                x={Math.max(0.5, 5 / s)}
                y={Math.max(0.5, 4.5 / s)}
                fontFamily="sans-serif"
              />
            </Group>

            {/* 5. "DESPUÉS" Badge (Right - Constant Screen Size: 18px height) */}
            <Group x={Math.max(8 / s, element.w_mm - (58 / s))} y={Math.max(1, 8 / s)} listening={false}>
              <Rect
                width={Math.max(5, 50 / s)}
                height={Math.max(2, 18 / s)}
                fill="rgba(0,0,0,0.7)"
                cornerRadius={Math.max(1, 3.5 / s)}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={Math.max(0.1, 0.6 / s)}
              />
              <Text
                text="DESPUÉS"
                fontSize={Math.max(1, 8 / s)}
                fontStyle="bold"
                fill="#f59e0b"
                x={Math.max(0.5, 5 / s)}
                y={Math.max(0.5, 4.5 / s)}
                fontFamily="sans-serif"
              />
            </Group>
          </Group>
        )}

        {/* Real-Time Color Overlay (for decorations & tinted image layers) */}
        {element.color && element.color !== 'transparent' ? (
          <Rect
            x={0}
            y={0}
            width={element.w_mm}
            height={element.h_mm}
            cornerRadius={appliedBorderRadius}
            fill={element.color}
            opacity={element.type === 'decoration' ? 0.75 : 0.35}
            globalCompositeOperation="source-atop"
            listening={false}
          />
        ) : null}

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

        {/* Discrete Hover Indicator for Overlapping Layers */}
        {isHovered && !isSelected && !element.locked && (
          <Rect
            width={element.w_mm}
            height={element.h_mm}
            stroke="#3b82f6"
            strokeWidth={1.5}
            dash={[4, 3]}
            opacity={0.75}
            listening={false}
          />
        )}

        {/* Locked Layer Selection Outline when inspected from Layers Panel */}
        {isSelected && element.locked && (
          <Rect
            width={element.w_mm}
            height={element.h_mm}
            stroke="#ef4444"
            strokeWidth={1.5}
            dash={[5, 4]}
            opacity={0.85}
            listening={false}
          />
        )}

        {/* Interactive Non-destructive Crop & Thirds Overlay */}
        {isCropActiveForThis && (
          <CropOverlay element={element} />
        )}
      </Group>
      {!isRawSession && isSelected && !element.locked && (
        <Transformer
          ref={trRef}
          centeredRotation={
            element.pivotX === undefined ||
            (Math.abs((element.pivotX ?? 0.5) - 0.5) < 0.02 && Math.abs((element.pivotY ?? 0.5) - 0.5) < 0.02)
          }
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) return oldBox;
            return newBox;
          }}
        />
      )}
      <PivotAnchorOverlay element={element} spreadId={spreadId} isSelected={isSelected} />
      <ShadowDragAnchor element={element} spreadId={spreadId} isSelected={isSelected} />
    </React.Fragment>
  );
}, (prev, next) => prev.element === next.element && prev.isSelected === next.isSelected && prev.isHovered === next.isHovered && prev.spreadId === next.spreadId && prev.canvasScale === next.canvasScale);

const EditorShape = React.memo(function EditorShape({
  element,
  elements,
  spreadId,
  isSelected,
  isHovered = false,
  onSelect,
  onContextMenu
}: {
  element: EditorElement,
  elements: EditorElement[],
  spreadId: string,
  isSelected: boolean,
  isHovered?: boolean,
  onSelect: () => void,
  onContextMenu: (x: number, y: number, id: string) => void
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shapeRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trRef = useRef<any>(null);
  const updateElement = useEditorStore((state) => state.updateElement);
  const projectSize = useEditorStore((state) => state.project?.size) || { w_mm: 1000, h_mm: 1000 };

  useEffect(() => {
    if (isSelected && !element.locked && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected, element.locked]);

  const commonProps = {
    ref: shapeRef,
    fill: element.fillColor || '#aaaaaa',
    rotation: element.rotation_deg,
    scaleX: element.scale || 1,
    scaleY: element.scale || 1,
    opacity: element.opacity !== undefined ? element.opacity : 1,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalCompositeOperation: (element.blendMode as any) || 'source-over',
    shadowColor: element.shadowColor || 'transparent',
    shadowBlur: element.shadowBlur || 0,
    shadowOffsetX: element.shadowOffsetX || 0,
    shadowOffsetY: element.shadowOffsetY || 0,
    shadowOpacity: element.shadowOpacity !== undefined ? element.shadowOpacity : 0.5,
    listening: !element.locked,
    draggable: Boolean(isSelected && !element.locked),
    stroke: isHovered && !isSelected && !element.locked ? '#3b82f6' : isSelected && element.locked ? '#ef4444' : undefined,
    strokeWidth: (isHovered && !isSelected && !element.locked) || (isSelected && element.locked) ? 1.5 : 0,
    dash: isSelected && element.locked ? [5, 4] : isHovered && !isSelected ? [4, 3] : undefined,
    onClick: () => {
      if (!element.locked) onSelect();
    },
    onTap: () => {
      if (!element.locked) onSelect();
    },
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
      const baseScale = element.scale || 1;
      const ratioX = node.scaleX() / baseScale;
      const ratioY = node.scaleY() / baseScale;
      node.scaleX(baseScale);
      node.scaleY(baseScale);

      updateElement(spreadId, element.id, {
        x_mm: Number(node.x().toFixed(3)),
        y_mm: Number(node.y().toFixed(3)),
        w_mm: Math.max(5, Number((element.w_mm * ratioX).toFixed(2))),
        h_mm: Math.max(5, Number((element.h_mm * ratioY).toFixed(2))),
        rotation_deg: Number(node.rotation().toFixed(2))
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
      {isSelected && !element.locked && (
        <Transformer
          ref={trRef}
          centeredRotation={
            element.pivotX === undefined ||
            (Math.abs((element.pivotX ?? 0.5) - 0.5) < 0.02 && Math.abs((element.pivotY ?? 0.5) - 0.5) < 0.02)
          }
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) return oldBox;
            return newBox;
          }}
        />
      )}
      <PivotAnchorOverlay element={element} spreadId={spreadId} isSelected={isSelected} />
      <ShadowDragAnchor element={element} spreadId={spreadId} isSelected={isSelected} />
    </React.Fragment>
  );
}, (prev, next) => prev.element === next.element && prev.isSelected === next.isSelected && prev.isHovered === next.isHovered && prev.spreadId === next.spreadId);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EditorText = React.memo(function EditorText({ element, elements, spreadId, isSelected, isHovered = false, onSelect, onContextMenu }: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shapeRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trRef = useRef<any>(null);
  const updateElement = useEditorStore((state) => state.updateElement);
  const projectSize = useEditorStore((state) => state.project?.size) || { w_mm: 1000, h_mm: 1000 };

  useEffect(() => {
    if (isSelected && !element.locked && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected, element.locked]);

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

  // Phase 8.G: Realtime Auto-Shrinkwrap Sync. Binds logical bounds to true typography layout natively.
  useLayoutEffect(() => {
    if (shapeRef.current) {
      const node = shapeRef.current;
      const actW = node.width();
      const actH = node.height();
      if (Math.abs(actW - element.w_mm) > 1 || Math.abs(actH - element.h_mm) > 1) {
         queueMicrotask(() => {
           updateElement(spreadId, element.id, { w_mm: actW, h_mm: actH });
         });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [element.text, element.fontSize, element.fontFamily, element.letterSpacing, element.lineHeight, element.textTransform]);

  const onTransformEnd = () => {
    const node = shapeRef.current;
    if (!node) return;
    const baseScale = element.scale || 1;
    const ratioX = node.scaleX() / baseScale;
    const ratioY = node.scaleY() / baseScale;
    node.scaleX(baseScale);
    node.scaleY(baseScale);

    updateElement(spreadId, element.id, {
      x_mm: Number(node.x().toFixed(3)),
      y_mm: Number(node.y().toFixed(3)),
      w_mm: Math.max(10, Number((node.width() * ratioX).toFixed(2))),
      h_mm: Math.max(10, Number((node.height() * ratioY).toFixed(2))),
      fontSize: Math.round((element.fontSize || 32) * ratioX),
      rotation_deg: Number(node.rotation().toFixed(2))
    });
  };

  return (
    <React.Fragment>
      <Text
        ref={shapeRef}
        x={element.x_mm}
        y={element.y_mm}
        width={undefined}
        height={undefined}
        text={element.textTransform === 'uppercase' ? (element.text || 'Doble clic para editar...').toUpperCase() : element.textTransform === 'lowercase' ? (element.text || 'Doble clic para editar...').toLowerCase() : (element.text || 'Doble clic para editar...')}
        fontFamily={element.fontFamily || 'Inter'}
        fontSize={element.fontSize || 32}
        fill={element.textColor || '#000000'}
        letterSpacing={element.letterSpacing || 0}
        lineHeight={element.lineHeight || 1}
        stroke={element.strokeColor || (isHovered && !isSelected && !element.locked ? '#3b82f6' : undefined)}
        strokeWidth={element.strokeWidth || (isHovered && !isSelected && !element.locked ? 0.5 : 0)}
        rotation={element.rotation_deg}
        scaleX={element.scale || 1}
        scaleY={element.scale || 1}
        opacity={element.opacity !== undefined ? element.opacity : 1}
        shadowColor={element.shadowColor || 'black'}
        shadowBlur={element.shadowBlur || 0}
        shadowOffsetX={element.shadowOffsetX || 0}
        shadowOffsetY={element.shadowOffsetY || 0}
        shadowOpacity={element.shadowOpacity !== undefined ? element.shadowOpacity : 0.5}
        listening={!element.locked}
        draggable={Boolean(isSelected && !element.locked)}
        onClick={() => {
          if (!element.locked) onSelect();
        }}
        onTap={() => {
          if (!element.locked) onSelect();
        }}
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
      {isSelected && !element.locked && (
        <Transformer
          ref={trRef}
          centeredRotation={
            element.pivotX === undefined ||
            (Math.abs((element.pivotX ?? 0.5) - 0.5) < 0.02 && Math.abs((element.pivotY ?? 0.5) - 0.5) < 0.02)
          }
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 10) return oldBox;
            return newBox;
          }}
        />
      )}
      <PivotAnchorOverlay element={element} spreadId={spreadId} isSelected={isSelected} />
      <ShadowDragAnchor element={element} spreadId={spreadId} isSelected={isSelected} />
    </React.Fragment>
  );
}, (prev, next) => prev.element === next.element && prev.isSelected === next.isSelected && prev.isHovered === next.isHovered && prev.spreadId === next.spreadId);

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
  const duplicateElement = useEditorStore((state) => state.duplicateElement);
  const updateElement = useEditorStore((state) => state.updateElement);
  const removeElement = useEditorStore((state) => state.removeElement);

  const t = useTranslations('Editor');

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, elementId: string } | null>(null);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [isDraggingOverCanvas, setIsDraggingOverCanvas] = useState(false);

  const openElementContextMenu = (clientX: number, clientY: number, elementId: string) => {
    setSelectedElement(elementId);
    const clampedX = typeof window !== 'undefined' ? Math.min(clientX, window.innerWidth - 200) : clientX;
    const clampedY = typeof window !== 'undefined' ? Math.min(clientY, window.innerHeight - 290) : clientY;
    setContextMenu({ x: Math.max(8, clampedX), y: Math.max(8, clampedY), elementId });
  };

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
  const isRawSession = project.type === 'type_raw_session' || (project as { workflowMode?: string })?.workflowMode === 'raw';

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
          const isStudio = project.projectCategory === 'studio_print';
          const isRawSession = project.type === 'type_raw_session' || (project as { workflowMode?: string })?.workflowMode === 'raw';
          const isGhostDrop = !isStudio && !isRawSession && isLastSpread && dropX > project.size.w_mm + 25;

           // Native OS Files Drop Interceptor (Folders / Desktop)
           if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
              if (files.length > 0) {
                 Promise.all(files.map(async (file, i) => {
                    const { originalUrl, previewUrl, originalBlobId, previewBlobId, widthPx, heightPx } = await processLocalImage(file);
                    const md = extractAssetMetadataFromFile(file, (useEditorStore.getState().project?.assets?.length || 0) + i, { w: widthPx || 0, h: heightPx || 0 });
                    const asset: import('@/types/editor').ProjectAsset = {
                       id: 'asset_' + Date.now() + '_' + Math.random().toString(36).substring(2,9),
                       name: file.name,
                       previewUrl,
                       originalUrl,
                       previewBlobId,
                       originalBlobId,
                       rating: 0,
                       isFavorite: false,
                       width: widthPx,
                       height: heightPx,
                       orientation: md.orientation,
                       aspectRatio: md.aspectRatio,
                       metadata: md
                    };
                    useEditorStore.getState().addAsset(asset);
                    return asset;
                 })).then(newAssets => {
                    if (isStudio || isRawSession) {
                       if (newAssets.length > 0) {
                          useEditorStore.getState().loadAssetToCanvas(newAssets[0]);
                       }
                       return;
                    }

                    if (spread.elements.length === 0) {
                       // Empty Canvas: Proportional Auto-Fit & Auto-Center
                       newAssets.forEach((asset, idx) => {
                          const imgRatio = (asset.width && asset.height) ? (asset.width / asset.height) : (asset.aspectRatio || 1);
                          const canvasW = project.size.w_mm;
                          const canvasH = project.size.h_mm;
                          const canvasRatio = canvasW / canvasH;

                          let w: number;
                          let h: number;
                          let posX: number;
                          let posY: number;

                          if (Math.abs(imgRatio - canvasRatio) < 0.01) {
                             w = canvasW;
                             h = canvasH;
                             posX = 0;
                             posY = 0;
                          } else {
                             if (imgRatio > canvasRatio) {
                                w = canvasW;
                                h = canvasW / imgRatio;
                                posX = 0;
                                posY = (canvasH - h) / 2;
                             } else {
                                h = canvasH;
                                w = canvasH * imgRatio;
                                posX = (canvasW - w) / 2;
                                posY = 0;
                             }
                          }

                          useEditorStore.getState().addElement(activeSpreadId, {
                             id: `el_${Date.now()}_${idx}`,
                             type: 'image',
                             previewUrl: asset.previewUrl,
                             originalUrl: asset.originalUrl,
                             previewBlobId: asset.previewBlobId,
                             originalBlobId: asset.originalBlobId,
                             assetId: asset.id,
                             x_mm: posX,
                             y_mm: posY,
                             w_mm: w,
                             h_mm: h,
                             rotation_deg: 0,
                             zIndex: spread.elements.length + idx
                          });
                       });
                       useEditorStore.getState().flushSave();
                       return;
                    }

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
                    useEditorStore.getState().flushSave();
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
               const isStudio = project.projectCategory === 'studio_print';
               const isRawSession = project.type === 'type_raw_session' || (project as { workflowMode?: string })?.workflowMode === 'raw';

               if (payload.type === 'image' && (isStudio || isRawSession) && stagedAssets.length > 0) {
                  useEditorStore.getState().loadAssetToCanvas(stagedAssets[0]);
                  return;
               }

               // eslint-disable-next-line @typescript-eslint/no-explicit-any
               const isFundyMode = !isStudio && !isRawSession && ((spread.autoLayout?.mode as any) === 'fundy-masonry-experimental' || spread.status === 'empty' || spread.elements.length === 0);

               if (payload.type === 'image' && isFundyMode && stagedAssets.length > 0) {
                    useEditorStore.getState().ingestAndDropToSpread(activeSpreadId, stagedAssets);
                    return;
               }

              if (payload.type === 'image') {
                 if (stagedAssets.length > 0) {
                    stagedAssets.forEach((asset, idx) => {
                       const img = new window.Image();
                       img.onload = () => {
                          let w: number;
                          let h: number;
                          let posX: number;
                          let posY: number;

                          const imgRatio = (img.width && img.height) ? (img.width / img.height) : (asset.aspectRatio || 1);
                          const canvasW = project.size.w_mm;
                          const canvasH = project.size.h_mm;
                          const canvasRatio = canvasW / canvasH;

                          if (isStudio || spread.elements.length === 0) {
                             if (Math.abs(imgRatio - canvasRatio) < 0.01) {
                                // Proportions match canvas: 100% full canvas coverage
                                w = canvasW;
                                h = canvasH;
                                posX = 0;
                                posY = 0;
                             } else {
                                // Proportions differ: Fit proportionally inside canvas (contain) centered
                                if (imgRatio > canvasRatio) {
                                   w = canvasW;
                                   h = canvasW / imgRatio;
                                   posX = 0;
                                   posY = (canvasH - h) / 2;
                                } else {
                                   h = canvasH;
                                   w = canvasH * imgRatio;
                                   posX = (canvasW - w) / 2;
                                   posY = 0;
                                }
                             }
                          } else {
                             const aspect = img.width / img.height;
                             w = 80;
                             h = 80 / aspect;
                             if (h > 120) { h = 120; w = 120 * aspect; }
                             posX = dropX - (w / 2) + (idx * 25);
                             posY = dropY - (h / 2) + (idx * 25);
                          }

                          let didSwap = false;
                          // Only swap if it's the primary lead dragged item (first one)
                          if (idx === 0 && spread?.autoLayout?.isActive) {
                             const targetManagedElement = spread.elements.find(el =>
                                el.isAutoLayoutManaged &&
                                dropX >= el.x_mm && dropX <= el.x_mm + el.w_mm &&
                                dropY >= el.y_mm && dropY <= el.y_mm + el.h_mm
                             );
                             if (targetManagedElement) {
                                useEditorStore.getState().updateElement(activeSpreadId, targetManagedElement.id, {
                                   previewUrl: asset.previewUrl,
                                   originalUrl: asset.originalUrl,
                                   previewBlobId: asset.previewBlobId,
                                   originalBlobId: asset.originalBlobId,
                                   assetId: asset.id
                                });
                                didSwap = true;
                             }
                          }

                          if (!didSwap) {
                             useEditorStore.getState().addElement(activeSpreadId, {
                                id: `el_${Date.now()}_${idx}`,
                                type: 'image',
                                previewUrl: asset.previewUrl,
                                originalUrl: asset.originalUrl,
                                previewBlobId: asset.previewBlobId,
                                originalBlobId: asset.originalBlobId,
                                assetId: asset.id,
                                x_mm: posX,
                                y_mm: posY,
                                w_mm: w,
                                h_mm: h,
                                rotation_deg: 0,
                                zIndex: spread.elements.length + idx // Ensure they mount on top
                             });
                          }
                       };
                       img.src = asset.previewUrl || '';
                    });
                 }
              } else if (payload.type === 'decoration') {
                 const img = new window.Image();
                 img.onload = () => {
                    const aspect = img.width / img.height;
                    let w = 80;
                    let h = 80 / aspect;
                    if (h > 120) { h = 120; w = 120 * aspect; }

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
                 };
                 img.src = payload.src;
              }
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
        onMouseMove={(e) => {
          if (e.evt && e.evt.buttons !== 0) return;
          const stage = e.target.getStage();
          if (!stage) return;
          const pointer = stage.getPointerPosition();
          if (!pointer) return;
          const worldX_mm = (pointer.x - panX) / scale;
          const worldY_mm = (pointer.y - panY) / scale;
          const hit = findTopmostElementAtPoint(elements, worldX_mm, worldY_mm, { includeLocked: false });
          const nextHoverId = hit?.id ?? null;
          if (nextHoverId !== hoveredElementId) {
            setHoveredElementId(nextHoverId);
          }
        }}
        onMouseLeave={() => {
          if (hoveredElementId !== null) setHoveredElementId(null);
        }}
        style={{ boxShadow: '0px 10px 30px rgba(0,0,0,0.1)' }}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          const stage = e.target.getStage();
          if (!stage) return;
          const pointer = stage.getPointerPosition();
          if (!pointer) return;
          const worldX_mm = (pointer.x - panX) / scale;
          const worldY_mm = (pointer.y - panY) / scale;
          // Hit-test topmost visible element including locked layers so locked layers can be unlocked via right-click
          const hit = findTopmostElementAtPoint(elements, worldX_mm, worldY_mm, { includeLocked: true });
          if (hit) {
            e.cancelBubble = true;
            e.evt.stopPropagation();
            openElementContextMenu(e.evt.clientX, e.evt.clientY, hit.id);
          } else {
            setContextMenu(null);
          }
        }}
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
          let el = rawEl;
          if (el.type === 'group') return null; // Logical container bypassing visual draw explicitly
          if (el.visible === false) return null; // Direct visibility toggle overriding render loops

          // Calculate cascading visibility and Opacity correctly natively protecting render cycles
          if (el.groupId) {
             const parent = spread.elements.find(g => g.id === el.groupId);
             if (parent && parent.visible === false) return null; // Cascade Visibility

             if (parent && parent.opacity !== undefined && parent.opacity !== 1) {
                // If parent has non-1 opacity, merge it natively
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
                isHovered={hoveredElementId === el.id}
                onSelect={() => setSelectedElement(el.id)}
                onContextMenu={openElementContextMenu}
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
                isHovered={hoveredElementId === el.id}
                onSelect={() => setSelectedElement(el.id)}
                onContextMenu={openElementContextMenu}
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
              isHovered={hoveredElementId === el.id}
              onSelect={() => setSelectedElement(el.id)}
              onContextMenu={openElementContextMenu}
              canvasScale={scale}
            />
          );
        })}

        {elements.length === 0 && !isRawSession && (
           <Group>
             <Rect x={project.size.w_mm * 0.2} y={project.size.h_mm * 0.25} width={project.size.w_mm * 0.6} height={project.size.h_mm * 0.5} fill="#d4d4d4" cornerRadius={4} listening={false} />
             <Text text="↓" x={0} y={project.size.h_mm * 0.5 - 15} width={project.size.w_mm} fontSize={18} fill="#666666" align="center" listening={false} />
             <Text text={project.projectCategory === 'studio_print' ? "Haz clic en una foto para revelarla" : "Drop images to Add Spread"} x={0} y={project.size.h_mm * 0.5 + 10} width={project.size.w_mm} fontSize={12} fontFamily="Inter" fill="#666666" align="center" listening={false} />
           </Group>
        )}

        {(() => {
            const isStudio = project.projectCategory === 'studio_print';
            if (isStudio || isRawSession) return null; // Standalone documents - never render ghost spreads
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

      {/* Print Guides Overlay separated safely from elements (hidden in Camera Raw Pro) */}
      {!isRawSession && (
        <>
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
        </>
      )}

        {/* Center Fold Line Component replaced by individual Spread Canvases - No Center Fold needed here */}

      {/* Dynamic Native Ruler Guides Overlay */}
        {project?.globalGuides?.map(guide => (
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
                 useEditorStore.getState().removeGuide(guide.id);
              } else {
                 useEditorStore.getState().updateGuide(guide.id, { position_mm: newPos });
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
          className="fixed z-50 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-2xl py-1.5 min-w-[190px] text-xs font-medium overflow-hidden"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.elementId.startsWith('guide:') ? (
             <>
               <button
                 type="button"
                 className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
                 onClick={() => {
                    const guideId = contextMenu.elementId.replace('guide:', '');
                    const guide = project?.globalGuides?.find(g => g.id === guideId);
                    if (guide) useEditorStore.getState().updateGuide(guideId, { locked: !guide.locked });
                    setContextMenu(null);
                 }}
               >
                 {project?.globalGuides?.find(g => g.id === contextMenu.elementId.replace('guide:', ''))?.locked ? 'Unlock Guide' : 'Lock Guide'}
               </button>
               <button
                 type="button"
                 className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-between"
                 onClick={() => {
                    const guideId = contextMenu.elementId.replace('guide:', '');
                    const guide = project?.globalGuides?.find(g => g.id === guideId);
                    const isRed = guide?.color === '#ff0000';
                    useEditorStore.getState().updateGuide(guideId, { color: isRed ? '#00ffff' : '#ff0000' });
                    setContextMenu(null);
                 }}
               >
                 Change Color
                 <span className="w-3 h-3 rounded-full border border-neutral-300 dark:border-neutral-600" style={{ backgroundColor: project?.globalGuides?.find(g => g.id === contextMenu.elementId.replace('guide:', ''))?.color === '#ff0000' ? '#00ffff' : '#ff0000' }}></span>
               </button>
               <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1"></div>
               <button
                 type="button"
                 className="w-full text-left px-4 py-2 hover:bg-red-500 hover:text-white text-red-500 transition-colors"
                 onClick={() => {
                    useEditorStore.getState().removeGuide(contextMenu.elementId.replace('guide:', ''));
                    setContextMenu(null);
                 }}
               >
                 Delete Guide
               </button>
             </>
          ) : (() => {
             const ctxEl = spread.elements.find(el => el.id === contextMenu.elementId);
             const isCtxLocked = Boolean(ctxEl?.locked);
             const isCtxHidden = ctxEl?.visible === false;
             return (
               <>
                 <button
                   type="button"
                   className="w-full text-left px-3.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition-colors flex items-center gap-2.5"
                   onClick={() => { bringToFront(activeSpreadId, contextMenu.elementId); setContextMenu(null); }}
                 >
                   <ArrowUpToLine className="w-3.5 h-3.5 text-neutral-400" />
                   <span>{t('bring_to_front')}</span>
                 </button>
                 <button
                   type="button"
                   className="w-full text-left px-3.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition-colors flex items-center gap-2.5"
                   onClick={() => { bringForward(activeSpreadId, contextMenu.elementId); setContextMenu(null); }}
                 >
                   <ArrowUp className="w-3.5 h-3.5 text-neutral-400" />
                   <span>{t('bring_forward')}</span>
                 </button>
                 <button
                   type="button"
                   className="w-full text-left px-3.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition-colors flex items-center gap-2.5"
                   onClick={() => { sendBackward(activeSpreadId, contextMenu.elementId); setContextMenu(null); }}
                 >
                   <ArrowDown className="w-3.5 h-3.5 text-neutral-400" />
                   <span>{t('send_backward')}</span>
                 </button>
                 <button
                   type="button"
                   className="w-full text-left px-3.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition-colors flex items-center gap-2.5"
                   onClick={() => { sendToBack(activeSpreadId, contextMenu.elementId); setContextMenu(null); }}
                 >
                   <ArrowDownToLine className="w-3.5 h-3.5 text-neutral-400" />
                   <span>{t('send_to_back')}</span>
                 </button>

                 <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1 mx-2" />

                 {ctxEl?.type === 'image' && ctxEl.assetId && (
                   <>
                     <PhotoAttributesMenuSection
                       isEs={typeof window !== 'undefined' ? window.location.pathname.startsWith('/es') : true}
                       source={{ assetId: ctxEl.assetId, elementId: ctxEl.id }}
                       target={{ assetIds: [ctxEl.assetId], elementId: ctxEl.id }}
                       onDone={() => setContextMenu(null)}
                     />
                     <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1 mx-2" />
                   </>
                 )}

                 <button
                   type="button"
                   className="w-full text-left px-3.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition-colors flex items-center gap-2.5"
                   onClick={() => { duplicateElement(activeSpreadId, contextMenu.elementId); setContextMenu(null); }}
                 >
                   <Copy className="w-3.5 h-3.5 text-neutral-400" />
                   <span>{t('duplicate_layer')}</span>
                 </button>
                 <button
                   type="button"
                   className="w-full text-left px-3.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition-colors flex items-center gap-2.5"
                   onClick={() => {
                     if (ctxEl) updateElement(activeSpreadId, contextMenu.elementId, { locked: !isCtxLocked });
                     setContextMenu(null);
                   }}
                 >
                   {isCtxLocked ? (
                     <Unlock className="w-3.5 h-3.5 text-amber-500" />
                   ) : (
                     <Lock className="w-3.5 h-3.5 text-neutral-400" />
                   )}
                   <span>{isCtxLocked ? t('unlock_layer') : t('lock_layer')}</span>
                 </button>
                 <button
                   type="button"
                   className="w-full text-left px-3.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition-colors flex items-center gap-2.5"
                   onClick={() => {
                     if (ctxEl) updateElement(activeSpreadId, contextMenu.elementId, { visible: isCtxHidden ? true : false });
                     setContextMenu(null);
                   }}
                 >
                   {isCtxHidden ? (
                     <Eye className="w-3.5 h-3.5 text-blue-500" />
                   ) : (
                     <EyeOff className="w-3.5 h-3.5 text-neutral-400" />
                   )}
                   <span>{isCtxHidden ? t('show_layer') : t('hide_layer')}</span>
                 </button>

                 <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1 mx-2" />

                 <button
                   type="button"
                   disabled={isCtxLocked}
                   className="w-full text-left px-3.5 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors flex items-center gap-2.5 disabled:opacity-40 disabled:pointer-events-none"
                   onClick={() => {
                     if (!isCtxLocked) removeElement(activeSpreadId, contextMenu.elementId);
                     setContextMenu(null);
                   }}
                 >
                   <Trash2 className="w-3.5 h-3.5" />
                   <span>{t('delete_layer')}</span>
                 </button>
               </>
             );
          })()}
        </div>
      )}
    </div>
  );
}
