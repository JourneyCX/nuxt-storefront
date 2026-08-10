<script setup lang="ts">
const { cart, cartOpen, cartLoading, itemCount, removeFromCart, closeCart } = useCart()

// price is a minor-unit string from the Store API (e.g. "49900" for R499.00
// at minorUnit 2) -- same convention as cart.totals.total_price below.
function formatPrice(price: string, symbol: string, minorUnit: number) {
  return `${symbol}${(parseFloat(price) / 10 ** minorUnit).toFixed(2)}`
}

// cart.totals.total_price already carries WooCommerce's own auto-selected
// default shipping zone rate (e.g. a flat R50) the moment the cart has
// shippable items -- WC calculates and picks a rate against the store's base
// address even before the shopper has entered one, well before checkout ever
// asks Stratum's shipping-rate endpoint for a real courier quote. Summing the
// line items directly instead avoids showing that premature estimate here;
// the real, final total (products + actual shipping) only appears on the
// checkout page once a rate has genuinely been calculated/selected.
const productsSubtotal = computed(() => {
  const items = cart.value?.items ?? []
  return items.reduce((sum, item) => sum + parseFloat(item.prices.price) * item.quantity, 0)
})
</script>

<template>
  <!-- Backdrop -->
  <Transition name="fade">
    <div
      v-if="cartOpen"
      @click="closeCart"
      :style="{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200 }"
    />
  </Transition>

  <!-- Drawer -->
  <Transition name="slide">
    <aside
      v-if="cartOpen"
      :style="{ position:'fixed', top:0, right:0, bottom:0, width:'min(420px,100vw)', background:'#fff', zIndex:201, display:'flex', flexDirection:'column', boxShadow:'-4px 0 24px rgba(0,0,0,0.15)' }"
    >
      <!-- Header -->
      <div :style="{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px', borderBottom:'1px solid #e2e8f0' }">
        <h3 :style="{ margin:0, fontSize:'18px', fontWeight:700, color:'#1a202c' }">
          Shopping Cart
          <span v-if="itemCount" :style="{ fontSize:'14px', fontWeight:400, color:'#718096', marginLeft:'6px' }">({{ itemCount }})</span>
        </h3>
        <button @click="closeCart" :style="{ background:'none', border:'none', fontSize:'22px', cursor:'pointer', color:'#718096', lineHeight:1 }">×</button>
      </div>

      <!-- Loading overlay -->
      <div v-if="cartLoading" :style="{ position:'absolute', inset:0, background:'rgba(255,255,255,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10 }">
        <div :style="{ width:'32px', height:'32px', border:'3px solid #e2e8f0', borderTopColor:'#3182ce', borderRadius:'50%', animation:'spin 0.7s linear infinite' }" />
      </div>

      <!-- Empty state -->
      <div v-if="!cart || cart.items.length === 0" :style="{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#a0aec0', padding:'32px' }">
        <div :style="{ fontSize:'48px', marginBottom:'16px' }">🛒</div>
        <p :style="{ margin:0, fontSize:'16px' }">Your cart is empty</p>
      </div>

      <!-- Items -->
      <div v-else :style="{ flex:1, overflowY:'auto', padding:'16px 24px' }">
        <div
          v-for="item in cart.items"
          :key="item.key"
          :style="{ display:'flex', gap:'14px', padding:'14px 0', borderBottom:'1px solid #f0f0f0' }"
        >
          <img
            v-if="item.images?.[0]"
            :src="item.images[0].src"
            :alt="item.images[0].alt || item.name"
            :style="{ width:'64px', height:'64px', objectFit:'cover', borderRadius:'6px', flexShrink:0 }"
          />
          <div :style="{ width:'64px', height:'64px', background:'#f7f8fa', borderRadius:'6px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', color:'#cbd5e0', fontSize:'12px' }" v-else>
            No img
          </div>
          <div :style="{ flex:1, minWidth:0 }">
            <p :style="{ margin:'0 0 4px', fontWeight:600, fontSize:'14px', color:'#2d3748', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }">{{ item.name }}</p>
            <p :style="{ margin:'0 0 8px', fontSize:'13px', color:'#718096' }">Qty: {{ item.quantity }}</p>
            <p :style="{ margin:0, fontWeight:700, fontSize:'14px', color:'#2d3748' }">
              {{ formatPrice(item.prices.price, item.prices.currency_symbol, item.prices.currency_minor_unit) }}
            </p>
          </div>
          <button
            @click="removeFromCart(item.key)"
            :style="{ background:'none', border:'none', color:'#a0aec0', cursor:'pointer', fontSize:'18px', flexShrink:0, alignSelf:'flex-start' }"
            title="Remove"
          >×</button>
        </div>
      </div>

      <!-- Footer with total + checkout -->
      <div v-if="cart && cart.items.length > 0" :style="{ padding:'20px 24px', borderTop:'1px solid #e2e8f0' }">
        <div :style="{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }">
          <span :style="{ fontWeight:600, fontSize:'16px', color:'#1a202c' }">Subtotal</span>
          <span :style="{ fontWeight:700, fontSize:'18px', color:'#1a202c' }">
            {{ formatPrice(String(productsSubtotal), cart.totals.currency_symbol, cart.totals.currency_minor_unit) }}
          </span>
        </div>
        <p :style="{ margin:'0 0 16px', fontSize:'12px', color:'#a0aec0' }">Discount codes and delivery options are on the cart page</p>
        <a
          href="/cart"
          :style="{ display:'block', width:'100%', background:'#2b6cb0', color:'#fff', textAlign:'center', padding:'14px', borderRadius:'6px', fontWeight:700, fontSize:'16px', textDecoration:'none' }"
        >
          View Cart
        </a>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }

.slide-enter-active, .slide-leave-active { transition: transform 0.25s ease; }
.slide-enter-from, .slide-leave-to       { transform: translateX(100%); }

@keyframes spin { to { transform: rotate(360deg); } }
</style>
