// src/app/css/route.ts
// Google Fonts–style CSS endpoint.
//
// Usage examples:
//   /css?family=Pippo                          → all variants
//   /css?family=Pippo:wght@400;700             → specific weights (normal only)
//   /css?family=Pippo:ital,wght@0,400;1,400    → specific weight + italic combos
//   /css?family=Pippo&family=Inter:wght@300;400 → multiple families
//   /css?family=Pippo&display=block            → custom font-display

import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// ─── Types ──────────────────────────────────────────────────────────────────
type FontVariant = {
  file: string;
  weight: number;
  style: 'normal' | 'italic';
  url: string;
};

type FontFamily = {
  variants: FontVariant[];
};

type FontIndex = Record<string, FontFamily>;

// ─── Helpers ────────────────────────────────────────────────────────────────
/**
 * Fetches and caches the font index JSON.
 * We fetch from our own origin so the edge function stays stateless.
 */
async function getFontIndex(origin: string): Promise<FontIndex> {
  const res = await fetch(`${origin}/fonts-index.json`, {
    // Cache for 1 hour on the edge; refreshed on every new deploy
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Failed to load font index: ${res.status}`);
  }

  return res.json() as Promise<FontIndex>;
}

/**
 * Case-insensitive family name lookup.
 */
function findFamily(
  index: FontIndex,
  name: string
): [string, FontFamily] | null {
  const normalised = name.toLowerCase().trim();
  const key = Object.keys(index).find(
    k => k.toLowerCase() === normalised
  );
  return key ? [key, index[key]] : null;
}

/**
 * Filters variants by the axes string from the URL.
 *
 * Supported formats (mirrors Google Fonts v2):
 *   wght@400;700
 *   ital,wght@0,400;1,400;0,700;1,700
 */
function filterVariants(
  variants: FontVariant[],
  axesStr: string
): FontVariant[] {
  // ── wght@400;700 ──────────────────────────────────────────────────────────
  if (axesStr.startsWith('wght@')) {
    const requested = new Set(
      axesStr
        .slice('wght@'.length)
        .split(';')
        .map(Number)
        .filter(n => !isNaN(n))
    );
    return variants.filter(
      v => requested.has(v.weight) && v.style === 'normal'
    );
  }

  // ── ital,wght@0,400;1,700 ─────────────────────────────────────────────────
  if (axesStr.startsWith('ital,wght@')) {
    type Combo = { ital: number; wght: number };
    const combos: Combo[] = axesStr
      .slice('ital,wght@'.length)
      .split(';')
      .map(pair => {
        const [i, w] = pair.split(',').map(Number);
        return { ital: i, wght: w };
      })
      .filter(c => !isNaN(c.ital) && !isNaN(c.wght));

    return variants.filter(v =>
      combos.some(
        c =>
          c.wght === v.weight &&
          ((c.ital === 0 && v.style === 'normal') ||
            (c.ital === 1 && v.style === 'italic'))
      )
    );
  }

  // Unknown axis format — return all variants unchanged
  return variants;
}

// ─── Route handler ──────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  // font-display value (default: swap)
  const display = ['auto', 'block', 'swap', 'fallback', 'optional'].includes(
    searchParams.get('display') ?? ''
  )
    ? (searchParams.get('display') as string)
    : 'swap';

  // Multiple ?family= params are allowed
  const familyParams = searchParams.getAll('family');

  if (familyParams.length === 0) {
    return new NextResponse(
      '/* Error: missing ?family= parameter */\n' +
        '/* Example: /css?family=Pippo:wght@400;700 */',
      {
        status: 400,
        headers: { 'Content-Type': 'text/css; charset=utf-8' },
      }
    );
  }

  let index: FontIndex;
  try {
    index = await getFontIndex(origin);
  } catch {
    return new NextResponse('/* Error: font index unavailable */', {
      status: 503,
      headers: { 'Content-Type': 'text/css; charset=utf-8' },
    });
  }

  const blocks: string[] = [];

  for (const param of familyParams) {
    // Split "FamilyName:axesStr" or just "FamilyName"
    const colonIdx = param.indexOf(':');
    const familyRaw =
      colonIdx === -1 ? param : param.slice(0, colonIdx);
    const axesStr =
      colonIdx === -1 ? null : param.slice(colonIdx + 1);

    // Decode "+" as space (matches Google Fonts encoding)
    const familyName = decodeURIComponent(familyRaw).replace(/\+/g, ' ');

    const found = findFamily(index, familyName);
    if (!found) continue;

    const [resolvedName, { variants }] = found;

    const selected =
      axesStr ? filterVariants(variants, axesStr) : variants;

    if (selected.length === 0) continue;

    // Build @font-face blocks
    const comment = `/* ── ${resolvedName} ───────────────────────────── */`;
    const faces = selected.map(
      v => `@font-face {
  font-family: '${resolvedName}';
  src: url('${v.url}') format('woff2');
  font-weight: ${v.weight};
  font-style: ${v.style};
  font-display: ${display};
}`
    );

    blocks.push([comment, ...faces].join('\n'));
  }

  if (blocks.length === 0) {
    return new NextResponse(
      `/* No matching font families found.\n` +
        `   Available families: GET /api/fonts */`,
      {
        status: 404,
        headers: { 'Content-Type': 'text/css; charset=utf-8' },
      }
    );
  }

  const css = blocks.join('\n\n') + '\n';

  return new NextResponse(css, {
    headers: {
      'Content-Type': 'text/css; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      // Edge CDN: cache for 1 year. Browser: revalidate daily.
      'Cache-Control':
        'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400',
      'Vary': 'Accept-Encoding',
    },
  });
}
