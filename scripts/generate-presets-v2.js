const fs = require('fs');

const palettes = [
  { colors: { h1: '#111111', h2: '#222222', body: '#444444', small: '#666666' }, desc: 'Onyx Monochrome' },
  { colors: { h1: '#b8945a', h2: '#b8945a', body: '#4a4a4a', small: '#808080' }, desc: 'Champagne Gold' },
  { colors: { h1: '#1c2e4a', h2: '#3b5998', body: '#333333', small: '#555555' }, desc: 'Navy Royal' },
  { colors: { h1: '#6e7a63', h2: '#8b9680', body: '#4a4a4a', small: '#757575' }, desc: 'Sage Botanical' }
];

const types = [
  { cat: 'wedding', h1: 'Great Vibes', h1S: 82, h1T: 'none', h1L: -2, h2: 'Playfair Display', h2S: 28, h2T: 'uppercase', h2L: 20, body: 'Inter', bodyS: 15, bodyT: 'none', bodyL: 0, sm: 'Inter', smS: 11, smT: 'uppercase', smL: 15 },
  { cat: 'wedding', h1: 'Pinyon Script', h1S: 90, h1T: 'none', h1L: 0, h2: 'Cormorant Garamond', h2S: 32, h2T: 'uppercase', h2L: 15, body: 'Cormorant Garamond', bodyS: 18, bodyT: 'none', bodyL: 0, sm: 'Inter', smS: 10, smT: 'uppercase', smL: 20 },
  { cat: 'wedding', h1: 'Alex Brush', h1S: 85, h1T: 'none', h1L: 0, h2: 'Cinzel', h2S: 24, h2T: 'uppercase', h2L: 30, body: 'Lora', bodyS: 16, bodyT: 'none', bodyL: 0, sm: 'Cinzel', smS: 12, smT: 'uppercase', smL: 25 },
  { cat: 'wedding', h1: 'Parisienne', h1S: 88, h1T: 'none', h1L: 0, h2: 'Bodoni Moda', h2S: 30, h2T: 'none', h2L: 10, body: 'Bodoni Moda', bodyS: 16, bodyT: 'none', bodyL: 0, sm: 'Inter', smS: 11, smT: 'none', smL: 5 },
  { cat: 'wedding', h1: 'Tangerine', h1S: 100, h1T: 'none', h1L: 5, h2: 'Montserrat', h2S: 22, h2T: 'uppercase', h2L: 35, body: 'Montserrat', bodyS: 14, bodyT: 'none', bodyL: 2, sm: 'Montserrat', smS: 10, smT: 'uppercase', smL: 20 },
  { cat: 'wedding', h1: 'Allura', h1S: 86, h1T: 'none', h1L: 0, h2: 'Libre Baskerville', h2S: 26, h2T: 'uppercase', h2L: 15, body: 'Libre Baskerville', bodyS: 15, bodyT: 'none', bodyL: 0, sm: 'Nunito Sans', smS: 11, smT: 'uppercase', smL: 15 },
  { cat: 'wedding', h1: 'Sacramento', h1S: 92, h1T: 'none', h1L: 2, h2: 'Gloock', h2S: 34, h2T: 'none', h2L: 5, body: 'Inter', bodyS: 16, bodyT: 'none', bodyL: 0, sm: 'Inter', smS: 12, smT: 'uppercase', smL: 10 },
  { cat: 'wedding', h1: 'Herr Von Muellerhoff', h1S: 96, h1T: 'none', h1L: 0, h2: 'Prata', h2S: 32, h2T: 'none', h2L: 8, body: 'Prata', bodyS: 16, bodyT: 'none', bodyL: 0, sm: 'Arial', smS: 10, smT: 'uppercase', smL: 15 },
  { cat: 'wedding', h1: 'Qwigley', h1S: 110, h1T: 'none', h1L: -5, h2: 'EB Garamond', h2S: 30, h2T: 'uppercase', h2L: 18, body: 'EB Garamond', bodyS: 18, bodyT: 'none', bodyL: 0, sm: 'Lato', smS: 11, smT: 'uppercase', smL: 20 },
  { cat: 'modern', h1: 'Montserrat', h1S: 70, h1T: 'uppercase', h1L: 10, h2: 'Montserrat', h2S: 24, h2T: 'uppercase', h2L: 40, body: 'Open Sans', bodyS: 14, bodyT: 'none', bodyL: 0, sm: 'Open Sans', smS: 10, smT: 'uppercase', smL: 30 },
  { cat: 'modern', h1: 'DM Sans', h1S: 72, h1T: 'none', h1L: -3, h2: 'Inter', h2S: 26, h2T: 'uppercase', h2L: 20, body: 'Inter', bodyS: 15, bodyT: 'none', bodyL: 0, sm: 'Inter', smS: 11, smT: 'uppercase', smL: 15 },
  { cat: 'modern', h1: 'Playfair Display', h1S: 76, h1T: 'uppercase', h1L: 5, h2: 'Outfit', h2S: 22, h2T: 'uppercase', h2L: 30, body: 'Outfit', bodyS: 15, bodyT: 'none', bodyL: 0, sm: 'Outfit', smS: 10, smT: 'uppercase', smL: 25 },
  { cat: 'modern', h1: 'Jost', h1S: 74, h1T: 'uppercase', h1L: 8, h2: 'Jost', h2S: 26, h2T: 'uppercase', h2L: 25, body: 'Nunito Sans', bodyS: 16, bodyT: 'none', bodyL: 0, sm: 'Nunito Sans', smS: 12, smT: 'uppercase', smL: 20 },
  { cat: 'quinceanera', h1: 'Dancing Script', h1S: 88, h1T: 'none', h1L: 0, h2: 'Poppins', h2S: 26, h2T: 'uppercase', h2L: 15, body: 'Poppins', bodyS: 15, bodyT: 'none', bodyL: 0, sm: 'Poppins', smS: 11, smT: 'uppercase', smL: 15 },
  { cat: 'quinceanera', h1: 'Pacifico', h1S: 75, h1T: 'none', h1L: 0, h2: 'Quicksand', h2S: 24, h2T: 'uppercase', h2L: 20, body: 'Nunito', bodyS: 16, bodyT: 'none', bodyL: 0, sm: 'Nunito', smS: 12, smT: 'uppercase', smL: 20 },
  { cat: 'quinceanera', h1: 'Grand Hotel', h1S: 90, h1T: 'none', h1L: 2, h2: 'Raleway', h2S: 24, h2T: 'uppercase', h2L: 25, body: 'Raleway', bodyS: 14, bodyT: 'none', bodyL: 0, sm: 'Raleway', smS: 10, smT: 'uppercase', smL: 30 },
  { cat: 'editorial', h1: 'Cinzel Decorative', h1S: 68, h1T: 'uppercase', h1L: 15, h2: 'Cinzel', h2S: 22, h2T: 'uppercase', h2L: 40, body: 'Cormorant Garamond', bodyS: 16, bodyT: 'none', bodyL: 2, sm: 'Cinzel', smS: 10, smT: 'uppercase', smL: 30 },
  { cat: 'editorial', h1: 'Vidaloka', h1S: 74, h1T: 'none', h1L: 0, h2: 'Oswald', h2S: 24, h2T: 'uppercase', h2L: 30, body: 'Oswald', bodyS: 15, bodyT: 'none', bodyL: 5, sm: 'Oswald', smS: 11, smT: 'uppercase', smL: 25 },
  { cat: 'editorial', h1: 'Abril Fatface', h1S: 70, h1T: 'none', h1L: 0, h2: 'Yeseva One', h2S: 26, h2T: 'uppercase', h2L: 10, body: 'Inter', bodyS: 15, bodyT: 'none', bodyL: 0, sm: 'Inter', smS: 12, smT: 'uppercase', smL: 15 },
  { cat: 'classic', h1: 'Libre Caslon Text', h1S: 80, h1T: 'none', h1L: 0, h2: 'Old Standard TT', h2S: 28, h2T: 'uppercase', h2L: 15, body: 'Old Standard TT', bodyS: 16, bodyT: 'none', bodyL: 0, sm: 'Inter', smS: 11, smT: 'uppercase', smL: 10 },
];

