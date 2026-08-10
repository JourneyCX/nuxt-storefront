<script setup lang="ts">
defineProps<{
  headline?: string
  accentColor?: string
  backgroundColor?: string
  textColor?: string
}>()
</script>
<template>
  <div :style="{ backgroundColor: backgroundColor || '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }">
    <h3 v-if="headline" :style="{ color: textColor || '#1e293b', fontSize: '16px', fontWeight: 700, margin: '0 0 16px' }">{{ headline || 'Select Pickup Point' }}</h3>
    <input type="text" placeholder="Search by suburb or postal code…" style="width:100%;padding:11px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;margin-bottom:16px;" />
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div v-for="loc in ['Cape Town CBD — Adderley Street','Claremont — Main Road','Bellville Centre']" :key="loc"
        style="display:flex;align-items:center;gap:10px;padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;">
        <input type="radio" name="pickup" :style="{ accentColor: accentColor || '#2563eb' }" />
        <div>
          <p :style="{ margin: 0, fontSize: '14px', fontWeight: 600, color: textColor || '#1e293b' }">{{ loc }}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Open Mon–Sat · Closes 18:00</p>
        </div>
      </div>
    </div>
  </div>
</template>
