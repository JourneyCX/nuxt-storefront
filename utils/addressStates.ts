// WooCommerce's Store API validates state/province against the country's
// defined state list (WC()->countries->get_states()) when one exists --
// confirmed live via `wp eval` against tenant-69's own WooCommerce install.
// A free-text field that doesn't match one of these codes fails checkout
// with a generic "Invalid parameter(s): billing_address, shipping_address"
// 400 (schema-level rejection, not WC's friendlier per-field message).
// GB and ZW have no defined states in WC core, so they fall back to free
// text. This list is static WC core data, not fetched per-request. Shared
// by both /cart (optional province, for a sharper Bob Go/Courier Guy quote)
// and /checkout (required at final submit) so the two stay in sync.
export const STATE_OPTIONS: Record<string, Record<string, string>> = {
  ZA: { EC: 'Eastern Cape', FS: 'Free State', GP: 'Gauteng', KZN: 'KwaZulu-Natal', LP: 'Limpopo', MP: 'Mpumalanga', NC: 'Northern Cape', NW: 'North West', WC: 'Western Cape' },
  US: { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming' },
  CA: { AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick', NL: 'Newfoundland and Labrador', NT: 'Northwest Territories', NS: 'Nova Scotia', NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island', QC: 'Quebec', SK: 'Saskatchewan', YT: 'Yukon Territory' },
  AU: { ACT: 'Australian Capital Territory', NSW: 'New South Wales', NT: 'Northern Territory', QLD: 'Queensland', SA: 'South Australia', TAS: 'Tasmania', VIC: 'Victoria', WA: 'Western Australia' },
  NZ: { NTL: 'Northland', AUK: 'Auckland', WKO: 'Waikato', BOP: 'Bay of Plenty', TKI: 'Taranaki', GIS: 'Gisborne', HKB: 'Hawke’s Bay', MWT: 'Manawatu-Whanganui', WGN: 'Wellington', NSN: 'Nelson', MBH: 'Marlborough', TAS: 'Tasman', WTC: 'West Coast', CAN: 'Canterbury', OTA: 'Otago', STL: 'Southland' },
  ZM: { 'ZM-01': 'Western', 'ZM-02': 'Central', 'ZM-03': 'Eastern', 'ZM-04': 'Luapula', 'ZM-05': 'Northern', 'ZM-06': 'North-Western', 'ZM-07': 'Southern', 'ZM-08': 'Copperbelt', 'ZM-09': 'Lusaka', 'ZM-10': 'Muchinga' },
}

export const COUNTRY_OPTIONS: { code: string; label: string }[] = [
  { code: 'ZA', label: 'South Africa' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'AU', label: 'Australia' },
  { code: 'CA', label: 'Canada' },
  { code: 'NZ', label: 'New Zealand' },
  { code: 'ZW', label: 'Zimbabwe' },
  { code: 'ZM', label: 'Zambia' },
]
