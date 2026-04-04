export type ElementType = 'image' | 'text' | 'shape' | 'decoration';

// Coordinates strictly in absolute mm. Precision mapping is applied in presentation components.
export interface EditorElement {
  id: string;
  type: ElementType;
  shapeType?: 'rect' | 'ellipse'; // Block 4: Shape native discriminator
  fillColor?: string; // Block 4: Hex shape color
  src?: string; // e.g., image URL
  previewUrl?: string; // Phase 2: Low resolution (e.g. canvas blob) to prevent memory crash
  originalUrl?: string; // Phase 2: High resolution original file for print export
  previewBlobId?: string; // Phase 3 Block 1: IndexedDB blob reference
  originalBlobId?: string; // Phase 3 Block 1: IndexedDB blob reference
  libraryCategory?: string; // Phase 7.G: Category discriminator strictly for decoration variants
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

export interface ProjectAsset {
  id: string;
  name: string;
  previewUrl?: string;
  originalUrl?: string;
  previewBlobId?: string;
  originalBlobId?: string;
  rating?: number; // 0-5 stars
  isFavorite?: boolean;
}

export interface EditorProject {
  id: string;
  title: string;
  type: string;
  labPresetId: string;
  labPresetName: string;
  storageMode: 'local';
  createdAt: string;
  updatedAt: string;
  projectVersion: number;
  size: Size; // Total size (e.g. 500x250)
  bleed_mm: number;
  safe_zone_mm: number;
  spreads: Spread[];
  assets?: ProjectAsset[];
}
