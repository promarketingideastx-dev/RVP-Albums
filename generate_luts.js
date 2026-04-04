const fs = require('fs');

const lutsRaw = `
1. Kodak Portra 400 Soft – warm tones, soft contrast, creamy highlights::CINEMATIC FILM::Kodak Style
2. Kodak Portra 160 Natural – neutral skin, balanced exposure::CINEMATIC FILM::Kodak Style
3. Kodak Gold Warm – nostalgic warmth, slight yellow tint::CINEMATIC FILM::Kodak Style
4. Kodak Vision3 Clean – cinematic neutral base::CINEMATIC FILM::Kodak Style
5. Kodak Matte Film – lifted blacks, film fade::CINEMATIC FILM::Kodak Style
6. Fuji Pro 400H Pastel – soft greens, pastel tones::CINEMATIC FILM::Fuji Style
7. Fuji Astia Portrait – smooth skin tones::CINEMATIC FILM::Fuji Style
8. Fuji Velvia Soft – controlled vibrance::CINEMATIC FILM::Fuji Style
9. Fuji Neutral Film – balanced cinematic look::CINEMATIC FILM::Fuji Style
10. Fuji Matte Fade – soft faded film::CINEMATIC FILM::Fuji Style
11. True Color Clean – accurate color reproduction::NATURAL / TRUE COLOR::Neutral Base
12. Studio Neutral – balanced whites and contrast::NATURAL / TRUE COLOR::Neutral Base
13. Daylight Balanced – natural daylight correction::NATURAL / TRUE COLOR::Neutral Base
14. Soft Contrast Natural – slight depth enhancement::NATURAL / TRUE COLOR::Neutral Base
15. White Tone Enhancer – clean whites without clipping::NATURAL / TRUE COLOR::Neutral Base
16. Skin Tone Protect – preserves natural skin hues::NATURAL / TRUE COLOR::Skin Protection
17. Portrait Neutral – soft skin rendering::NATURAL / TRUE COLOR::Skin Protection
18. Warm Skin Balance – slight warmth for faces::NATURAL / TRUE COLOR::Skin Protection
19. Soft Beauty Tone – flattering skin glow::NATURAL / TRUE COLOR::Skin Protection
20. Clean Portrait Base – professional portrait look::NATURAL / TRUE COLOR::Skin Protection
21. Golden Hour Glow – warm highlights, soft shadows::WARM / GOLDEN::Golden Hour
22. Sunset Warm Fade – orange-pink tones::WARM / GOLDEN::Golden Hour
23. Honey Light – rich golden tones::WARM / GOLDEN::Golden Hour
24. Warm Film Light – cinematic warmth::WARM / GOLDEN::Golden Hour
25. Golden Matte – faded warm blacks::WARM / GOLDEN::Golden Hour
26. Romantic Warm Film – wedding tones::WARM / GOLDEN::Romantic
27. Peach Skin Tone – soft peach highlights::WARM / GOLDEN::Romantic
28. Soft Amber LUT – subtle amber tint::WARM / GOLDEN::Romantic
29. Autumn Warm Tone – seasonal warmth::WARM / GOLDEN::Romantic
30. Warm Vintage Glow – nostalgic warmth::WARM / GOLDEN::Romantic
31. Cool Neutral – subtle blue tones::COOL / MODERN::Clean Cool
32. Minimal Cool Contrast – modern clean look::COOL / MODERN::Clean Cool
33. Urban Cool Tone – city aesthetic::COOL / MODERN::Clean Cool
34. Silver Tone – slight desaturation::COOL / MODERN::Clean Cool
35. Cool Studio – controlled cool lighting::COOL / MODERN::Clean Cool
36. Soft Teal Shadow – teal shadows only::COOL / MODERN::Cinematic Cool
37. Blue Shadow Lift – cool shadow lift::COOL / MODERN::Cinematic Cool
38. Cyan Balance – slight cyan tint::COOL / MODERN::Cinematic Cool
39. Cool Matte Film – faded cool blacks::COOL / MODERN::Cinematic Cool
40. Modern Clean LUT – crisp modern tone::COOL / MODERN::Cinematic Cool
41. Vintage Fade Soft – lifted blacks::VINTAGE / FADED::Film Fade
42. Faded Film Classic – analog feel::VINTAGE / FADED::Film Fade
43. Dusty Vintage – muted colors::VINTAGE / FADED::Film Fade
44. Cream Tone Vintage – creamy whites::VINTAGE / FADED::Film Fade
45. Retro Matte – soft contrast matte::VINTAGE / FADED::Film Fade
46. Analog Wash – film wash look::VINTAGE / FADED::Analog Style
47. Old Film Neutral – subtle vintage::VINTAGE / FADED::Analog Style
48. Film Grain Soft Tone – texture-ready::VINTAGE / FADED::Analog Style
49. Muted Film Look – reduced saturation::VINTAGE / FADED::Analog Style
50. Soft Retro Portrait – vintage portrait::VINTAGE / FADED::Analog Style
51. Editorial Clean – high-end magazine tone::EDITORIAL / FASHION::Magazine Style
52. Fashion Neutral – clean contrast::EDITORIAL / FASHION::Magazine Style
53. Soft Highlight Fashion – bright but controlled::EDITORIAL / FASHION::Magazine Style
54. Matte Editorial – flat premium look::EDITORIAL / FASHION::Magazine Style
55. Studio Fashion Glow – controlled highlight rolloff::EDITORIAL / FASHION::Magazine Style
56. Luxury Tone – rich but soft::EDITORIAL / FASHION::High-End Look
57. Premium Skin LUT – polished skin tone::EDITORIAL / FASHION::High-End Look
58. Clean Contrast Pro – subtle depth::EDITORIAL / FASHION::High-End Look
59. Soft Luxe Fade – premium matte::EDITORIAL / FASHION::High-End Look
60. Neutral Fashion Film – editorial film look::EDITORIAL / FASHION::High-End Look
61. Pastel Soft Wash – light pastel tones::CREATIVE SOFT::Pastel
62. Soft Pink Tint – subtle pink glow::CREATIVE SOFT::Pastel
63. Light Blue Pastel – airy tones::CREATIVE SOFT::Pastel
64. Dreamy Pastel Fade – soft dreamy look::CREATIVE SOFT::Pastel
65. Cream Pastel Tone – warm pastel mix::CREATIVE SOFT::Pastel
66. Soft Artistic Fade – creative fade::CREATIVE SOFT::Artistic
67. Light Leak Soft – minimal light leaks::CREATIVE SOFT::Artistic
68. Dream Tone LUT – cinematic dreamy feel::CREATIVE SOFT::Artistic
69. Desaturated Art – muted artistic tone::CREATIVE SOFT::Artistic
70. Soft Contrast Dream – soft shadows::CREATIVE SOFT::Artistic
71. Classic BW Neutral – balanced grayscale::BLACK & WHITE::Classic BW
72. Soft Contrast BW – gentle contrast::BLACK & WHITE::Classic BW
73. Matte BW Film – faded black tones::BLACK & WHITE::Classic BW
74. High Key BW – bright whites::BLACK & WHITE::Classic BW
75. Low Key BW – deep shadows controlled::BLACK & WHITE::Classic BW
76. Vintage BW Wash – faded monochrome::BLACK & WHITE::Artistic BW
77. Silver BW Tone – film silver effect::BLACK & WHITE::Artistic BW
78. Portrait BW Soft – skin-friendly grayscale::BLACK & WHITE::Artistic BW
79. Editorial BW – magazine look::BLACK & WHITE::Artistic BW
80. Clean BW Studio – studio monochrome::BLACK & WHITE::Artistic BW
81. Natural Greens Boost – controlled greens::LANDSCAPE SAFE::Nature
82. Earth Tone Balance – realistic earth tones::LANDSCAPE SAFE::Nature
83. Sky Soft Blue – natural sky tones::LANDSCAPE SAFE::Nature
84. Landscape Neutral – realistic scene::LANDSCAPE SAFE::Nature
85. Soft HDR Look – gentle dynamic range::LANDSCAPE SAFE::Nature
86. Warm Travel Tone – inviting warmth::LANDSCAPE SAFE::Travel
87. Cool Travel Film – modern travel look::LANDSCAPE SAFE::Travel
88. Natural Vibrance – subtle color boost::LANDSCAPE SAFE::Travel
89. Scenic Matte – cinematic landscape::LANDSCAPE SAFE::Travel
90. Clean Outdoor LUT – crisp outdoor tones::LANDSCAPE SAFE::Travel
91. Base Correction Neutral – starting LUT::UNIVERSAL BASE::Workflow Base
92. Soft Contrast Base – mild depth::UNIVERSAL BASE::Workflow Base
93. Exposure Balance LUT – correct exposure bias::UNIVERSAL BASE::Workflow Base
94. Highlight Recovery LUT – protect highlights::UNIVERSAL BASE::Workflow Base
95. Shadow Lift Base – open shadows::UNIVERSAL BASE::Workflow Base
96. Final Polish Soft – finishing touch::UNIVERSAL BASE::Finishing LUTs
97. Subtle Contrast Finish – light contrast::UNIVERSAL BASE::Finishing LUTs
98. Skin Tone Finalizer – refine skin tones::UNIVERSAL BASE::Finishing LUTs
99. Print Safe Final LUT – optimized for printing::UNIVERSAL BASE::Finishing LUTs
100. Master Neutral Finish – universal final pass::UNIVERSAL BASE::Finishing LUTs
`.split('\n').filter(Boolean);

