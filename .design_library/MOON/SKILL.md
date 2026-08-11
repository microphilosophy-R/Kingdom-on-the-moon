---
name: moon-design
description: Use this skill to generate well-branded interfaces and assets for MOON — a space-tech digital product. Contains colors, type, fonts, and UI components for prototyping dashboard and tool UIs.
user-invocable: true
---

# MOON Design Skill

Read the `README.md` file within this skill, and explore the other available files.

If creating visual artifacts, copy assets out and create static HTML files. If working on production code, read the rules here to become an expert in designing with this brand.

## Quick map

- `colors_and_type.css` — drop-in CSS variables for colors, type, radius, shadow, spacing
- `css.json` — structured token understanding source
- `components/index.json` — component index + cross-component patterns
- `components.css` — aggregated component CSS extracted from previews
- `components/{slug}.json` — component contracts for button, icon-button, card, panel, input, modal, navigation, tabs, tag, progress, avatar, section-heading, action-bar
- `preview/component-{slug}.html` — small HTML cards illustrating each component
- `library-consumption.json` — recommended downstream read order

## Essentials at a glance

- Brand primary `#7848DB` — deep nebula violet; pair with signal orange `#F97316` only for urgent CTAs.
- Radius is **4px / 8px / 12px / 9999px** — tight and geometric; pills reserved for tags and chips.
- Default control height is **40px**; spacing base is **4px** with tokens at 8, 12, 16, 24, 32, 48, 64.
- Type: **Orbitron** for display/headings, **Noto Sans SC** for body, **JetBrains Mono** for code.
- Voice: concise, technical, bilingual-friendly; no emoji in product UI.
- Shadows are whisper-quiet, five layered depths using `rgba(24,26,34,0.06...0.30)`; rest surfaces stay flat.
- Signature quirk: a `.dark` class flips primary to nebula-400 and swaps the steel scale for a true dark theme.

## Components

| Slug | Name | Key Insight |
|------|------|-------------|
| button | Button | Primary actions use nebula fills with Orbitron labels; signal orange for high-attention CTAs. |
| icon-button | IconButton | Square icon-only buttons with glow border on hover, simulating ship console keys. |
| card | Card | Floats on shadow-1 over steel-50; radius-md and steel-200 hairline borders. |
| panel | Panel | Semi-transparent bordered containers with four visual variants (surface/parchment/hero/raised). |
| input | Input | 40px height with nebula focus ring and steel-200 borders; keep labels terse. |
| navigation | Navigation | Steel-neutral bars with nebula active indicators and mono-logos. |
| tabs | Tabs | Bottom tab bar with icon+label items; active tab glows in signal orange. |
| modal | Modal | Overlay uses shadow-4 and radius-lg for clear separation from the page. |
| tag | Tag | Radius-full pills for status chips; use caption size and minimal copy. |
| progress | Progress | Linear progress bar with color-coded states (default/warning/critical). |
| avatar | Avatar | Character portrait slot with fine border and holographic glow effect. |
| section-heading | SectionHeading | Section header with eyebrow, title, description, and optional action slot. |
| action-bar | ActionBar | Horizontal button bar with alignment variants for dialog footers and toolbars. |
