// Mirrors DISTRIBUTIONS in studio-app/src/components/Layout/Columns.tsx — must stay
// in sync so a layout that looks right in the Puck editor renders identically live.
// Keep only the fields the storefront renderer needs (template + column count);
// the editor's `label` field has no live-rendering equivalent.
export const COLUMN_DISTRIBUTIONS: Record<string, { template: string; cols: number }> = {
  equal2:    { template: '1fr 1fr',         cols: 2 },
  sidebar13: { template: '1fr 3fr',         cols: 2 },
  sidebar31: { template: '3fr 1fr',         cols: 2 },
  wide21:    { template: '2fr 1fr',         cols: 2 },
  wide12:    { template: '1fr 2fr',         cols: 2 },
  equal3:    { template: '1fr 1fr 1fr',     cols: 3 },
  equal4:    { template: '1fr 1fr 1fr 1fr', cols: 4 },
}
