"use client";

import React, { useRef, useEffect } from 'react';
import { Group, Rect, Line } from 'react-konva';
import Konva from 'konva';
import { useEditorStore } from '@/store/useEditorStore';
import { EditorElement, CropData } from '@/types/editor';

interface CropOverlayProps {
  element: EditorElement;
}

type DragMode = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'w' | 'e' | 'move' | null;

export const CropOverlay: React.FC<CropOverlayProps> = ({ element }) => {
  const cropDraft = useEditorStore((state) => state.cropDraft);
  const setCropDraft = useEditorStore((state) => state.setCropDraft);
  const cropGridGuide = useEditorStore((state) => state.cropGridGuide);

  const groupRef = useRef<Konva.Group>(null);
  const dragInfoRef = useRef<{
    mode: DragMode;
    startLocalX: number;
    startLocalY: number;
    initCropX: number;
    initCropY: number;
    initCropW: number;
    initCropH: number;
  }>({
    mode: null,
    startLocalX: 0,
    startLocalY: 0,
    initCropX: 0,
    initCropY: 0,
    initCropW: 0,
    initCropH: 0,
  });

  const rafRef = useRef<number | null>(null);

  const w = element.w_mm;
  const h = element.h_mm;

  // Cleanup any lingering window listeners on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!cropDraft) return null;

  const cropX = Math.max(0, Math.min(w, (cropDraft.xPercent / 100) * w));
  const cropY = Math.max(0, Math.min(h, (cropDraft.yPercent / 100) * h));
  const cropW = Math.max(5, Math.min(w - cropX, (cropDraft.widthPercent / 100) * w));
  const cropH = Math.max(5, Math.min(h - cropY, (cropDraft.heightPercent / 100) * h));

  // Determine target aspect ratio if locked by preset
  let targetRatio: number | null = null;
  const preset = cropDraft.aspectPreset;
  if (preset === '1:1') {
    targetRatio = 1.0;
  } else if (preset === 'original') {
    targetRatio = w / h;
  } else if (preset === '2:3') {
    targetRatio = 2 / 3;
  } else if (preset === '3:2') {
    targetRatio = 3 / 2;
  } else if (preset === '4:5') {
    targetRatio = 4 / 5;
  } else if (preset === '5:4') {
    targetRatio = 5 / 4;
  } else if (preset === '16:9') {
    targetRatio = 16 / 9;
  } else if (preset === '9:16') {
    targetRatio = 9 / 16;
  } else if (preset && preset.includes(':')) {
    const parts = preset.split(':').map(Number);
    if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
      targetRatio = parts[0] / parts[1];
    }
  }

  // Get local coordinates within the element using Konva's inverted transform
  const getLocalPointer = (stage: Konva.Stage): { x: number; y: number } | null => {
    const group = groupRef.current;
    if (!group) return null;
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return null;
    const transform = group.getAbsoluteTransform().copy().invert();
    return transform.point(pointerPos);
  };

  const startDrag = (mode: DragMode, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    const stage = e.target.getStage();
    if (!stage) return;
    const local = getLocalPointer(stage);
    if (!local) return;

    dragInfoRef.current = {
      mode,
      startLocalX: local.x,
      startLocalY: local.y,
      initCropX: cropX,
      initCropY: cropY,
      initCropW: cropW,
      initCropH: cropH,
    };

    const handlePointerMove = () => {
      if (!dragInfoRef.current.mode || !groupRef.current) return;
      const st = groupRef.current.getStage();
      if (!st) return;
      const currentLocal = getLocalPointer(st);
      if (!currentLocal) return;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const { mode, startLocalX, startLocalY, initCropX, initCropY, initCropW, initCropH } =
          dragInfoRef.current;
        if (!mode) return;

        const dx = currentLocal.x - startLocalX;
        const dy = currentLocal.y - startLocalY;

        let newX = initCropX;
        let newY = initCropY;
        let newW = initCropW;
        let newH = initCropH;

        if (mode === 'move') {
          newX = Math.max(0, Math.min(w - initCropW, initCropX + dx));
          newY = Math.max(0, Math.min(h - initCropH, initCropY + dy));
        } else if (mode === 'nw') {
          newX = Math.min(initCropX + dx, initCropX + initCropW - 5);
          newY = Math.min(initCropY + dy, initCropY + initCropH - 5);
          newW = initCropX + initCropW - newX;
          newH = initCropY + initCropH - newY;
          if (targetRatio) {
            newH = newW / targetRatio;
            newY = initCropY + initCropH - newH;
          }
        } else if (mode === 'ne') {
          newY = Math.min(initCropY + dy, initCropY + initCropH - 5);
          newW = Math.max(5, initCropW + dx);
          newH = initCropY + initCropH - newY;
          if (targetRatio) {
            newH = newW / targetRatio;
            newY = initCropY + initCropH - newH;
          }
        } else if (mode === 'se') {
          newW = Math.max(5, initCropW + dx);
          newH = Math.max(5, initCropH + dy);
          if (targetRatio) {
            newH = newW / targetRatio;
          }
        } else if (mode === 'sw') {
          newX = Math.min(initCropX + dx, initCropX + initCropW - 5);
          newW = initCropX + initCropW - newX;
          newH = Math.max(5, initCropH + dy);
          if (targetRatio) {
            newH = newW / targetRatio;
          }
        } else if (mode === 'n') {
          newY = Math.min(initCropY + dy, initCropY + initCropH - 5);
          newH = initCropY + initCropH - newY;
          if (targetRatio) {
            newW = newH * targetRatio;
            newX = initCropX + (initCropW - newW) / 2;
          }
        } else if (mode === 's') {
          newH = Math.max(5, initCropH + dy);
          if (targetRatio) {
            newW = newH * targetRatio;
            newX = initCropX + (initCropW - newW) / 2;
          }
        } else if (mode === 'w') {
          newX = Math.min(initCropX + dx, initCropX + initCropW - 5);
          newW = initCropX + initCropW - newX;
          if (targetRatio) {
            newH = newW / targetRatio;
            newY = initCropY + (initCropH - newH) / 2;
          }
        } else if (mode === 'e') {
          newW = Math.max(5, initCropW + dx);
          if (targetRatio) {
            newH = newW / targetRatio;
            newY = initCropY + (initCropH - newH) / 2;
          }
        }

        // Clamp to element bounds
        const clampedX = Math.max(0, Math.min(w - 5, newX));
        const clampedY = Math.max(0, Math.min(h - 5, newY));
        const clampedW = Math.max(5, Math.min(w - clampedX, newW));
        const clampedH = Math.max(5, Math.min(h - clampedY, newH));

        const updated: CropData = {
          ...cropDraft,
          xPercent: Number(((clampedX / w) * 100).toFixed(3)),
          yPercent: Number(((clampedY / h) * 100).toFixed(3)),
          widthPercent: Number(((clampedW / w) * 100).toFixed(3)),
          heightPercent: Number(((clampedH / h) * 100).toFixed(3)),
        };

        setCropDraft(updated);
      });
    };

    const handlePointerUp = () => {
      dragInfoRef.current.mode = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const bracketLen = Math.min(18, Math.min(cropW, cropH) * 0.35); // Sleek bracket arm length
  const bracketThickness = 2.5;
  const hitTargetSize = 20; // Invisible hit target for easy gripping

  return (
    <Group ref={groupRef} listening={true}>
      {/* 1. Cinematic Dimmer Masks for Excluded Areas */}
      {cropY > 0 && (
        <Rect
          x={0}
          y={0}
          width={w}
          height={cropY}
          fill="rgba(0, 0, 0, 0.6)"
          listening={false}
        />
      )}
      {cropY + cropH < h && (
        <Rect
          x={0}
          y={cropY + cropH}
          width={w}
          height={h - (cropY + cropH)}
          fill="rgba(0, 0, 0, 0.6)"
          listening={false}
        />
      )}
      {cropX > 0 && (
        <Rect
          x={0}
          y={cropY}
          width={cropX}
          height={cropH}
          fill="rgba(0, 0, 0, 0.6)"
          listening={false}
        />
      )}
      {cropX + cropW < w && (
        <Rect
          x={cropX + cropW}
          y={cropY}
          width={w - (cropX + cropW)}
          height={cropH}
          fill="rgba(0, 0, 0, 0.6)"
          listening={false}
        />
      )}

      {/* 2. Composition Thirds / Grid Lines (Ultra-fine Hairlines) */}
      {cropGridGuide === 'thirds' && (
        <Group listening={false}>
          <Line
            points={[cropX + cropW / 3, cropY, cropX + cropW / 3, cropY + cropH]}
            stroke="rgba(255, 255, 255, 0.45)"
            strokeWidth={0.8}
            shadowColor="rgba(0,0,0,0.4)"
            shadowBlur={1}
          />
          <Line
            points={[cropX + (2 * cropW) / 3, cropY, cropX + (2 * cropW) / 3, cropY + cropH]}
            stroke="rgba(255, 255, 255, 0.45)"
            strokeWidth={0.8}
            shadowColor="rgba(0,0,0,0.4)"
            shadowBlur={1}
          />
          <Line
            points={[cropX, cropY + cropH / 3, cropX + cropW, cropY + cropH / 3]}
            stroke="rgba(255, 255, 255, 0.45)"
            strokeWidth={0.8}
            shadowColor="rgba(0,0,0,0.4)"
            shadowBlur={1}
          />
          <Line
            points={[cropX, cropY + (2 * cropH) / 3, cropX + cropW, cropY + (2 * cropH) / 3]}
            stroke="rgba(255, 255, 255, 0.45)"
            strokeWidth={0.8}
            shadowColor="rgba(0,0,0,0.4)"
            shadowBlur={1}
          />
        </Group>
      )}

      {cropGridGuide === 'grid' && (
        <Group listening={false}>
          {[1, 2, 3, 4, 5].map((i) => (
            <React.Fragment key={i}>
              <Line
                points={[cropX + (i * cropW) / 6, cropY, cropX + (i * cropW) / 6, cropY + cropH]}
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth={0.7}
              />
              <Line
                points={[cropX, cropY + (i * cropH) / 6, cropX + cropW, cropY + (i * cropH) / 6]}
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth={0.7}
              />
            </React.Fragment>
          ))}
        </Group>
      )}

      {/* 3. Crop Window Outline (Crisp 1px White Line with Outer Shadow) */}
      <Rect
        x={cropX}
        y={cropY}
        width={cropW}
        height={cropH}
        stroke="#ffffff"
        strokeWidth={1}
        shadowColor="rgba(0, 0, 0, 0.6)"
        shadowBlur={2}
        listening={false}
      />

      {/* 4. Center Drag Area (Move Crop Window) */}
      <Rect
        x={cropX}
        y={cropY}
        width={cropW}
        height={cropH}
        fill="transparent"
        onMouseEnter={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = 'move';
        }}
        onMouseLeave={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = 'default';
        }}
        onPointerDown={(e) => startDrag('move', e)}
      />

      {/* 5. Sleek Professional Corner Brackets (L-Shapes) */}
      {/* Top-Left Bracket */}
      <Group listening={false}>
        <Line
          points={[cropX, cropY + bracketLen, cropX, cropY, cropX + bracketLen, cropY]}
          stroke="#ffffff"
          strokeWidth={bracketThickness}
          shadowColor="rgba(0,0,0,0.8)"
          shadowBlur={2}
          lineCap="square"
          lineJoin="miter"
        />
      </Group>
      {/* Top-Left Hit Target */}
      <Rect
        x={cropX - hitTargetSize / 2}
        y={cropY - hitTargetSize / 2}
        width={hitTargetSize}
        height={hitTargetSize}
        fill="transparent"
        onMouseEnter={(e) => {
          const c = e.target.getStage()?.container();
          if (c) c.style.cursor = 'nwse-resize';
        }}
        onMouseLeave={(e) => {
          const c = e.target.getStage()?.container();
          if (c) c.style.cursor = 'default';
        }}
        onPointerDown={(e) => startDrag('nw', e)}
      />

      {/* Top-Right Bracket */}
      <Group listening={false}>
        <Line
          points={[cropX + cropW - bracketLen, cropY, cropX + cropW, cropY, cropX + cropW, cropY + bracketLen]}
          stroke="#ffffff"
          strokeWidth={bracketThickness}
          shadowColor="rgba(0,0,0,0.8)"
          shadowBlur={2}
          lineCap="square"
          lineJoin="miter"
        />
      </Group>
      {/* Top-Right Hit Target */}
      <Rect
        x={cropX + cropW - hitTargetSize / 2}
        y={cropY - hitTargetSize / 2}
        width={hitTargetSize}
        height={hitTargetSize}
        fill="transparent"
        onMouseEnter={(e) => {
          const c = e.target.getStage()?.container();
          if (c) c.style.cursor = 'nesw-resize';
        }}
        onMouseLeave={(e) => {
          const c = e.target.getStage()?.container();
          if (c) c.style.cursor = 'default';
        }}
        onPointerDown={(e) => startDrag('ne', e)}
      />

      {/* Bottom-Right Bracket */}
      <Group listening={false}>
        <Line
          points={[cropX + cropW, cropY + cropH - bracketLen, cropX + cropW, cropY + cropH, cropX + cropW - bracketLen, cropY + cropH]}
          stroke="#ffffff"
          strokeWidth={bracketThickness}
          shadowColor="rgba(0,0,0,0.8)"
          shadowBlur={2}
          lineCap="square"
          lineJoin="miter"
        />
      </Group>
      {/* Bottom-Right Hit Target */}
      <Rect
        x={cropX + cropW - hitTargetSize / 2}
        y={cropY + cropH - hitTargetSize / 2}
        width={hitTargetSize}
        height={hitTargetSize}
        fill="transparent"
        onMouseEnter={(e) => {
          const c = e.target.getStage()?.container();
          if (c) c.style.cursor = 'nwse-resize';
        }}
        onMouseLeave={(e) => {
          const c = e.target.getStage()?.container();
          if (c) c.style.cursor = 'default';
        }}
        onPointerDown={(e) => startDrag('se', e)}
      />

      {/* Bottom-Left Bracket */}
      <Group listening={false}>
        <Line
          points={[cropX + bracketLen, cropY + cropH, cropX, cropY + cropH, cropX, cropY + cropH - bracketLen]}
          stroke="#ffffff"
          strokeWidth={bracketThickness}
          shadowColor="rgba(0,0,0,0.8)"
          shadowBlur={2}
          lineCap="square"
          lineJoin="miter"
        />
      </Group>
      {/* Bottom-Left Hit Target */}
      <Rect
        x={cropX - hitTargetSize / 2}
        y={cropY + cropH - hitTargetSize / 2}
        width={hitTargetSize}
        height={hitTargetSize}
        fill="transparent"
        onMouseEnter={(e) => {
          const c = e.target.getStage()?.container();
          if (c) c.style.cursor = 'nesw-resize';
        }}
        onMouseLeave={(e) => {
          const c = e.target.getStage()?.container();
          if (c) c.style.cursor = 'default';
        }}
        onPointerDown={(e) => startDrag('sw', e)}
      />

      {/* 6. Refined Mid-Edge Grips (Minimalist Hairline Bars) */}
      {/* Top Edge (N) */}
      <Group listening={false}>
        <Rect
          x={cropX + cropW / 2 - 8}
          y={cropY - 1.25}
          width={16}
          height={2.5}
          fill="#ffffff"
          shadowColor="rgba(0,0,0,0.8)"
          shadowBlur={2}
        />
      </Group>
      <Rect
        x={cropX + cropW / 2 - 12}
        y={cropY - hitTargetSize / 2}
        width={24}
        height={hitTargetSize}
        fill="transparent"
        onMouseEnter={(e) => {
          const c = e.target.getStage()?.container();
          if (c) c.style.cursor = 'ns-resize';
        }}
        onMouseLeave={(e) => {
          const c = e.target.getStage()?.container();
          if (c) c.style.cursor = 'default';
        }}
        onPointerDown={(e) => startDrag('n', e)}
      />

      {/* Bottom Edge (S) */}
      <Group listening={false}>
        <Rect
          x={cropX + cropW / 2 - 8}
          y={cropY + cropH - 1.25}
          width={16}
          height={2.5}
          fill="#ffffff"
          shadowColor="rgba(0,0,0,0.8)"
          shadowBlur={2}
        />
      </Group>
      <Rect
        x={cropX + cropW / 2 - 12}
        y={cropY + cropH - hitTargetSize / 2}
        width={24}
        height={hitTargetSize}
        fill="transparent"
        onMouseEnter={(e) => {
          const c = e.target.getStage()?.container();
          if (c) c.style.cursor = 'ns-resize';
        }}
        onMouseLeave={(e) => {
          const c = e.target.getStage()?.container();
          if (c) c.style.cursor = 'default';
        }}
        onPointerDown={(e) => startDrag('s', e)}
      />

      {/* Left Edge (W) */}
      <Group listening={false}>
        <Rect
          x={cropX - 1.25}
          y={cropY + cropH / 2 - 8}
          width={2.5}
          height={16}
          fill="#ffffff"
          shadowColor="rgba(0,0,0,0.8)"
          shadowBlur={2}
        />
      </Group>
      <Rect
        x={cropX - hitTargetSize / 2}
        y={cropY + cropH / 2 - 12}
        width={hitTargetSize}
        height={24}
        fill="transparent"
        onMouseEnter={(e) => {
          const c = e.target.getStage()?.container();
          if (c) c.style.cursor = 'ew-resize';
        }}
        onMouseLeave={(e) => {
          const c = e.target.getStage()?.container();
          if (c) c.style.cursor = 'default';
        }}
        onPointerDown={(e) => startDrag('w', e)}
      />

      {/* Right Edge (E) */}
      <Group listening={false}>
        <Rect
          x={cropX + cropW - 1.25}
          y={cropY + cropH / 2 - 8}
          width={2.5}
          height={16}
          fill="#ffffff"
          shadowColor="rgba(0,0,0,0.8)"
          shadowBlur={2}
        />
      </Group>
      <Rect
        x={cropX + cropW - hitTargetSize / 2}
        y={cropY + cropH / 2 - 12}
        width={hitTargetSize}
        height={24}
        fill="transparent"
        onMouseEnter={(e) => {
          const c = e.target.getStage()?.container();
          if (c) c.style.cursor = 'ew-resize';
        }}
        onMouseLeave={(e) => {
          const c = e.target.getStage()?.container();
          if (c) c.style.cursor = 'default';
        }}
        onPointerDown={(e) => startDrag('e', e)}
      />
    </Group>
  );
};
