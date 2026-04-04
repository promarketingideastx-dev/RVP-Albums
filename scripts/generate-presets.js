const fs = require('fs');
const path = require('path');

const fonts = {
  serif: ['Playfair Display', 'Cormorant Garamond', 'Bodoni Moda', 'Cinzel', 'Lora', 'Merriweather', 'PT Serif'],
  sans: ['Inter', 'Montserrat', 'Lato', 'Roboto', 'Outfit', 'Oswald', 'Poppins', 'Raleway'],
  script: ['Great Vibes', 'Alex Brush', 'Allura', 'Dancing Script', 'Pinyon Script', 'Tangerine']
};

const colors = [
  { p: '#1a1a1a', s: '#4a4a4a', a: '#d4af37' }, // Gold accent
  { p: '#2c3e50', s: '#34495e', a: '#e74c3c' }, // Navy / Red
  { p: '#000000', s: '#666666', a: '#ff9f43' }, // Modern Orange
  { p: '#4b4b4b', s: '#7d7d7d', a: '#c0392b' }, // Dark Grey / Ruby
  { p: '#111111', s: '#555555', a: '#8e44ad' }, // Purple
  { p: '#2d3436', s: '#636e72', a: '#00b894' }, // Mint
  { p: '#222f3e', s: '#576574', a: '#ee5253' }, // Armor Red
  { p: '#1e272e', s: '#485460', a: '#ffdd59' }  // Dark / Yellow
];

const categories = ['wedding', 'quinceanera', 'modern', 'editorial', 'minimal', 'classic'];

let presets = [];
let idCounter = 11; // We know 1 to 10 exist

// Generate 90 presets
for(let i=0; i<90; i++) {
  const category = categories[Math.floor(Math.random() * categories.length)];
  let h1Font, h2Font, bodyFont;
  
  if (category === 'wedding' || category === 'quinceanera') {
    h1Font = fonts.script[Math.floor(Math.random() * fonts.script.length)];
    h2Font = fonts.sans[Math.floor(Math.random() * fonts.sans.length)];
    bodyFont = fonts.serif[Math.floor(Math.random() * fonts.serif.length)];
  } else if (category === 'modern' || category === 'minimal') {
    h1Font = fonts.sans[Math.floor(Math.random() * fonts.sans.length)];
    h2Font = fonts.sans[Math.floor(Math.random() * fonts.sans.length)];
    bodyFont = fonts.sans[Math.floor(Math.random() * fonts.sans.length)];
  } else {
    h1Font = fonts.serif[Math.floor(Math.random() * fonts.serif.length)];
    h2Font = fonts.serif[Math.floor(Math.random() * fonts.serif.length)];
    bodyFont = fonts.sans[Math.floor(Math.random() * fonts.sans.length)];
  }

  const cp = colors[Math.floor(Math.random() * colors.length)];

  const preset = {
    id: `preset-${idCounter.toString().padStart(3, '0')}`,
    category: category,
    fonts: {
      h1: h1Font,
      h2: h2Font,
      body: bodyFont,
      small: bodyFont
    },
    styles: {
      h1: { letterSpacing: Math.floor(Math.random() * 5), lineHeight: 1.1, textTransform: 'none' },
      h2: { letterSpacing: Math.floor(Math.random() * 10), lineHeight: 1.2, textTransform: 'uppercase' },
      body: { letterSpacing: 0, lineHeight: 1.5, textTransform: 'none' },
      small: { letterSpacing: 1, lineHeight: 1.4, textTransform: 'uppercase' }
    },
    colorPalette: {
      primary: cp.p,
      secondary: cp.s,
      accent: cp.a
    }
  };
  
  presets.push(preset);
  idCounter++;
}

const fileContent = fs.readFileSync(path.join(__dirname, '../src/lib/typography-presets.ts'), 'utf-8');
const arrayEndIndex = fileContent.lastIndexOf('];');
const arrayPart = fileContent.substring(0, arrayEndIndex);

const newItemsStr = presets.map(p => JSON.stringify(p, null, 2)).join(',\\n');

const newContent = arrayPart + ',\\n' + newItemsStr + '\\n];\\n';

fs.writeFileSync(path.join(__dirname, '../src/lib/typography-presets.ts'), newContent);
console.log('Successfully generated 90 additional typography presets!');
