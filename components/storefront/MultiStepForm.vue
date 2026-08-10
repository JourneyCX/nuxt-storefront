<script setup lang="ts">
defineProps<{
  headline?: string
  subheadline?: string
  accentColor?: string
  backgroundColor?: string
  textColor?: string
  steps?: Array<{ title: string; fields: string[] }>
  submitButtonText?: string
  successMessage?: string
}>()
</script>
<template>
  <section :style="{ backgroundColor: backgroundColor || '#fff', padding: '64px 24px' }">
    <div style="max-width:680px;margin:0 auto;">
      <div v-if="headline || subheadline" style="text-align:center;margin-bottom:40px;">
        <h2 v-if="headline" :style="{ color: textColor || '#1e293b', fontSize: '32px', fontWeight: 800, margin: '0 0 12px' }">{{ headline }}</h2>
        <p v-if="subheadline" :style="{ color: textColor || '#1e293b', opacity: 0.65, fontSize: '17px', margin: 0 }">{{ subheadline }}</p>
      </div>
      <div style="background:#f8fafc;border-radius:16px;padding:40px;box-shadow:0 2px 16px rgba(0,0,0,0.06);">
        <div style="display:flex;gap:8px;margin-bottom:32px;">
          <div v-for="(step, i) in (steps?.length ? steps : [{title:'Details'},{title:'Preferences'},{title:'Confirm'}])" :key="i"
            :style="{ flex:1, height:'4px', borderRadius:'999px', backgroundColor: i === 0 ? (accentColor||'#2563eb') : '#e2e8f0' }" />
        </div>
        <h3 :style="{ color: textColor || '#1e293b', fontSize: '20px', fontWeight: 700, margin: '0 0 24px' }">
          {{ steps?.[0]?.title || 'Step 1: Your Details' }}
        </h3>
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div v-for="field in (steps?.[0]?.fields || ['Full Name','Email Address','Phone Number'])" :key="field">
            <label :style="{ display: 'block', fontSize: '13px', fontWeight: 600, color: textColor || '#1e293b', marginBottom: '6px', opacity: 0.8 }">{{ field }}</label>
            <input type="text" :placeholder="field" style="width:100%;padding:11px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:15px;outline:none;box-sizing:border-box;" />
          </div>
        </div>
        <button :style="{ marginTop: '24px', backgroundColor: accentColor || '#2563eb', color: '#fff', border: 'none', padding: '13px 32px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 700 }">
          {{ submitButtonText || 'Continue →' }}
        </button>
      </div>
    </div>
  </section>
</template>
