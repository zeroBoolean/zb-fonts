// scripts/build-fonts.js
// Runs at build time (via "prebuild") to:
//  1. Copy all .woff2 files from /fonts → /public/f
//  2. Parse weight + style from filename
//  3. Write /public/fonts-index.json for the API and CSS routes

const fs = require('fs-extra');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FONTS_SRC = path.join(ROOT, 'fonts');
const PUBLIC_FONTS = path.join(ROOT, 'public', 'f');
const INDEX_OUTPUT = path.join(ROOT, 'public', 'fonts-index.json');

// ─── Weight name → numeric value ───────────────────────────────────────────
// Sorted longest → shortest to prevent "bold" matching inside "extrabold"
const WEIGHT_MAP = [
  ['extrablack',  950],
  ['ultrablack',  950],
  ['extrabold',   800],
  ['ultrabold',   800],
  ['demibold',    600],
  ['semibold',    600],
  ['extralight',  200],
  ['ultralight',  200],
  ['hairline',    100],
  ['medium',      500],
  ['black',       900],
  ['heavy',       900],
  ['light',       300],
  ['thin',        100],
  ['bold',        700],
  ['regular',     400],
  ['normal',      400],
  ['book',        400],
  ['roman',       400],
];

/**
 * Parses a .woff2 filename and returns { weight, style }.
 * Handles formats like:
 *   FamilyName-Bold.woff2
 *   FamilyName-700.woff2
 *   FamilyName-BoldItalic.woff2
 *   FamilyName-SemiBold.woff2
 *   FamilyName_Light_Italic.woff2
 */
function parseVariant(filename) {
  // Strip extension, normalize separators to single string
  const base = path.basename(filename, '.woff2')
    .replace(/[-_ ]/g, '')
    .toLowerCase();

  // Detect italic / oblique
  const isItalic = base.includes('italic') || base.includes('oblique');

  // Remove style tokens so they don't interfere with weight detection
  const withoutStyle = base.replace('italic', '').replace('oblique', '');

  // 1. Try a bare numeric weight at the END of the string (e.g. "pippo700")
  const numericSuffix = withoutStyle.match(/(\d{3})$/);
  if (numericSuffix) {
    const w = parseInt(numericSuffix[1], 10);
    if (w >= 100 && w <= 900 && w % 100 === 0) {
      return { weight: w, style: isItalic ? 'italic' : 'normal' };
    }
  }

  // 2. Try named weight tokens (longest match wins)
  for (const [name, value] of WEIGHT_MAP) {
    if (withoutStyle.includes(name)) {
      return { weight: value, style: isItalic ? 'italic' : 'normal' };
    }
  }

  // 3. Default: Regular / 400
  return { weight: 400, style: isItalic ? 'italic' : 'normal' };
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function build() {
  console.log('\n🔄  Building Font CDN index...\n');

  await fs.ensureDir(PUBLIC_FONTS);

  const entries = await fs.readdir(FONTS_SRC);
  const index = {};
  let totalVariants = 0;

  for (const family of entries.sort()) {
    const familySrc = path.join(FONTS_SRC, family);
    if (!(await fs.stat(familySrc)).isDirectory()) continue;

    const files = (await fs.readdir(familySrc))
      .filter(f => f.toLowerCase().endsWith('.woff2'));

    if (files.length === 0) {
      console.warn(`  ⚠️  ${family} — no .woff2 files found, skipping.`);
      continue;
    }

    const destDir = path.join(PUBLIC_FONTS, family);
    await fs.ensureDir(destDir);

    const variants = [];

    for (const file of files.sort()) {
      const { weight, style } = parseVariant(file);

      // Copy to public/f/<Family>/file.woff2
      await fs.copy(
        path.join(familySrc, file),
        path.join(destDir, file),
        { overwrite: true }
      );

      variants.push({
        file,
        weight,
        style,
        url: `/f/${family}/${file}`,
      });
    }

    // Sort: weight asc → normal before italic
    variants.sort((a, b) =>
      a.weight !== b.weight
        ? a.weight - b.weight
        : a.style === b.style ? 0 : a.style === 'normal' ? -1 : 1
    );

    index[family] = { variants };
    totalVariants += variants.length;
    console.log(`  ✅  ${family.padEnd(32)} ${variants.length} variant(s)`);
  }

  await fs.writeFile(INDEX_OUTPUT, JSON.stringify(index, null, 2));

  console.log(`\n🎉  Done — ${Object.keys(index).length} families, ${totalVariants} total variants.`);
  console.log(`📄  Index written to public/fonts-index.json\n`);
}

build().catch(err => {
  console.error('\n❌  Build failed:', err.message);
  process.exit(1);
});
