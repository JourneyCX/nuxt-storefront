import type { WcVariation } from '~/server/utils/woocommerce'

// A WooCommerce variation can define an attribute as "Any …" (e.g. "Any
// Color"). WC REST returns such an attribute as ABSENT from the variation's
// `attributes` (or with an empty option), so an exact-match lookup never
// resolves it and the product could not be bought (0b-B11, 2026-10-02).
//
// WooCommerce's own rule, mirrored here: a variation matches when, for every
// variation attribute of the parent, the variation's value is either equal to
// the shopper's choice or "Any". When several match, the FIRST in menu order
// wins -- so `variations` must be fetched ordered by menu_order ascending
// (see getVariations() in server/utils/woocommerce.ts).

export interface VariationSelectionPair {
  attribute: string
  value: string
}

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase()

export function matchVariation(
  variations: WcVariation[] | null | undefined,
  attributeNames: string[],
  selected: Record<string, string | null>,
): WcVariation | null {
  if (!variations?.length || !attributeNames.length) return null
  if (!attributeNames.every(name => !!selected[name])) return null

  return variations.find(v =>
    attributeNames.every(name => {
      const own = v.attributes.find(a => norm(a.name) === norm(name))
      // Absent or blank = "Any": matches whatever the shopper picked.
      return !own || own.option === '' || norm(own.option) === norm(selected[name])
    }),
  ) ?? null
}

// The shopper's full selection, sent to the Store API's add-item `variation`
// field. Required for "Any" attributes (WC rejects the add without them:
// "… is a required field") and harmless for specific ones (WC validates them).
export function variationSelection(
  attributeNames: string[],
  selected: Record<string, string | null>,
): VariationSelectionPair[] {
  return attributeNames
    .filter(name => !!selected[name])
    .map(name => ({ attribute: name, value: selected[name] as string }))
}
