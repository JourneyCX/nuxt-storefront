<script setup lang="ts">
type Category = { label: string; slug: string; count: number }

// showCategoryCounts already existed in studio-app's ProductFilter.tsx but was never
// ported here — the per-category count span below was always shown unconditionally.
// withDefaults() (not `?? true`) because Vue casts an absent Boolean prop to `false`,
// not `undefined` — see the schema-drift-audit doc for why that matters.
const props = withDefaults(defineProps<{
  layout?: 'sidebar' | 'topbar'
  showSearch?: boolean
  showCategories?: boolean
  showCategoryCounts?: boolean
  showPriceRange?: boolean
  showSortBy?: boolean
  showActiveFilters?: boolean
  accentColor?: string
  backgroundColor?: string
  textColor?: string
  borderColor?: string
  currency?: string
  minPrice?: number
  maxPrice?: number
  categories?: Category[]
}>(), {
  showCategoryCounts: true,
})

const accent = computed(() => props.accentColor || '#2563eb')
const bg     = computed(() => props.backgroundColor || '#ffffff')
const text   = computed(() => props.textColor || '#1e293b')
const border = computed(() => props.borderColor || '#e2e8f0')
const cur    = computed(() => props.currency || 'R ')
const minP   = computed(() => props.minPrice ?? 0)
const maxP   = computed(() => props.maxPrice ?? 2000)

const catOpen   = ref(true)
const priceOpen = ref(true)
const checkedCats = ref<number[]>([0])
const priceVal  = ref(maxP.value)

watch(maxP, v => { priceVal.value = v })

function toggleCat(i: number) {
  if (checkedCats.value.includes(i)) {
    checkedCats.value = checkedCats.value.filter(c => c !== i)
  } else {
    checkedCats.value = [...checkedCats.value, i]
  }
}

// Pushes the current selection into the URL's `category`/`max_price` query
// params, which is how ProductGrid (an independent sibling Puck block, with no
// direct prop/event channel to this one) picks up the filter -- see
// ProductGrid.vue's effectiveCategory/effectiveMaxPrice. router.replace, not
// push, so dragging the price slider doesn't spam browser history.
const router = useRouter()
const route  = useRoute()

function syncQuery() {
  const q: Record<string, any> = { ...route.query }
  if (props.showCategories !== false) {
    const slugs = checkedCats.value
      .map(i => props.categories?.[i]?.slug)
      .filter((s): s is string => !!s)
    if (slugs.length > 0) q.category = slugs.join(',')
    else delete q.category
  }
  if (props.showPriceRange !== false) {
    q.max_price = String(priceVal.value)
  } else {
    delete q.max_price
  }
  router.replace({ query: q })
}

let debounceTimer: ReturnType<typeof setTimeout> | undefined
function syncQueryDebounced() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(syncQuery, 300)
}

watch(checkedCats, syncQuery)
watch(priceVal, syncQueryDebounced)

const inputBase = computed(() => ({
  width: '100%',
  border: `1px solid ${border.value}`,
  borderRadius: '8px',
  padding: '9px 12px',
  fontSize: '14px',
  color: text.value,
  backgroundColor: '#fff',
  outline: 'none',
  boxSizing: 'border-box' as const,
}))
</script>

