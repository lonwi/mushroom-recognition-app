---
name: Grzybobranie Design System
version: "1.0.0"
colors:
  paper: '#f6f5f1'
  app-bg: '#f6f5f1'
  paper-active: '#eae6dc'
  surface-card: '#ffffff'
  border-subtle: '#dcdad3'
  primary: '#1b382b'
  primary-green: '#1b382b'
  primary-green-hover: '#152e23'
  soft-green-bg: '#f4f7f4'
  accent-red: '#ad1414'
  accent-red-soft: '#fdf2f2'
  warning-amber: '#d97706'
  warning-soft: '#fef3c7'
  edible-bg: '#E8F5E9'
  edible-text: '#2E7D32'
  edible-border: '#81C784'
  inedible-bg: '#FFF3E0'
  inedible-text: '#C2410C'
  inedible-border: '#FFB74D'
  poisonous-bg: '#FFEBEE'
  poisonous-text: '#C62828'
  poisonous-border: '#EF5350'
  deadly-bg: '#ad1414'
  deadly-text: '#ffffff'
  deadly-alt-bg: '#2A080C'
  deadly-alt-text: '#FF4560'
  deadly-alt-border: '#FF1744'
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
    fontWeight: '600'
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
  sm: 0.25rem     # 4px  — inner image crops, subtle tags
  DEFAULT: 0.375rem # 6px
  md: 0.375rem    # 6px
  lg: 0.5rem      # 8px  — buttons, inputs, checkboxes, Skaner CTA pill
  xl: 0.75rem     # 12px — contained modules, modals
  2xl: 1rem       # 16px — bottom sheets
  full: 9999px    # pill badges, filter chips, status dots
spacing:
  gutter: 1rem       # 16px (px-4)
  margin: 1rem       # 16px
  space-xs: 0.25rem  # 4px
  space-sm: 0.5rem   # 8px
  space-md: 0.75rem  # 12px
  space-lg: 1rem     # 16px
  space-xl: 1.5rem   # 24px
---

# DESIGN.md — Grzybobranie AI (Grzybobranie Design System v1.0)

> **Source of truth**: The Stitch project _"Grzybobranie AI"_ is the
> visual source of truth. This file is the code-side mirror — keep both in sync.
> `src/theme/tokens.ts` is the runtime source of truth; components always read from there.

---

## 1. Visual Archetype & Core Philosophy

- **Aesthetic:** Grzybobranie Design System / Warm Editorial Paper — Scandinavian botanical manual.
- **Zero Sci-Fi / Zero HUD:** Strictly NO neon greens, NO laser scan lines, NO dark-mode
  cyberpunk HUDs, NO monospace fonts (`JetBrains Mono`), and NO AI hardware jargon
  (`TFLite`, `INT8`, `NPU`, `FPS`).
- **No Fake OS Elements:** NEVER render a fake iOS/Android top status bar (no `08:05`
  or `09:41` clock, WiFi, cellular, or battery icons) and NEVER render a fake bottom iOS
  Home Indicator bar.
- **Zero Gesture Conflicts:** NEVER use horizontal before/after drag sliders
  (`compare-slider`) on mobile screens. Always use a static 50/50 split grid or a clean
  segmented toggle (`50/50` vs `Makro`).

---

## 2. Typography & Contrast (WCAG 2.1 AA/AAA)

Font family: exclusively **Plus Jakarta Sans** (`font-sans`). Never use serif or monospace
fonts in app UI. Use `neutral-700` (`#374151`) and `neutral-800` (`#1f2937`) instead of
muted grays to maintain >7:1 contrast on `#f6f5f1`.

| Token | Size | Line-height | Weight | Letter-spacing | Usage |
|---|---|---|---|---|---|
| `headline-lg` | 30 px | 36 px | 800 | −0.025 em | Screen titles (main tabs) |
| `headline-lg-mobile` | 24 px | 32 px | 800 | −0.025 em | Screen titles (compact) |
| `headline-md` | 18 px | 24 px | 800 | −0.01 em | Species card titles, section headers |
| `headline-sm` | 15 px | 20 px | 800 | — | Sub-section headers |
| `species-latin` | 13 px | 18 px | 600 italic | 0 | Latin binomial names |
| `body-default` | 13 px | 18 px | 400 | — | Body copy, descriptions |
| `body-medium` | 13 px | 18 px | 600 | — | Emphasised body copy |
| `label-micro` | 11 px | 14 px | 700 | 0.025 em | Micro-labels, tab labels |
| `label-badge` | 10 px | 12 px | 800 uppercase | 0.05 em | Edibility & status badges |

