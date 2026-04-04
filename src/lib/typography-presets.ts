export type TextHierarchy = 'h1' | 'h2' | 'body' | 'small';
export type PresetCategory = 'wedding' | 'quinceanera' | 'modern' | 'minimal' | 'formal' | 'editorial' | 'classic';

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
,
{
  "id": "preset-011",
  "name": "Luxury preset-011",
  "lockedFonts": true,
  "alignment": "center",
  "category": "modern",
  "fonts": {
    "h1": "Lato",
    "h2": "Poppins",
    "body": "Oswald",
    "small": "Oswald"
  },
  "styles": {
    "h1": {
      "letterSpacing": 1,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 3,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#1a1a1a",
    "secondary": "#4a4a4a",
    "accent": "#d4af37"
  }
},
{
  "id": "preset-012",
  "name": "Luxury preset-012",
  "lockedFonts": true,
  "alignment": "center",
  "category": "minimal",
  "fonts": {
    "h1": "Poppins",
    "h2": "Raleway",
    "body": "Poppins",
    "small": "Poppins"
  },
  "styles": {
    "h1": {
      "letterSpacing": 4,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 9,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#222f3e",
    "secondary": "#576574",
    "accent": "#ee5253"
  }
},
{
  "id": "preset-013",
  "name": "Luxury preset-013",
  "lockedFonts": true,
  "alignment": "center",
  "category": "editorial",
  "fonts": {
    "h1": "Cormorant Garamond",
    "h2": "Cormorant Garamond",
    "body": "Raleway",
    "small": "Raleway"
  },
  "styles": {
    "h1": {
      "letterSpacing": 1,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 1,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#4b4b4b",
    "secondary": "#7d7d7d",
    "accent": "#c0392b"
  }
},
{
  "id": "preset-014",
  "name": "Luxury preset-014",
  "lockedFonts": true,
  "alignment": "center",
  "category": "classic",
  "fonts": {
    "h1": "Merriweather",
    "h2": "PT Serif",
    "body": "Lato",
    "small": "Lato"
  },
  "styles": {
    "h1": {
      "letterSpacing": 3,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 3,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#2d3436",
    "secondary": "#636e72",
    "accent": "#00b894"
  }
},
{
  "id": "preset-015",
  "name": "Luxury preset-015",
  "lockedFonts": true,
  "alignment": "center",
  "category": "editorial",
  "fonts": {
    "h1": "Lora",
    "h2": "Bodoni Moda",
    "body": "Oswald",
    "small": "Oswald"
  },
  "styles": {
    "h1": {
      "letterSpacing": 2,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 2,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#000000",
    "secondary": "#666666",
    "accent": "#ff9f43"
  }
},
{
  "id": "preset-016",
  "name": "Luxury preset-016",
  "lockedFonts": true,
  "alignment": "center",
  "category": "editorial",
  "fonts": {
    "h1": "Merriweather",
    "h2": "Bodoni Moda",
    "body": "Montserrat",
    "small": "Montserrat"
  },
  "styles": {
    "h1": {
      "letterSpacing": 1,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 7,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#1a1a1a",
    "secondary": "#4a4a4a",
    "accent": "#d4af37"
  }
},
{
  "id": "preset-017",
  "name": "Luxury preset-017",
  "lockedFonts": true,
  "alignment": "center",
  "category": "classic",
  "fonts": {
    "h1": "Cormorant Garamond",
    "h2": "Cinzel",
    "body": "Outfit",
    "small": "Outfit"
  },
  "styles": {
    "h1": {
      "letterSpacing": 3,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 8,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#2c3e50",
    "secondary": "#34495e",
    "accent": "#e74c3c"
  }
},
{
  "id": "preset-018",
  "name": "Luxury preset-018",
  "lockedFonts": true,
  "alignment": "center",
  "category": "wedding",
  "fonts": {
    "h1": "Great Vibes",
    "h2": "Roboto",
    "body": "Cormorant Garamond",
    "small": "Cormorant Garamond"
  },
  "styles": {
    "h1": {
      "letterSpacing": 2,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 0,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#2c3e50",
    "secondary": "#34495e",
    "accent": "#e74c3c"
  }
},
{
  "id": "preset-019",
  "name": "Luxury preset-019",
  "lockedFonts": true,
  "alignment": "center",
  "category": "minimal",
  "fonts": {
    "h1": "Montserrat",
    "h2": "Outfit",
    "body": "Lato",
    "small": "Lato"
  },
  "styles": {
    "h1": {
      "letterSpacing": 0,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 5,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#111111",
    "secondary": "#555555",
    "accent": "#8e44ad"
  }
},
{
  "id": "preset-020",
  "name": "Luxury preset-020",
  "lockedFonts": true,
  "alignment": "center",
  "category": "minimal",
  "fonts": {
    "h1": "Lato",
    "h2": "Raleway",
    "body": "Oswald",
    "small": "Oswald"
  },
  "styles": {
    "h1": {
      "letterSpacing": 1,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 9,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#2c3e50",
    "secondary": "#34495e",
    "accent": "#e74c3c"
  }
},
{
  "id": "preset-021",
  "name": "Luxury preset-021",
  "lockedFonts": true,
  "alignment": "center",
  "category": "modern",
  "fonts": {
    "h1": "Lato",
    "h2": "Lato",
    "body": "Outfit",
    "small": "Outfit"
  },
  "styles": {
    "h1": {
      "letterSpacing": 2,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 5,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#2c3e50",
    "secondary": "#34495e",
    "accent": "#e74c3c"
  }
},
{
  "id": "preset-022",
  "name": "Luxury preset-022",
  "lockedFonts": true,
  "alignment": "center",
  "category": "editorial",
  "fonts": {
    "h1": "Cinzel",
    "h2": "Cinzel",
    "body": "Poppins",
    "small": "Poppins"
  },
  "styles": {
    "h1": {
      "letterSpacing": 1,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 3,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#4b4b4b",
    "secondary": "#7d7d7d",
    "accent": "#c0392b"
  }
},
{
  "id": "preset-023",
  "name": "Luxury preset-023",
  "lockedFonts": true,
  "alignment": "center",
  "category": "classic",
  "fonts": {
    "h1": "Cormorant Garamond",
    "h2": "Merriweather",
    "body": "Poppins",
    "small": "Poppins"
  },
  "styles": {
    "h1": {
      "letterSpacing": 0,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 0,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#1e272e",
    "secondary": "#485460",
    "accent": "#ffdd59"
  }
},
{
  "id": "preset-024",
  "name": "Luxury preset-024",
  "lockedFonts": true,
  "alignment": "center",
  "category": "editorial",
  "fonts": {
    "h1": "Playfair Display",
    "h2": "PT Serif",
    "body": "Montserrat",
    "small": "Montserrat"
  },
  "styles": {
    "h1": {
      "letterSpacing": 1,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 0,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#111111",
    "secondary": "#555555",
    "accent": "#8e44ad"
  }
},
{
  "id": "preset-025",
  "name": "Luxury preset-025",
  "lockedFonts": true,
  "alignment": "center",
  "category": "classic",
  "fonts": {
    "h1": "Playfair Display",
    "h2": "Playfair Display",
    "body": "Lato",
    "small": "Lato"
  },
  "styles": {
    "h1": {
      "letterSpacing": 2,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 1,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#4b4b4b",
    "secondary": "#7d7d7d",
    "accent": "#c0392b"
  }
},
{
  "id": "preset-026",
  "name": "Luxury preset-026",
  "lockedFonts": true,
  "alignment": "center",
  "category": "modern",
  "fonts": {
    "h1": "Raleway",
    "h2": "Roboto",
    "body": "Lato",
    "small": "Lato"
  },
  "styles": {
    "h1": {
      "letterSpacing": 1,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 5,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#1e272e",
    "secondary": "#485460",
    "accent": "#ffdd59"
  }
},
{
  "id": "preset-027",
  "name": "Luxury preset-027",
  "lockedFonts": true,
  "alignment": "center",
  "category": "quinceanera",
  "fonts": {
    "h1": "Pinyon Script",
    "h2": "Raleway",
    "body": "Bodoni Moda",
    "small": "Bodoni Moda"
  },
  "styles": {
    "h1": {
      "letterSpacing": 1,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 1,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#222f3e",
    "secondary": "#576574",
    "accent": "#ee5253"
  }
},
{
  "id": "preset-028",
  "name": "Luxury preset-028",
  "lockedFonts": true,
  "alignment": "center",
  "category": "wedding",
  "fonts": {
    "h1": "Allura",
    "h2": "Inter",
    "body": "Lora",
    "small": "Lora"
  },
  "styles": {
    "h1": {
      "letterSpacing": 4,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 1,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#222f3e",
    "secondary": "#576574",
    "accent": "#ee5253"
  }
},
{
  "id": "preset-029",
  "name": "Luxury preset-029",
  "lockedFonts": true,
  "alignment": "center",
  "category": "editorial",
  "fonts": {
    "h1": "Playfair Display",
    "h2": "Cinzel",
    "body": "Roboto",
    "small": "Roboto"
  },
  "styles": {
    "h1": {
      "letterSpacing": 2,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 9,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#222f3e",
    "secondary": "#576574",
    "accent": "#ee5253"
  }
},
{
  "id": "preset-030",
  "name": "Luxury preset-030",
  "lockedFonts": true,
  "alignment": "center",
  "category": "editorial",
  "fonts": {
    "h1": "Playfair Display",
    "h2": "Lora",
    "body": "Roboto",
    "small": "Roboto"
  },
  "styles": {
    "h1": {
      "letterSpacing": 4,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 2,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#111111",
    "secondary": "#555555",
    "accent": "#8e44ad"
  }
},
{
  "id": "preset-031",
  "name": "Luxury preset-031",
  "lockedFonts": true,
  "alignment": "center",
  "category": "editorial",
  "fonts": {
    "h1": "Cinzel",
    "h2": "Playfair Display",
    "body": "Outfit",
    "small": "Outfit"
  },
  "styles": {
    "h1": {
      "letterSpacing": 2,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 5,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#2c3e50",
    "secondary": "#34495e",
    "accent": "#e74c3c"
  }
},
{
  "id": "preset-032",
  "name": "Luxury preset-032",
  "lockedFonts": true,
  "alignment": "center",
  "category": "minimal",
  "fonts": {
    "h1": "Poppins",
    "h2": "Montserrat",
    "body": "Outfit",
    "small": "Outfit"
  },
  "styles": {
    "h1": {
      "letterSpacing": 3,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 1,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#111111",
    "secondary": "#555555",
    "accent": "#8e44ad"
  }
},
{
  "id": "preset-033",
  "name": "Luxury preset-033",
  "lockedFonts": true,
  "alignment": "center",
  "category": "quinceanera",
  "fonts": {
    "h1": "Allura",
    "h2": "Inter",
    "body": "Bodoni Moda",
    "small": "Bodoni Moda"
  },
  "styles": {
    "h1": {
      "letterSpacing": 4,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 7,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#1a1a1a",
    "secondary": "#4a4a4a",
    "accent": "#d4af37"
  }
},
{
  "id": "preset-034",
  "name": "Luxury preset-034",
  "lockedFonts": true,
  "alignment": "center",
  "category": "wedding",
  "fonts": {
    "h1": "Dancing Script",
    "h2": "Inter",
    "body": "Cormorant Garamond",
    "small": "Cormorant Garamond"
  },
  "styles": {
    "h1": {
      "letterSpacing": 1,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 9,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#2c3e50",
    "secondary": "#34495e",
    "accent": "#e74c3c"
  }
},
{
  "id": "preset-035",
  "name": "Luxury preset-035",
  "lockedFonts": true,
  "alignment": "center",
  "category": "classic",
  "fonts": {
    "h1": "Cormorant Garamond",
    "h2": "Cinzel",
    "body": "Inter",
    "small": "Inter"
  },
  "styles": {
    "h1": {
      "letterSpacing": 4,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 2,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#1a1a1a",
    "secondary": "#4a4a4a",
    "accent": "#d4af37"
  }
},
{
  "id": "preset-036",
  "name": "Luxury preset-036",
  "lockedFonts": true,
  "alignment": "center",
  "category": "wedding",
  "fonts": {
    "h1": "Alex Brush",
    "h2": "Poppins",
    "body": "PT Serif",
    "small": "PT Serif"
  },
  "styles": {
    "h1": {
      "letterSpacing": 2,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 9,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#4b4b4b",
    "secondary": "#7d7d7d",
    "accent": "#c0392b"
  }
},
{
  "id": "preset-037",
  "name": "Luxury preset-037",
  "lockedFonts": true,
  "alignment": "center",
  "category": "wedding",
  "fonts": {
    "h1": "Allura",
    "h2": "Lato",
    "body": "Playfair Display",
    "small": "Playfair Display"
  },
  "styles": {
    "h1": {
      "letterSpacing": 2,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 2,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#1a1a1a",
    "secondary": "#4a4a4a",
    "accent": "#d4af37"
  }
},
{
  "id": "preset-038",
  "name": "Luxury preset-038",
  "lockedFonts": true,
  "alignment": "center",
  "category": "editorial",
  "fonts": {
    "h1": "Bodoni Moda",
    "h2": "Playfair Display",
    "body": "Oswald",
    "small": "Oswald"
  },
  "styles": {
    "h1": {
      "letterSpacing": 3,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 8,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#1e272e",
    "secondary": "#485460",
    "accent": "#ffdd59"
  }
},
{
  "id": "preset-039",
  "name": "Luxury preset-039",
  "lockedFonts": true,
  "alignment": "center",
  "category": "minimal",
  "fonts": {
    "h1": "Inter",
    "h2": "Raleway",
    "body": "Raleway",
    "small": "Raleway"
  },
  "styles": {
    "h1": {
      "letterSpacing": 0,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 6,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#4b4b4b",
    "secondary": "#7d7d7d",
    "accent": "#c0392b"
  }
},
{
  "id": "preset-040",
  "name": "Luxury preset-040",
  "lockedFonts": true,
  "alignment": "center",
  "category": "quinceanera",
  "fonts": {
    "h1": "Allura",
    "h2": "Outfit",
    "body": "PT Serif",
    "small": "PT Serif"
  },
  "styles": {
    "h1": {
      "letterSpacing": 4,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 1,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#1e272e",
    "secondary": "#485460",
    "accent": "#ffdd59"
  }
},
{
  "id": "preset-041",
  "name": "Luxury preset-041",
  "lockedFonts": true,
  "alignment": "center",
  "category": "modern",
  "fonts": {
    "h1": "Outfit",
    "h2": "Oswald",
    "body": "Inter",
    "small": "Inter"
  },
  "styles": {
    "h1": {
      "letterSpacing": 4,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 7,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#2c3e50",
    "secondary": "#34495e",
    "accent": "#e74c3c"
  }
},
{
  "id": "preset-042",
  "name": "Luxury preset-042",
  "lockedFonts": true,
  "alignment": "center",
  "category": "classic",
  "fonts": {
    "h1": "Cormorant Garamond",
    "h2": "Cormorant Garamond",
    "body": "Inter",
    "small": "Inter"
  },
  "styles": {
    "h1": {
      "letterSpacing": 0,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 1,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#1e272e",
    "secondary": "#485460",
    "accent": "#ffdd59"
  }
},
{
  "id": "preset-043",
  "name": "Luxury preset-043",
  "lockedFonts": true,
  "alignment": "center",
  "category": "quinceanera",
  "fonts": {
    "h1": "Pinyon Script",
    "h2": "Poppins",
    "body": "Cormorant Garamond",
    "small": "Cormorant Garamond"
  },
  "styles": {
    "h1": {
      "letterSpacing": 1,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 4,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#000000",
    "secondary": "#666666",
    "accent": "#ff9f43"
  }
},
{
  "id": "preset-044",
  "name": "Luxury preset-044",
  "lockedFonts": true,
  "alignment": "center",
  "category": "quinceanera",
  "fonts": {
    "h1": "Great Vibes",
    "h2": "Roboto",
    "body": "Cormorant Garamond",
    "small": "Cormorant Garamond"
  },
  "styles": {
    "h1": {
      "letterSpacing": 3,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 7,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#4b4b4b",
    "secondary": "#7d7d7d",
    "accent": "#c0392b"
  }
},
{
  "id": "preset-045",
  "name": "Luxury preset-045",
  "lockedFonts": true,
  "alignment": "center",
  "category": "wedding",
  "fonts": {
    "h1": "Allura",
    "h2": "Poppins",
    "body": "Playfair Display",
    "small": "Playfair Display"
  },
  "styles": {
    "h1": {
      "letterSpacing": 4,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 1,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#111111",
    "secondary": "#555555",
    "accent": "#8e44ad"
  }
},
{
  "id": "preset-046",
  "name": "Luxury preset-046",
  "lockedFonts": true,
  "alignment": "center",
  "category": "minimal",
  "fonts": {
    "h1": "Poppins",
    "h2": "Raleway",
    "body": "Montserrat",
    "small": "Montserrat"
  },
  "styles": {
    "h1": {
      "letterSpacing": 3,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 6,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#222f3e",
    "secondary": "#576574",
    "accent": "#ee5253"
  }
},
{
  "id": "preset-047",
  "name": "Luxury preset-047",
  "lockedFonts": true,
  "alignment": "center",
  "category": "minimal",
  "fonts": {
    "h1": "Outfit",
    "h2": "Inter",
    "body": "Outfit",
    "small": "Outfit"
  },
  "styles": {
    "h1": {
      "letterSpacing": 4,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 2,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#2c3e50",
    "secondary": "#34495e",
    "accent": "#e74c3c"
  }
},
{
  "id": "preset-048",
  "name": "Luxury preset-048",
  "lockedFonts": true,
  "alignment": "center",
  "category": "quinceanera",
  "fonts": {
    "h1": "Allura",
    "h2": "Roboto",
    "body": "Lora",
    "small": "Lora"
  },
  "styles": {
    "h1": {
      "letterSpacing": 2,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 5,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#222f3e",
    "secondary": "#576574",
    "accent": "#ee5253"
  }
},
{
  "id": "preset-049",
  "name": "Luxury preset-049",
  "lockedFonts": true,
  "alignment": "center",
  "category": "minimal",
  "fonts": {
    "h1": "Poppins",
    "h2": "Outfit",
    "body": "Oswald",
    "small": "Oswald"
  },
  "styles": {
    "h1": {
      "letterSpacing": 0,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 0,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#4b4b4b",
    "secondary": "#7d7d7d",
    "accent": "#c0392b"
  }
},
{
  "id": "preset-050",
  "name": "Luxury preset-050",
  "lockedFonts": true,
  "alignment": "center",
  "category": "wedding",
  "fonts": {
    "h1": "Tangerine",
    "h2": "Inter",
    "body": "Merriweather",
    "small": "Merriweather"
  },
  "styles": {
    "h1": {
      "letterSpacing": 3,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 8,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#111111",
    "secondary": "#555555",
    "accent": "#8e44ad"
  }
},
{
  "id": "preset-051",
  "name": "Luxury preset-051",
  "lockedFonts": true,
  "alignment": "center",
  "category": "quinceanera",
  "fonts": {
    "h1": "Great Vibes",
    "h2": "Outfit",
    "body": "Playfair Display",
    "small": "Playfair Display"
  },
  "styles": {
    "h1": {
      "letterSpacing": 0,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 4,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#4b4b4b",
    "secondary": "#7d7d7d",
    "accent": "#c0392b"
  }
},
{
  "id": "preset-052",
  "name": "Luxury preset-052",
  "lockedFonts": true,
  "alignment": "center",
  "category": "editorial",
  "fonts": {
    "h1": "Cinzel",
    "h2": "PT Serif",
    "body": "Raleway",
    "small": "Raleway"
  },
  "styles": {
    "h1": {
      "letterSpacing": 1,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 0,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#222f3e",
    "secondary": "#576574",
    "accent": "#ee5253"
  }
},
{
  "id": "preset-053",
  "name": "Luxury preset-053",
  "lockedFonts": true,
  "alignment": "center",
  "category": "editorial",
  "fonts": {
    "h1": "Cormorant Garamond",
    "h2": "Merriweather",
    "body": "Roboto",
    "small": "Roboto"
  },
  "styles": {
    "h1": {
      "letterSpacing": 3,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 4,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#111111",
    "secondary": "#555555",
    "accent": "#8e44ad"
  }
},
{
  "id": "preset-054",
  "name": "Luxury preset-054",
  "lockedFonts": true,
  "alignment": "center",
  "category": "minimal",
  "fonts": {
    "h1": "Inter",
    "h2": "Outfit",
    "body": "Oswald",
    "small": "Oswald"
  },
  "styles": {
    "h1": {
      "letterSpacing": 2,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 0,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#2d3436",
    "secondary": "#636e72",
    "accent": "#00b894"
  }
},
{
  "id": "preset-055",
  "name": "Luxury preset-055",
  "lockedFonts": true,
  "alignment": "center",
  "category": "editorial",
  "fonts": {
    "h1": "PT Serif",
    "h2": "Cormorant Garamond",
    "body": "Outfit",
    "small": "Outfit"
  },
  "styles": {
    "h1": {
      "letterSpacing": 1,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 4,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#000000",
    "secondary": "#666666",
    "accent": "#ff9f43"
  }
},
{
  "id": "preset-056",
  "name": "Luxury preset-056",
  "lockedFonts": true,
  "alignment": "center",
  "category": "wedding",
  "fonts": {
    "h1": "Tangerine",
    "h2": "Roboto",
    "body": "PT Serif",
    "small": "PT Serif"
  },
  "styles": {
    "h1": {
      "letterSpacing": 1,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 2,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#111111",
    "secondary": "#555555",
    "accent": "#8e44ad"
  }
},
{
  "id": "preset-057",
  "name": "Luxury preset-057",
  "lockedFonts": true,
  "alignment": "center",
  "category": "classic",
  "fonts": {
    "h1": "Cormorant Garamond",
    "h2": "Lora",
    "body": "Lato",
    "small": "Lato"
  },
  "styles": {
    "h1": {
      "letterSpacing": 1,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 3,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#2c3e50",
    "secondary": "#34495e",
    "accent": "#e74c3c"
  }
},
{
  "id": "preset-058",
  "name": "Luxury preset-058",
  "lockedFonts": true,
  "alignment": "center",
  "category": "quinceanera",
  "fonts": {
    "h1": "Pinyon Script",
    "h2": "Roboto",
    "body": "Cinzel",
    "small": "Cinzel"
  },
  "styles": {
    "h1": {
      "letterSpacing": 2,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 6,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#1e272e",
    "secondary": "#485460",
    "accent": "#ffdd59"
  }
},
{
  "id": "preset-059",
  "name": "Luxury preset-059",
  "lockedFonts": true,
  "alignment": "center",
  "category": "minimal",
  "fonts": {
    "h1": "Outfit",
    "h2": "Roboto",
    "body": "Oswald",
    "small": "Oswald"
  },
  "styles": {
    "h1": {
      "letterSpacing": 0,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 7,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#2d3436",
    "secondary": "#636e72",
    "accent": "#00b894"
  }
},
{
  "id": "preset-060",
  "name": "Luxury preset-060",
  "lockedFonts": true,
  "alignment": "center",
  "category": "quinceanera",
  "fonts": {
    "h1": "Great Vibes",
    "h2": "Inter",
    "body": "Cormorant Garamond",
    "small": "Cormorant Garamond"
  },
  "styles": {
    "h1": {
      "letterSpacing": 4,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 2,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#1e272e",
    "secondary": "#485460",
    "accent": "#ffdd59"
  }
},
{
  "id": "preset-061",
  "name": "Luxury preset-061",
  "lockedFonts": true,
  "alignment": "center",
  "category": "editorial",
  "fonts": {
    "h1": "Cormorant Garamond",
    "h2": "Cormorant Garamond",
    "body": "Oswald",
    "small": "Oswald"
  },
  "styles": {
    "h1": {
      "letterSpacing": 3,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 3,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#1a1a1a",
    "secondary": "#4a4a4a",
    "accent": "#d4af37"
  }
},
{
  "id": "preset-062",
  "name": "Luxury preset-062",
  "lockedFonts": true,
  "alignment": "center",
  "category": "minimal",
  "fonts": {
    "h1": "Raleway",
    "h2": "Montserrat",
    "body": "Montserrat",
    "small": "Montserrat"
  },
  "styles": {
    "h1": {
      "letterSpacing": 0,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 1,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#1a1a1a",
    "secondary": "#4a4a4a",
    "accent": "#d4af37"
  }
},
{
  "id": "preset-063",
  "name": "Luxury preset-063",
  "lockedFonts": true,
  "alignment": "center",
  "category": "editorial",
  "fonts": {
    "h1": "Merriweather",
    "h2": "PT Serif",
    "body": "Montserrat",
    "small": "Montserrat"
  },
  "styles": {
    "h1": {
      "letterSpacing": 1,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 2,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#2d3436",
    "secondary": "#636e72",
    "accent": "#00b894"
  }
},
{
  "id": "preset-064",
  "name": "Luxury preset-064",
  "lockedFonts": true,
  "alignment": "center",
  "category": "wedding",
  "fonts": {
    "h1": "Dancing Script",
    "h2": "Roboto",
    "body": "Cormorant Garamond",
    "small": "Cormorant Garamond"
  },
  "styles": {
    "h1": {
      "letterSpacing": 1,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 4,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#111111",
    "secondary": "#555555",
    "accent": "#8e44ad"
  }
},
{
  "id": "preset-065",
  "name": "Luxury preset-065",
  "lockedFonts": true,
  "alignment": "center",
  "category": "wedding",
  "fonts": {
    "h1": "Tangerine",
    "h2": "Lato",
    "body": "Lora",
    "small": "Lora"
  },
  "styles": {
    "h1": {
      "letterSpacing": 3,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 1,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#4b4b4b",
    "secondary": "#7d7d7d",
    "accent": "#c0392b"
  }
},
{
  "id": "preset-066",
  "name": "Luxury preset-066",
  "lockedFonts": true,
  "alignment": "center",
  "category": "quinceanera",
  "fonts": {
    "h1": "Allura",
    "h2": "Montserrat",
    "body": "Playfair Display",
    "small": "Playfair Display"
  },
  "styles": {
    "h1": {
      "letterSpacing": 4,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 5,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#2c3e50",
    "secondary": "#34495e",
    "accent": "#e74c3c"
  }
},
{
  "id": "preset-067",
  "name": "Luxury preset-067",
  "lockedFonts": true,
  "alignment": "center",
  "category": "modern",
  "fonts": {
    "h1": "Outfit",
    "h2": "Lato",
    "body": "Roboto",
    "small": "Roboto"
  },
  "styles": {
    "h1": {
      "letterSpacing": 4,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 7,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#1e272e",
    "secondary": "#485460",
    "accent": "#ffdd59"
  }
},
{
  "id": "preset-068",
  "name": "Luxury preset-068",
  "lockedFonts": true,
  "alignment": "center",
  "category": "minimal",
  "fonts": {
    "h1": "Raleway",
    "h2": "Poppins",
    "body": "Poppins",
    "small": "Poppins"
  },
  "styles": {
    "h1": {
      "letterSpacing": 1,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 5,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#1e272e",
    "secondary": "#485460",
    "accent": "#ffdd59"
  }
},
{
  "id": "preset-069",
  "name": "Luxury preset-069",
  "lockedFonts": true,
  "alignment": "center",
  "category": "wedding",
  "fonts": {
    "h1": "Dancing Script",
    "h2": "Poppins",
    "body": "Lora",
    "small": "Lora"
  },
  "styles": {
    "h1": {
      "letterSpacing": 2,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 1,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#1e272e",
    "secondary": "#485460",
    "accent": "#ffdd59"
  }
},
{
  "id": "preset-070",
  "name": "Luxury preset-070",
  "lockedFonts": true,
  "alignment": "center",
  "category": "modern",
  "fonts": {
    "h1": "Oswald",
    "h2": "Poppins",
    "body": "Inter",
    "small": "Inter"
  },
  "styles": {
    "h1": {
      "letterSpacing": 4,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 2,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#1e272e",
    "secondary": "#485460",
    "accent": "#ffdd59"
  }
},
{
  "id": "preset-071",
  "name": "Luxury preset-071",
  "lockedFonts": true,
  "alignment": "center",
  "category": "wedding",
  "fonts": {
    "h1": "Alex Brush",
    "h2": "Outfit",
    "body": "Merriweather",
    "small": "Merriweather"
  },
  "styles": {
    "h1": {
      "letterSpacing": 4,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 9,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#2d3436",
    "secondary": "#636e72",
    "accent": "#00b894"
  }
},
{
  "id": "preset-072",
  "name": "Luxury preset-072",
  "lockedFonts": true,
  "alignment": "center",
  "category": "wedding",
  "fonts": {
    "h1": "Pinyon Script",
    "h2": "Outfit",
    "body": "Bodoni Moda",
    "small": "Bodoni Moda"
  },
  "styles": {
    "h1": {
      "letterSpacing": 1,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 2,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#222f3e",
    "secondary": "#576574",
    "accent": "#ee5253"
  }
},
{
  "id": "preset-073",
  "name": "Luxury preset-073",
  "lockedFonts": true,
  "alignment": "center",
  "category": "modern",
  "fonts": {
    "h1": "Oswald",
    "h2": "Outfit",
    "body": "Outfit",
    "small": "Outfit"
  },
  "styles": {
    "h1": {
      "letterSpacing": 2,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 6,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#2d3436",
    "secondary": "#636e72",
    "accent": "#00b894"
  }
},
{
  "id": "preset-074",
  "name": "Luxury preset-074",
  "lockedFonts": true,
  "alignment": "center",
  "category": "modern",
  "fonts": {
    "h1": "Montserrat",
    "h2": "Poppins",
    "body": "Raleway",
    "small": "Raleway"
  },
  "styles": {
    "h1": {
      "letterSpacing": 2,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 8,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#222f3e",
    "secondary": "#576574",
    "accent": "#ee5253"
  }
},
{
  "id": "preset-075",
  "name": "Luxury preset-075",
  "lockedFonts": true,
  "alignment": "center",
  "category": "quinceanera",
  "fonts": {
    "h1": "Tangerine",
    "h2": "Lato",
    "body": "Bodoni Moda",
    "small": "Bodoni Moda"
  },
  "styles": {
    "h1": {
      "letterSpacing": 2,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 0,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#2d3436",
    "secondary": "#636e72",
    "accent": "#00b894"
  }
},
{
  "id": "preset-076",
  "name": "Luxury preset-076",
  "lockedFonts": true,
  "alignment": "center",
  "category": "wedding",
  "fonts": {
    "h1": "Allura",
    "h2": "Inter",
    "body": "Cormorant Garamond",
    "small": "Cormorant Garamond"
  },
  "styles": {
    "h1": {
      "letterSpacing": 4,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 2,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#1e272e",
    "secondary": "#485460",
    "accent": "#ffdd59"
  }
},
{
  "id": "preset-077",
  "name": "Luxury preset-077",
  "lockedFonts": true,
  "alignment": "center",
  "category": "wedding",
  "fonts": {
    "h1": "Alex Brush",
    "h2": "Lato",
    "body": "Cormorant Garamond",
    "small": "Cormorant Garamond"
  },
  "styles": {
    "h1": {
      "letterSpacing": 3,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 6,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#000000",
    "secondary": "#666666",
    "accent": "#ff9f43"
  }
},
{
  "id": "preset-078",
  "name": "Luxury preset-078",
  "lockedFonts": true,
  "alignment": "center",
  "category": "classic",
  "fonts": {
    "h1": "Lora",
    "h2": "Bodoni Moda",
    "body": "Raleway",
    "small": "Raleway"
  },
  "styles": {
    "h1": {
      "letterSpacing": 2,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 1,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#2c3e50",
    "secondary": "#34495e",
    "accent": "#e74c3c"
  }
},
{
  "id": "preset-079",
  "name": "Luxury preset-079",
  "lockedFonts": true,
  "alignment": "center",
  "category": "wedding",
  "fonts": {
    "h1": "Allura",
    "h2": "Lato",
    "body": "Bodoni Moda",
    "small": "Bodoni Moda"
  },
  "styles": {
    "h1": {
      "letterSpacing": 3,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 7,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#222f3e",
    "secondary": "#576574",
    "accent": "#ee5253"
  }
},
{
  "id": "preset-080",
  "name": "Luxury preset-080",
  "lockedFonts": true,
  "alignment": "center",
  "category": "quinceanera",
  "fonts": {
    "h1": "Great Vibes",
    "h2": "Roboto",
    "body": "PT Serif",
    "small": "PT Serif"
  },
  "styles": {
    "h1": {
      "letterSpacing": 4,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 9,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#000000",
    "secondary": "#666666",
    "accent": "#ff9f43"
  }
},
{
  "id": "preset-081",
  "name": "Luxury preset-081",
  "lockedFonts": true,
  "alignment": "center",
  "category": "quinceanera",
  "fonts": {
    "h1": "Great Vibes",
    "h2": "Raleway",
    "body": "Playfair Display",
    "small": "Playfair Display"
  },
  "styles": {
    "h1": {
      "letterSpacing": 3,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 8,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#4b4b4b",
    "secondary": "#7d7d7d",
    "accent": "#c0392b"
  }
},
{
  "id": "preset-082",
  "name": "Luxury preset-082",
  "lockedFonts": true,
  "alignment": "center",
  "category": "wedding",
  "fonts": {
    "h1": "Dancing Script",
    "h2": "Oswald",
    "body": "Playfair Display",
    "small": "Playfair Display"
  },
  "styles": {
    "h1": {
      "letterSpacing": 1,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 6,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#222f3e",
    "secondary": "#576574",
    "accent": "#ee5253"
  }
},
{
  "id": "preset-083",
  "name": "Luxury preset-083",
  "lockedFonts": true,
  "alignment": "center",
  "category": "classic",
  "fonts": {
    "h1": "Bodoni Moda",
    "h2": "Playfair Display",
    "body": "Montserrat",
    "small": "Montserrat"
  },
  "styles": {
    "h1": {
      "letterSpacing": 3,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 0,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#2d3436",
    "secondary": "#636e72",
    "accent": "#00b894"
  }
},
{
  "id": "preset-084",
  "name": "Luxury preset-084",
  "lockedFonts": true,
  "alignment": "center",
  "category": "classic",
  "fonts": {
    "h1": "Cinzel",
    "h2": "Cormorant Garamond",
    "body": "Inter",
    "small": "Inter"
  },
  "styles": {
    "h1": {
      "letterSpacing": 3,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 7,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#222f3e",
    "secondary": "#576574",
    "accent": "#ee5253"
  }
},
{
  "id": "preset-085",
  "name": "Luxury preset-085",
  "lockedFonts": true,
  "alignment": "center",
  "category": "modern",
  "fonts": {
    "h1": "Roboto",
    "h2": "Lato",
    "body": "Raleway",
    "small": "Raleway"
  },
  "styles": {
    "h1": {
      "letterSpacing": 4,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 3,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#000000",
    "secondary": "#666666",
    "accent": "#ff9f43"
  }
},
{
  "id": "preset-086",
  "name": "Luxury preset-086",
  "lockedFonts": true,
  "alignment": "center",
  "category": "minimal",
  "fonts": {
    "h1": "Poppins",
    "h2": "Oswald",
    "body": "Oswald",
    "small": "Oswald"
  },
  "styles": {
    "h1": {
      "letterSpacing": 4,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 9,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#1a1a1a",
    "secondary": "#4a4a4a",
    "accent": "#d4af37"
  }
},
{
  "id": "preset-087",
  "name": "Luxury preset-087",
  "lockedFonts": true,
  "alignment": "center",
  "category": "editorial",
  "fonts": {
    "h1": "Cinzel",
    "h2": "Bodoni Moda",
    "body": "Oswald",
    "small": "Oswald"
  },
  "styles": {
    "h1": {
      "letterSpacing": 2,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 5,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#1a1a1a",
    "secondary": "#4a4a4a",
    "accent": "#d4af37"
  }
},
{
  "id": "preset-088",
  "name": "Luxury preset-088",
  "lockedFonts": true,
  "alignment": "center",
  "category": "wedding",
  "fonts": {
    "h1": "Pinyon Script",
    "h2": "Poppins",
    "body": "Cinzel",
    "small": "Cinzel"
  },
  "styles": {
    "h1": {
      "letterSpacing": 2,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 5,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#4b4b4b",
    "secondary": "#7d7d7d",
    "accent": "#c0392b"
  }
},
{
  "id": "preset-089",
  "name": "Luxury preset-089",
  "lockedFonts": true,
  "alignment": "center",
  "category": "classic",
  "fonts": {
    "h1": "Cormorant Garamond",
    "h2": "Bodoni Moda",
    "body": "Lato",
    "small": "Lato"
  },
  "styles": {
    "h1": {
      "letterSpacing": 0,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 5,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#222f3e",
    "secondary": "#576574",
    "accent": "#ee5253"
  }
},
{
  "id": "preset-090",
  "name": "Luxury preset-090",
  "lockedFonts": true,
  "alignment": "center",
  "category": "quinceanera",
  "fonts": {
    "h1": "Allura",
    "h2": "Outfit",
    "body": "Cinzel",
    "small": "Cinzel"
  },
  "styles": {
    "h1": {
      "letterSpacing": 4,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 2,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#000000",
    "secondary": "#666666",
    "accent": "#ff9f43"
  }
},
{
  "id": "preset-091",
  "name": "Luxury preset-091",
  "lockedFonts": true,
  "alignment": "center",
  "category": "editorial",
  "fonts": {
    "h1": "Merriweather",
    "h2": "Cormorant Garamond",
    "body": "Poppins",
    "small": "Poppins"
  },
  "styles": {
    "h1": {
      "letterSpacing": 4,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 7,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#000000",
    "secondary": "#666666",
    "accent": "#ff9f43"
  }
},
{
  "id": "preset-092",
  "name": "Luxury preset-092",
  "lockedFonts": true,
  "alignment": "center",
  "category": "wedding",
  "fonts": {
    "h1": "Tangerine",
    "h2": "Poppins",
    "body": "Playfair Display",
    "small": "Playfair Display"
  },
  "styles": {
    "h1": {
      "letterSpacing": 1,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 7,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#2c3e50",
    "secondary": "#34495e",
    "accent": "#e74c3c"
  }
},
{
  "id": "preset-093",
  "name": "Luxury preset-093",
  "lockedFonts": true,
  "alignment": "center",
  "category": "editorial",
  "fonts": {
    "h1": "Bodoni Moda",
    "h2": "Bodoni Moda",
    "body": "Roboto",
    "small": "Roboto"
  },
  "styles": {
    "h1": {
      "letterSpacing": 0,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 0,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#1e272e",
    "secondary": "#485460",
    "accent": "#ffdd59"
  }
},
{
  "id": "preset-094",
  "name": "Luxury preset-094",
  "lockedFonts": true,
  "alignment": "center",
  "category": "quinceanera",
  "fonts": {
    "h1": "Pinyon Script",
    "h2": "Poppins",
    "body": "Merriweather",
    "small": "Merriweather"
  },
  "styles": {
    "h1": {
      "letterSpacing": 0,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 1,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#000000",
    "secondary": "#666666",
    "accent": "#ff9f43"
  }
},
{
  "id": "preset-095",
  "name": "Luxury preset-095",
  "lockedFonts": true,
  "alignment": "center",
  "category": "minimal",
  "fonts": {
    "h1": "Oswald",
    "h2": "Lato",
    "body": "Lato",
    "small": "Lato"
  },
  "styles": {
    "h1": {
      "letterSpacing": 2,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 1,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#2d3436",
    "secondary": "#636e72",
    "accent": "#00b894"
  }
},
{
  "id": "preset-096",
  "name": "Luxury preset-096",
  "lockedFonts": true,
  "alignment": "center",
  "category": "editorial",
  "fonts": {
    "h1": "Cormorant Garamond",
    "h2": "Merriweather",
    "body": "Montserrat",
    "small": "Montserrat"
  },
  "styles": {
    "h1": {
      "letterSpacing": 2,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 9,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#2d3436",
    "secondary": "#636e72",
    "accent": "#00b894"
  }
},
{
  "id": "preset-097",
  "name": "Luxury preset-097",
  "lockedFonts": true,
  "alignment": "center",
  "category": "editorial",
  "fonts": {
    "h1": "Merriweather",
    "h2": "PT Serif",
    "body": "Raleway",
    "small": "Raleway"
  },
  "styles": {
    "h1": {
      "letterSpacing": 4,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 4,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#1a1a1a",
    "secondary": "#4a4a4a",
    "accent": "#d4af37"
  }
},
{
  "id": "preset-098",
  "name": "Luxury preset-098",
  "lockedFonts": true,
  "alignment": "center",
  "category": "modern",
  "fonts": {
    "h1": "Poppins",
    "h2": "Roboto",
    "body": "Raleway",
    "small": "Raleway"
  },
  "styles": {
    "h1": {
      "letterSpacing": 3,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 5,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#1a1a1a",
    "secondary": "#4a4a4a",
    "accent": "#d4af37"
  }
},
{
  "id": "preset-099",
  "name": "Luxury preset-099",
  "lockedFonts": true,
  "alignment": "center",
  "category": "wedding",
  "fonts": {
    "h1": "Great Vibes",
    "h2": "Oswald",
    "body": "Merriweather",
    "small": "Merriweather"
  },
  "styles": {
    "h1": {
      "letterSpacing": 4,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 5,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#4b4b4b",
    "secondary": "#7d7d7d",
    "accent": "#c0392b"
  }
},
{
  "id": "preset-100",
  "name": "Luxury preset-100",
  "lockedFonts": true,
  "alignment": "center",
  "category": "editorial",
  "fonts": {
    "h1": "Merriweather",
    "h2": "Cinzel",
    "body": "Oswald",
    "small": "Oswald"
  },
  "styles": {
    "h1": {
      "letterSpacing": 1,
      "lineHeight": 1.1,
      "textTransform": "none"
    },
    "h2": {
      "letterSpacing": 6,
      "lineHeight": 1.2,
      "textTransform": "uppercase"
    },
    "body": {
      "letterSpacing": 0,
      "lineHeight": 1.5,
      "textTransform": "none"
    },
    "small": {
      "letterSpacing": 1,
      "lineHeight": 1.4,
      "textTransform": "uppercase"
    }
  },
  "colorPalette": {
    "primary": "#2c3e50",
    "secondary": "#34495e",
    "accent": "#e74c3c"
  }
}
];
