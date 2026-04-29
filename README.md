# Font CDN

A self-hosted, Google Fonts-style font delivery network built on Next.js + Vercel.

---

## ✅ How to Add a Font

1. Create a folder under `/fonts/` named after the font family:
   ```
   fonts/
   └── Pippo/
       ├── Pippo-Regular.woff2
       ├── Pippo-Bold.woff2
       ├── Pippo-BoldItalic.woff2
       └── Pippo-Light.woff2
   ```
2. Commit and push.
3. Vercel automatically rebuilds and your font is live in ~30 seconds.

### Filename Conventions (auto-parsed)
| Filename pattern | Weight | Style |
|---|---|---|
| `*-Thin.*` | 100 | normal |
| `*-ExtraLight.*` | 200 | normal |
| `*-Light.*` | 300 | normal |
| `*-Regular.*` / `*-Normal.*` | 400 | normal |
| `*-Medium.*` | 500 | normal |
| `*-SemiBold.*` / `*-DemiBold.*` | 600 | normal |
| `*-Bold.*` | 700 | normal |
| `*-ExtraBold.*` | 800 | normal |
| `*-Black.*` / `*-Heavy.*` | 900 | normal |
| `*-700.*` | 700 | normal |
| Any of the above + `Italic` | same | italic |

---

## 🔗 Usage in Projects

### HTML (like Google Fonts)
```html
<link rel="preconnect" href="https://your-cdn.vercel.app">
<link rel="stylesheet" href="https://your-cdn.vercel.app/css?family=Pippo:wght@400;700">

<style>
  body { font-family: 'Pippo', sans-serif; }
</style>
```

### CSS @import
```css
@import url('https://your-cdn.vercel.app/css?family=Pippo:wght@400;700');
```

### Shopify / Liquid
```liquid
{{ 'https://your-cdn.vercel.app/css?family=Pippo:wght@400;700' | stylesheet_tag }}
```

### Multiple Families
```html
<link rel="stylesheet" href="https://your-cdn.vercel.app/css?family=Pippo:wght@400;700&family=Inter:wght@300;400;600">
```

### All Weights
```html
<link rel="stylesheet" href="https://your-cdn.vercel.app/css?family=Pippo">
```

### With Italics (Google Fonts v2 format)
```html
<link rel="stylesheet" href="https://your-cdn.vercel.app/css?family=Pippo:ital,wght@0,400;1,400;0,700;1,700">
```

### Custom font-display
```html
<link rel="stylesheet" href="https://your-cdn.vercel.app/css?family=Pippo&display=optional">
```

---

## 📥 Direct Font Downloads

Every font file is accessible directly:
```
https://your-cdn.vercel.app/f/Pippo/Pippo-Regular.woff2
https://your-cdn.vercel.app/f/Pippo/Pippo-Bold.woff2
```

---

## 📡 API Endpoints

### List all font families
```
GET /api/fonts
```
```json
{
  "count": 3,
  "families": [
    {
      "family": "Pippo",
      "weights": [300, 400, 700],
      "styles": ["italic", "normal"],
      "variantCount": 4,
      "cssUrl": "/css?family=Pippo",
      "variants": [
        { "weight": 400, "style": "normal", "file": "Pippo-Regular.woff2", "downloadUrl": "/f/Pippo/Pippo-Regular.woff2" }
      ]
    }
  ]
}
```

### Search families
```
GET /api/fonts?search=pip
```

### Single family details
```
GET /api/fonts?family=Pippo
```

---

## 🚀 Deployment

### First-time setup
```bash
# 1. Clone the repo
git clone https://github.com/your-user/font-cdn.git
cd font-cdn

# 2. Install dependencies
npm install

# 3. Add fonts to /fonts/ directory
# 4. Test locally
npm run dev

# 5. Push to GitHub, link repo to Vercel
# Vercel auto-runs: npm run build → node scripts/build-fonts.js → next build
```

### Environment Variables (optional)
| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_CDN_BASE` | Override base URL for font src in CSS | auto-detected from request origin |

---

## 🏗️ Architecture

```
GitHub /fonts/         →  Vercel Build  →  /public/f/  (static .woff2 files)
                                        →  /public/fonts-index.json

Browser request:
  /css?family=Pippo    →  Edge Function  →  @font-face CSS  (cached 1yr on CDN)
  /api/fonts           →  Edge Function  →  JSON index      (cached 1hr)
  /f/Pippo/*.woff2     →  Static File    →  Binary          (immutable cache)
```
