import { EditorElement } from '@/types/editor';

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Normalizes an angle in degrees into [0, 360) while keeping 360 as 360 when explicitly set.
 */
export function normalizeAngle360(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  if (deg === 360) return 360;
  const mod = ((deg % 360) + 360) % 360;
  return Number(mod.toFixed(2));
}

/**
 * Computes the world position (in spread mm) of a normalized local pivot (u, v) in [0, 1]^2
 * for a Konva element whose origin is at top-left (x_mm, y_mm) rotated by rotation_deg.
 */
export function getWorldPivotPoint(
  el: Pick<EditorElement, 'x_mm' | 'y_mm' | 'w_mm' | 'h_mm' | 'rotation_deg' | 'scale'>,
  pivotU: number,
  pivotV: number
): Point2D {
  const s = el.scale || 1;
  const w = (el.w_mm || 0) * s;
  const h = (el.h_mm || 0) * s;
  const rad = ((el.rotation_deg || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const localX = pivotU * w;
  const localY = pivotV * h;

  return {
    x: el.x_mm + localX * cos - localY * sin,
    y: el.y_mm + localX * sin + localY * cos,
  };
}

/**
 * Computes the new { x_mm, y_mm, rotation_deg } when rotating an element around
 * a specific normalized pivot (pivotU, pivotV) so that the world pivot position
 * remains 100% stationary.
 *
 * - Operation A (Center Image Rotation): pivotU = 0.5, pivotV = 0.5
 * - Operation B (Anchor Point Rotation): pivotU = el.pivotX ?? 0, pivotV = el.pivotY ?? 0
 */
export function computeRotationAroundPivot(
  el: Pick<EditorElement, 'x_mm' | 'y_mm' | 'w_mm' | 'h_mm' | 'rotation_deg' | 'scale'>,
  newAngleDeg: number,
  pivotU: number,
  pivotV: number,
  fixedWorldPivot?: Point2D
): { x_mm: number; y_mm: number; rotation_deg: number } {
  const worldPivot = fixedWorldPivot ?? getWorldPivotPoint(el, pivotU, pivotV);
  const s = el.scale || 1;
  const w = (el.w_mm || 0) * s;
  const h = (el.h_mm || 0) * s;

  const rad = (newAngleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const localX = pivotU * w;
  const localY = pivotV * h;

  const nextX = worldPivot.x - (localX * cos - localY * sin);
  const nextY = worldPivot.y - (localX * sin + localY * cos);

  return {
    x_mm: Number(nextX.toFixed(3)),
    y_mm: Number(nextY.toFixed(3)),
    rotation_deg: Number(newAngleDeg.toFixed(2)),
  };
}

/**
 * Computes the new { x_mm, y_mm, scale } when scaling an element proportionally
 * around a normalized pivot (defaulting to geometric center 0.5, 0.5).
 */
export function computeScaleAroundPivot(
  el: Pick<EditorElement, 'x_mm' | 'y_mm' | 'w_mm' | 'h_mm' | 'rotation_deg' | 'scale'>,
  newScale: number,
  pivotU: number = 0.5,
  pivotV: number = 0.5,
  fixedWorldPivot?: Point2D
): { x_mm: number; y_mm: number; scale: number } {
  const safeScale = Math.max(0.05, newScale);
  const worldPivot = fixedWorldPivot ?? getWorldPivotPoint(el, pivotU, pivotV);
  const w = (el.w_mm || 0) * safeScale;
  const h = (el.h_mm || 0) * safeScale;

  const rad = ((el.rotation_deg || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const localX = pivotU * w;
  const localY = pivotV * h;

  const nextX = worldPivot.x - (localX * cos - localY * sin);
  const nextY = worldPivot.y - (localX * sin + localY * cos);

  return {
    x_mm: Number(nextX.toFixed(3)),
    y_mm: Number(nextY.toFixed(3)),
    scale: Number(safeScale.toFixed(3)),
  };
}

/**
 * Converts a world point (in spread mm) into the element's normalized local coordinates (u, v).
 */
export function worldPointToNormalizedPivot(
  el: Pick<EditorElement, 'x_mm' | 'y_mm' | 'w_mm' | 'h_mm' | 'rotation_deg' | 'scale'>,
  worldX: number,
  worldY: number
): { pivotX: number; pivotY: number } {
  const s = el.scale || 1;
  const w = Math.max(1, (el.w_mm || 1) * s);
  const h = Math.max(1, (el.h_mm || 1) * s);
  const rad = -((el.rotation_deg || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const dx = worldX - el.x_mm;
  const dy = worldY - el.y_mm;

  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;

  const u = Math.max(-0.5, Math.min(1.5, localX / w));
  const v = Math.max(-0.5, Math.min(1.5, localY / h));

  return {
    pivotX: Number(u.toFixed(3)),
    pivotY: Number(v.toFixed(3)),
  };
}

/**
 * Exact geometric hit-test in spread millimeters for rotated rectangles, images, texts, and ellipses.
 */
export function isPointInsideElement(el: EditorElement, worldX_mm: number, worldY_mm: number): boolean {
  if (el.type === 'group' || el.visible === false) return false;

  const s = el.scale || 1;
  const w = Math.max(2, (el.w_mm || 20) * s);
  const h = Math.max(2, (el.h_mm || 20) * s);

  const rad = -((el.rotation_deg || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const dx = worldX_mm - el.x_mm;
  const dy = worldY_mm - el.y_mm;

  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;

  if (el.type === 'shape' && el.shapeType === 'ellipse') {
    const rx = w / 2;
    const ry = h / 2;
    if (rx <= 0 || ry <= 0) return false;
    const nx = (localX - rx) / rx;
    const ny = (localY - ry) / ry;
    return nx * nx + ny * ny <= 1;
  }

  return localX >= 0 && localX <= w && localY >= 0 && localY <= h;
}

/**
 * Finds the topmost visible element at (worldX_mm, worldY_mm) respecting descending zIndex order.
 */
export function findTopmostElementAtPoint(
  elements: EditorElement[],
  worldX_mm: number,
  worldY_mm: number,
  options: { includeLocked?: boolean } = {}
): EditorElement | null {
  const { includeLocked = false } = options;

  // Sort from highest zIndex (topmost visually) to lowest zIndex
  const sortedDesc = [...elements].sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0));

  for (const el of sortedDesc) {
    if (el.type === 'group') continue;
    if (el.visible === false) continue;
    if (!includeLocked && el.locked) continue;

    if (el.groupId) {
      const parent = elements.find((g) => g.id === el.groupId);
      if (parent && parent.visible === false) continue;
      if (!includeLocked && parent && parent.locked) continue;
    }

    if (isPointInsideElement(el, worldX_mm, worldY_mm)) {
      return el;
    }
  }

  return null;
}
