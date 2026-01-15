# Nairobi Sculpt Brand Fonts

## Required Fonts

This project uses the Nairobi Sculpt brand typography:

1. **Roboto** (Sans-serif) - For body text and UI elements
2. **Roboto Serif** - For headings and emphasis

## Installation

### Option 1: Google Fonts (Recommended)

Add to `app/layout.tsx` or `_document.tsx`:

```tsx
import { Roboto, Roboto_Serif } from 'next/font/google';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
});

const robotoSerif = Roboto_Serif({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-roboto-serif',
});
```

### Option 2: Self-hosted

Download fonts from Google Fonts and place in `/public/fonts/` directory.

## Usage

Fonts are automatically applied via Tailwind config:
- `font-sans` → Roboto
- `font-serif` → Roboto Serif









