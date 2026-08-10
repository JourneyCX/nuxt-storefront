<script setup lang="ts">
const props = defineProps<{
  layout?: 'banner' | 'card' | 'minimal'
  showFirstName?: boolean
  headline?: string
  subheadline?: string
  placeholder?: string
  buttonText?: string
  privacyText?: string
  successMessage?: string
  webhookUrl?: string
  accentColor?: string
  backgroundColor?: string
  textColor?: string
  borderRadius?: number
}>()

const email = ref('')
const firstName = ref('')
const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')

const layout = computed(() => props.layout || 'banner')
const accent = computed(() => props.accentColor || '#2563eb')
const bg = computed(() => props.backgroundColor || '#f8fafc')
const text = computed(() => props.textColor || '#1e293b')
const radius = computed(() => props.borderRadius || 12)
const inputRadius = computed(() => Math.round(radius.value / 1.5))

async function submit() {
  if (!email.value) return
  status.value = 'loading'
  if (!props.webhookUrl) {
    setTimeout(() => { status.value = 'success' }, 800)
    return
  }
  try {
    const res = await fetch(props.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, firstName: firstName.value }),
    })
    status.value = res.ok ? 'success' : 'error'
  } catch {
    status.value = 'error'
  }
}

const inputStyleDark = computed(() => ({
  flex: 1, padding: '13px 18px', border: '1px solid rgba(255,255,255,0.25)',
  borderRadius: `${inputRadius.value}px`, fontSize: '15px', outline: 'none',
  backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff', minWidth: 0,
}))

const inputStyleLight = computed(() => ({
  flex: 1, padding: '12px 16px', border: '1px solid #e2e8f0',
  borderRadius: `${inputRadius.value}px`, fontSize: '15px', outline: 'none',
  backgroundColor: '#fff', color: text.value, minWidth: 0,
}))
</script>

