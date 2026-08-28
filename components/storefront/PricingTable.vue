<script setup lang="ts">
type Plan = {
  name: string; price: string; period: string; description: string
  features: string; highlighted: boolean; highlightColor: string
  buttonText: string; buttonUrl: string
}
defineProps<{
  headline?: string
  subheadline?: string
  backgroundColor?: string
  textColor?: string
  plans?: Plan[]
}>()
</script>

<template>
  <section :style="{ backgroundColor: backgroundColor || '#f8fafc', padding: '72px 24px' }">
    <div style="max-width:1100px;margin:0 auto;">
      <div v-if="headline || subheadline" style="text-align:center;margin-bottom:56px;">
        <h2 v-if="headline" class="sb-text-fluid-md" :style="{ color: textColor || '#1e293b', fontWeight: 800, margin: '0 0 16px' }">{{ headline }}</h2>
        <p v-if="subheadline" :style="{ color: textColor || '#1e293b', opacity: 0.7, fontSize: '18px', margin: 0, lineHeight: 1.65 }">{{ subheadline }}</p>
      </div>
      <!-- sb-grid collapses this to 1 column on mobile / 2 on tablet regardless of plan count -->
      <div v-if="plans?.length" class="sb-grid" :style="{ display: 'grid', gridTemplateColumns: `repeat(${plans.length}, 1fr)`, gap: '24px', alignItems: 'start' }">
        <div v-for="(plan, i) in plans" :key="i" :style="{
          borderRadius: '16px',
          padding: plan.highlighted ? '40px 32px' : '32px',
          backgroundColor: plan.highlighted ? plan.highlightColor : '#fff',
          color: plan.highlighted ? '#fff' : (textColor || '#1e293b'),
          boxShadow: plan.highlighted ? `0 8px 32px ${plan.highlightColor}44` : '0 2px 12px rgba(0,0,0,0.07)',
          border: plan.highlighted ? 'none' : `1px solid rgba(0,0,0,0.1)`,
          position: 'relative',
        }">
          <div v-if="plan.highlighted" style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:#fbbf24;color:#1e293b;font-size:12px;font-weight:700;padding:4px 16px;border-radius:20px;letter-spacing:0.06em;white-space:nowrap;">
            MOST POPULAR
          </div>
          <p :style="{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px', opacity: 0.8 }">{{ plan.name }}</p>
          <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:8px;">
            <span style="font-size:42px;font-weight:800;line-height:1;">{{ plan.price }}</span>
            <span v-if="plan.period" style="font-size:16px;opacity:0.7;">{{ plan.period }}</span>
          </div>
          <p v-if="plan.description" style="font-size:15px;opacity:0.75;margin:0 0 24px;line-height:1.5;">{{ plan.description }}</p>
          <ul style="list-style:none;margin:0 0 32px;padding:0;display:flex;flex-direction:column;gap:12px;">
            <li v-for="(feat, j) in (plan.features || '').split('\n').filter(Boolean)" :key="j" style="display:flex;align-items:flex-start;gap:10px;font-size:15px;">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style="flex-shrink:0;margin-top:1px;">
                <circle cx="9" cy="9" r="9" :fill="plan.highlighted ? '#fff' : plan.highlightColor" fill-opacity="0.15"/>
                <path d="M5 9l3 3 5-5" :stroke="plan.highlighted ? '#fff' : plan.highlightColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span style="opacity:0.9;">{{ feat }}</span>
            </li>
          </ul>
          <a v-if="plan.buttonText" :href="plan.buttonUrl || '#'" :style="{
            display: 'block', textAlign: 'center', padding: '13px 24px', borderRadius: '8px',
            textDecoration: 'none', fontWeight: 700, fontSize: '15px',
            backgroundColor: plan.highlighted ? '#fff' : plan.highlightColor,
            color: plan.highlighted ? plan.highlightColor : '#fff',
          }">{{ plan.buttonText }}</a>
        </div>
      </div>
    </div>
  </section>
</template>
