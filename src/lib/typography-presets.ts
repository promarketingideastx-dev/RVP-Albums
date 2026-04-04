export type PresetCategory = 'wedding' | 'quinceanera' | 'modern' | 'editorial' | 'classic';

export interface TypographyPreset {
  id: string;
  name: string;
  category: PresetCategory;
  lockedFonts: boolean;
  alignment: 'left' | 'center' | 'right';
  fonts: {
    h1: string;
    h2: string;
    body: string;
    small: string;
  };
  styles: {
    h1: { fontSize: number; letterSpacing: number; lineHeight: number; textTransform?: 'none' | 'uppercase' | 'lowercase'; color: string };
    h2: { fontSize: number; letterSpacing: number; lineHeight: number; textTransform?: 'none' | 'uppercase' | 'lowercase'; color: string };
    body: { fontSize: number; letterSpacing: number; lineHeight: number; textTransform?: 'none' | 'uppercase' | 'lowercase'; color: string };
    small: { fontSize: number; letterSpacing: number; lineHeight: number; textTransform?: 'none' | 'uppercase' | 'lowercase'; color: string };
  };
}

export const TYPOGRAPHY_CATEGORIES: { id: PresetCategory; label: string }[] = [
  { id: 'wedding', label: 'Wedding' },
  { id: 'quinceanera', label: 'Quinceañera' },
  { id: 'modern', label: 'Modern' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'classic', label: 'Classic' }
];