let result = `export interface LUTDefinition {
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
`;

lutsRaw.forEach((line) => {
  const [desc, cat, subcat] = line.split('::');
  const match = desc.match(/^\d+\.\s*(.*?)\s*–\s*(.*)$/);
  if(!match) return;
  const name = match[1];
  const intent = match[2];
  const lowName = name.toLowerCase();
  
  let contrast = 0;
  let brightness = 0;
  let saturation = 0;
  let sepia = false;
  let grayscale = false;
  let hue = 0;
  
  // Mathematical logic based on names!
  if(lowName.includes('soft') || desc.includes('soft')) contrast = -10;
  if(lowName.includes('matte') || desc.includes('matte')) { contrast = -15; brightness = 0.05; }
  if(lowName.includes('contrast')) contrast = 15;
  if(lowName.includes('fade')) { contrast = -20; brightness = 0.08; saturation = -0.1; }
  
  if(lowName.includes('warm') || desc.includes('warm')) { sepia = true; hue = 30; saturation = 0.1; }
  if(lowName.includes('cool') || desc.includes('cool') || lowName.includes('blue')) { hue = 210; saturation = 0.1; }
  if(lowName.includes('cyan') || lowName.includes('teal')) { hue = 180; saturation = 0.1; }
  
  if(lowName.includes('pastel')) { contrast = -5; brightness = 0.05; saturation = -0.1; }
  if(lowName.includes('bw') || lowName.includes('silver') || lowName.includes('monochrome') || cat.includes('BLACK')) grayscale = true;
  if(lowName.includes('gold') || lowName.includes('honey')) { sepia = true; contrast = 5; }
  
  if(lowName.includes('vibrance') || lowName.includes('boost')) saturation = 0.2;
  if(lowName.includes('muted')) saturation = -0.3;
  if(lowName.includes('clean') || lowName.includes('neutral')) { contrast = 5; saturation = 0.05; }
  
  result += \`  {
    id: "lut_\${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}",
    name: "\${name}",
    category: "\${cat.trim()}",
    subCategory: "\${subcat.trim()}",
    intent: "\${intent}",
    contrast: \${contrast},
    brightness: \${brightness},
    saturation: \${saturation},
    hue: \${hue},
    \${grayscale ? 'grayscale: true,' : ''}
    \${sepia && !grayscale ? 'sepia: true,' : ''}
  },
\`;
});

result += `];\n`;

fs.writeFileSync('src/lib/lut-presets.ts', result);
console.log('Generated LUT library!');
