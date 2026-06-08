# Field Notes — the Nate Irwin brand

This is the brand system for **nate.irwin.xyz**. It is small on purpose. The point is a
consistent point of view, not a rulebook nobody reads.

## The idea

The site reads like a beautifully made **topographic field guide**, kept by someone who makes
maps and builds software. That is the actual throughline of Nate's work — National Park Service
cartography (NPMap, Park Tiles, Places, the Symbol Library) and now product at OuterSpatial,
helping people get outside.

So the language of the brand is the language of a map: **coordinates, contour lines, elevation,
a trail blaze.** The mood is warm paper and ink, not a glossy app.

**Restraint is the whole game.** The cartographic motifs are quiet texture and small metadata —
a faint contour wash, a coordinate eyebrow, a hairline that ticks like a map ruler. The moment it
looks like a costume, it has failed. When in doubt, take the motif out.

## Color

Warm national-park palette: paper, forest, contour brown, trail blaze. Tokens live in
`public/assets/css/tokens.css`; use the variables, never raw hex.

### Light (default)

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#F4F0E6` | page background |
| `--paper-raised` | `#FBF8F0` | cards, raised surfaces |
| `--paper-sunk` | `#ECE6D6` | wells, hover fills |
| `--ink` | `#1A1A17` | primary text |
| `--forest` | `#1F3A2E` | brand, headings emphasis, **link text** |
| `--contour` | `#7A5C3E` | muted accents, eyebrows, planned status |
| `--blaze` | `#E8662A` | trail-blaze accent — active nav, markers, hover underline |
| `--blaze-ink` | `#C5491A` | blaze when used as small text (passes AA on paper) |
| `--muted` | `#6B6257` | secondary text, metadata |
| `--rule` | `#D9D2C2` | hairline borders, graticule ticks |

### Dark

Warm near-black paper, forest becomes a legible **sage**, blaze brightens. Same token names — see
`tokens.css`. Dark is opt-in via the toggle, or follows OS preference when the user hasn't chosen.

### The one contrast rule

`--blaze` is gorgeous and **fails** as small body text on cream (orange-on-paper ≈ 3:1). So:

- **Link text is `--forest`** (dark, ~9:1 on paper), with a `--blaze` underline that animates on hover.
- Use `--blaze` for **large text, markers, active states, and the hover underline** — never for
  paragraph-size text on `--paper`. When you truly need blaze-colored small text, use `--blaze-ink`.
- Body text is `--ink`; secondary text is `--muted`. Both clear AA at body sizes.

## Typography

Two families, self-hosted (no Google Fonts dependency, no FOUT).

- **Fraunces Variable** — display. Hero wordmark, page titles, section titles, and the big
  dashboard numerals. Use its optical size: `font-variation-settings: "opsz" 144` at display sizes.
  Warm, characterful, a little old-style. This is the voice.
- **Inter Variable** — everything else. Body, nav, labels, tags, coordinates. Use
  `font-variant-numeric: tabular-nums` for any aligned figures (stats, log metrics).

Scale (fluid, tokens in `tokens.css`): hero `--fs-hero`, page title `--fs-h1`, section `--fs-h2`,
lede `--fs-lede`, body `--fs-body` at line-height **1.62**, labels `--fs-label` uppercase tracked
`0.14em`, eyebrows tracked `0.22em`.

## Motifs (use sparingly)

1. **Contour wash** — faint concentric contour SVG (`currentColor`, ~5% opacity) behind the hero.
   Texture, never foreground.
2. **Coordinate eyebrow** — small uppercase tracked coordinate/metadata string above a title
   (e.g. `40.4850° N · 106.8317° W`). The `Coordinate.astro` component.
3. **Graticule hairline** — section titles sit on a thin rule with a short blaze tick at the start,
   like the edge of a map.
4. **Trail blaze** — the orange as a small marker: active nav underline, the tick on a section rule,
   the dot on an in-progress item.
5. **Status tags** — small uppercase tracked tags. `completed` = forest, `in progress` = blaze,
   `planned`/`to read` = contour/muted.

## Voice

Plainspoken, precise, a little dry — field-notes brevity. State what a thing is; skip the adjectives.
No marketing language, no exclamation points, no "passionate about." First person, lowercase
domain (`nate.irwin.xyz`).

## Don't

- Don't let the map theme get literal — no fake compasses, no skeuomorphic paper curl, no emoji pins.
- Don't put blaze-colored text at body size on paper.
- Don't add a third typeface or a third accent color.
- Don't fill space with decoration; whitespace is part of the design.
