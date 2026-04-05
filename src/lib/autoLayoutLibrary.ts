import { AutoLayoutSlot, LayoutFamily } from '@/types/editor';
import { v4 as uuidv4 } from 'uuid';

interface GenerateLayoutProps {
  photoCount: number;
  width: number; // Spread width (mm)
  height: number; // Spread height (mm)
  margin?: number; // Spread margin (mm)
  gap?: number; // Gap between photos (mm)
  seed?: number; // Variant randomization seed
  preferredFamily?: LayoutFamily | 'geometric'; // Phase 7.I.2 constraints coupling 
}

interface LayoutVariant {
  slots: AutoLayoutSlot[];
  variantId: string;
  family: LayoutFamily;
}

export interface AutoLayoutResult extends LayoutVariant {
  totalAvailableVariants: number;
  maxSupportedPhotos: number;
}

// Generates structural geometries isolated strictly from semantic bindings natively. Let's UI layer execute filtering based on Families.
export function generateAutoLayout({ 
  photoCount, 
  width, 
  height, 
  margin = 15, 
  gap = 10,
  seed = 0,
  preferredFamily = 'geometric'
}: GenerateLayoutProps): AutoLayoutResult {
  
  const innerWidth = width - (margin * 2);
  const innerHeight = height - (margin * 2);
  const MAX_SUPPORTED = 8;
  const countToUse = Math.min(photoCount, MAX_SUPPORTED);
  
  const createSlot = (x: number, y: number, w: number, h: number, role?: 'hero' | 'supporting' | 'filler'): AutoLayoutSlot => ({
    id: uuidv4(),
    x_mm: x,
    y_mm: y,
    w_mm: w,
    h_mm: h,
    aspectRatio: w / h,
    role
  });

  const variantsList: LayoutVariant[] = [];

  if (countToUse === 1 || countToUse === 0) {
    variantsList.push(
      { variantId: 'single-padded', family: 'hero-dominant', slots: [ createSlot(margin, margin, innerWidth, innerHeight, 'hero') ] },
      { variantId: 'single-full-bleed', family: 'hero-dominant', slots: [ createSlot(0, 0, width, height, 'hero') ] },
      { variantId: 'single-square-center', family: 'hero-dominant', slots: [ createSlot(width/2 - innerHeight/2, margin, innerHeight, innerHeight, 'hero') ] },
      { variantId: 'single-landscape-center', family: 'hero-dominant', slots: [ createSlot(margin, height/2 - (innerWidth*0.66)/2, innerWidth, innerWidth * 0.66, 'hero') ] }
    );
  } else if (countToUse === 2) {
    variantsList.push(
      { variantId: 'split-2-hero-left', family: 'hero-dominant', slots: [ createSlot(margin, margin, (innerWidth * 0.65) - gap/2, innerHeight, 'hero'), createSlot(margin + (innerWidth * 0.65) + gap/2, margin, (innerWidth * 0.35) - gap/2, innerHeight, 'supporting') ] },
      { variantId: 'split-2-padded-h', family: 'balanced-story', slots: [ createSlot(margin, margin, (innerWidth - gap) / 2, innerHeight, 'supporting'), createSlot(margin + (innerWidth - gap) / 2 + gap, margin, (innerWidth - gap) / 2, innerHeight, 'supporting') ] },
      { variantId: 'split-2-full-h', family: 'balanced-story', slots: [ createSlot(0, 0, (width - gap) / 2, height, 'supporting'), createSlot((width - gap) / 2 + gap, 0, (width - gap) / 2, height, 'supporting') ] },
      { variantId: 'split-2-padded-v', family: 'column-story', slots: [ createSlot(margin, margin, innerWidth, (innerHeight - gap)/2, 'supporting'), createSlot(margin, margin + (innerHeight - gap)/2 + gap, innerWidth, (innerHeight - gap)/2, 'supporting') ] }
    );
  } else if (countToUse === 3) {
    const w3 = (innerWidth - (gap * 2)) / 3;
    const h2 = (innerHeight - gap) / 2;
    variantsList.push(
      { variantId: 'hero-left-2-right', family: 'hero-dominant', slots: [ createSlot(margin, margin, (innerWidth/2) - gap/2, innerHeight, 'hero'), createSlot(margin + (innerWidth/2) + gap/2, margin, (innerWidth/2) - gap/2, h2, 'supporting'), createSlot(margin + (innerWidth/2) + gap/2, margin + h2 + gap, (innerWidth/2) - gap/2, h2, 'supporting') ] },
      { variantId: 'hero-top-2-bottom', family: 'hero-dominant', slots: [ createSlot(margin, margin, innerWidth, h2, 'hero'), createSlot(margin, margin + h2 + gap, (innerWidth/2) - gap/2, h2, 'supporting'), createSlot(margin + (innerWidth/2) + gap/2, margin + h2 + gap, (innerWidth/2) - gap/2, h2, 'supporting') ] },
      { variantId: '2-left-hero-right', family: 'hero-dominant', slots: [ createSlot(margin, margin, (innerWidth/2) - gap/2, h2, 'supporting'), createSlot(margin, margin + h2 + gap, (innerWidth/2) - gap/2, h2, 'supporting'), createSlot(margin + (innerWidth/2) + gap/2, margin, (innerWidth/2) - gap/2, innerHeight, 'hero') ] },
      { variantId: 'grid-3-cols', family: 'column-story', slots: [ createSlot(margin, margin, w3, innerHeight, 'supporting'), createSlot(margin + w3 + gap, margin, w3, innerHeight, 'supporting'), createSlot(margin + (w3 * 2) + (gap * 2), margin, w3, innerHeight, 'supporting') ] }
    );
  } else if (countToUse === 4) {
    const w2 = (innerWidth - gap) / 2;
    const h2 = (innerHeight - gap) / 2;
    const w3 = (innerWidth - (gap * 2)) / 3;
    const hHero = (innerHeight * 0.65) - gap/2;
    const hSmall = (innerHeight * 0.35) - gap/2;
    const wHero = (innerWidth * 0.65) - gap/2;
    const wSmall = (innerWidth * 0.35) - gap/2;
    variantsList.push(
      { variantId: 'hero-1-top-3-bottom', family: 'hero-dominant', slots: [ createSlot(margin, margin, innerWidth, hHero, 'hero'), createSlot(margin, margin + hHero + gap, w3, hSmall, 'filler'), createSlot(margin + w3 + gap, margin + hHero + gap, w3, hSmall, 'filler'), createSlot(margin + (w3*2) + (gap*2), margin + hHero + gap, w3, hSmall, 'filler') ] },
      { variantId: 'hero-left-3-right', family: 'hero-dominant', slots: [ createSlot(margin, margin, wHero, innerHeight, 'hero'), createSlot(margin + wHero + gap, margin, wSmall, (innerHeight-(gap*2))/3, 'filler'), createSlot(margin + wHero + gap, margin + (innerHeight-(gap*2))/3 + gap, wSmall, (innerHeight-(gap*2))/3, 'filler'), createSlot(margin + wHero + gap, margin + ((innerHeight-(gap*2))/3)*2 + (gap*2), wSmall, (innerHeight-(gap*2))/3, 'filler') ] },
      { variantId: '3-top-1-hero-bottom', family: 'hero-dominant', slots: [ createSlot(margin, margin, w3, hSmall, 'filler'), createSlot(margin + w3 + gap, margin, w3, hSmall, 'filler'), createSlot(margin + (w3*2) + (gap*2), margin, w3, hSmall, 'filler'), createSlot(margin, margin + hSmall + gap, innerWidth, hHero, 'hero') ] },
      { variantId: 'grid-2x2', family: 'balanced-story', slots: [ createSlot(margin, margin, w2, h2, 'supporting'), createSlot(margin + w2 + gap, margin, w2, h2, 'supporting'), createSlot(margin, margin + h2 + gap, w2, h2, 'supporting'), createSlot(margin + w2 + gap, margin + h2 + gap, w2, h2, 'supporting') ] }
    );
  } else if (countToUse === 5) {
    const w2 = (innerWidth - gap) / 2;
    const w3 = (innerWidth - (gap * 2)) / 3;
    const h2 = (innerHeight - gap) / 2;
    variantsList.push(
      { variantId: 'hero-1-left-4-right-grid', family: 'hero-dominant', slots: [ createSlot(margin, margin, w2, innerHeight, 'hero'), createSlot(margin + w2 + gap, margin, w2/2 - gap/2, h2, 'filler'), createSlot(margin + w2 + gap + w2/2 + gap/2, margin, w2/2 - gap/2, h2, 'filler'), createSlot(margin + w2 + gap, margin + h2 + gap, w2/2 - gap/2, h2, 'filler'), createSlot(margin + w2 + gap + w2/2 + gap/2, margin + h2 + gap, w2/2 - gap/2, h2, 'filler') ] },
      { variantId: 'grid-3-top-2-bottom', family: 'mosaic', slots: [ createSlot(margin, margin, w3, h2, 'supporting'), createSlot(margin + w3 + gap, margin, w3, h2, 'supporting'), createSlot(margin + (w3*2) + (gap*2), margin, w3, h2, 'supporting'), createSlot(margin + (innerWidth/2 - w2/2) - (gap/2 + w2/2), margin + h2 + gap, w2, h2, 'supporting'), createSlot(margin + (innerWidth/2) + gap/2, margin + h2 + gap, w2, h2, 'supporting') ] },
      { variantId: 'grid-2-top-3-bottom', family: 'mosaic', slots: [ createSlot(margin + (innerWidth/2 - w2/2) - (gap/2 + w2/2), margin, w2, h2, 'supporting'), createSlot(margin + (innerWidth/2) + gap/2, margin, w2, h2, 'supporting'), createSlot(margin, margin + h2 + gap, w3, h2, 'supporting'), createSlot(margin + w3 + gap, margin + h2 + gap, w3, h2, 'supporting'), createSlot(margin + (w3*2) + (gap*2), margin + h2 + gap, w3, h2, 'supporting') ] }
    );
  } else if (countToUse === 6) {
    const w3 = (innerWidth - (gap * 2)) / 3;
    const h2 = (innerHeight - gap) / 2;
    variantsList.push(
      { variantId: 'hero-top-5-bottom', family: 'hero-dominant', slots: [ createSlot(margin, margin, innerWidth, h2, 'hero'), createSlot(margin, margin + h2 + gap, innerWidth/5 - gap*0.8, h2, 'filler'), createSlot(margin + (innerWidth/5) + gap*0.2, margin + h2 + gap, innerWidth/5 - gap*0.8, h2, 'filler'), createSlot(margin + (innerWidth/5)*2 + gap*1.2, margin + h2 + gap, innerWidth/5 - gap*0.8, h2, 'filler'), createSlot(margin + (innerWidth/5)*3 + gap*2.2, margin + h2 + gap, innerWidth/5 - gap*0.8, h2, 'filler'), createSlot(margin + (innerWidth/5)*4 + gap*3.2, margin + h2 + gap, innerWidth/5 - gap*0.8, h2, 'filler')] },
      { variantId: 'grid-3x2', family: 'balanced-story', slots: [ createSlot(margin, margin, w3, h2, 'supporting'), createSlot(margin + w3 + gap, margin, w3, h2, 'supporting'), createSlot(margin + (w3*2) + (gap*2), margin, w3, h2, 'supporting'), createSlot(margin, margin + h2 + gap, w3, h2, 'filler'), createSlot(margin + w3 + gap, margin + h2 + gap, w3, h2, 'filler'), createSlot(margin + (w3*2) + (gap*2), margin + h2 + gap, w3, h2, 'filler') ] }
    );
  } else if (countToUse === 7) {
    const w3 = (innerWidth - (gap * 2)) / 3;
    const w4 = (innerWidth - (gap * 3)) / 4;
    const h2 = (innerHeight - gap) / 2;
    variantsList.push(
      { variantId: 'grid-3-top-4-bottom', family: 'mosaic', slots: [ createSlot(margin, margin, w3, h2, 'supporting'), createSlot(margin + w3 + gap, margin, w3, h2, 'supporting'), createSlot(margin + (w3*2) + (gap*2), margin, w3, h2, 'supporting'), createSlot(margin, margin + h2 + gap, w4, h2, 'filler'), createSlot(margin + w4 + gap, margin + h2 + gap, w4, h2, 'filler'), createSlot(margin + (w4*2) + (gap*2), margin + h2 + gap, w4, h2, 'filler'), createSlot(margin + (w4*3) + (gap*3), margin + h2 + gap, w4, h2, 'filler') ] },
      { variantId: 'grid-4-top-3-bottom', family: 'mosaic', slots: [ createSlot(margin, margin, w4, h2, 'filler'), createSlot(margin + w4 + gap, margin, w4, h2, 'filler'), createSlot(margin + (w4*2) + (gap*2), margin, w4, h2, 'filler'), createSlot(margin + (w4*3) + (gap*3), margin, w4, h2, 'filler'), createSlot(margin, margin + h2 + gap, w3, h2, 'supporting'), createSlot(margin + w3 + gap, margin + h2 + gap, w3, h2, 'supporting'), createSlot(margin + (w3*2) + (gap*2), margin + h2 + gap, w3, h2, 'supporting') ] }
    );
  } else if (countToUse === 8) {
    const w4 = (innerWidth - (gap * 3)) / 4;
    const h2 = (innerHeight - gap) / 2;
    variantsList.push(
      { variantId: 'grid-4x2', family: 'balanced-story', slots: [ createSlot(margin, margin, w4, h2, 'filler'), createSlot(margin + w4 + gap, margin, w4, h2, 'filler'), createSlot(margin + (w4*2) + (gap*2), margin, w4, h2, 'filler'), createSlot(margin + (w4*3) + (gap*3), margin, w4, h2, 'filler'), createSlot(margin, margin + h2 + gap, w4, h2, 'filler'), createSlot(margin + w4 + gap, margin + h2 + gap, w4, h2, 'filler'), createSlot(margin + (w4*2) + (gap*2), margin + h2 + gap, w4, h2, 'filler'), createSlot(margin + (w4*3) + (gap*3), margin + h2 + gap, w4, h2, 'filler') ] }
    );
  }

  // Fallback
  if (variantsList.length === 0) {
     variantsList.push({
       variantId: 'fallback-single-padded',
       family: 'hero-dominant',
       slots: [ createSlot(margin, margin, innerWidth, innerHeight, 'hero') ]
     });
  }

  // Phase 7.I.2: Restrict Variants specifically based on calculated Semantic Family constraints (unless raw geometric mode requested)
  const filteredVariants = (preferredFamily && preferredFamily !== 'geometric') 
    ? variantsList.filter(v => v.family === preferredFamily)
    : variantsList;
    
  const validVariants = filteredVariants.length > 0 ? filteredVariants : variantsList; // Secure Fallback preventing array exhaustion

  const safeIndex = seed % validVariants.length;
  const selectedVariant = validVariants[safeIndex];

  return {
     ...selectedVariant,
     totalAvailableVariants: validVariants.length,
     maxSupportedPhotos: MAX_SUPPORTED
  };
}
