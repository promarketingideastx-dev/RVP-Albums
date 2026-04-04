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
  sourceType?: 'default' | 'user-decoration'; // Phase 7.G.2.A: Stable local decoration rendering persistence discriminator
  sourceId?: string; // Phase 7.G.2.A: Strict persistence reference decoupled from runtime objectURLs
  opacity?: number; // Phase 7.G.4: Editable transparency multiplier (0 to 1) 
  scale?: number; // Phase 7.G.4: Generic internal dimension multiplier decoupling generic bounding constraints
  color?: string; // Phase 7.G.4: Configurable base shape/stroke overlay styling mapping hex variants 
  variant?: string; // Phase 7.G.4: Strict variant discriminator supporting parametric overrides
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowBlur?: number;
  shadowColor?: string;
  shadowOpacity?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: string;
  isBold?: boolean;
  isItalic?: boolean;
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

export type CustomCategory = {
  id: string;
  name: string;
  createdAt: number;
};

export type UserDecoration = {
  id: string;
  categoryId: string;
  blob: Blob;
  preview: string; // objectURL resolving local Native DB blob representation
  createdAt: number;
};
