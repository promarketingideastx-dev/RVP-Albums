export type ElementType = 'image' | 'text' | 'shape';

// Coordinates strictly in absolute mm. Precision mapping is applied in presentation components.
export interface EditorElement {
  id: string;
  type: ElementType;
  shapeType?: 'rect' | 'ellipse'; // Block 4: Shape native discriminator
  fillColor?: string; // Block 4: Hex shape color
  src?: string; // e.g., image URL
  previewUrl?: string; // Phase 2: Low resolution (e.g. canvas blob) to prevent memory crash
  originalUrl?: string; // Phase 2: High resolution original file for print export
  x_mm: number;
  y_mm: number;
  w_mm: number;
  h_mm: number;
  rotation_deg: number;
  zIndex: number;
}

export interface Spread {
  id: string;
  elements: EditorElement[];
  bg_color: string;
}

export interface Size {
  w_mm: number;
  h_mm: number;
}

export interface EditorProject {
  id: string;
  size: Size; // Total size (e.g. 500x250)
  bleed_mm: number;
  safe_zone_mm: number;
  spreads: Spread[];
}
