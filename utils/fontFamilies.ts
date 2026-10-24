// The font families a storefront block may use. The Studio's font select (studio-app: src/components/SiteSettings/FontsSection.tsx, FONT_OPTIONS)
// offers exactly these values, and a page's saved JSON is data a merchant (or an old import) wrote, so the storefront does not trust it:
// a block's font is applied only when it is one of these strings, exactly. Anything else (free text, a stray `;`, `url(...)`) is ignored and
// the block inherits the theme font. Add a font here in the same change as the Studio list; tests/fontFamilies.test.ts checks the shape.
export const ALLOWED_FONT_FAMILIES: readonly string[] = [
  "'Montserrat', sans-serif",
  "'Poppins', sans-serif",
  "'Inter', sans-serif",
  "'Roboto', sans-serif",
  "'Nunito', sans-serif",
  "'Oswald', sans-serif",
  "'Playfair Display', serif",
  "'Lora', serif",
  'Arial, Helvetica, sans-serif',
  "Georgia, 'Times New Roman', serif",
  "'DM Sans', sans-serif",
  "'Raleway', sans-serif",
  "'Open Sans', sans-serif",
  "'Lato', sans-serif",
  "'Work Sans', sans-serif",
  "'Manrope', sans-serif",
  "'Outfit', sans-serif",
  "'Space Grotesk', sans-serif",
  "'Rubik', sans-serif",
  "'Quicksand', sans-serif",
  "'Merriweather', serif",
  "'Cormorant Garamond', serif",
  "'DM Serif Display', serif",
  "'Libre Baskerville', serif",
  "'Cinzel', serif",
  "'Abril Fatface', serif",
  "'Righteous', sans-serif",
  "'Dancing Script', cursive",
  "'Pacifico', cursive",
  "'Lobster', cursive",
  "'Great Vibes', cursive",
  "'Caveat', cursive",
  "'Permanent Marker', cursive",
  "'Space Mono', monospace",
]

const ALLOWED = new Set<string>(ALLOWED_FONT_FAMILIES)

/** The font-family to apply for a saved value, or undefined (inherit the theme font) when it is empty or not on the list. */
export function safeFontFamily(value: unknown): string | undefined {
  return typeof value === 'string' && ALLOWED.has(value) ? value : undefined
}
