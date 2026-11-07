---
name: Nordic Field Guide
version: "3.1"
stitch_project: "Grzybobranie Mobile Design System"
colors:
  surface: '#faf9f5'
  surface-dim: '#dbdad6'
  surface-bright: '#faf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f4f0'
  surface-container: '#efeeea'
  surface-container-high: '#e9e8e4'
  surface-container-highest: '#e3e2df'
  on-surface: '#1b1c1a'
  on-surface-variant: '#424844'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f1ed'
  outline: '#727974'
  outline-variant: '#c2c8c2'
  surface-tint: '#476556'
  primary: '#042217'
  on-primary: '#ffffff'
  primary-container: '#1b382b'
  on-primary-container: '#82a291'
  inverse-primary: '#adcebc'
  secondary: '#b51b19'
  on-secondary: '#ffffff'
  secondary-container: '#d8372e'
  on-secondary-container: '#fffbff'
  tertiary: '#311515'
  on-tertiary: '#ffffff'
  tertiary-container: '#4a2929'
  on-tertiary-container: '#be8f8e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c9ead7'
  primary-fixed-dim: '#adcebc'
  on-primary-fixed: '#022015'
  on-primary-fixed-variant: '#304d3f'
  secondary-fixed: '#ffdad5'
  secondary-fixed-dim: '#ffb4aa'
  on-secondary-fixed: '#410001'
  on-secondary-fixed-variant: '#930008'
  tertiary-fixed: '#ffdad9'
  tertiary-fixed-dim: '#edbab9'
  on-tertiary-fixed: '#2f1313'
  on-tertiary-fixed-variant: '#613d3d'
  background: '#faf9f5'
  on-background: '#1b1c1a'
  surface-variant: '#e3e2df'
  # Brand extensions (not part of MD3 baseline)
  paper: '#f6f5f1'
  paper-active: '#eae6dc'
  surface-card: '#ffffff'
  border-subtle: '#dcdad3'
  primary-green: '#1b382b'
  primary-green-hover: '#152e23'
  soft-green-bg: '#f4f7f4'
  accent-red: '#ad1414'
  accent-red-soft: '#fdf2f2'
  warning-amber: '#d97706'
  warning-soft: '#fef3c7'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.025em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '800'
    lineHeight: 32px
    letterSpacing: -0.025em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '800'
    lineHeight: 24px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '800'
    lineHeight: 20px
  species-latin:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: '0'
    fontStyle: italic
  body-default:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-medium:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
  label-badge:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '800'
    lineHeight: 12px
    letterSpacing: 0.05em
    textTransform: uppercase
  label-micro:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.025em
rounded:
  sm: 0.25rem    # 4px  — buttons, inputs, inner image crops
  DEFAULT: 0.5rem # 8px  — standard cards, chips
  md: 0.5rem     # 8px
  lg: 1rem       # 16px — modal sheets, detail panels
  xl: 1.5rem     # 24px — large containers
  full: 9999px   # pill shapes (Skaner CTA only)
spacing:
  gutter: 1rem    # 16px
  margin: 1rem    # 16px
  space-xs: 0.25rem  # 4px
  space-sm: 0.5rem   # 8px
  space-md: 0.75rem  # 12px
  space-lg: 1rem     # 16px
  space-xl: 1.5rem   # 24px
---

# DESIGN.md — Grzybobranie AI (Nordic Field Guide v3.1)

> **Source of truth**: The Stitch project _"Grzybobranie Mobile Design System"_ is the
> visual source of truth. This file is the code-side mirror — keep both in sync.
> `src/theme/tokens.ts` is the runtime source of truth; components always read from there.

---

## 1. Visual Archetype & Core Philosophy

- **Aesthetic:** Nordic Field Guide / Warm Editorial Paper — Scandinavian botanical manual.
- **Zero Sci-Fi / Zero HUD:** Strictly NO neon greens, NO laser scan lines, NO dark-mode
  cyberpunk HUDs, NO monospace fonts (`JetBrains Mono`), and NO AI hardware jargon
  (`TFLite`, `INT8`, `NPU`, `FPS`).
