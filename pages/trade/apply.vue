<script setup lang="ts">
// Trade account application (B2B Session 2). Only works for tenants with B2B enabled: /api/trade/config 404s
// otherwise and the page says so. All validation is repeated on Stratum; the checks here are for convenience.
interface TradeConfig {
  consentText: string
  consentVersion: string
  businessName: string
  documentsReady: boolean
  limits: { maxFiles: number; maxFileBytes: number; maxTotalBytes: number }
  fillToken: string
}

useHead({ title: 'Apply for a trade account', meta: [{ name: 'robots', content: 'noindex' }] })

const cfg       = ref<TradeConfig | null>(null)
const available = ref<boolean | null>(null)
const submitting = ref(false)
const done      = ref('')
const errors    = reactive<Record<string, string>>({})

const form = reactive({
  legal_name: '', trading_name: '', reg_no: '', tax_id: '',
  contact_first_name: '', contact_last_name: '', contact_email: '', contact_phone: '',
  delivery_street: '', delivery_city: '', delivery_state: '', delivery_zip: '',
  consent: false, marketing_optin: false,
  website_url: '', // honeypot: hidden from people
})
const docs = reactive<{ type: string; label: string; file: File | null }[]>([
  { type: 'company_registration', label: 'Company registration (CIPC)', file: null },
  { type: 'vat_certificate', label: 'VAT registration certificate', file: null },
  { type: 'bank_letter', label: 'Bank confirmation letter', file: null },
])

onMounted(async () => {
  try {
    cfg.value = await $fetch<TradeConfig>('/api/trade/config')
    available.value = true
  } catch {
    available.value = false
  }
})

function onFile(i: number, e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0] ?? null
  errors.documents = ''
  if (f && cfg.value && f.size > cfg.value.limits.maxFileBytes) {
    errors.documents = `${f.name} is larger than ${Math.round(cfg.value.limits.maxFileBytes / 1048576)} MB.`
    ;(e.target as HTMLInputElement).value = ''
    docs[i].file = null
    return
  }
  docs[i].file = f
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

async function onSubmit() {
  Object.keys(errors).forEach(k => delete errors[k])
  if (!cfg.value) return
  const chosen = docs.filter(d => d.file)
  const total  = chosen.reduce((s, d) => s + (d.file as File).size, 0)
  if (total > cfg.value.limits.maxTotalBytes) {
    errors.documents = `The documents together must be under ${Math.round(cfg.value.limits.maxTotalBytes / 1048576)} MB.`
    return
  }
  submitting.value = true
  try {
    const documents = []
    for (const d of chosen) documents.push({ type: d.type, name: (d.file as File).name, data: await toBase64(d.file as File) })
    const res = await $fetch<{ success: boolean; reference?: string; errors?: Record<string, string> }>('/api/trade/apply', {
      method: 'POST',
      body: { ...form, consent: form.consent ? '1' : '', marketing_optin: form.marketing_optin ? '1' : '', fill_token: cfg.value.fillToken, documents },
    })
    if (res.success) done.value = res.reference ?? ''
  } catch (e: any) {
    const data = e?.data?.errors ?? e?.response?._data?.errors
    if (data) Object.assign(errors, data)
    else errors._ = e?.data?.statusMessage || e?.statusMessage || 'We could not submit your application. Please try again.'
    // A refused attempt used the fill token; get a fresh one so the visitor can correct and resubmit.
    try { cfg.value = await $fetch<TradeConfig>('/api/trade/config') } catch { /* keep the old one */ }
  } finally {
    submitting.value = false
  }
}

const input = 'width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;box-sizing:border-box'
const label = 'display:block;font-size:13px;font-weight:600;color:#4a5568;margin-bottom:6px'
</script>