---

## 3. Color Tokens

Always read from `src/theme/tokens.ts`. **Never hardcode hex values in components.**

### Brand palette

| Token | Hex | Usage |
|---|---|---|
| `primaryGreen` / `primary` | `#1b382b` | Primary CTA, edible dot, Skaner pill |
| `primaryGreenHover` | `#152e23` | Active / pressed state for primary buttons |
| `paper` / `appBg` | `#f6f5f1` | App background — warm matte paper |
| `paperActive` | `#eae6dc` | Active pills, selected day/tab cards |
| `surfaceCard` | `#ffffff` | Cards and content blocks |
| `borderSubtle` | `#dcdad3` | 1 px hairlines and borders |
| `softGreenBg` | `#f4f7f4` | Soft tint for edible comparison columns |
| `accentRed` | `#ad1414` | Life-safety crimson (deadly toxic badge, emergency) |
| `accentRedSoft` | `#fdf2f2` | Soft tint for toxic warnings / look-alike cards |
| `warningAmber` | `#d97706` | Inedible / requires thermal processing |
| `warningSoft` | `#fef3c7` | Amber tint background |

### Edibility & toxicity tiers

Safety signaling is absolute. These colors are **reserved strictly for taxonomic status**
and must never be co-opted for generic UI states.

| Status | Background | Text | Border / Accent |
|---|---|---|---|
| `EDIBLE` 🟢 | `#FFFFFF` (95% alpha) | `#171717` (`neutral-900`) | Dot `#1b382b` (`primaryGreen`), border `#e5e5e5` |
| `INEDIBLE` 🟡 | `#FFF3E0` | `#C2410C` | `#FFB74D` |
| `POISONOUS` 🔴 | `#FFEBEE` | `#C62828` | `#EF5350` |
| `DEADLY_POISONOUS` ☠️ | `#ad1414` (`accentRed`) | `#FFFFFF` | Skull SVG icon (or dark variant `#2A080C` / `#FF4560`) |

---

## 4. Corner Radius (Aligned with Tailwind Default Scale)

| Token | Value | Usage |
|---|---|---|
| `sm` | 4 px (`0.25rem`) | Inner image crops, subtle tags |
| `md` / `DEFAULT` | 6 px (`0.375rem`) | Compact chips |
| `lg` | 8 px (`0.5rem`) | Buttons, inputs, checkboxes, **Skaner CTA pill** (`rounded-lg`) |
| `xl` | 12 px (`0.75rem`) | Contained cards and modules (`rounded-xl`) |
| `2xl` | 16 px (`1rem`) | Modal sheets, detail panels |
| `full` | 9999 px | Filter pills, status dots, active tab indicator (`rounded-full`) |

---

## 5. Spacing Scale (8pt Grid System)

| Token | Value | Usage |
|---|---|---|
| `space-xs` | 4 px | Tight inline gaps |
| `space-sm` | 8 px | Base grid unit (`mt-2`, `space-y-2`) |
| `space-md` | 12 px | Vertical section rhythm (`mt-3`, `space-y-3`, `p-3`) |
| `space-lg` / `gutter` | 16 px | Universal horizontal padding (`px-4`, `p-4`) |
| `space-xl` | 24 px | Large section breaks |

---

## 6. Layout Rules

- **Mobile container:** `max-w-[420px]`, `h-[100vh] sm:h-[900px]`, `bg-appBg`,
  `sm:rounded-[40px]`, `flex flex-col justify-between`.
- **Horizontal padding:** Strictly `px-4` (16 px) across all headers, banners, and card bodies.
- **Edge-to-edge cards:** Main species cards and comparison containers span 100% width
  (`w-full bg-surfaceCard border-y border-borderSubtle`), separated by 1 px hairlines.
