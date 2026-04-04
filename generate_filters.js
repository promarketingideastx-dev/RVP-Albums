const fs = require('fs');
const categories = [
  { prefix: 'Tijuana', h: 30, s: 80, l: 50 },
  { prefix: 'Summer', h: 45, s: 90, l: 60 },
  { prefix: 'Sepia', h: 35, s: 50, l: 40 },
  { prefix: 'Cyberpunk', h: 300, s: 90, l: 50 },
  { prefix: 'Miami', h: 330, s: 80, l: 60 },
  { prefix: 'Vintage', h: 20, s: 40, l: 70 },
  { prefix: 'Fade', h: 220, s: 20, l: 50 },
  { prefix: 'B&W', h: 0, s: 0, l: 50 },
  { prefix: 'Warm', h: 10, s: 60, l: 55 },
  { prefix: 'Cool', h: 210, s: 70, l: 60 }
];

let items = [];
let fileIndex = 1;

for(let cat of categories) {
  for(let j=1; j<=10; j++) {
    const num = fileIndex.toString().padStart(3, '0');
    const name = `${cat.prefix} ${j}`;
    
    // Slight variation in lightness and saturation
    const varyingSat = Math.max(0, Math.min(100, cat.s + (j*3 - 15)));
    const varyingLight = Math.max(20, Math.min(80, cat.l + (j*4 - 20)));
    
    const hex = hslToHex(cat.h, varyingSat, varyingLight);
    
    const str = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><rect width="1000" height="1000" fill="${hex}" /></svg>`;
    fs.writeFileSync(`public/mock-library/cinematic/cin-${num}.svg`, str);
    
    items.push(`      {
        "id": "cin-${num}",
        "name": "${name}",
        "src": "/mock-library/cinematic/cin-${num}.svg",
        "category": "cinematic"
      }`);
      
    fileIndex++;
  }
}

// Ensure length 100
const itemsStr = items.join(',\n');
const jsFile = fs.readFileSync('src/lib/asset-library.ts', 'utf8');

// Replace everything inside "cinematic": { ... items: [ ... ] }
const regex = /("cinematic":\s*\{\s*name:\s*"Efectos Visuales",\s*items:\s*\[)[\s\S]*?(\]\s*\})/m;
const newJs = jsFile.replace(regex, `$1\n${itemsStr}\n$2`);
fs.writeFileSync('src/lib/asset-library.ts', newJs);

function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
console.log('Filters generated.');
