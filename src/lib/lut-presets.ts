export interface LUTDefinition {
  id: string;
  name: string;
  category: string;
  subCategory: string;
  intent: string;
  contrast?: number; // -100 to 100
  brightness?: number; // -1 to 1
  hue?: number; // 0 to 359
  saturation?: number; // -1 to 1 (or Konva scale)
  luminance?: number; // -1 to 1
  sepia?: boolean;
  grayscale?: boolean;
  invert?: boolean;
}

export const LUT_LIBRARY: LUTDefinition[] = [
  {
    id: "lut_kodak_portra_400_soft",
    name: "Kodak Portra 400 Soft",
    category: "CINEMATIC FILM",
    subCategory: "Kodak Style",
    intent: "warm tones, soft contrast, creamy highlights",
    contrast: 15,
    saturation: 0.5,
    sepia: true
  },
  {
    id: "lut_kodak_portra_160_natural",
    name: "Kodak Portra 160 Natural",
    category: "CINEMATIC FILM",
    subCategory: "Kodak Style",
    intent: "neutral skin, balanced exposure"
  },
  {
    id: "lut_kodak_gold_warm",
    name: "Kodak Gold Warm",
    category: "CINEMATIC FILM",
    subCategory: "Kodak Style",
    intent: "nostalgic warmth, slight yellow tint",
    contrast: 5,
    saturation: 0.5,
    sepia: true
  },
  {
    id: "lut_kodak_vision3_clean",
    name: "Kodak Vision3 Clean",
    category: "CINEMATIC FILM",
    subCategory: "Kodak Style",
    intent: "cinematic neutral base",
    contrast: 5,
    saturation: 0.2
  },
  {
    id: "lut_kodak_matte_film",
    name: "Kodak Matte Film",
    category: "CINEMATIC FILM",
    subCategory: "Kodak Style",
    intent: "lifted blacks, film fade",
    contrast: -20,
    brightness: 0.08,
    saturation: -0.5
  },
  {
    id: "lut_fuji_pro_400h_pastel",
    name: "Fuji Pro 400H Pastel",
    category: "CINEMATIC FILM",
    subCategory: "Fuji Style",
    intent: "soft greens, pastel tones",
    contrast: -5,
    brightness: 0.05,
    saturation: -0.3
  },
  {
    id: "lut_fuji_astia_portrait",
    name: "Fuji Astia Portrait",
    category: "CINEMATIC FILM",
    subCategory: "Fuji Style",
    intent: "smooth skin tones"
  },
  {
    id: "lut_fuji_velvia_soft",
    name: "Fuji Velvia Soft",
    category: "CINEMATIC FILM",
    subCategory: "Fuji Style",
    intent: "controlled vibrance",
    contrast: -10
  },
  {
    id: "lut_fuji_neutral_film",
    name: "Fuji Neutral Film",
    category: "CINEMATIC FILM",
    subCategory: "Fuji Style",
    intent: "balanced cinematic look",
    contrast: 5,
    saturation: 0.2
  },
  {
    id: "lut_fuji_matte_fade",
    name: "Fuji Matte Fade",
    category: "CINEMATIC FILM",
    subCategory: "Fuji Style",
    intent: "soft faded film",
    contrast: -20,
    brightness: 0.08,
    saturation: -0.5
  },
  {
    id: "lut_true_color_clean",
    name: "True Color Clean",
    category: "NATURAL / TRUE COLOR",
    subCategory: "Neutral Base",
    intent: "accurate color reproduction",
    contrast: 5,
    saturation: 0.2
  },
  {
    id: "lut_studio_neutral",
    name: "Studio Neutral",
    category: "NATURAL / TRUE COLOR",
    subCategory: "Neutral Base",
    intent: "balanced whites and contrast",
    contrast: 5,
    saturation: 0.2
  },
  {
    id: "lut_daylight_balanced",
    name: "Daylight Balanced",
    category: "NATURAL / TRUE COLOR",
    subCategory: "Neutral Base",
    intent: "natural daylight correction"
  },
  {
    id: "lut_soft_contrast_natural",
    name: "Soft Contrast Natural",
    category: "NATURAL / TRUE COLOR",
    subCategory: "Neutral Base",
    intent: "slight depth enhancement",
    contrast: 15
  },
  {
    id: "lut_white_tone_enhancer",
    name: "White Tone Enhancer",
    category: "NATURAL / TRUE COLOR",
    subCategory: "Neutral Base",
    intent: "clean whites without clipping"
  },
  {
    id: "lut_skin_tone_protect",
    name: "Skin Tone Protect",
    category: "NATURAL / TRUE COLOR",
    subCategory: "Skin Protection",
    intent: "preserves natural skin hues"
  },
  {
    id: "lut_portrait_neutral",
    name: "Portrait Neutral",
    category: "NATURAL / TRUE COLOR",
    subCategory: "Skin Protection",
    intent: "soft skin rendering",
    contrast: 5,
    saturation: 0.2
  },
  {
    id: "lut_warm_skin_balance",
    name: "Warm Skin Balance",
    category: "NATURAL / TRUE COLOR",
    subCategory: "Skin Protection",
    intent: "slight warmth for faces",
    saturation: 0.5,
    sepia: true
  },
  {
    id: "lut_soft_beauty_tone",
    name: "Soft Beauty Tone",
    category: "NATURAL / TRUE COLOR",
    subCategory: "Skin Protection",
    intent: "flattering skin glow",
    contrast: -10
  },
  {
    id: "lut_clean_portrait_base",
    name: "Clean Portrait Base",
    category: "NATURAL / TRUE COLOR",
    subCategory: "Skin Protection",
    intent: "professional portrait look",
    contrast: 5,
    saturation: 0.2
  },
  {
    id: "lut_golden_hour_glow",
    name: "Golden Hour Glow",
    category: "WARM / GOLDEN",
    subCategory: "Golden Hour",
    intent: "warm highlights, soft shadows",
    contrast: 5,
    saturation: 0.5,
    sepia: true
  },
  {
    id: "lut_sunset_warm_fade",
    name: "Sunset Warm Fade",
    category: "WARM / GOLDEN",
    subCategory: "Golden Hour",
    intent: "orange-pink tones",
    contrast: -20,
    brightness: 0.08,
    saturation: 0.5,
    sepia: true
  },
  {
    id: "lut_honey_light",
    name: "Honey Light",
    category: "WARM / GOLDEN",
    subCategory: "Golden Hour",
    intent: "rich golden tones",
    contrast: 5,
    sepia: true
  },
  {
    id: "lut_warm_film_light",
    name: "Warm Film Light",
    category: "WARM / GOLDEN",
    subCategory: "Golden Hour",
    intent: "cinematic warmth",
    saturation: 0.5,
    sepia: true
  },
  {
    id: "lut_golden_matte",
    name: "Golden Matte",
    category: "WARM / GOLDEN",
    subCategory: "Golden Hour",
    intent: "faded warm blacks",
    contrast: 5,
    brightness: 0.08,
    saturation: 0.5,
    sepia: true
  },
  {
    id: "lut_romantic_warm_film",
    name: "Romantic Warm Film",
    category: "WARM / GOLDEN",
    subCategory: "Romantic",
    intent: "wedding tones",
    saturation: 0.5,
    sepia: true
  },
  {
    id: "lut_peach_skin_tone",
    name: "Peach Skin Tone",
    category: "WARM / GOLDEN",
    subCategory: "Romantic",
    intent: "soft peach highlights",
    contrast: -10
  },
  {
    id: "lut_soft_amber_lut",
    name: "Soft Amber LUT",
    category: "WARM / GOLDEN",
    subCategory: "Romantic",
    intent: "subtle amber tint",
    contrast: -10
  },
  {
    id: "lut_autumn_warm_tone",
    name: "Autumn Warm Tone",
    category: "WARM / GOLDEN",
    subCategory: "Romantic",
    intent: "seasonal warmth",
    saturation: 0.5,
    sepia: true
  },
  {
    id: "lut_warm_vintage_glow",
    name: "Warm Vintage Glow",
    category: "WARM / GOLDEN",
    subCategory: "Romantic",
    intent: "nostalgic warmth",
    saturation: 0.5,
    sepia: true
  },
  {
    id: "lut_cool_neutral",
    name: "Cool Neutral",
    category: "COOL / MODERN",
    subCategory: "Clean Cool",
    intent: "subtle blue tones",
    contrast: 5,
    saturation: 0.2,
    hue: 210
  },
  {
    id: "lut_minimal_cool_contrast",
    name: "Minimal Cool Contrast",
    category: "COOL / MODERN",
    subCategory: "Clean Cool",
    intent: "modern clean look",
    contrast: 15,
    saturation: 0.5,
    hue: 210
  },
  {
    id: "lut_urban_cool_tone",
    name: "Urban Cool Tone",
    category: "COOL / MODERN",
    subCategory: "Clean Cool",
    intent: "city aesthetic",
    saturation: 0.5,
    hue: 210
  },
  {
    id: "lut_silver_tone",
    name: "Silver Tone",
    category: "COOL / MODERN",
    subCategory: "Clean Cool",
    intent: "slight desaturation",
    grayscale: true
  },
  {
    id: "lut_cool_studio",
    name: "Cool Studio",
    category: "COOL / MODERN",
    subCategory: "Clean Cool",
    intent: "controlled cool lighting",
    saturation: 0.5,
    hue: 210
  },
  {
    id: "lut_soft_teal_shadow",
    name: "Soft Teal Shadow",
    category: "COOL / MODERN",
    subCategory: "Cinematic Cool",
    intent: "teal shadows only",
    contrast: -10,
    saturation: 0.5,
    hue: 180
  },
  {
    id: "lut_blue_shadow_lift",
    name: "Blue Shadow Lift",
    category: "COOL / MODERN",
    subCategory: "Cinematic Cool",
    intent: "cool shadow lift",
    saturation: 0.5,
    hue: 210
  },
  {
    id: "lut_cyan_balance",
    name: "Cyan Balance",
    category: "COOL / MODERN",
    subCategory: "Cinematic Cool",
    intent: "slight cyan tint",
    saturation: 0.5,
    hue: 180
  },
  {
    id: "lut_cool_matte_film",
    name: "Cool Matte Film",
    category: "COOL / MODERN",
    subCategory: "Cinematic Cool",
    intent: "faded cool blacks",
    contrast: -20,
    brightness: 0.08,
    saturation: 0.5,
    hue: 210
  },
  {
    id: "lut_modern_clean_lut",
    name: "Modern Clean LUT",
    category: "COOL / MODERN",
    subCategory: "Cinematic Cool",
    intent: "crisp modern tone",
    contrast: 5,
    saturation: 0.2
  },
  {
    id: "lut_vintage_fade_soft",
    name: "Vintage Fade Soft",
    category: "VINTAGE / FADED",
    subCategory: "Film Fade",
    intent: "lifted blacks",
    contrast: -20,
    brightness: 0.08,
    saturation: -0.5
  },
  {
    id: "lut_faded_film_classic",
    name: "Faded Film Classic",
    category: "VINTAGE / FADED",
    subCategory: "Film Fade",
    intent: "analog feel",
    contrast: -20,
    brightness: 0.08,
    saturation: -0.5
  },
  {
    id: "lut_dusty_vintage",
    name: "Dusty Vintage",
    category: "VINTAGE / FADED",
    subCategory: "Film Fade",
    intent: "muted colors"
  },
  {
    id: "lut_cream_tone_vintage",
    name: "Cream Tone Vintage",
    category: "VINTAGE / FADED",
    subCategory: "Film Fade",
    intent: "creamy whites"
  },
  {
    id: "lut_retro_matte",
    name: "Retro Matte",
    category: "VINTAGE / FADED",
    subCategory: "Film Fade",
    intent: "soft contrast matte",
    contrast: 15,
    brightness: 0.05
  },
  {
    id: "lut_analog_wash",
    name: "Analog Wash",
    category: "VINTAGE / FADED",
    subCategory: "Analog Style",
    intent: "film wash look"
  },
  {
    id: "lut_old_film_neutral",
    name: "Old Film Neutral",
    category: "VINTAGE / FADED",
    subCategory: "Analog Style",
    intent: "subtle vintage",
    contrast: 5,
    saturation: 0.2
  },
  {
    id: "lut_film_grain_soft_tone",
    name: "Film Grain Soft Tone",
    category: "VINTAGE / FADED",
    subCategory: "Analog Style",
    intent: "texture-ready",
    contrast: -10
  },
  {
    id: "lut_muted_film_look",
    name: "Muted Film Look",
    category: "VINTAGE / FADED",
    subCategory: "Analog Style",
    intent: "reduced saturation",
    saturation: -1.5
  },
  {
    id: "lut_soft_retro_portrait",
    name: "Soft Retro Portrait",
    category: "VINTAGE / FADED",
    subCategory: "Analog Style",
    intent: "vintage portrait",
    contrast: -10
  },
  {
    id: "lut_editorial_clean",
    name: "Editorial Clean",
    category: "EDITORIAL / FASHION",
    subCategory: "Magazine Style",
    intent: "high-end magazine tone",
    contrast: 5,
    saturation: 0.2
  },
  {
    id: "lut_fashion_neutral",
    name: "Fashion Neutral",
    category: "EDITORIAL / FASHION",
    subCategory: "Magazine Style",
    intent: "clean contrast",
    contrast: 5,
    saturation: 0.2
  },
  {
    id: "lut_soft_highlight_fashion",
    name: "Soft Highlight Fashion",
    category: "EDITORIAL / FASHION",
    subCategory: "Magazine Style",
    intent: "bright but controlled",
    contrast: -10
  },
  {
    id: "lut_matte_editorial",
    name: "Matte Editorial",
    category: "EDITORIAL / FASHION",
    subCategory: "Magazine Style",
    intent: "flat premium look",
    contrast: -15,
    brightness: 0.05
  },
  {
    id: "lut_studio_fashion_glow",
    name: "Studio Fashion Glow",
    category: "EDITORIAL / FASHION",
    subCategory: "Magazine Style",
    intent: "controlled highlight rolloff"
  },
  {
    id: "lut_luxury_tone",
    name: "Luxury Tone",
    category: "EDITORIAL / FASHION",
    subCategory: "High-End Look",
    intent: "rich but soft",
    contrast: -10
  },
  {
    id: "lut_premium_skin_lut",
    name: "Premium Skin LUT",
    category: "EDITORIAL / FASHION",
    subCategory: "High-End Look",
    intent: "polished skin tone"
  },
  {
    id: "lut_clean_contrast_pro",
    name: "Clean Contrast Pro",
    category: "EDITORIAL / FASHION",
    subCategory: "High-End Look",
    intent: "subtle depth",
    contrast: 5,
    saturation: 0.2
  },
  {
    id: "lut_soft_luxe_fade",
    name: "Soft Luxe Fade",
    category: "EDITORIAL / FASHION",
    subCategory: "High-End Look",
    intent: "premium matte",
    contrast: -20,
    brightness: 0.08,
    saturation: -0.5
  },
  {
    id: "lut_neutral_fashion_film",
    name: "Neutral Fashion Film",
    category: "EDITORIAL / FASHION",
    subCategory: "High-End Look",
    intent: "editorial film look",
    contrast: 5,
    saturation: 0.2
  },
  {
    id: "lut_pastel_soft_wash",
    name: "Pastel Soft Wash",
    category: "CREATIVE SOFT",
    subCategory: "Pastel",
    intent: "light pastel tones",
    contrast: -5,
    brightness: 0.05,
    saturation: -0.3
  },
  {
    id: "lut_soft_pink_tint",
    name: "Soft Pink Tint",
    category: "CREATIVE SOFT",
    subCategory: "Pastel",
    intent: "subtle pink glow",
    contrast: -10
  },
  {
    id: "lut_light_blue_pastel",
    name: "Light Blue Pastel",
    category: "CREATIVE SOFT",
    subCategory: "Pastel",
    intent: "airy tones",
    contrast: -5,
    brightness: 0.05,
    saturation: -0.3,
    hue: 210
  },
  {
    id: "lut_dreamy_pastel_fade",
    name: "Dreamy Pastel Fade",
    category: "CREATIVE SOFT",
    subCategory: "Pastel",
    intent: "soft dreamy look",
    contrast: -5,
    brightness: 0.05,
    saturation: -0.3
  },
  {
    id: "lut_cream_pastel_tone",
    name: "Cream Pastel Tone",
    category: "CREATIVE SOFT",
    subCategory: "Pastel",
    intent: "warm pastel mix",
    contrast: -5,
    brightness: 0.05,
    saturation: -0.3,
    sepia: true
  },
  {
    id: "lut_soft_artistic_fade",
    name: "Soft Artistic Fade",
    category: "CREATIVE SOFT",
    subCategory: "Artistic",
    intent: "creative fade",
    contrast: -20,
    brightness: 0.08,
    saturation: -0.5
  },
  {
    id: "lut_light_leak_soft",
    name: "Light Leak Soft",
    category: "CREATIVE SOFT",
    subCategory: "Artistic",
    intent: "minimal light leaks",
    contrast: -10
  },
  {
    id: "lut_dream_tone_lut",
    name: "Dream Tone LUT",
    category: "CREATIVE SOFT",
    subCategory: "Artistic",
    intent: "cinematic dreamy feel"
  },
  {
    id: "lut_desaturated_art",
    name: "Desaturated Art",
    category: "CREATIVE SOFT",
    subCategory: "Artistic",
    intent: "muted artistic tone"
  },
  {
    id: "lut_soft_contrast_dream",
    name: "Soft Contrast Dream",
    category: "CREATIVE SOFT",
    subCategory: "Artistic",
    intent: "soft shadows",
    contrast: 15
  },
  {
    id: "lut_classic_bw_neutral",
    name: "Classic BW Neutral",
    category: "BLACK & WHITE",
    subCategory: "Classic BW",
    intent: "balanced grayscale",
    contrast: 5,
    saturation: 0.2,
    grayscale: true
  },
  {
    id: "lut_soft_contrast_bw",
    name: "Soft Contrast BW",
    category: "BLACK & WHITE",
    subCategory: "Classic BW",
    intent: "gentle contrast",
    contrast: 15,
    grayscale: true
  },
  {
    id: "lut_matte_bw_film",
    name: "Matte BW Film",
    category: "BLACK & WHITE",
    subCategory: "Classic BW",
    intent: "faded black tones",
    contrast: -20,
    brightness: 0.08,
    saturation: -0.5,
    grayscale: true
  },
  {
    id: "lut_high_key_bw",
    name: "High Key BW",
    category: "BLACK & WHITE",
    subCategory: "Classic BW",
    intent: "bright whites",
    grayscale: true
  },
  {
    id: "lut_low_key_bw",
    name: "Low Key BW",
    category: "BLACK & WHITE",
    subCategory: "Classic BW",
    intent: "deep shadows controlled",
    grayscale: true
  },
  {
    id: "lut_vintage_bw_wash",
    name: "Vintage BW Wash",
    category: "BLACK & WHITE",
    subCategory: "Artistic BW",
    intent: "faded monochrome",
    contrast: -20,
    brightness: 0.08,
    saturation: -0.5,
    grayscale: true
  },
  {
    id: "lut_silver_bw_tone",
    name: "Silver BW Tone",
    category: "BLACK & WHITE",
    subCategory: "Artistic BW",
    intent: "film silver effect",
    grayscale: true
  },
  {
    id: "lut_portrait_bw_soft",
    name: "Portrait BW Soft",
    category: "BLACK & WHITE",
    subCategory: "Artistic BW",
    intent: "skin-friendly grayscale",
    contrast: -10,
    grayscale: true
  },
  {
    id: "lut_editorial_bw",
    name: "Editorial BW",
    category: "BLACK & WHITE",
    subCategory: "Artistic BW",
    intent: "magazine look",
    grayscale: true
  },
  {
    id: "lut_clean_bw_studio",
    name: "Clean BW Studio",
    category: "BLACK & WHITE",
    subCategory: "Artistic BW",
    intent: "studio monochrome",
    contrast: 5,
    saturation: 0.2,
    grayscale: true
  },
  {
    id: "lut_natural_greens_boost",
    name: "Natural Greens Boost",
    category: "LANDSCAPE SAFE",
    subCategory: "Nature",
    intent: "controlled greens",
    saturation: 1
  },
  {
    id: "lut_earth_tone_balance",
    name: "Earth Tone Balance",
    category: "LANDSCAPE SAFE",
    subCategory: "Nature",
    intent: "realistic earth tones"
  },
  {
    id: "lut_sky_soft_blue",
    name: "Sky Soft Blue",
    category: "LANDSCAPE SAFE",
    subCategory: "Nature",
    intent: "natural sky tones",
    contrast: -10,
    saturation: 0.5,
    hue: 210
  },
  {
    id: "lut_landscape_neutral",
    name: "Landscape Neutral",
    category: "LANDSCAPE SAFE",
    subCategory: "Nature",
    intent: "realistic scene",
    contrast: 5,
    saturation: 0.2
  },
  {
    id: "lut_soft_hdr_look",
    name: "Soft HDR Look",
    category: "LANDSCAPE SAFE",
    subCategory: "Nature",
    intent: "gentle dynamic range",
    contrast: -10
  },
  {
    id: "lut_warm_travel_tone",
    name: "Warm Travel Tone",
    category: "LANDSCAPE SAFE",
    subCategory: "Travel",
    intent: "inviting warmth",
    saturation: 0.5,
    sepia: true
  },
  {
    id: "lut_cool_travel_film",
    name: "Cool Travel Film",
    category: "LANDSCAPE SAFE",
    subCategory: "Travel",
    intent: "modern travel look",
    saturation: 0.5,
    hue: 210
  },
  {
    id: "lut_natural_vibrance",
    name: "Natural Vibrance",
    category: "LANDSCAPE SAFE",
    subCategory: "Travel",
    intent: "subtle color boost",
    saturation: 1
  },
  {
    id: "lut_scenic_matte",
    name: "Scenic Matte",
    category: "LANDSCAPE SAFE",
    subCategory: "Travel",
    intent: "cinematic landscape",
    contrast: -15,
    brightness: 0.05
  },
  {
    id: "lut_clean_outdoor_lut",
    name: "Clean Outdoor LUT",
    category: "LANDSCAPE SAFE",
    subCategory: "Travel",
    intent: "crisp outdoor tones",
    contrast: 5,
    saturation: 0.2
  },
  {
    id: "lut_base_correction_neutral",
    name: "Base Correction Neutral",
    category: "UNIVERSAL BASE",
    subCategory: "Workflow Base",
    intent: "starting LUT",
    contrast: 5,
    saturation: 0.2
  },
  {
    id: "lut_soft_contrast_base",
    name: "Soft Contrast Base",
    category: "UNIVERSAL BASE",
    subCategory: "Workflow Base",
    intent: "mild depth",
    contrast: 15
  },
  {
    id: "lut_exposure_balance_lut",
    name: "Exposure Balance LUT",
    category: "UNIVERSAL BASE",
    subCategory: "Workflow Base",
    intent: "correct exposure bias"
  },
  {
    id: "lut_highlight_recovery_lut",
    name: "Highlight Recovery LUT",
    category: "UNIVERSAL BASE",
    subCategory: "Workflow Base",
    intent: "protect highlights"
  },
  {
    id: "lut_shadow_lift_base",
    name: "Shadow Lift Base",
    category: "UNIVERSAL BASE",
    subCategory: "Workflow Base",
    intent: "open shadows"
  },
  {
    id: "lut_final_polish_soft",
    name: "Final Polish Soft",
    category: "UNIVERSAL BASE",
    subCategory: "Finishing LUTs",
    intent: "finishing touch",
    contrast: -10
  },
  {
    id: "lut_subtle_contrast_finish",
    name: "Subtle Contrast Finish",
    category: "UNIVERSAL BASE",
    subCategory: "Finishing LUTs",
    intent: "light contrast",
    contrast: 15
  },
  {
    id: "lut_skin_tone_finalizer",
    name: "Skin Tone Finalizer",
    category: "UNIVERSAL BASE",
    subCategory: "Finishing LUTs",
    intent: "refine skin tones"
  },
  {
    id: "lut_print_safe_final_lut",
    name: "Print Safe Final LUT",
    category: "UNIVERSAL BASE",
    subCategory: "Finishing LUTs",
    intent: "optimized for printing"
  },
  {
    id: "lut_master_neutral_finish",
    name: "Master Neutral Finish",
    category: "UNIVERSAL BASE",
    subCategory: "Finishing LUTs",
    intent: "universal final pass",
    contrast: 5,
    saturation: 0.2
  },
];
