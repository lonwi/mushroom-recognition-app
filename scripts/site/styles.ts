import { siteTheme } from './theme';

export function generateCss(): string {
  const { light, dark, radius } = siteTheme;

  return `/* Grzybobranie AI — Pileus v1.0 Design Tokens (zero-runtime CSS) */
:root {
  --bg: ${light.bg};
  --surface: ${light.surface};
  --surface-raised: ${light.surfaceRaised};
  --ink: ${light.ink};
  --muted: ${light.muted};
  --border: ${light.border};
  --border-strong: ${light.borderStrong};
  --primary: ${light.primary};
  --on-primary: ${light.onPrimary};
  --danger: ${light.danger};
  --warning: ${light.warning};
  --link: ${light.link};
  --focus: ${light.focus};
  --radius-sm: ${radius.sm};
  --radius-md: ${radius.md};
  --radius-lg: ${radius.lg};
  --radius-xl: ${radius.xl};
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-serif: Georgia, "Iowan Old Style", "Palatino Linotype", Palatino, serif;
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: ${dark.bg};
    --surface: ${dark.surface};
    --surface-raised: ${dark.surfaceRaised};
    --ink: ${dark.ink};
    --muted: ${dark.muted};
    --border: ${dark.border};
    --border-strong: ${dark.borderStrong};
    --primary: ${dark.primary};
    --on-primary: ${dark.onPrimary};
    --danger: ${dark.danger};
    --warning: ${dark.warning};
    --link: ${dark.link};
    --focus: ${dark.focus};
    color-scheme: dark;
  }
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.6;
  background-color: var(--bg);
  color: var(--ink);
  -webkit-text-size-adjust: 100%;
}

body {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

a {
  color: var(--link);
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.15s ease;
}

a:hover {
  opacity: 0.85;
}

:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 3px;
}

.skip {
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
  z-index: 1000;
  padding: 0.75rem 1.25rem;
  background: var(--surface);
  color: var(--ink);
  border: 2px solid var(--focus);
  font-weight: 700;
  text-decoration: none;
}

.skip:focus {
  left: 1rem;
  top: 1rem;
  width: auto;
  height: auto;
  overflow: visible;
}

.wrap {
  width: 100%;
  max-width: 960px;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1.25rem;
  padding-right: 1.25rem;
}

.site-header {
  background-color: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 50;
}

.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
  flex-wrap: wrap;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 1.25rem;
  font-weight: 700;
}

.brand img {
  display: block;
  border-radius: var(--radius-sm);
}

.nav {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
}

.nav a {
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--muted);
  padding: 0.35rem 0;
  border-bottom: 2px solid transparent;
}

.nav a:hover {
  color: var(--ink);
}

.nav a[aria-current="page"] {
  color: var(--ink);
  border-bottom-color: var(--primary);
}

.page {
  flex: 1;
  padding-top: 2.5rem;
  padding-bottom: 4rem;
}

h1, h2, h3, h4 {
  font-family: var(--font-serif);
  color: var(--ink);
  line-height: 1.3;
  margin-bottom: 0.75rem;
}

h1 {
  font-size: 2.25rem;
  margin-bottom: 1rem;
}

h2 {
  font-size: 1.6rem;
  margin-top: 2.25rem;
  margin-bottom: 0.85rem;
}

h3 {
  font-size: 1.25rem;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}

p {
  margin-bottom: 1rem;
}

.lead {
  font-size: 1.2rem;
  line-height: 1.6;
  color: var(--muted);
  margin-bottom: 1.5rem;
}

.badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  background-color: var(--surface-raised);
  color: var(--ink);
  border: 1px solid var(--border);
  margin-bottom: 1rem;
}

.safety {
  background-color: var(--surface);
  border: 2px solid var(--danger);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  margin-top: 2rem;
  margin-bottom: 2rem;
}

.safety h2 {
  color: var(--danger);
  margin-top: 0;
  font-size: 1.4rem;
}

.safety p:last-child {
  margin-bottom: 0;
}

.grid {
  display: grid;
  gap: 1.5rem;
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}

.grid-2 {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.grid-3 {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.card {
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.5rem;
}

.card h3 {
  margin-top: 0;
}

.card p:last-child {
  margin-bottom: 0;
}

.list-styled {
  margin-left: 1.5rem;
  margin-bottom: 1.5rem;
}

.list-styled li {
  margin-bottom: 0.5rem;
}

.table-wrap {
  overflow-x: auto;
  margin-top: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.95rem;
}

th, td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
}

th {
  background-color: var(--surface-raised);
  font-weight: 700;
  color: var(--ink);
}

tr:last-child td {
  border-bottom: none;
}

.site-footer {
  background-color: var(--surface-raised);
  border-top: 1px solid var(--border);
  padding-top: 2.5rem;
  padding-bottom: 2.5rem;
  margin-top: auto;
  font-size: 0.9rem;
  color: var(--muted);
}

.footer-safety {
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 1rem;
}

.footer-links {
  list-style: none;
  display: flex;
  gap: 1.5rem;
  padding: 0;
  margin-top: 1rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.footer-links a {
  color: var(--ink);
  text-decoration: none;
  font-weight: 600;
}

.footer-links a:hover {
  text-decoration: underline;
}

.copyright {
  font-size: 0.85rem;
  color: var(--muted);
}

@media (max-width: 600px) {
  h1 { font-size: 1.85rem; }
  h2 { font-size: 1.35rem; }
  .bar { flex-direction: column; align-items: flex-start; }
  .nav { width: 100%; justify-content: flex-start; }
}

@media (forced-colors: active) {
  :root {
    --border: CanvasText;
    --border-strong: CanvasText;
    --primary: Highlight;
    --danger: Mark;
  }
  .card, .safety, .site-header, .site-footer {
    border-color: CanvasText;
  }
}
`;
}