<template>
  <!-- Success state -->
  <section v-if="status === 'success'" :style="{ backgroundColor: layout==='banner' ? accent : bg, padding:'56px 24px', textAlign:'center' }">
    <div :style="{ maxWidth:'560px', margin:'0 auto' }">
      <div :style="{ fontSize:'40px', marginBottom:'16px' }">🎉</div>
      <p :style="{ color: layout==='banner' ? '#fff' : text, fontSize:'22px', fontWeight:800, margin:'0 0 10px' }">{{ successMessage || "You're subscribed!" }}</p>
      <p :style="{ color: layout==='banner' ? 'rgba(255,255,255,0.75)' : text, opacity: layout==='banner' ? 1 : 0.6, fontSize:'15px', margin:0 }">Keep an eye on your inbox.</p>
    </div>
  </section>

  <!-- Banner layout -->
  <section v-else-if="layout === 'banner'" :style="{ backgroundColor: accent, padding:'56px 24px' }">
    <div :style="{ maxWidth:'700px', margin:'0 auto', textAlign:'center' }">
      <div :style="{ marginBottom:'8px', display:'flex', justifyContent:'center' }">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" :stroke="'rgba(255,255,255,0.7)'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      </div>
      <h2 :style="{ color:'#fff', fontSize:'32px', fontWeight:800, margin:'12px 0 12px' }">{{ headline || 'Stay in the Loop' }}</h2>
      <p v-if="subheadline" :style="{ color:'rgba(255,255,255,0.8)', fontSize:'17px', margin:'0 0 32px', lineHeight:1.6 }">{{ subheadline }}</p>
      <form @submit.prevent="submit" :style="{ display:'flex', gap:'10px', flexWrap:'wrap', justifyContent:'center' }">
        <input v-if="showFirstName" type="text" placeholder="First name" v-model="firstName" :style="{ ...inputStyleDark, flex:'0 1 160px' }" />
        <input type="email" required :placeholder="placeholder || 'Enter your email address'" v-model="email" :style="inputStyleDark" />
        <button type="submit" :disabled="status==='loading'" :style="{ padding:'13px 28px', borderRadius:`${inputRadius}px`, backgroundColor:'#fff', color:accent, border:'none', fontWeight:700, fontSize:'15px', cursor:'pointer', whiteSpace:'nowrap' }">
          {{ status === 'loading' ? '…' : (buttonText || 'Subscribe') }}
        </button>
      </form>
      <p v-if="privacyText" :style="{ color:'rgba(255,255,255,0.55)', fontSize:'12px', marginTop:'16px' }">{{ privacyText }}</p>
    </div>
  </section>

  <!-- Card layout -->
  <section v-else-if="layout === 'card'" :style="{ backgroundColor: bg, padding:'64px 24px' }">
    <div :style="{ maxWidth:'540px', margin:'0 auto', backgroundColor:'#fff', borderRadius:`${radius}px`, padding:'48px', boxShadow:'0 8px 40px rgba(0,0,0,0.1)', border:'1px solid #f1f5f9', textAlign:'center' }">
      <div :style="{ width:'56px', height:'56px', borderRadius:'50%', backgroundColor:`${accent}18`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" :stroke="accent" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      </div>
      <h2 :style="{ color:text, fontSize:'26px', fontWeight:800, margin:'0 0 12px' }">{{ headline || 'Stay in the Loop' }}</h2>
      <p v-if="subheadline" :style="{ color:text, opacity:0.65, fontSize:'15px', margin:'0 0 28px', lineHeight:1.6 }">{{ subheadline }}</p>
      <form @submit.prevent="submit" :style="{ display:'flex', flexDirection:'column', gap:'12px' }">
        <input v-if="showFirstName" type="text" placeholder="First name" v-model="firstName" :style="{ ...inputStyleLight, textAlign:'center' }" />
        <input type="email" required :placeholder="placeholder || 'Enter your email address'" v-model="email" :style="{ ...inputStyleLight, textAlign:'center' }" />
        <button type="submit" :disabled="status==='loading'" :style="{ padding:'13px', borderRadius:`${inputRadius}px`, backgroundColor:accent, color:'#fff', border:'none', fontWeight:700, fontSize:'15px', cursor:'pointer' }">
          {{ status === 'loading' ? 'Subscribing…' : (buttonText || 'Subscribe') }}
        </button>
      </form>
      <p v-if="privacyText" :style="{ color:text, opacity:0.4, fontSize:'12px', marginTop:'14px' }">{{ privacyText }}</p>
    </div>
  </section>

  <!-- Minimal layout -->
  <section v-else :style="{ backgroundColor: bg, padding:'32px 24px' }">
    <div :style="{ maxWidth:'800px', margin:'0 auto' }">
      <div :style="{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'24px' }">
        <div :style="{ flex:'1 1 240px' }">
          <h3 :style="{ color:text, fontSize:'20px', fontWeight:700, margin:'0 0 6px' }">{{ headline || 'Stay in the Loop' }}</h3>
          <p v-if="subheadline" :style="{ color:text, opacity:0.6, fontSize:'14px', margin:0 }">{{ subheadline }}</p>
        </div>
        <form @submit.prevent="submit" :style="{ display:'flex', gap:'8px', flex:'1 1 320px', flexWrap:'wrap' }">
          <input v-if="showFirstName" type="text" placeholder="First name" v-model="firstName" :style="{ ...inputStyleLight, flex:'0 1 140px' }" />
          <input type="email" required :placeholder="placeholder || 'Enter your email address'" v-model="email" :style="inputStyleLight" />
          <button type="submit" :disabled="status==='loading'" :style="{ padding:'12px 22px', borderRadius:`${inputRadius}px`, backgroundColor:accent, color:'#fff', border:'none', fontWeight:700, fontSize:'14px', cursor:'pointer', whiteSpace:'nowrap' }">
            {{ status === 'loading' ? '…' : (buttonText || 'Subscribe') }}
          </button>
        </form>
      </div>
      <p v-if="privacyText" :style="{ color:text, opacity:0.4, fontSize:'12px', marginTop:'12px' }">{{ privacyText }}</p>
    </div>
  </section>
</template>