- **No Fake OS Status Bars:** NEVER render a fake iOS/Android top status bar (no `08:05`
  or `09:41` clock, WiFi, cellular, or battery icons).
- **Zero Gesture Conflicts:** NEVER use horizontal before/after drag sliders
  (`compare-slider`) on mobile screens. Always use a static 50/50 split grid or a clean
  segmented toggle (`50/50` vs `Makro`).

---

## 2. Typography

Font family: exclusively **Plus Jakarta Sans** (`font-sans`). Never use serif or monospace
fonts in app UI.

| Token | Size | Line-height | Weight | Letter-spacing | Usage |
|---|---|---|---|---|---|
| `headline-lg` | 30 px | 36 px | 800 | −0.025 em | Screen titles (desktop) |
| `headline-lg-mobile` | 24 px | 32 px | 800 | −0.025 em | Screen titles (mobile) |
| `headline-md` | 18 px | 24 px | 800 | −0.01 em | Section headers |
| `headline-sm` | 15 px | 20 px | 800 | — | Sub-section headers |
| `species-latin` | 13 px | 18 px | 400 italic | 0 | Latin binomial names |
| `body-default` | 13 px | 18 px | 400 | — | Body copy, descriptions |
| `body-medium` | 13 px | 18 px | 600 | — | Emphasised body copy |
| `label-micro` | 11 px | 14 px | 700 | 0.025 em | Micro-labels |
| `label-badge` | 10 px | 12 px | 800 uppercase | 0.05 em | Badges |

---

## 3. Color Tokens

Always read from `src/theme/tokens.ts`. **Never hardcode hex values in components.**

### Brand palette

| Token | Hex | Usage |
|---|---|---|
| `primaryGreen` / `primary` | `#1b382b` | Primary CTA, edible status, Skaner pill, header |
| `primaryGreenHover` | `#152e23` | Active / pressed state for primary buttons |
| `paper` / `appBg` | `#f6f5f1` | App background — warm matte paper |
| `paperActive` | `#eae6dc` | Active pills, selected tabs, active step cards |
| `surfaceCard` | `#ffffff` | Cards and content blocks |
| `borderSubtle` | `#dcdad3` | 1 px hairlines and borders |
| `softGreenBg` | `#f4f7f4` | Soft tint for edible comparison columns |
| `accentRed` | `#ad1414` | Life-safety crimson (deadly toxic, SOS 112) |
| `accentRedSoft` | `#fdf2f2` | Soft tint for toxic warnings / look-alike cards |
| `warningAmber` | `#d97706` | Inedible / requires thermal processing |
| `warningSoft` | `#fef3c7` | Amber tint background |

### Edibility & toxicity tiers

Safety signaling is absolute. These colors are **reserved strictly for taxonomic status**
and must never be co-opted for generic UI states.

| Status | Background | Text | Border |
|---|---|---|---|
| `EDIBLE` 🟢 | `#E8F5E9` | `#2E7D32` | `#81C784` |
| `INEDIBLE` 🟡 | `#FFF3E0` | `#C2410C` | `#FFB74D` |
| `POISONOUS` 🔴 | `#FFEBEE` | `#C62828` | `#EF5350` |
| `DEADLY_POISONOUS` ☠️ | `#2A080C` | `#FF4560` | `1.5 px #FF1744` |

**Deadly badge contrast rule:** `#FF4560` on `#2A080C` = 5.51:1 ≥ 5.18:1 (WCAG AA+).
Verify with WCAG whenever these values change.

---

## 4. Corner Radius

| Token | Value | Usage |
|---|---|---|
| `sm` | 4 px | Buttons, inputs, inner image crops |
| `md` / `DEFAULT` | 8 px | Standard cards, chips |
| `lg` | 16 px | Modal sheets, detail panels |
| `xl` | 24 px | Large containers |
| `full` | 9999 px | Pill shapes — **Skaner CTA only** |

