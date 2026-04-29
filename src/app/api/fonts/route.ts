// src/app/api/fonts/route.ts
// Returns a structured JSON index of every hosted font family.
//
// GET /api/fonts
// GET /api/fonts?search=pip          → filter by name
// GET /api/fonts?family=Pippo        → single family details
//
// Response shape:
// {
//   "count": 2,
//   "families": [
//     {
//       "family": "Pippo",
//       "weights": [400, 700],
//       "styles": ["normal", "italic"],
//       "variantCount": 3,
//       "cssUrl": "/css?family=Pippo",
//       "variants": [
//         { "weight": 400, "style": "normal", "file": "Pippo-Regular.woff2", "downloadUrl": "/f/Pippo/Pippo-Regular.woff2" }
//       ]
//     }
//   ]
// }

import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

type RawVariant = {
  file: string;
  weight: number;
  style: string;
  url: string;
};

type RawIndex = Record<string, { variants: RawVariant[] }>;

async function getRawIndex(origin: string): Promise<RawIndex> {
  const res = await fetch(`${origin}/fonts-index.json`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Index fetch failed: ${res.status}`);
  return res.json() as Promise<RawIndex>;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase().trim() ?? '';
  const singleFamily = searchParams.get('family')?.trim() ?? '';

  let rawIndex: RawIndex;
  try {
    rawIndex = await getRawIndex(origin);
  } catch {
    return NextResponse.json(
      { error: 'Font index unavailable' },
      { status: 503 }
    );
  }

  let entries = Object.entries(rawIndex);

  // Single family lookup
  if (singleFamily) {
    entries = entries.filter(
      ([name]) => name.toLowerCase() === singleFamily.toLowerCase()
    );
    if (entries.length === 0) {
      return NextResponse.json(
        { error: `Family "${singleFamily}" not found` },
        { status: 404 }
      );
    }
  }

  // Search filter
  if (search) {
    entries = entries.filter(([name]) =>
      name.toLowerCase().includes(search)
    );
  }

  const families = entries.map(([name, { variants }]) => ({
    family: name,
    weights: [...new Set(variants.map(v => v.weight))].sort((a, b) => a - b),
    styles: [...new Set(variants.map(v => v.style))].sort(),
    variantCount: variants.length,
    cssUrl: `/css?family=${encodeURIComponent(name)}`,
    variants: variants.map(v => ({
      weight: v.weight,
      style: v.style,
      file: v.file,
      downloadUrl: v.url,
    })),
  }));

  return NextResponse.json(
    { count: families.length, families },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    }
  );
}