<template>
  <!-- ── SIDEBAR layout ── -->
  <aside
    v-if="layout !== 'topbar'"
    :style="{ backgroundColor: bg, padding: '24px', borderRight: `1px solid ${border}`, minWidth: '220px' }"
  >
    <!-- Heading -->
    <div :style="{ display:'flex', alignItems:'center', gap:'6px', color:text, fontWeight:800, fontSize:'15px', marginBottom:'16px' }">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" :stroke="text" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
      </svg>
      <span>Filters</span>
    </div>

    <!-- Active filter tags -->
    <div v-if="showActiveFilters !== false && checkedCats.length > 0" :style="{ marginBottom:'16px', display:'flex', flexWrap:'wrap', gap:'6px' }">
      <span
        v-for="i in checkedCats" :key="i"
        :style="{ display:'inline-flex', alignItems:'center', gap:'4px', backgroundColor:accent+'18', color:accent, fontSize:'12px', fontWeight:600, padding:'4px 10px', borderRadius:'20px' }"
      >
        {{ categories?.[i]?.label }}
        <button @click="toggleCat(i)" :style="{ background:'none', border:'none', cursor:'pointer', color:accent, fontSize:'14px', lineHeight:1, padding:0 }">×</button>
      </span>
    </div>

    <!-- Search -->
    <div v-if="showSearch !== false" :style="{ position:'relative', display:'flex', alignItems:'center', marginBottom:'16px' }">
      <svg :style="{ position:'absolute', left:'10px' }" width="15" height="15" viewBox="0 0 24 24" fill="none" :stroke="text+'88'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input type="text" placeholder="Search products…" :style="{ ...inputBase, paddingLeft:'34px' }" />
    </div>

    <!-- Sort by -->
    <div v-if="showSortBy !== false" :style="{ marginBottom:'16px' }">
      <select :style="inputBase">
        <option>Sort: Featured</option>
        <option>Price: Low to High</option>
        <option>Price: High to Low</option>
        <option>Newest Arrivals</option>
        <option>Best Selling</option>
      </select>
    </div>

    <!-- Categories -->
    <div v-if="showCategories !== false && categories?.length">
      <hr :style="{ border:'none', borderTop:`1px solid ${border}`, margin:'4px 0' }" />
      <button @click="catOpen = !catOpen"
        :style="{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', background:'none', border:'none', cursor:'pointer', padding:'12px 0', color:text }">
        <span :style="{ fontWeight:700, fontSize:'13px', letterSpacing:'0.05em', textTransform:'uppercase' }">Category</span>
        <span :style="{ fontSize:'18px', fontWeight:300, transform: catOpen ? 'rotate(180deg)' : 'none', transition:'transform 0.2s', display:'inline-block' }">›</span>
      </button>
      <div v-if="catOpen" :style="{ paddingBottom:'8px' }">
        <label
          v-for="(cat, i) in categories" :key="i"
          :style="{ display:'flex', alignItems:'center', gap:'9px', padding:'5px 0', cursor:'pointer' }"
        >
          <input
            type="checkbox"
            :checked="checkedCats.includes(i)"
            @change="toggleCat(i)"
            :style="{ accentColor: accent, width:'15px', height:'15px', cursor:'pointer' }"
          />
          <span :style="{ color:text, fontSize:'14px', flexGrow:1 }">{{ cat.label }}</span>
          <span v-if="showCategoryCounts" :style="{ color:text, opacity:0.45, fontSize:'12px' }">{{ cat.count }}</span>
        </label>
      </div>
    </div>

    <!-- Price range -->
    <div v-if="showPriceRange !== false">
      <hr :style="{ border:'none', borderTop:`1px solid ${border}`, margin:'4px 0' }" />
      <button @click="priceOpen = !priceOpen"
        :style="{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', background:'none', border:'none', cursor:'pointer', padding:'12px 0', color:text }">
        <span :style="{ fontWeight:700, fontSize:'13px', letterSpacing:'0.05em', textTransform:'uppercase' }">Price</span>
        <span :style="{ fontSize:'18px', fontWeight:300, transform: priceOpen ? 'rotate(180deg)' : 'none', transition:'transform 0.2s', display:'inline-block' }">›</span>
      </button>
      <div v-if="priceOpen" :style="{ paddingBottom:'12px' }">
        <input
          type="range"
          :min="minP" :max="maxP"
          v-model.number="priceVal"
          :style="{ width:'100%', accentColor: accent, cursor:'pointer' }"
        />
        <div :style="{ display:'flex', justifyContent:'space-between', marginTop:'8px' }">
          <span :style="{ color:text, opacity:0.65, fontSize:'13px' }">{{ cur }}{{ minP }}</span>
          <span :style="{ color:accent, fontWeight:700, fontSize:'13px' }">{{ cur }}{{ priceVal }}</span>
        </div>
      </div>
    </div>
  </aside>

  <!-- ── TOPBAR layout ── -->
  <div
    v-else
    :style="{ backgroundColor:bg, padding:'14px 24px', borderBottom:`1px solid ${border}` }"
  >
    <div :style="{ maxWidth:'1280px', margin:'0 auto', display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap' }">
      <div :style="{ display:'flex', alignItems:'center', gap:'6px', color:text, fontWeight:700, fontSize:'14px' }">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" :stroke="text" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
        </svg>
        <span>Filters</span>
      </div>
      <template v-if="showCategories !== false">
        <button
          v-for="(cat, i) in categories?.slice(0, 5)" :key="i"
          @click="toggleCat(i)"
          :style="{
            padding:'7px 14px', borderRadius:'20px', fontSize:'13px', fontWeight:600, cursor:'pointer',
            border: `1.5px solid ${checkedCats.includes(i) ? accent : border}`,
            backgroundColor: checkedCats.includes(i) ? accent+'14' : '#fff',
            color: checkedCats.includes(i) ? accent : text,
          }"
        >{{ cat.label }}</button>
      </template>
      <div v-if="showPriceRange !== false" :style="{ display:'flex', alignItems:'center', gap:'8px', marginLeft:'auto' }">
        <span :style="{ color:text, fontSize:'13px', fontWeight:600, whiteSpace:'nowrap' }">Up to {{ cur }}{{ priceVal }}</span>
        <input type="range" :min="minP" :max="maxP" v-model.number="priceVal" :style="{ width:'100px', accentColor: accent, cursor:'pointer' }" />
      </div>
      <select v-if="showSortBy !== false" :style="{ ...inputBase, width:'auto', paddingRight:'32px' }">
        <option>Sort: Featured</option>
        <option>Price: Low to High</option>
        <option>Newest</option>
      </select>
    </div>
  </div>
</template>