---

## 5. Spacing Scale

| Token | Value |
|---|---|
| `space-xs` | 4 px |
| `space-sm` | 8 px |
| `space-md` | 12 px |
| `space-lg` | 16 px |
| `space-xl` | 24 px |
| `gutter` / `margin` | 16 px |

---

## 6. Layout Rules

- **Mobile container:** `max-w-[420px]`, full viewport height, `bg-appBg`,
  `rounded-[40px]` on `sm+`.
- **Edge-to-edge cards:** span 100 % width, separated by 1 px `borderSubtle` borders —
  not floating cards with heavy shadows.
- **Internal sticky header** (detail & comparison screens):
  - `h-13 py-2.5 px-4 bg-appBg/95 backdrop-blur-md border-b border-borderSubtle`
  - Left: back button (`← Atlas` or `← Karta gatunku`).
  - Right: **SOS 112** emergency button (`bg-accentRed text-white text-[11px] font-extrabold px-2.5 py-1.5 rounded-lg`).
- **Touch targets:** minimum 48 × 48 px for all interactive elements.
- **Elevation:** zero diffusion shadows. Blur > 4 px is forbidden. Use 1 px crisp
  borders (`borderSubtle`) to separate surfaces.
- **NativeWind-ready:** Flexbox and simple grid layouts that map cleanly to React Native
  primitives.

---

## 7. Components

### Locked: BottomNavigationBar

Do **not** redesign the bottom tab bar. The HTML/JSX structure is locked in Stitch.

- Tabs in order: **Atlas · Dziennik · Skaner · Pomoc · Profil**
- **Skaner** tab: `primaryGreen` pill CTA (`bg-[#1b382b] rounded-lg`, camera icon).
- Active tab indicator: `2.5 px` underline in `neutral-900`.
- Inactive tabs: `neutral-700` text, no underline.
- Home indicator bar: `w-32 h-1 bg-neutral-300 rounded-full` centered below tabs.

### Deadly Poisonous Badge

```
background: #2A080C
text:       #FF4560  (contrast ≥ 5.18:1 on bg)
border:     1.5px solid #FF1744
symbol:     ☠️ required
```

### Species Card

- White surface (`surfaceCard`) with 1 px `borderSubtle` border and `md` radius (8 px).
- Structure: square photo viewport → Polish common name (`headline-sm`) → Latin binomial
  (`species-latin`) → edibility chip (bottom-right, `label-badge`).

### Comparison / Look-Alike Drawer

- Dual-column split with a solid 1 px center divider.
- Left: target edible specimen. Right: toxic confusion counterpart.
- Morphological trait rows in alternating `body-default` rows.
- Left column background: `softGreenBg`. Right column background: `accentRedSoft`.
- **No** horizontal drag slider — use static 50/50 grid.

### SOS / Safety Header Button

```
bg-accentRed  (#ad1414)   text-white   text-[11px] font-extrabold
px-2.5 py-1.5  rounded-lg (8px)
```
Phone numbers must come exclusively from `src/data/safetyRules.ts`.

---

## 8. Tailwind Config Reference

```js
// tailwind.config.js — extend section
colors: {
  appBg:            '#f6f5f1',
  paper:            '#f6f5f1',
  paperActive:      '#eae6dc',
  surfaceCard:      '#ffffff',
  borderSubtle:     '#dcdad3',
  primaryGreen:     '#1b382b',
  primaryGreenHover:'#152e23',
  softGreenBg:      '#f4f7f4',
  accentRed:        '#ad1414',
  accentRedSoft:    '#fdf2f2',
  warningAmber:     '#d97706',
  warningSoft:      '#fef3c7',
},
fontFamily: {
  sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
},
boxShadow: {
  '2xs': '0 1px 2px rgba(0,0,0,0.04)',
},
borderRadius: {
  sm:      '4px',
  DEFAULT: '8px',
  md:      '8px',
  lg:      '16px',
  xl:      '24px',
  full:    '9999px',
},
```
