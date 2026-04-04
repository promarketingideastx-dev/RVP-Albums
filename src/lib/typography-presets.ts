export type TextHierarchy = 'h1' | 'h2' | 'body' | 'small';
export type PresetCategory = 'wedding' | 'quinceanera' | 'modern' | 'minimal' | 'formal';

export interface TypographyPreset {
  id: string;
  name: string;
  category: PresetCategory;
  lockedFonts: boolean;
  fonts: {
    h1: string;
    h2: string;
    body: string;
    small: string;
  };
  styles?: {
    h1: { letterSpacing?: number; lineHeight?: number; textTransform?: 'uppercase' | 'lowercase' | 'none' };
    h2: { letterSpacing?: number; lineHeight?: number; textTransform?: 'uppercase' | 'lowercase' | 'none' };
    body: { letterSpacing?: number; lineHeight?: number; textTransform?: 'uppercase' | 'lowercase' | 'none' };
    small: { letterSpacing?: number; lineHeight?: number; textTransform?: 'uppercase' | 'lowercase' | 'none' };
  };
  alignment: 'center' | 'left' | 'right' | 'justify';
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export const TYPOGRAPHY_PRESETS: TypographyPreset[] = [
  {
    id: 'luxury_wedding_classic',
    name: 'Luxury Wedding Classic',
    category: 'wedding',
    lockedFonts: true,
    fonts: {
      h1: 'Great Vibes',
      h2: 'Cormorant Garamond',
      body: 'Cormorant Garamond',
      small: 'Cormorant Garamond'
    },
    styles: {
      h1: { letterSpacing: 0, lineHeight: 1.2, textTransform: 'none' },
      h2: { letterSpacing: 2, lineHeight: 1.4, textTransform: 'uppercase' },
      body: { letterSpacing: 0, lineHeight: 1.5, textTransform: 'none' },
      small: { letterSpacing: 1, lineHeight: 1.5, textTransform: 'uppercase' }
    },
    alignment: 'center',
    colorPalette: { primary: '#2C3E50', secondary: '#7F8C8D', accent: '#D4AF37' }
  },
  {
    id: 'modern_elegant',
    name: 'Modern Elegant',
    category: 'modern',
    lockedFonts: true,
    fonts: {
      h1: 'Playfair Display',
      h2: 'Montserrat',
      body: 'Montserrat',
      small: 'Montserrat'
    },
    styles: {
      h1: { letterSpacing: 0, lineHeight: 1.1, textTransform: 'none' },
      h2: { letterSpacing: 3, lineHeight: 1.3, textTransform: 'uppercase' },
      body: { letterSpacing: 0.5, lineHeight: 1.6, textTransform: 'none' },
      small: { letterSpacing: 1.5, lineHeight: 1.6, textTransform: 'uppercase' }
    },
    alignment: 'center',
    colorPalette: { primary: '#000000', secondary: '#555555', accent: '#B76E79' }
  },
  {
    id: 'romantic_script',
    name: 'Romantic Script',
    category: 'wedding',
    lockedFonts: true,
    fonts: {
      h1: 'Alex Brush',
      h2: 'EB Garamond',
      body: 'EB Garamond',
      small: 'EB Garamond'
    },
    styles: {
      h1: { letterSpacing: 0, lineHeight: 1.3, textTransform: 'none' },
      h2: { letterSpacing: 1.5, lineHeight: 1.4, textTransform: 'none' },
      body: { letterSpacing: 0, lineHeight: 1.5, textTransform: 'none' },
      small: { letterSpacing: 1, lineHeight: 1.5, textTransform: 'uppercase' }
    },
    alignment: 'center',
    colorPalette: { primary: '#4A4A4A', secondary: '#8A8A8A', accent: '#FADADD' }
  },
  {
    id: 'minimal_clean',
    name: 'Minimal Clean',
    category: 'minimal',
    lockedFonts: true,
    fonts: {
      h1: 'Inter',
      h2: 'Inter',
      body: 'Inter',
      small: 'Inter'
    },
    styles: {
      h1: { letterSpacing: -1, lineHeight: 1.0, textTransform: 'none' },
      h2: { letterSpacing: 2, lineHeight: 1.2, textTransform: 'uppercase' },
      body: { letterSpacing: 0, lineHeight: 1.5, textTransform: 'none' },
      small: { letterSpacing: 1, lineHeight: 1.5, textTransform: 'uppercase' }
    },
    alignment: 'left',
    colorPalette: { primary: '#111111', secondary: '#666666', accent: '#EEEEEE' }
  },
  {
    id: 'editorial_vogue',
    name: 'Editorial Vogue',
    category: 'formal',
    lockedFonts: true,
    fonts: {
      h1: 'Bodoni Moda',
      h2: 'Lato',
      body: 'Lato',
      small: 'Lato'
    },
    styles: {
      h1: { letterSpacing: -0.5, lineHeight: 1.0, textTransform: 'uppercase' },
      h2: { letterSpacing: 4, lineHeight: 1.4, textTransform: 'uppercase' },
      body: { letterSpacing: 0, lineHeight: 1.6, textTransform: 'none' },
      small: { letterSpacing: 2, lineHeight: 1.6, textTransform: 'uppercase' }
    },
    alignment: 'center',
    colorPalette: { primary: '#000000', secondary: '#333333', accent: '#C0C0C0' }
  },
  {
    id: 'quinceanera_princess',
    name: 'Quinceañera Princess',
    category: 'quinceanera',
    lockedFonts: true,
    fonts: {
      h1: 'Pinyon Script',
      h2: 'Lora',
      body: 'Lora',
      small: 'Lora'
    },
    styles: {
      h1: { letterSpacing: 0, lineHeight: 1.2, textTransform: 'none' },
      h2: { letterSpacing: 1.5, lineHeight: 1.4, textTransform: 'uppercase' },
      body: { letterSpacing: 0, lineHeight: 1.6, textTransform: 'none' },
      small: { letterSpacing: 0.5, lineHeight: 1.6, textTransform: 'uppercase' }
    },
    alignment: 'center',
    colorPalette: { primary: '#D81B60', secondary: '#F48FB1', accent: '#FFDF00' }
  },
  {
    id: 'golden_luxury',
    name: 'Golden Luxury',
    category: 'formal',
    lockedFonts: true,
    fonts: {
      h1: 'Cinzel Decorative',
      h2: 'Cinzel',
      body: 'Cardo',
      small: 'Cinzel'
    },
    styles: {
      h1: { letterSpacing: 1, lineHeight: 1.1, textTransform: 'uppercase' },
      h2: { letterSpacing: 3, lineHeight: 1.3, textTransform: 'uppercase' },
      body: { letterSpacing: 0, lineHeight: 1.5, textTransform: 'none' },
      small: { letterSpacing: 2, lineHeight: 1.5, textTransform: 'uppercase' }
    },
    alignment: 'center',
    colorPalette: { primary: '#D4AF37', secondary: '#996515', accent: '#000000' }
  },
  {
    id: 'soft_pastel',
    name: 'Soft Pastel',
    category: 'quinceanera',
    lockedFonts: true,
    fonts: {
      h1: 'Dancing Script',
      h2: 'Merriweather',
      body: 'Merriweather',
      small: 'Merriweather'
    },
    styles: {
      h1: { letterSpacing: 0, lineHeight: 1.3, textTransform: 'none' },
      h2: { letterSpacing: 1, lineHeight: 1.4, textTransform: 'none' },
      body: { letterSpacing: 0, lineHeight: 1.6, textTransform: 'none' },
      small: { letterSpacing: 1, lineHeight: 1.6, textTransform: 'uppercase' }
    },
    alignment: 'center',
    colorPalette: { primary: '#98FF98', secondary: '#AEC6CF', accent: '#FFB7B2' }
  },
  {
    id: 'classic_formal',
    name: 'Classic Formal',
    category: 'formal',
    lockedFonts: true,
    fonts: {
      h1: 'Tangerine',
      h2: 'Crimson Text',
      body: 'Crimson Text',
      small: 'Crimson Text'
    },
    styles: {
      h1: { letterSpacing: 0, lineHeight: 1.1, textTransform: 'none' },
      h2: { letterSpacing: 1.5, lineHeight: 1.3, textTransform: 'uppercase' },
      body: { letterSpacing: 0, lineHeight: 1.5, textTransform: 'none' },
      small: { letterSpacing: 1, lineHeight: 1.5, textTransform: 'uppercase' }
    },
    alignment: 'center',
    colorPalette: { primary: '#000080', secondary: '#4169E1', accent: '#FFFFFF' }
  },
  {
    id: 'modern_minimal_black',
    name: 'Modern Minimal Black',
    category: 'minimal',
    lockedFonts: true,
    fonts: {
      h1: 'Outfit',
      h2: 'Outfit',
      body: 'Outfit',
      small: 'Outfit'
    },
    styles: {
      h1: { letterSpacing: -2, lineHeight: 1.0, textTransform: 'uppercase' },
      h2: { letterSpacing: 5, lineHeight: 1.2, textTransform: 'uppercase' },
      body: { letterSpacing: 0, lineHeight: 1.5, textTransform: 'none' },
      small: { letterSpacing: 2, lineHeight: 1.5, textTransform: 'uppercase' }
    },
    alignment: 'left',
    colorPalette: { primary: '#000000', secondary: '#333333', accent: '#CCCCCC' }
  }
];
