export type ElementType = 'image' | 'text' | 'shape' | 'decoration' | 'group';

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
  borderRadius?: number; // Phase 7.G.9: Border radius element manually applying masks
  isolateFromGlobalStyles?: boolean; // Phase 7.G.10: Manual decoupling from cascading style overrides
  blendMode?: string;
  visible?: boolean; // Phase 7.G.6.C: Visibility cascade mapping
  locked?: boolean; // Phase 7.G.6.C: Selection and Dragging constraint 
  groupId?: string; // Phase 7.G.6.C: Advanced generic nested folders
  isCollapsed?: boolean; // Phase 7.G.6.C: Folder structural bounds
  layerName?: string; // Phase 7.G.6.C: UI-level naming override
  photoFilter?: string;
  filterIntensity?: number;
  text?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: string;
  isBold?: boolean;
  isItalic?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  textRole?: 'h1' | 'h2' | 'body' | 'small'; // Phase 7.I: Typography Hierarchy Mapping
  lockedFonts?: boolean; // Phase 7.I: Binding localized overrides matching presets
  letterSpacing?: number;
  lineHeight?: number;
  textTransform?: 'uppercase' | 'lowercase' | 'none';
  x_mm: number;
  y_mm: number;
  w_mm: number;
  h_mm: number;
  rotation_deg: number;
  zIndex: number;
}

export interface SpreadBackgroundConfig {
  type: 'none' | 'solid' | 'linear' | 'radial';
  color1?: string; 
  color2?: string; 
  gradientAngle?: number; 
  radialSize?: number; 
  radialCenterX?: number; 
  radialCenterY?: number; 
}

export interface SpreadGuide {
  id: string;
  orientation: 'horizontal' | 'vertical';
  position_mm: number;
  color?: string; // Default visual rendering
  locked?: boolean;
}

export interface Spread {
  id: string;
  elements: EditorElement[];
  bg_color: string;
  bg_config?: SpreadBackgroundConfig; // Phase 7.G.9: Advanced Gradient spread backgrounds
  guides?: SpreadGuide[]; // Phase 7.G.12: Native alignment geometry boundaries
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

export interface GlobalImageStyles {
  strokeEnabled?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowBlur?: number;
  shadowOpacity?: number;
  borderRadiusEnabled?: boolean;
  borderRadius?: number;
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
  typographyPresetId?: string; // Phase 7.I: Document-scope active typography pattern
  globalImageStyles?: GlobalImageStyles; // Phase 7.G.9: Project-level cascading default styles
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
