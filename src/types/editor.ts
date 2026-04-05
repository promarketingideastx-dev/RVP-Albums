export type ElementType = 'image' | 'text' | 'shape' | 'decoration' | 'group';

export interface PhotoAdjustments {
   exposure: number;
   lightContrast: number;
   highlights: number;
   shadows: number;
   whites: number;
   blacks: number;
   temperature: number;
   tint: number;
   vibrance: number;
   saturation: number;
   texture: number;
   clarity: number;
   dehaze: number;
   vignette: number;
   grain: number;
   blur?: number;
   hsl: {
      reds: { h: number; s: number; l: number };
      oranges: { h: number; s: number; l: number };
      yellows: { h: number; s: number; l: number };
      greens: { h: number; s: number; l: number };
      aquas: { h: number; s: number; l: number };
      blues: { h: number; s: number; l: number };
      purples: { h: number; s: number; l: number };
      magentas: { h: number; s: number; l: number };
   };
}

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
  isAutoLayoutManaged?: boolean; // Phase 7.H: Managed by auto layout bounding box strictly
  stageType?: 'staged' | 'layout' | 'free'; // Phase 8.D FIX: Explicit structural staging mode discriminator 
  editorialRole?: 'hero' | 'supporting' | 'filler' | 'auto'; // Phase 7.J: User Control Override
  assignmentReason?: string; // Phase 7.K: Explanable Editor Feedback
  assetId?: string; // Phase 7.H: Primary connection to uploaded external image pool
  photoFilter?: string;
  filterIntensity?: number;
  photoAdjustments?: Partial<PhotoAdjustments>;
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

export type LayoutFamily = 'hero-dominant' | 'balanced-story' | 'column-story' | 'mosaic' | 'geometric';

export interface AutoLayoutSlot {
  id: string; // Independent structural generic id
  x_mm: number;
  y_mm: number;
  w_mm: number;
  h_mm: number;
  aspectRatio: number;
  assignedAssetId?: string; // Phase 7.H: Connected image metadata decoupled
  assignedElementId?: string; // Phase 7.H: Visual bridge mapping optional
  role?: 'hero' | 'supporting' | 'filler'; // Phase 7.I: Intelligence hierarchy discriminator
  assignmentReason?: string; // Phase 7.K: Exportable reason explaining algorithm decisions
}

export interface SpreadAutoLayout {
  isActive: boolean;
  variantId: string;
  slots: AutoLayoutSlot[];
  seed?: number;
  mode?: 'geometric' | 'editorial' | 'fundy-masonry-experimental'; // Phase 9A/10/11 Extension
  fundyStrategy?: 'PRIORITIZE_HEIGHT' | 'PRIORITIZE_WIDTH' | 'FORCE_TWO_COLUMNS' | 'CHAOTIC_BALANCED';
  fundyGapMm?: number;
  fundyFlipHorizontal?: boolean;
}

export interface Spread {
  id: string;
  elements: EditorElement[];
  bg_color: string;
  autoBookManaged?: boolean; // Phase 14: Discriminates pristine autobook layouts from manually handcrafted spaces
  bg_config?: SpreadBackgroundConfig; // Phase 7.G.9: Advanced Gradient spread backgrounds
  guides?: SpreadGuide[]; // Phase 7.G.12: Native alignment geometry boundaries
  autoLayout?: SpreadAutoLayout; // Phase 7.H: Auto Layout Engine Structural bounds 
  status?: 'empty' | 'staging' | 'designed' | 'completed'; // Phase Final A: Explict Structural Pagination Status
}

export interface Size {
  w_mm: number;
  h_mm: number;
}

export interface AssetMetadata {
   fileName?: string;
   fileType?: string;
   widthPx?: number;
   heightPx?: number;
   orientation?: 'landscape' | 'portrait' | 'square';
   aspectRatio?: number;
   captureTimestamp?: number; // Fetched from EXIF/lastModified
   sourceOrderIndex: number;
   manualPriority?: number;
   metadataStatus?: 'raw' | 'enriched' | 'failed';
}

export interface ProjectAsset {
  id: string;
  name: string;
  previewUrl?: string; // local blob URL
  originalUrl?: string;
  previewBlobId?: string; // IndexedDB internal ref
  originalBlobId?: string;
  rating?: number; // 0-5 stars
  isFavorite?: boolean;
  width?: number; // Phase 7.H: Extracted native photo dimensions
  height?: number; // Phase 7.H: Extracted native photo dimensions
  orientation?: 'landscape' | 'portrait' | 'square'; // Phase 7.H: Calculated auto layout logic parameter
  aspectRatio?: number; // Phase 7.I: Intrinsic ratio preservation
  visualWeight?: number; // Phase 7.I: Narrative mapping
  isWide?: boolean;
  isTall?: boolean;
  metadata?: AssetMetadata; // Phase 15: Sequencing Intelligence Layer
}

export interface PhotoMetadata {
  elementId: string;
  width: number;
  height: number;
  aspectRatio: number;
  orientation: 'landscape' | 'portrait' | 'square';
  originalIndex: number;
  visualWeight?: number;
  editorialRole?: 'hero' | 'supporting' | 'filler' | 'auto';
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
  totalSpreads?: number; // Phase Final A: Fixed album capacity bounds natively
  spreads: Spread[];
  assets?: ProjectAsset[];
  sequenceMode?: 'ORIGINAL_ORDER' | 'CHRONOLOGICAL' | 'MANUAL_PRIORITY'; // Phase 16
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