- **Internal sticky header** (detail & sub-screens):
  - `h-13 py-2.5 px-4 bg-appBg/95 backdrop-blur-md border-b border-borderSubtle flex items-center justify-between shrink-0 z-40`
  - Left: unified back button (`← Atlas`, `← Dziennik`, `← Profil`, `← Karta gatunku`).
  - Right: contextual action (e.g., bookmark). Do NOT render red SOS buttons in standard informational headers (emergency tools live in the `Pomoc` tab).
- **Touch targets:** minimum 48 × 48 px for all interactive elements.
- **Elevation:** zero diffusion shadows (`shadow-2xs` max). Use 1 px crisp borders (`borderSubtle`).

---

## 7. Components

### Locked: BottomNavigationBar

Do **not** redesign the bottom tab bar. All 5 tabs align on a single horizontal baseline:

- Tabs in order: **Atlas · Dziennik · Skaner · Pomoc · Profil**
- **Skaner** tab: `primaryGreen` pill CTA (`w-13 h-10 px-3.5 bg-primaryGreen rounded-lg`, white camera icon).
- Active tab indicator: `w-7 h-[2.5px] bg-neutral-900 rounded-full mt-1`.
- Inactive tabs: `neutral-700` text, transparent indicator bar (`bg-transparent`).

### Species Card (Atlas List)

- Edge-to-edge white surface (`w-full bg-surfaceCard border-y border-borderSubtle shadow-2xs`)[cite: 2].
- Spacing: add subtle separation (`mb-3`) between cards in the list to maintain scannability.
- Structure:
  1. Rectangular photo viewport (`w-full h-[210px] object-cover`) with top-right floating edibility badge (`top-3.5 right-4`)[cite: 2].
  2. Content block (`px-4 pt-3 pb-4`):
     - Polish common name (`headline-md` 18px)[cite: 2].
     - Latin binomial (`species-latin` 13px italic)[cite: 2].
     - 1 px hairline divider (`bg-borderSubtle/70 my-2.5`)[cite: 2].
     - Bottom metadata row (`flex items-center justify-between text-xs`):
       - Left: Habitat (`neutral-700`, e.g., "Lasy liściaste, polany") with tree icon.
       - Right: Contextual season indicator:
         - **In season (current month):** Pill badge (`bg-paperActive text-primaryGreen rounded-full px-2.5 py-0.5 text-[11px] font-bold`) featuring an inline dot (`w-1.5 h-1.5 rounded-full bg-primaryGreen mr-1.5`) and text: `● W sezonie (Lip – Lis)`[cite: 2].
         - **Out of season:** Muted label (`text-neutral-700 text-[11px] font-medium`): `Sezon: Lip – Paź`[cite: 2].
         - *Strict Rule:* Never render red (`accentRed`) or multi-dot micro-bars for season data; red is strictly reserved for toxicity tiers[cite: 2].

### Comparison / Look-Alike View (1:1)

- Dual-column static 50/50 split with a solid 1 px center divider (`borderSubtle`) and `50/50` vs `Makro` segmented toggle.
- Left column: target edible specimen (`softGreenBg`). Right column: toxic counterpart (`accentRedSoft`).
- 5-point physical verification checklist that locks the confirmation CTA (`disabled`) until all 5 checkboxes are checked (`5/5`).

---

## 8. Tailwind Config Reference

```js
// tailwind.config.js — extend section
colors: {
  appBg:             '#f6f5f1',
  paper:             '#f6f5f1',
  paperActive:       '#eae6dc',
  surfaceCard:       '#ffffff',
  borderSubtle:      '#dcdad3',
  primaryGreen:      '#1b382b',
  primaryGreenHover: '#152e23',
  softGreenBg:       '#f4f7f4',
  accentRed:         '#ad1414',
  accentRedSoft:     '#fdf2f2',
  warningAmber:      '#d97706',
  warningSoft:       '#fef3c7',
},
fontFamily: {
  sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
},
boxShadow: {
  '2xs': '0 1px 2px rgba(0, 0, 0, 0.04)',
}
// Keep Tailwind's default borderRadius scale (sm=4px, md=6px, lg=8px, xl=12px, 2xl=16px, full=9999px)