let generated = [];
let idCounter = 1;

types.forEach(t => {
  palettes.forEach((p) => {
    generated.push({
      id: "TP-PRO-" + idCounter.toString().padStart(3, '0'),
      name: t.h1 + ' + ' + t.h2 + ' (' + p.desc + ')',
      category: t.cat,
      lockedFonts: true,
      alignment: 'center',
      fonts: {
        h1: t.h1,
        h2: t.h2,
        body: t.body,
        small: t.sm
      },
      styles: {
        h1: { fontSize: t.h1S, letterSpacing: t.h1L, lineHeight: 1.1, textTransform: t.h1T, color: p.colors.h1 },
        h2: { fontSize: t.h2S, letterSpacing: t.h2L, lineHeight: 1.3, textTransform: t.h2T, color: p.colors.h2 },
        body: { fontSize: t.bodyS, letterSpacing: t.bodyL, lineHeight: 1.5, textTransform: t.bodyT, color: p.colors.body },
        small: { fontSize: t.smS, letterSpacing: t.smL, lineHeight: 1.4, textTransform: t.smT, color: p.colors.small }
      }
    });
    idCounter++;
  });
});

const fileContent = "import { TypographyPreset, PresetCategory } from '../types/editor';\n\n" +
"export const TYPOGRAPHY_CATEGORIES: { id: PresetCategory; label: string }[] = [\n" +
"  { id: 'wedding', label: 'Wedding' },\n" +
"  { id: 'quinceanera', label: 'Quinceañera' },\n" +
"  { id: 'modern', label: 'Modern' },\n" +
"  { id: 'editorial', label: 'Editorial' },\n" +
"  { id: 'classic', label: 'Classic' }\n" +
"];\n\n" +
"export const TYPOGRAPHY_PRESETS: TypographyPreset[] = " + JSON.stringify(generated, null, 2) + ";\n";

fs.writeFileSync('src/lib/typography-presets.ts', fileContent);
console.log('Successfully wrote 80 robust typography pairs!');
