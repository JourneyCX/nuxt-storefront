<script setup lang="ts">
const props = defineProps<{
  headline?: string
  subheadline?: string
  showPhone?: boolean
  showSubject?: boolean
  showCompany?: boolean
  submitEndpoint?: string
  submitButtonText?: string
  successMessage?: string
  errorMessage?: string
  layout?: 'standard' | 'two-column' | 'card'
  accentColor?: string
  backgroundColor?: string
  cardColor?: string
  textColor?: string
  borderColor?: string
  borderRadius?: number
}>()

const form = reactive({ name: '', email: '', phone: '', company: '', subject: '', message: '' })
const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')

async function submit(e: Event) {
  e.preventDefault()
  status.value = 'loading'
  try {
    // No endpoint configured -> deliver via Stratum's own contact-form route
    // (emails the tenant's Site Settings > Store Info contact address) rather
    // than a merchant's own third-party form handler.
    const res = await fetch(props.submitEndpoint || '/api/contact-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    status.value = res.ok ? 'success' : 'error'
  } catch {
    status.value = 'error'
  }
}

function reset() {
  Object.assign(form, { name: '', email: '', phone: '', company: '', subject: '', message: '' })
  status.value = 'idle'
}

const isTwoCol = computed(() => props.layout === 'two-column')
const isCard   = computed(() => props.layout === 'card')
const accent   = computed(() => props.accentColor || '#2563eb')
const border   = computed(() => props.borderColor || '#e2e8f0')
const text     = computed(() => props.textColor   || '#1e293b')
const br       = computed(() => `${(props.borderRadius ?? 12) / 2}px`)
</script>

<template>
  <section :style="{ backgroundColor: backgroundColor || '#fff', padding: '64px 24px' }">
    <div :style="{ maxWidth: isCard ? '680px' : '900px', margin: '0 auto' }">
      <div v-if="headline || subheadline" :style="{ marginBottom: '40px', textAlign: isCard ? 'center' : 'left' }">
        <h2 v-if="headline" :style="{ color: text, fontSize: '32px', fontWeight: 800, margin: '0 0 12px' }">{{ headline }}</h2>
        <p v-if="subheadline" :style="{ color: text, opacity: 0.65, fontSize: '17px', margin: 0, lineHeight: 1.65 }">{{ subheadline }}</p>
      </div>

      <div :style="isCard ? { backgroundColor: cardColor || '#f8fafc', borderRadius: `${borderRadius ?? 12}px`, padding: '40px 48px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: `1px solid ${border}` } : {}">
        <!-- Success -->
        <div v-if="status === 'success'" style="text-align:center;padding:48px 32px;">
          <div :style="{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" :stroke="accent" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p :style="{ color: text, fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }">{{ successMessage || 'Thanks! We\'ll be in touch soon.' }}</p>
          <button @click="reset" :style="{ marginTop: '20px', background: 'none', border: `1px solid ${border}`, color: text, padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }">
            Send another message
          </button>
        </div>

        <!-- Form -->
        <form v-else @submit="submit" novalidate>
          <div :style="{ display: 'grid', gridTemplateColumns: isTwoCol ? '1fr 1fr' : '1fr', gap: '16px' }">
            <div>
              <label :style="{ display: 'block', fontSize: '13px', fontWeight: 600, color: text, marginBottom: '6px', opacity: 0.8 }">Full Name *</label>
              <input v-model="form.name" type="text" required placeholder="Jane Smith" :style="{ width: '100%', padding: '11px 14px', border: `1px solid ${border}`, borderRadius: br, fontSize: '15px', color: text, backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box' }" />
            </div>
            <div>
              <label :style="{ display: 'block', fontSize: '13px', fontWeight: 600, color: text, marginBottom: '6px', opacity: 0.8 }">Email Address *</label>
              <input v-model="form.email" type="email" required placeholder="jane@example.com" :style="{ width: '100%', padding: '11px 14px', border: `1px solid ${border}`, borderRadius: br, fontSize: '15px', color: text, backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box' }" />
            </div>
            <div v-if="showPhone">
              <label :style="{ display: 'block', fontSize: '13px', fontWeight: 600, color: text, marginBottom: '6px', opacity: 0.8 }">Phone Number</label>
              <input v-model="form.phone" type="tel" placeholder="+27 00 000 0000" :style="{ width: '100%', padding: '11px 14px', border: `1px solid ${border}`, borderRadius: br, fontSize: '15px', color: text, backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box' }" />
            </div>
            <div v-if="showCompany">
              <label :style="{ display: 'block', fontSize: '13px', fontWeight: 600, color: text, marginBottom: '6px', opacity: 0.8 }">Company</label>
              <input v-model="form.company" type="text" placeholder="Company name" :style="{ width: '100%', padding: '11px 14px', border: `1px solid ${border}`, borderRadius: br, fontSize: '15px', color: text, backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box' }" />
            </div>
            <div v-if="showSubject" :style="{ gridColumn: isTwoCol ? '1 / -1' : undefined }">
              <label :style="{ display: 'block', fontSize: '13px', fontWeight: 600, color: text, marginBottom: '6px', opacity: 0.8 }">Subject</label>
              <input v-model="form.subject" type="text" placeholder="How can we help?" :style="{ width: '100%', padding: '11px 14px', border: `1px solid ${border}`, borderRadius: br, fontSize: '15px', color: text, backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box' }" />
            </div>
            <div :style="{ gridColumn: isTwoCol ? '1 / -1' : undefined }">
              <label :style="{ display: 'block', fontSize: '13px', fontWeight: 600, color: text, marginBottom: '6px', opacity: 0.8 }">Message *</label>
              <textarea v-model="form.message" required rows="5" placeholder="Tell us more…" :style="{ width: '100%', padding: '11px 14px', border: `1px solid ${border}`, borderRadius: br, fontSize: '15px', color: text, backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }" />
            </div>
          </div>
          <p v-if="status === 'error'" style="color:#ef4444;font-size:14px;margin:12px 0 0;">{{ errorMessage || 'Something went wrong. Please try again.' }}</p>
          <button type="submit" :disabled="status === 'loading'" :style="{ marginTop: '20px', display: 'inline-flex', alignItems: 'center', backgroundColor: status === 'loading' ? accent + 'aa' : accent, color: '#fff', border: 'none', padding: '13px 32px', borderRadius: br, cursor: status === 'loading' ? 'not-allowed' : 'pointer', fontSize: '15px', fontWeight: 700 }">
            {{ status === 'loading' ? 'Sending…' : (submitButtonText || 'Send Message') }}
          </button>
        </form>
      </div>
    </div>
  </section>
</template>