export const TYPOGRAPHY_PRESETS: TypographyPreset[] = [
  {
    "id": "TP-PRO-001",
    "name": "Great Vibes + Playfair Display (Onyx Monochrome)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Great Vibes",
      "h2": "Playfair Display",
      "body": "Inter",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 82,
        "letterSpacing": -2,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#111111"
      },
      "h2": {
        "fontSize": 28,
        "letterSpacing": 20,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#222222"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#444444"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 15,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#666666"
      }
    }
  },
  {
    "id": "TP-PRO-002",
    "name": "Great Vibes + Playfair Display (Champagne Gold)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Great Vibes",
      "h2": "Playfair Display",
      "body": "Inter",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 82,
        "letterSpacing": -2,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#b8945a"
      },
      "h2": {
        "fontSize": 28,
        "letterSpacing": 20,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#b8945a"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 15,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#808080"
      }
    }
  },
  {
    "id": "TP-PRO-003",
    "name": "Great Vibes + Playfair Display (Navy Royal)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Great Vibes",
      "h2": "Playfair Display",
      "body": "Inter",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 82,
        "letterSpacing": -2,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#1c2e4a"
      },
      "h2": {
        "fontSize": 28,
        "letterSpacing": 20,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#3b5998"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#333333"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 15,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#555555"
      }
    }
  },
  {
    "id": "TP-PRO-004",
    "name": "Great Vibes + Playfair Display (Sage Botanical)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Great Vibes",
      "h2": "Playfair Display",
      "body": "Inter",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 82,
        "letterSpacing": -2,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#6e7a63"
      },
      "h2": {
        "fontSize": 28,
        "letterSpacing": 20,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#8b9680"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 15,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#757575"
      }
    }
  },
  {
    "id": "TP-PRO-005",
    "name": "Pinyon Script + Cormorant Garamond (Onyx Monochrome)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Pinyon Script",
      "h2": "Cormorant Garamond",
      "body": "Cormorant Garamond",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 90,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#111111"
      },
      "h2": {
        "fontSize": 32,
        "letterSpacing": 15,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#222222"
      },
      "body": {
        "fontSize": 18,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#444444"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 20,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#666666"
      }
    }
  },
  {
    "id": "TP-PRO-006",
    "name": "Pinyon Script + Cormorant Garamond (Champagne Gold)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Pinyon Script",
      "h2": "Cormorant Garamond",
      "body": "Cormorant Garamond",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 90,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#b8945a"
      },
      "h2": {
        "fontSize": 32,
        "letterSpacing": 15,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#b8945a"
      },
      "body": {
        "fontSize": 18,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 20,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#808080"
      }
    }
  },
  {
    "id": "TP-PRO-007",
    "name": "Pinyon Script + Cormorant Garamond (Navy Royal)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Pinyon Script",
      "h2": "Cormorant Garamond",
      "body": "Cormorant Garamond",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 90,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#1c2e4a"
      },
      "h2": {
        "fontSize": 32,
        "letterSpacing": 15,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#3b5998"
      },
      "body": {
        "fontSize": 18,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#333333"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 20,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#555555"
      }
    }
  },
  {
    "id": "TP-PRO-008",
    "name": "Pinyon Script + Cormorant Garamond (Sage Botanical)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Pinyon Script",
      "h2": "Cormorant Garamond",
      "body": "Cormorant Garamond",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 90,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#6e7a63"
      },
      "h2": {
        "fontSize": 32,
        "letterSpacing": 15,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#8b9680"
      },
      "body": {
        "fontSize": 18,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 20,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#757575"
      }
    }
  },
  {
    "id": "TP-PRO-009",
    "name": "Alex Brush + Cinzel (Onyx Monochrome)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Alex Brush",
      "h2": "Cinzel",
      "body": "Lora",
      "small": "Cinzel"
    },
    "styles": {
      "h1": {
        "fontSize": 85,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#111111"
      },
      "h2": {
        "fontSize": 24,
        "letterSpacing": 30,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#222222"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#444444"
      },
      "small": {
        "fontSize": 12,
        "letterSpacing": 25,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#666666"
      }
    }
  },
  {
    "id": "TP-PRO-010",
    "name": "Alex Brush + Cinzel (Champagne Gold)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Alex Brush",
      "h2": "Cinzel",
      "body": "Lora",
      "small": "Cinzel"
    },
    "styles": {
      "h1": {
        "fontSize": 85,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#b8945a"
      },
      "h2": {
        "fontSize": 24,
        "letterSpacing": 30,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#b8945a"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 12,
        "letterSpacing": 25,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#808080"
      }
    }
  },
  {
    "id": "TP-PRO-011",
    "name": "Alex Brush + Cinzel (Navy Royal)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Alex Brush",
      "h2": "Cinzel",
      "body": "Lora",
      "small": "Cinzel"
    },
    "styles": {
      "h1": {
        "fontSize": 85,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#1c2e4a"
      },
      "h2": {
        "fontSize": 24,
        "letterSpacing": 30,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#3b5998"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#333333"
      },
      "small": {
        "fontSize": 12,
        "letterSpacing": 25,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#555555"
      }
    }
  },
  {
    "id": "TP-PRO-012",
    "name": "Alex Brush + Cinzel (Sage Botanical)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Alex Brush",
      "h2": "Cinzel",
      "body": "Lora",
      "small": "Cinzel"
    },
    "styles": {
      "h1": {
        "fontSize": 85,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#6e7a63"
      },
      "h2": {
        "fontSize": 24,
        "letterSpacing": 30,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#8b9680"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 12,
        "letterSpacing": 25,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#757575"
      }
    }
  },
  {
    "id": "TP-PRO-013",
    "name": "Parisienne + Bodoni Moda (Onyx Monochrome)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Parisienne",
      "h2": "Bodoni Moda",
      "body": "Bodoni Moda",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 88,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#111111"
      },
      "h2": {
        "fontSize": 30,
        "letterSpacing": 10,
        "lineHeight": 1.3,
        "textTransform": "none",
        "color": "#222222"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#444444"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 5,
        "lineHeight": 1.4,
        "textTransform": "none",
        "color": "#666666"
      }
    }
  },
  {
    "id": "TP-PRO-014",
    "name": "Parisienne + Bodoni Moda (Champagne Gold)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Parisienne",
      "h2": "Bodoni Moda",
      "body": "Bodoni Moda",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 88,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#b8945a"
      },
      "h2": {
        "fontSize": 30,
        "letterSpacing": 10,
        "lineHeight": 1.3,
        "textTransform": "none",
        "color": "#b8945a"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 5,
        "lineHeight": 1.4,
        "textTransform": "none",
        "color": "#808080"
      }
    }
  },
  {
    "id": "TP-PRO-015",
    "name": "Parisienne + Bodoni Moda (Navy Royal)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Parisienne",
      "h2": "Bodoni Moda",
      "body": "Bodoni Moda",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 88,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#1c2e4a"
      },
      "h2": {
        "fontSize": 30,
        "letterSpacing": 10,
        "lineHeight": 1.3,
        "textTransform": "none",
        "color": "#3b5998"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#333333"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 5,
        "lineHeight": 1.4,
        "textTransform": "none",
        "color": "#555555"
      }
    }
  },
  {
    "id": "TP-PRO-016",
    "name": "Parisienne + Bodoni Moda (Sage Botanical)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Parisienne",
      "h2": "Bodoni Moda",
      "body": "Bodoni Moda",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 88,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#6e7a63"
      },
      "h2": {
        "fontSize": 30,
        "letterSpacing": 10,
        "lineHeight": 1.3,
        "textTransform": "none",
        "color": "#8b9680"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 5,
        "lineHeight": 1.4,
        "textTransform": "none",
        "color": "#757575"
      }
    }
  },
  {
    "id": "TP-PRO-017",
    "name": "Tangerine + Montserrat (Onyx Monochrome)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Tangerine",
      "h2": "Montserrat",
      "body": "Montserrat",
      "small": "Montserrat"
    },
    "styles": {
      "h1": {
        "fontSize": 100,
        "letterSpacing": 5,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#111111"
      },
      "h2": {
        "fontSize": 22,
        "letterSpacing": 35,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#222222"
      },
      "body": {
        "fontSize": 14,
        "letterSpacing": 2,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#444444"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 20,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#666666"
      }
    }
  },
  {
    "id": "TP-PRO-018",
    "name": "Tangerine + Montserrat (Champagne Gold)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Tangerine",
      "h2": "Montserrat",
      "body": "Montserrat",
      "small": "Montserrat"
    },
    "styles": {
      "h1": {
        "fontSize": 100,
        "letterSpacing": 5,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#b8945a"
      },
      "h2": {
        "fontSize": 22,
        "letterSpacing": 35,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#b8945a"
      },
      "body": {
        "fontSize": 14,
        "letterSpacing": 2,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 20,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#808080"
      }
    }
  },
  {
    "id": "TP-PRO-019",
    "name": "Tangerine + Montserrat (Navy Royal)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Tangerine",
      "h2": "Montserrat",
      "body": "Montserrat",
      "small": "Montserrat"
    },
    "styles": {
      "h1": {
        "fontSize": 100,
        "letterSpacing": 5,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#1c2e4a"
      },
      "h2": {
        "fontSize": 22,
        "letterSpacing": 35,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#3b5998"
      },
      "body": {
        "fontSize": 14,
        "letterSpacing": 2,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#333333"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 20,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#555555"
      }
    }
  },
  {
    "id": "TP-PRO-020",
    "name": "Tangerine + Montserrat (Sage Botanical)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Tangerine",
      "h2": "Montserrat",
      "body": "Montserrat",
      "small": "Montserrat"
    },
    "styles": {
      "h1": {
        "fontSize": 100,
        "letterSpacing": 5,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#6e7a63"
      },
      "h2": {
        "fontSize": 22,
        "letterSpacing": 35,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#8b9680"
      },
      "body": {
        "fontSize": 14,
        "letterSpacing": 2,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 20,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#757575"
      }
    }
  },
  {
    "id": "TP-PRO-021",
    "name": "Allura + Libre Baskerville (Onyx Monochrome)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Allura",
      "h2": "Libre Baskerville",
      "body": "Libre Baskerville",
      "small": "Nunito Sans"
    },
    "styles": {
      "h1": {
        "fontSize": 86,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#111111"
      },
      "h2": {
        "fontSize": 26,
        "letterSpacing": 15,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#222222"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#444444"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 15,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#666666"
      }
    }
  },
  {
    "id": "TP-PRO-022",
    "name": "Allura + Libre Baskerville (Champagne Gold)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Allura",
      "h2": "Libre Baskerville",
      "body": "Libre Baskerville",
      "small": "Nunito Sans"
    },
    "styles": {
      "h1": {
        "fontSize": 86,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#b8945a"
      },
      "h2": {
        "fontSize": 26,
        "letterSpacing": 15,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#b8945a"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 15,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#808080"
      }
    }
  },
  {
    "id": "TP-PRO-023",
    "name": "Allura + Libre Baskerville (Navy Royal)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Allura",
      "h2": "Libre Baskerville",
      "body": "Libre Baskerville",
      "small": "Nunito Sans"
    },
    "styles": {
      "h1": {
        "fontSize": 86,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#1c2e4a"
      },
      "h2": {
        "fontSize": 26,
        "letterSpacing": 15,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#3b5998"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#333333"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 15,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#555555"
      }
    }
  },
  {
    "id": "TP-PRO-024",
    "name": "Allura + Libre Baskerville (Sage Botanical)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Allura",
      "h2": "Libre Baskerville",
      "body": "Libre Baskerville",
      "small": "Nunito Sans"
    },
    "styles": {
      "h1": {
        "fontSize": 86,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#6e7a63"
      },
      "h2": {
        "fontSize": 26,
        "letterSpacing": 15,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#8b9680"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 15,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#757575"
      }
    }
  },
  {
    "id": "TP-PRO-025",
    "name": "Sacramento + Gloock (Onyx Monochrome)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Sacramento",
      "h2": "Gloock",
      "body": "Inter",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 92,
        "letterSpacing": 2,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#111111"
      },
      "h2": {
        "fontSize": 34,
        "letterSpacing": 5,
        "lineHeight": 1.3,
        "textTransform": "none",
        "color": "#222222"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#444444"
      },
      "small": {
        "fontSize": 12,
        "letterSpacing": 10,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#666666"
      }
    }
  },
  {
    "id": "TP-PRO-026",
    "name": "Sacramento + Gloock (Champagne Gold)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Sacramento",
      "h2": "Gloock",
      "body": "Inter",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 92,
        "letterSpacing": 2,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#b8945a"
      },
      "h2": {
        "fontSize": 34,
        "letterSpacing": 5,
        "lineHeight": 1.3,
        "textTransform": "none",
        "color": "#b8945a"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 12,
        "letterSpacing": 10,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#808080"
      }
    }
  },
  {
    "id": "TP-PRO-027",
    "name": "Sacramento + Gloock (Navy Royal)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Sacramento",
      "h2": "Gloock",
      "body": "Inter",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 92,
        "letterSpacing": 2,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#1c2e4a"
      },
      "h2": {
        "fontSize": 34,
        "letterSpacing": 5,
        "lineHeight": 1.3,
        "textTransform": "none",
        "color": "#3b5998"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#333333"
      },
      "small": {
        "fontSize": 12,
        "letterSpacing": 10,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#555555"
      }
    }
  },
  {
    "id": "TP-PRO-028",
    "name": "Sacramento + Gloock (Sage Botanical)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Sacramento",
      "h2": "Gloock",
      "body": "Inter",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 92,
        "letterSpacing": 2,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#6e7a63"
      },
      "h2": {
        "fontSize": 34,
        "letterSpacing": 5,
        "lineHeight": 1.3,
        "textTransform": "none",
        "color": "#8b9680"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 12,
        "letterSpacing": 10,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#757575"
      }
    }
  },
  {
    "id": "TP-PRO-029",
    "name": "Herr Von Muellerhoff + Prata (Onyx Monochrome)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Herr Von Muellerhoff",
      "h2": "Prata",
      "body": "Prata",
      "small": "Arial"
    },
    "styles": {
      "h1": {
        "fontSize": 96,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#111111"
      },
      "h2": {
        "fontSize": 32,
        "letterSpacing": 8,
        "lineHeight": 1.3,
        "textTransform": "none",
        "color": "#222222"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#444444"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 15,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#666666"
      }
    }
  },
  {
    "id": "TP-PRO-030",
    "name": "Herr Von Muellerhoff + Prata (Champagne Gold)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Herr Von Muellerhoff",
      "h2": "Prata",
      "body": "Prata",
      "small": "Arial"
    },
    "styles": {
      "h1": {
        "fontSize": 96,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#b8945a"
      },
      "h2": {
        "fontSize": 32,
        "letterSpacing": 8,
        "lineHeight": 1.3,
        "textTransform": "none",
        "color": "#b8945a"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 15,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#808080"
      }
    }
  },
  {
    "id": "TP-PRO-031",
    "name": "Herr Von Muellerhoff + Prata (Navy Royal)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Herr Von Muellerhoff",
      "h2": "Prata",
      "body": "Prata",
      "small": "Arial"
    },
    "styles": {
      "h1": {
        "fontSize": 96,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#1c2e4a"
      },
      "h2": {
        "fontSize": 32,
        "letterSpacing": 8,
        "lineHeight": 1.3,
        "textTransform": "none",
        "color": "#3b5998"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#333333"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 15,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#555555"
      }
    }
  },
  {
    "id": "TP-PRO-032",
    "name": "Herr Von Muellerhoff + Prata (Sage Botanical)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Herr Von Muellerhoff",
      "h2": "Prata",
      "body": "Prata",
      "small": "Arial"
    },
    "styles": {
      "h1": {
        "fontSize": 96,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#6e7a63"
      },
      "h2": {
        "fontSize": 32,
        "letterSpacing": 8,
        "lineHeight": 1.3,
        "textTransform": "none",
        "color": "#8b9680"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 15,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#757575"
      }
    }
  },
  {
    "id": "TP-PRO-033",
    "name": "Qwigley + EB Garamond (Onyx Monochrome)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Qwigley",
      "h2": "EB Garamond",
      "body": "EB Garamond",
      "small": "Lato"
    },
    "styles": {
      "h1": {
        "fontSize": 110,
        "letterSpacing": -5,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#111111"
      },
      "h2": {
        "fontSize": 30,
        "letterSpacing": 18,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#222222"
      },
      "body": {
        "fontSize": 18,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#444444"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 20,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#666666"
      }
    }
  },
  {
    "id": "TP-PRO-034",
    "name": "Qwigley + EB Garamond (Champagne Gold)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Qwigley",
      "h2": "EB Garamond",
      "body": "EB Garamond",
      "small": "Lato"
    },
    "styles": {
      "h1": {
        "fontSize": 110,
        "letterSpacing": -5,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#b8945a"
      },
      "h2": {
        "fontSize": 30,
        "letterSpacing": 18,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#b8945a"
      },
      "body": {
        "fontSize": 18,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 20,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#808080"
      }
    }
  },
  {
    "id": "TP-PRO-035",
    "name": "Qwigley + EB Garamond (Navy Royal)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Qwigley",
      "h2": "EB Garamond",
      "body": "EB Garamond",
      "small": "Lato"
    },
    "styles": {
      "h1": {
        "fontSize": 110,
        "letterSpacing": -5,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#1c2e4a"
      },
      "h2": {
        "fontSize": 30,
        "letterSpacing": 18,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#3b5998"
      },
      "body": {
        "fontSize": 18,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#333333"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 20,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#555555"
      }
    }
  },
  {
    "id": "TP-PRO-036",
    "name": "Qwigley + EB Garamond (Sage Botanical)",
    "category": "wedding",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Qwigley",
      "h2": "EB Garamond",
      "body": "EB Garamond",
      "small": "Lato"
    },
    "styles": {
      "h1": {
        "fontSize": 110,
        "letterSpacing": -5,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#6e7a63"
      },
      "h2": {
        "fontSize": 30,
        "letterSpacing": 18,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#8b9680"
      },
      "body": {
        "fontSize": 18,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 20,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#757575"
      }
    }
  },
  {
    "id": "TP-PRO-037",
    "name": "Montserrat + Montserrat (Onyx Monochrome)",
    "category": "modern",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Montserrat",
      "h2": "Montserrat",
      "body": "Open Sans",
      "small": "Open Sans"
    },
    "styles": {
      "h1": {
        "fontSize": 70,
        "letterSpacing": 10,
        "lineHeight": 1.1,
        "textTransform": "uppercase",
        "color": "#111111"
      },
      "h2": {
        "fontSize": 24,
        "letterSpacing": 40,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#222222"
      },
      "body": {
        "fontSize": 14,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#444444"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 30,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#666666"
      }
    }
  },
  {
    "id": "TP-PRO-038",
    "name": "Montserrat + Montserrat (Champagne Gold)",
    "category": "modern",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Montserrat",
      "h2": "Montserrat",
      "body": "Open Sans",
      "small": "Open Sans"
    },
    "styles": {
      "h1": {
        "fontSize": 70,
        "letterSpacing": 10,
        "lineHeight": 1.1,
        "textTransform": "uppercase",
        "color": "#b8945a"
      },
      "h2": {
        "fontSize": 24,
        "letterSpacing": 40,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#b8945a"
      },
      "body": {
        "fontSize": 14,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 30,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#808080"
      }
    }
  },
  {
    "id": "TP-PRO-039",
    "name": "Montserrat + Montserrat (Navy Royal)",
    "category": "modern",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Montserrat",
      "h2": "Montserrat",
      "body": "Open Sans",
      "small": "Open Sans"
    },
    "styles": {
      "h1": {
        "fontSize": 70,
        "letterSpacing": 10,
        "lineHeight": 1.1,
        "textTransform": "uppercase",
        "color": "#1c2e4a"
      },
      "h2": {
        "fontSize": 24,
        "letterSpacing": 40,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#3b5998"
      },
      "body": {
        "fontSize": 14,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#333333"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 30,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#555555"
      }
    }
  },
  {
    "id": "TP-PRO-040",
    "name": "Montserrat + Montserrat (Sage Botanical)",
    "category": "modern",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Montserrat",
      "h2": "Montserrat",
      "body": "Open Sans",
      "small": "Open Sans"
    },
    "styles": {
      "h1": {
        "fontSize": 70,
        "letterSpacing": 10,
        "lineHeight": 1.1,
        "textTransform": "uppercase",
        "color": "#6e7a63"
      },
      "h2": {
        "fontSize": 24,
        "letterSpacing": 40,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#8b9680"
      },
      "body": {
        "fontSize": 14,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 30,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#757575"
      }
    }
  },
  {
    "id": "TP-PRO-041",
    "name": "DM Sans + Inter (Onyx Monochrome)",
    "category": "modern",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "DM Sans",
      "h2": "Inter",
      "body": "Inter",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 72,
        "letterSpacing": -3,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#111111"
      },
      "h2": {
        "fontSize": 26,
        "letterSpacing": 20,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#222222"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#444444"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 15,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#666666"
      }
    }
  },
  {
    "id": "TP-PRO-042",
    "name": "DM Sans + Inter (Champagne Gold)",
    "category": "modern",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "DM Sans",
      "h2": "Inter",
      "body": "Inter",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 72,
        "letterSpacing": -3,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#b8945a"
      },
      "h2": {
        "fontSize": 26,
        "letterSpacing": 20,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#b8945a"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 15,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#808080"
      }
    }
  },
  {
    "id": "TP-PRO-043",
    "name": "DM Sans + Inter (Navy Royal)",
    "category": "modern",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "DM Sans",
      "h2": "Inter",
      "body": "Inter",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 72,
        "letterSpacing": -3,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#1c2e4a"
      },
      "h2": {
        "fontSize": 26,
        "letterSpacing": 20,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#3b5998"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#333333"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 15,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#555555"
      }
    }
  },
  {
    "id": "TP-PRO-044",
    "name": "DM Sans + Inter (Sage Botanical)",
    "category": "modern",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "DM Sans",
      "h2": "Inter",
      "body": "Inter",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 72,
        "letterSpacing": -3,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#6e7a63"
      },
      "h2": {
        "fontSize": 26,
        "letterSpacing": 20,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#8b9680"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 15,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#757575"
      }
    }
  },
  {
    "id": "TP-PRO-045",
    "name": "Playfair Display + Outfit (Onyx Monochrome)",
    "category": "modern",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Playfair Display",
      "h2": "Outfit",
      "body": "Outfit",
      "small": "Outfit"
    },
    "styles": {
      "h1": {
        "fontSize": 76,
        "letterSpacing": 5,
        "lineHeight": 1.1,
        "textTransform": "uppercase",
        "color": "#111111"
      },
      "h2": {
        "fontSize": 22,
        "letterSpacing": 30,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#222222"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#444444"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 25,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#666666"
      }
    }
  },
  {
    "id": "TP-PRO-046",
    "name": "Playfair Display + Outfit (Champagne Gold)",
    "category": "modern",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Playfair Display",
      "h2": "Outfit",
      "body": "Outfit",
      "small": "Outfit"
    },
    "styles": {
      "h1": {
        "fontSize": 76,
        "letterSpacing": 5,
        "lineHeight": 1.1,
        "textTransform": "uppercase",
        "color": "#b8945a"
      },
      "h2": {
        "fontSize": 22,
        "letterSpacing": 30,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#b8945a"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 25,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#808080"
      }
    }
  },
  {
    "id": "TP-PRO-047",
    "name": "Playfair Display + Outfit (Navy Royal)",
    "category": "modern",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Playfair Display",
      "h2": "Outfit",
      "body": "Outfit",
      "small": "Outfit"
    },
    "styles": {
      "h1": {
        "fontSize": 76,
        "letterSpacing": 5,
        "lineHeight": 1.1,
        "textTransform": "uppercase",
        "color": "#1c2e4a"
      },
      "h2": {
        "fontSize": 22,
        "letterSpacing": 30,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#3b5998"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#333333"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 25,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#555555"
      }
    }
  },
  {
    "id": "TP-PRO-048",
    "name": "Playfair Display + Outfit (Sage Botanical)",
    "category": "modern",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Playfair Display",
      "h2": "Outfit",
      "body": "Outfit",
      "small": "Outfit"
    },
    "styles": {
      "h1": {
        "fontSize": 76,
        "letterSpacing": 5,
        "lineHeight": 1.1,
        "textTransform": "uppercase",
        "color": "#6e7a63"
      },
      "h2": {
        "fontSize": 22,
        "letterSpacing": 30,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#8b9680"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 25,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#757575"
      }
    }
  },
  {
    "id": "TP-PRO-049",
    "name": "Jost + Jost (Onyx Monochrome)",
    "category": "modern",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Jost",
      "h2": "Jost",
      "body": "Nunito Sans",
      "small": "Nunito Sans"
    },
    "styles": {
      "h1": {
        "fontSize": 74,
        "letterSpacing": 8,
        "lineHeight": 1.1,
        "textTransform": "uppercase",
        "color": "#111111"
      },
      "h2": {
        "fontSize": 26,
        "letterSpacing": 25,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#222222"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#444444"
      },
      "small": {
        "fontSize": 12,
        "letterSpacing": 20,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#666666"
      }
    }
  },
  {
    "id": "TP-PRO-050",
    "name": "Jost + Jost (Champagne Gold)",
    "category": "modern",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Jost",
      "h2": "Jost",
      "body": "Nunito Sans",
      "small": "Nunito Sans"
    },
    "styles": {
      "h1": {
        "fontSize": 74,
        "letterSpacing": 8,
        "lineHeight": 1.1,
        "textTransform": "uppercase",
        "color": "#b8945a"
      },
      "h2": {
        "fontSize": 26,
        "letterSpacing": 25,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#b8945a"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 12,
        "letterSpacing": 20,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#808080"
      }
    }
  },
  {
    "id": "TP-PRO-051",
    "name": "Jost + Jost (Navy Royal)",
    "category": "modern",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Jost",
      "h2": "Jost",
      "body": "Nunito Sans",
      "small": "Nunito Sans"
    },
    "styles": {
      "h1": {
        "fontSize": 74,
        "letterSpacing": 8,
        "lineHeight": 1.1,
        "textTransform": "uppercase",
        "color": "#1c2e4a"
      },
      "h2": {
        "fontSize": 26,
        "letterSpacing": 25,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#3b5998"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#333333"
      },
      "small": {
        "fontSize": 12,
        "letterSpacing": 20,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#555555"
      }
    }
  },
  {
    "id": "TP-PRO-052",
    "name": "Jost + Jost (Sage Botanical)",
    "category": "modern",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Jost",
      "h2": "Jost",
      "body": "Nunito Sans",
      "small": "Nunito Sans"
    },
    "styles": {
      "h1": {
        "fontSize": 74,
        "letterSpacing": 8,
        "lineHeight": 1.1,
        "textTransform": "uppercase",
        "color": "#6e7a63"
      },
      "h2": {
        "fontSize": 26,
        "letterSpacing": 25,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#8b9680"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 12,
        "letterSpacing": 20,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#757575"
      }
    }
  },
  {
    "id": "TP-PRO-053",
    "name": "Dancing Script + Poppins (Onyx Monochrome)",
    "category": "quinceanera",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Dancing Script",
      "h2": "Poppins",
      "body": "Poppins",
      "small": "Poppins"
    },
    "styles": {
      "h1": {
        "fontSize": 88,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#111111"
      },
      "h2": {
        "fontSize": 26,
        "letterSpacing": 15,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#222222"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#444444"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 15,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#666666"
      }
    }
  },
  {
    "id": "TP-PRO-054",
    "name": "Dancing Script + Poppins (Champagne Gold)",
    "category": "quinceanera",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Dancing Script",
      "h2": "Poppins",
      "body": "Poppins",
      "small": "Poppins"
    },
    "styles": {
      "h1": {
        "fontSize": 88,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#b8945a"
      },
      "h2": {
        "fontSize": 26,
        "letterSpacing": 15,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#b8945a"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 15,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#808080"
      }
    }
  },
  {
    "id": "TP-PRO-055",
    "name": "Dancing Script + Poppins (Navy Royal)",
    "category": "quinceanera",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Dancing Script",
      "h2": "Poppins",
      "body": "Poppins",
      "small": "Poppins"
    },
    "styles": {
      "h1": {
        "fontSize": 88,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#1c2e4a"
      },
      "h2": {
        "fontSize": 26,
        "letterSpacing": 15,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#3b5998"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#333333"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 15,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#555555"
      }
    }
  },
  {
    "id": "TP-PRO-056",
    "name": "Dancing Script + Poppins (Sage Botanical)",
    "category": "quinceanera",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Dancing Script",
      "h2": "Poppins",
      "body": "Poppins",
      "small": "Poppins"
    },
    "styles": {
      "h1": {
        "fontSize": 88,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#6e7a63"
      },
      "h2": {
        "fontSize": 26,
        "letterSpacing": 15,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#8b9680"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 15,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#757575"
      }
    }
  },
  {
    "id": "TP-PRO-057",
    "name": "Pacifico + Quicksand (Onyx Monochrome)",
    "category": "quinceanera",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Pacifico",
      "h2": "Quicksand",
      "body": "Nunito",
      "small": "Nunito"
    },
    "styles": {
      "h1": {
        "fontSize": 75,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#111111"
      },
      "h2": {
        "fontSize": 24,
        "letterSpacing": 20,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#222222"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#444444"
      },
      "small": {
        "fontSize": 12,
        "letterSpacing": 20,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#666666"
      }
    }
  },
  {
    "id": "TP-PRO-058",
    "name": "Pacifico + Quicksand (Champagne Gold)",
    "category": "quinceanera",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Pacifico",
      "h2": "Quicksand",
      "body": "Nunito",
      "small": "Nunito"
    },
    "styles": {
      "h1": {
        "fontSize": 75,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#b8945a"
      },
      "h2": {
        "fontSize": 24,
        "letterSpacing": 20,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#b8945a"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 12,
        "letterSpacing": 20,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#808080"
      }
    }
  },
  {
    "id": "TP-PRO-059",
    "name": "Pacifico + Quicksand (Navy Royal)",
    "category": "quinceanera",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Pacifico",
      "h2": "Quicksand",
      "body": "Nunito",
      "small": "Nunito"
    },
    "styles": {
      "h1": {
        "fontSize": 75,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#1c2e4a"
      },
      "h2": {
        "fontSize": 24,
        "letterSpacing": 20,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#3b5998"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#333333"
      },
      "small": {
        "fontSize": 12,
        "letterSpacing": 20,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#555555"
      }
    }
  },
  {
    "id": "TP-PRO-060",
    "name": "Pacifico + Quicksand (Sage Botanical)",
    "category": "quinceanera",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Pacifico",
      "h2": "Quicksand",
      "body": "Nunito",
      "small": "Nunito"
    },
    "styles": {
      "h1": {
        "fontSize": 75,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#6e7a63"
      },
      "h2": {
        "fontSize": 24,
        "letterSpacing": 20,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#8b9680"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 12,
        "letterSpacing": 20,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#757575"
      }
    }
  },
  {
    "id": "TP-PRO-061",
    "name": "Grand Hotel + Raleway (Onyx Monochrome)",
    "category": "quinceanera",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Grand Hotel",
      "h2": "Raleway",
      "body": "Raleway",
      "small": "Raleway"
    },
    "styles": {
      "h1": {
        "fontSize": 90,
        "letterSpacing": 2,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#111111"
      },
      "h2": {
        "fontSize": 24,
        "letterSpacing": 25,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#222222"
      },
      "body": {
        "fontSize": 14,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#444444"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 30,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#666666"
      }
    }
  },
  {
    "id": "TP-PRO-062",
    "name": "Grand Hotel + Raleway (Champagne Gold)",
    "category": "quinceanera",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Grand Hotel",
      "h2": "Raleway",
      "body": "Raleway",
      "small": "Raleway"
    },
    "styles": {
      "h1": {
        "fontSize": 90,
        "letterSpacing": 2,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#b8945a"
      },
      "h2": {
        "fontSize": 24,
        "letterSpacing": 25,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#b8945a"
      },
      "body": {
        "fontSize": 14,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 30,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#808080"
      }
    }
  },
  {
    "id": "TP-PRO-063",
    "name": "Grand Hotel + Raleway (Navy Royal)",
    "category": "quinceanera",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Grand Hotel",
      "h2": "Raleway",
      "body": "Raleway",
      "small": "Raleway"
    },
    "styles": {
      "h1": {
        "fontSize": 90,
        "letterSpacing": 2,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#1c2e4a"
      },
      "h2": {
        "fontSize": 24,
        "letterSpacing": 25,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#3b5998"
      },
      "body": {
        "fontSize": 14,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#333333"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 30,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#555555"
      }
    }
  },
  {
    "id": "TP-PRO-064",
    "name": "Grand Hotel + Raleway (Sage Botanical)",
    "category": "quinceanera",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Grand Hotel",
      "h2": "Raleway",
      "body": "Raleway",
      "small": "Raleway"
    },
    "styles": {
      "h1": {
        "fontSize": 90,
        "letterSpacing": 2,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#6e7a63"
      },
      "h2": {
        "fontSize": 24,
        "letterSpacing": 25,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#8b9680"
      },
      "body": {
        "fontSize": 14,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 30,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#757575"
      }
    }
  },
  {
    "id": "TP-PRO-065",
    "name": "Cinzel Decorative + Cinzel (Onyx Monochrome)",
    "category": "editorial",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Cinzel Decorative",
      "h2": "Cinzel",
      "body": "Cormorant Garamond",
      "small": "Cinzel"
    },
    "styles": {
      "h1": {
        "fontSize": 68,
        "letterSpacing": 15,
        "lineHeight": 1.1,
        "textTransform": "uppercase",
        "color": "#111111"
      },
      "h2": {
        "fontSize": 22,
        "letterSpacing": 40,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#222222"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 2,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#444444"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 30,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#666666"
      }
    }
  },
  {
    "id": "TP-PRO-066",
    "name": "Cinzel Decorative + Cinzel (Champagne Gold)",
    "category": "editorial",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Cinzel Decorative",
      "h2": "Cinzel",
      "body": "Cormorant Garamond",
      "small": "Cinzel"
    },
    "styles": {
      "h1": {
        "fontSize": 68,
        "letterSpacing": 15,
        "lineHeight": 1.1,
        "textTransform": "uppercase",
        "color": "#b8945a"
      },
      "h2": {
        "fontSize": 22,
        "letterSpacing": 40,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#b8945a"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 2,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 30,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#808080"
      }
    }
  },
  {
    "id": "TP-PRO-067",
    "name": "Cinzel Decorative + Cinzel (Navy Royal)",
    "category": "editorial",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Cinzel Decorative",
      "h2": "Cinzel",
      "body": "Cormorant Garamond",
      "small": "Cinzel"
    },
    "styles": {
      "h1": {
        "fontSize": 68,
        "letterSpacing": 15,
        "lineHeight": 1.1,
        "textTransform": "uppercase",
        "color": "#1c2e4a"
      },
      "h2": {
        "fontSize": 22,
        "letterSpacing": 40,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#3b5998"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 2,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#333333"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 30,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#555555"
      }
    }
  },
  {
    "id": "TP-PRO-068",
    "name": "Cinzel Decorative + Cinzel (Sage Botanical)",
    "category": "editorial",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Cinzel Decorative",
      "h2": "Cinzel",
      "body": "Cormorant Garamond",
      "small": "Cinzel"
    },
    "styles": {
      "h1": {
        "fontSize": 68,
        "letterSpacing": 15,
        "lineHeight": 1.1,
        "textTransform": "uppercase",
        "color": "#6e7a63"
      },
      "h2": {
        "fontSize": 22,
        "letterSpacing": 40,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#8b9680"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 2,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 10,
        "letterSpacing": 30,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#757575"
      }
    }
  },
  {
    "id": "TP-PRO-069",
    "name": "Vidaloka + Oswald (Onyx Monochrome)",
    "category": "editorial",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Vidaloka",
      "h2": "Oswald",
      "body": "Oswald",
      "small": "Oswald"
    },
    "styles": {
      "h1": {
        "fontSize": 74,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#111111"
      },
      "h2": {
        "fontSize": 24,
        "letterSpacing": 30,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#222222"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 5,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#444444"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 25,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#666666"
      }
    }
  },
  {
    "id": "TP-PRO-070",
    "name": "Vidaloka + Oswald (Champagne Gold)",
    "category": "editorial",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Vidaloka",
      "h2": "Oswald",
      "body": "Oswald",
      "small": "Oswald"
    },
    "styles": {
      "h1": {
        "fontSize": 74,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#b8945a"
      },
      "h2": {
        "fontSize": 24,
        "letterSpacing": 30,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#b8945a"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 5,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 25,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#808080"
      }
    }
  },
  {
    "id": "TP-PRO-071",
    "name": "Vidaloka + Oswald (Navy Royal)",
    "category": "editorial",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Vidaloka",
      "h2": "Oswald",
      "body": "Oswald",
      "small": "Oswald"
    },
    "styles": {
      "h1": {
        "fontSize": 74,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#1c2e4a"
      },
      "h2": {
        "fontSize": 24,
        "letterSpacing": 30,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#3b5998"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 5,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#333333"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 25,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#555555"
      }
    }
  },
  {
    "id": "TP-PRO-072",
    "name": "Vidaloka + Oswald (Sage Botanical)",
    "category": "editorial",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Vidaloka",
      "h2": "Oswald",
      "body": "Oswald",
      "small": "Oswald"
    },
    "styles": {
      "h1": {
        "fontSize": 74,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#6e7a63"
      },
      "h2": {
        "fontSize": 24,
        "letterSpacing": 30,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#8b9680"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 5,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 25,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#757575"
      }
    }
  },
  {
    "id": "TP-PRO-073",
    "name": "Abril Fatface + Yeseva One (Onyx Monochrome)",
    "category": "editorial",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Abril Fatface",
      "h2": "Yeseva One",
      "body": "Inter",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 70,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#111111"
      },
      "h2": {
        "fontSize": 26,
        "letterSpacing": 10,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#222222"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#444444"
      },
      "small": {
        "fontSize": 12,
        "letterSpacing": 15,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#666666"
      }
    }
  },
  {
    "id": "TP-PRO-074",
    "name": "Abril Fatface + Yeseva One (Champagne Gold)",
    "category": "editorial",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Abril Fatface",
      "h2": "Yeseva One",
      "body": "Inter",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 70,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#b8945a"
      },
      "h2": {
        "fontSize": 26,
        "letterSpacing": 10,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#b8945a"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 12,
        "letterSpacing": 15,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#808080"
      }
    }
  },
  {
    "id": "TP-PRO-075",
    "name": "Abril Fatface + Yeseva One (Navy Royal)",
    "category": "editorial",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Abril Fatface",
      "h2": "Yeseva One",
      "body": "Inter",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 70,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#1c2e4a"
      },
      "h2": {
        "fontSize": 26,
        "letterSpacing": 10,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#3b5998"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#333333"
      },
      "small": {
        "fontSize": 12,
        "letterSpacing": 15,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#555555"
      }
    }
  },
  {
    "id": "TP-PRO-076",
    "name": "Abril Fatface + Yeseva One (Sage Botanical)",
    "category": "editorial",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Abril Fatface",
      "h2": "Yeseva One",
      "body": "Inter",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 70,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#6e7a63"
      },
      "h2": {
        "fontSize": 26,
        "letterSpacing": 10,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#8b9680"
      },
      "body": {
        "fontSize": 15,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 12,
        "letterSpacing": 15,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#757575"
      }
    }
  },
  {
    "id": "TP-PRO-077",
    "name": "Libre Caslon Text + Old Standard TT (Onyx Monochrome)",
    "category": "classic",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Libre Caslon Text",
      "h2": "Old Standard TT",
      "body": "Old Standard TT",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 80,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#111111"
      },
      "h2": {
        "fontSize": 28,
        "letterSpacing": 15,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#222222"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#444444"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 10,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#666666"
      }
    }
  },
  {
    "id": "TP-PRO-078",
    "name": "Libre Caslon Text + Old Standard TT (Champagne Gold)",
    "category": "classic",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Libre Caslon Text",
      "h2": "Old Standard TT",
      "body": "Old Standard TT",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 80,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#b8945a"
      },
      "h2": {
        "fontSize": 28,
        "letterSpacing": 15,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#b8945a"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 10,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#808080"
      }
    }
  },
  {
    "id": "TP-PRO-079",
    "name": "Libre Caslon Text + Old Standard TT (Navy Royal)",
    "category": "classic",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Libre Caslon Text",
      "h2": "Old Standard TT",
      "body": "Old Standard TT",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 80,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#1c2e4a"
      },
      "h2": {
        "fontSize": 28,
        "letterSpacing": 15,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#3b5998"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#333333"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 10,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#555555"
      }
    }
  },
  {
    "id": "TP-PRO-080",
    "name": "Libre Caslon Text + Old Standard TT (Sage Botanical)",
    "category": "classic",
    "lockedFonts": true,
    "alignment": "center",
    "fonts": {
      "h1": "Libre Caslon Text",
      "h2": "Old Standard TT",
      "body": "Old Standard TT",
      "small": "Inter"
    },
    "styles": {
      "h1": {
        "fontSize": 80,
        "letterSpacing": 0,
        "lineHeight": 1.1,
        "textTransform": "none",
        "color": "#6e7a63"
      },
      "h2": {
        "fontSize": 28,
        "letterSpacing": 15,
        "lineHeight": 1.3,
        "textTransform": "uppercase",
        "color": "#8b9680"
      },
      "body": {
        "fontSize": 16,
        "letterSpacing": 0,
        "lineHeight": 1.5,
        "textTransform": "none",
        "color": "#4a4a4a"
      },
      "small": {
        "fontSize": 11,
        "letterSpacing": 10,
        "lineHeight": 1.4,
        "textTransform": "uppercase",
        "color": "#757575"
      }
    }
  }
];
