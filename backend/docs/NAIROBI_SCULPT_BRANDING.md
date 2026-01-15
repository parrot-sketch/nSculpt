# Nairobi Sculpt Brand Identity - Design System

**Date**: 2026-01-03  
**Status**: ✅ **APPLIED**

---

## Brand Colors

### Primary Palette

| Color | Name | Hex | Usage |
|-------|------|-----|-------|
| **Space Cadet** | Primary | `#1E3A5F` | Primary buttons, headers, brand elements |
| **Lion** | Accent | `#C9A961` | Accents, highlights, CTAs |
| **Isabelline** | Background | `#F4F0E8` | Page backgrounds, cards |
| **Almond** | Secondary BG | `#E8DCC6` | Subtle backgrounds, borders |
| **Dusk** | Muted | `#6B7A8F` | Secondary text, icons |
| **Powder Blue** | Tertiary | `#B0C4DE` | Subtle accents, backgrounds |

### Color Usage Guidelines

- **Primary (Space Cadet)**: Main brand color for buttons, headers, important UI elements
- **Accent (Lion)**: For highlights, badges, important callouts
- **Isabelline**: Default page background (warm, professional)
- **Almond**: Subtle backgrounds, card backgrounds, dividers
- **Dusk**: Secondary text, muted elements
- **Powder Blue**: Soft accents, informational elements

---

## Typography

### Font Families

1. **Roboto** (Sans-serif)
   - **Usage**: Body text, UI elements, buttons, forms
   - **Weights**: 300, 400, 500, 700
   - **Style**: Clean, modern, highly legible

2. **Roboto Serif** (Serif)
   - **Usage**: Headings (h1-h6), emphasis, brand text
   - **Weights**: 400, 500, 600, 700
   - **Style**: Elegant, traditional, sophisticated

### Typography Scale

- **H1**: Roboto Serif, 3xl, semibold, Space Cadet
- **H2**: Roboto Serif, 2xl, semibold, Space Cadet
- **H3**: Roboto Serif, xl, semibold, Space Cadet
- **Body**: Roboto, base, regular, neutral-900
- **Small**: Roboto, sm, regular, neutral-600

---

## Design Principles

### Aesthetic
- **Professional**: Medical/healthcare appropriate
- **Sophisticated**: Premium feel without being ostentatious
- **Modern**: Clean, contemporary design
- **Warm**: Cream/beige tones create welcoming atmosphere

### Color Psychology
- **Navy (Space Cadet)**: Trust, professionalism, stability
- **Gold (Lion)**: Premium, quality, excellence
- **Cream (Isabelline)**: Warmth, comfort, cleanliness
- **Beige (Almond)**: Neutrality, sophistication

---

## Implementation

### Tailwind Config

Colors are defined in `client/tailwind.config.ts`:
- `primary` → Space Cadet (#1E3A5F)
- `accent` → Lion (#C9A961)
- `isabelline`, `almond`, `lion`, `powderBlue`, `dusk`, `spaceCadet` → Direct brand colors

### Global Styles

Typography applied in `client/app/globals.css`:
- Body: Roboto
- Headings: Roboto Serif
- Background: Isabelline

---

## Component Guidelines

### Buttons
- **Primary**: Space Cadet background, white text
- **Accent**: Lion background, white text
- **Secondary**: White background, Space Cadet text, border

### Cards
- Background: White or Isabelline
- Border: Neutral-200 or Almond
- Shadow: Soft, subtle

### Forms
- Inputs: White background, Space Cadet focus ring
- Labels: Space Cadet text
- Placeholders: Dusk text

---

## Next Steps

1. ✅ Colors applied to Tailwind config
2. ✅ Typography updated in globals.css
3. ⏳ Add Roboto fonts to project (Google Fonts or self-hosted)
4. ⏳ Update component styles to use new brand colors
5. ⏳ Create brand logo component (pillar icon)

---

**Status**: ✅ **BRAND COLORS & TYPOGRAPHY APPLIED**









