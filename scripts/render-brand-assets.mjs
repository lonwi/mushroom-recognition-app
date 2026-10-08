/**
 * Rasterise the mushroom brand SVGs into the PNGs Expo expects.
 *
 *   node scripts/render-brand-assets.mjs
 *
 * Requires @resvg/resvg-js on NODE_PATH (it is not an app dependency):
 *   pnpm dlx --package @resvg/resvg-js node scripts/render-brand-assets.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'assets');

function render(svgName, pngName, width) {
  const svg = readFileSync(join(assets, svgName));
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
  writeFileSync(join(assets, pngName), png);
}

render('icon.svg', 'icon.png', 1024);
render('adaptive-icon.svg', 'adaptive-icon.png', 1024);
render('splash-icon.svg', 'splash-icon.png', 1024);
render('icon.svg', 'favicon.png', 196);