<template>
  <div style="max-width:720px;margin:0 auto;padding:48px 24px">
    <h1 style="font-size:28px;font-weight:700;color:#1a202c;margin:0 0 8px">Apply for a trade account</h1>

    <p v-if="available === null" style="color:#718096">Loading…</p>
    <p v-else-if="!available" style="color:#4a5568">Trade accounts are not available on this store.</p>

    <div v-else-if="done" style="background:#f0fff4;border:1px solid #9ae6b4;border-radius:8px;padding:24px;margin-top:24px">
      <h2 style="margin:0 0 8px;font-size:20px;color:#22543d">Thank you, we have your application</h2>
      <p style="margin:0;color:#2f855a">We have emailed you a confirmation. We will review the application and come back to you.
        <span v-if="done !== 'TA-00000'">Your reference is <strong>{{ done }}</strong>.</span></p>
    </div>

    <form v-else-if="cfg" @submit.prevent="onSubmit" novalidate>
      <p style="color:#718096;margin:0 0 24px">Tell us about your business. Fields marked * are required. We review each application before opening an account.</p>

      <p v-if="errors._" role="alert" style="color:#e53e3e;font-size:14px;margin:0 0 16px">{{ errors._ }}</p>

      <h2 style="font-size:16px;margin:24px 0 12px;color:#2d3748">Company</h2>
      <div style="margin-bottom:16px">
        <label :style="label">Legal company name *</label>
        <input v-model="form.legal_name" type="text" maxlength="191" autocomplete="organization" :style="input" />
        <small v-if="errors.legal_name" style="color:#e53e3e">{{ errors.legal_name }}</small>
      </div>
      <div style="margin-bottom:16px">
        <label :style="label">Trading name (if different)</label>
        <input v-model="form.trading_name" type="text" maxlength="191" :style="input" />
        <small v-if="errors.trading_name" style="color:#e53e3e">{{ errors.trading_name }}</small>
      </div>
      <div class="trade-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div>
          <label :style="label">Company registration number</label>
          <input v-model="form.reg_no" type="text" placeholder="2015/123456/07" maxlength="30" :style="input" />
          <small v-if="errors.reg_no" style="color:#e53e3e">{{ errors.reg_no }}</small>
        </div>
        <div>
          <label :style="label">VAT number</label>
          <input v-model="form.tax_id" type="text" placeholder="4123456789" maxlength="20" :style="input" />
          <small v-if="errors.tax_id" style="color:#e53e3e">{{ errors.tax_id }}</small>
        </div>
      </div>

      <h2 style="font-size:16px;margin:24px 0 12px;color:#2d3748">Contact person</h2>
      <div class="trade-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div>
          <label :style="label">First name *</label>
          <input v-model="form.contact_first_name" type="text" autocomplete="given-name" :style="input" />
          <small v-if="errors.contact_first_name" style="color:#e53e3e">{{ errors.contact_first_name }}</small>
        </div>
        <div>
          <label :style="label">Last name *</label>
          <input v-model="form.contact_last_name" type="text" autocomplete="family-name" :style="input" />
          <small v-if="errors.contact_last_name" style="color:#e53e3e">{{ errors.contact_last_name }}</small>
        </div>
        <div>
          <label :style="label">Email *</label>
          <input v-model="form.contact_email" type="email" autocomplete="email" :style="input" />
          <small v-if="errors.contact_email" style="color:#e53e3e">{{ errors.contact_email }}</small>
        </div>
        <div>
          <label :style="label">Phone *</label>
          <input v-model="form.contact_phone" type="tel" autocomplete="tel" :style="input" />
          <small v-if="errors.contact_phone" style="color:#e53e3e">{{ errors.contact_phone }}</small>
        </div>
      </div>

      <h2 style="font-size:16px;margin:24px 0 12px;color:#2d3748">Delivery address</h2>
      <div style="margin-bottom:16px">
        <label :style="label">Street address *</label>
        <input v-model="form.delivery_street" type="text" autocomplete="street-address" :style="input" />
        <small v-if="errors.delivery_street" style="color:#e53e3e">{{ errors.delivery_street }}</small>
      </div>
      <div class="trade-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px">
        <div>
          <label :style="label">City / town *</label>
          <input v-model="form.delivery_city" type="text" :style="input" />
          <small v-if="errors.delivery_city" style="color:#e53e3e">{{ errors.delivery_city }}</small>
        </div>
        <div>
          <label :style="label">Province</label>
          <input v-model="form.delivery_state" type="text" :style="input" />
        </div>
        <div>
          <label :style="label">Postal code *</label>
          <input v-model="form.delivery_zip" type="text" maxlength="10" :style="input" />
          <small v-if="errors.delivery_zip" style="color:#e53e3e">{{ errors.delivery_zip }}</small>
        </div>
      </div>

      <h2 style="font-size:16px;margin:24px 0 12px;color:#2d3748">Documents</h2>
      <p v-if="!cfg.documentsReady" style="color:#975a16;font-size:13px">Document upload is not available right now. You can still apply and send the documents to us afterwards.</p>
      <template v-else>
        <p style="color:#718096;font-size:13px;margin:0 0 12px">Optional but speeds up approval. PDF, JPG or PNG, up to {{ Math.round(cfg.limits.maxFileBytes / 1048576) }} MB each.</p>
        <div v-for="(d, i) in docs" :key="d.type" style="margin-bottom:12px">
          <label :style="label">{{ d.label }}</label>
          <input type="file" accept="application/pdf,image/jpeg,image/png" @change="onFile(i, $event)" />
        </div>
        <small v-if="errors.documents" style="color:#e53e3e">{{ errors.documents }}</small>
      </template>

      <!-- Honeypot: invisible to people, tempting to bots -->
      <div aria-hidden="true" style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden">
        <label>Leave this empty <input v-model="form.website_url" type="text" tabindex="-1" autocomplete="off" /></label>
      </div>

      <h2 style="font-size:16px;margin:24px 0 12px;color:#2d3748">Consent</h2>
      <label style="display:flex;gap:10px;align-items:flex-start;font-size:13px;color:#4a5568;margin-bottom:12px;cursor:pointer">
        <input v-model="form.consent" type="checkbox" style="margin-top:3px" />
        <span>{{ cfg.consentText }}</span>
      </label>
      <small v-if="errors.consent" style="color:#e53e3e;display:block;margin-bottom:12px">{{ errors.consent }}</small>
      <label style="display:flex;gap:10px;align-items:flex-start;font-size:13px;color:#4a5568;margin-bottom:24px;cursor:pointer">
        <input v-model="form.marketing_optin" type="checkbox" style="margin-top:3px" />
        <span>I would also like to receive news and offers from {{ cfg.businessName || 'this business' }} by email. (Optional. You can unsubscribe at any time.)</span>
      </label>

      <button type="submit" :disabled="submitting"
        style="background:#2b6cb0;color:#fff;padding:14px 32px;border:none;border-radius:8px;font-weight:700;font-size:16px;cursor:pointer">
        {{ submitting ? 'Submitting…' : 'Submit application' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
@media (max-width: 600px) {
  .trade-grid { grid-template-columns: 1fr !important; }
}
</style>
